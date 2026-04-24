const express = require('express');
const multer  = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const client = new Anthropic();

app.use(express.static(path.join(__dirname)));

app.post('/api/scan', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const direction = req.body.direction || 'ja-en';
  const b64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype || 'image/jpeg';

  const srcLang = direction === 'en-ja' ? 'English' : 'Japanese';
  const tgtLang = direction === 'en-ja' ? 'Japanese' : 'English';

  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: `You are an expert OCR and translation assistant. Extract all visible text from images and translate it accurately. Respond ONLY with a JSON object in this exact format: {"original": "<extracted text>", "translation": "<translated text>"}. No markdown, no explanation, just the JSON.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: b64 },
            },
            {
              type: 'text',
              text: `Extract all ${srcLang} text from this image and translate it to ${tgtLang}. Return only the JSON object.`,
            },
          ],
        },
      ],
    });

    const raw = msg.content[0].text.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Claude sometimes wraps in markdown fences — strip and retry
      const cleaned = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({ original: parsed.original || '', translation: parsed.translation || '' });
  } catch (err) {
    console.error('Scan error:', err.message);
    res.status(500).json({ error: 'AI scan failed. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Translate4me server running on port ${PORT}`));
