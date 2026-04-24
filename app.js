// direction: 'en-ja' = English→Japanese, 'ja-en' = Japanese→English
let direction = 'en-ja';
let lastTranslation = '';
let recognizing = false;

const PHRASES = [
  { en: "Thank you",             ja: "ありがとうございます", ro: "Arigatou gozaimasu" },
  { en: "Excuse me",             ja: "すみません",           ro: "Sumimasen" },
  { en: "Where is…?",            ja: "…はどこですか？",      ro: "…wa doko desu ka?" },
  { en: "How much?",             ja: "いくらですか？",        ro: "Ikura desu ka?" },
  { en: "I don't understand",    ja: "わかりません",          ro: "Wakarimasen" },
  { en: "Do you speak English?", ja: "英語を話せますか？",    ro: "Eigo wo hanasemasu ka?" },
  { en: "Help!",                 ja: "助けてください！",      ro: "Tasukete kudasai!" },
  { en: "One ticket please",     ja: "チケットを一枚ください", ro: "Chiketto wo ichimai kudasai" },
  { en: "Delicious!",            ja: "おいしい！",            ro: "Oishii!" },
  { en: "Restroom?",             ja: "トイレはどこですか？",  ro: "Toire wa doko desu ka?" },
  { en: "Good morning",          ja: "おはようございます",    ro: "Ohayou gozaimasu" },
  { en: "Goodbye",               ja: "さようなら",            ro: "Sayounara" },
];

// Elements
const srcLabel     = document.getElementById('src-label');
const tgtLabel     = document.getElementById('tgt-label');
const swapBtn      = document.getElementById('swap-btn');
const sourceText   = document.getElementById('source-text');
const outputText   = document.getElementById('output-text');
const translateBtn = document.getElementById('translate-btn');
const clearBtn     = document.getElementById('clear-btn');
const copyBtn      = document.getElementById('copy-btn');
const speakBtn     = document.getElementById('speak-btn');
const scanBtn      = document.getElementById('scan-btn');
const listenBtn    = document.getElementById('listen-btn');
const imgInput     = document.getElementById('img-input');
const charCount    = document.getElementById('char-count');
const errorMsg     = document.getElementById('error-msg');
const ocrProgress  = document.getElementById('ocr-progress');
const progressFill = document.getElementById('progress-fill');
const progressLabel= document.getElementById('progress-label');
const phrasesGrid  = document.getElementById('phrases-grid');

// ── Helpers ──────────────────────────────────────────────────────────────────

function srcLang()    { return direction === 'en-ja' ? 'en' : 'ja'; }
function tgtLang()    { return direction === 'en-ja' ? 'ja' : 'en'; }
function srcLocale()  { return direction === 'en-ja' ? 'en-US' : 'ja-JP'; }
function tgtLocale()  { return direction === 'en-ja' ? 'ja-JP' : 'en-US'; }
function ocrLang()    { return direction === 'en-ja' ? 'eng' : 'jpn'; }

function updateLabels() {
  srcLabel.textContent = direction === 'en-ja' ? 'English' : 'Japanese';
  tgtLabel.textContent = direction === 'en-ja' ? 'Japanese' : 'English';
}

function updateCharCount() {
  const len = sourceText.value.length;
  charCount.textContent = `${len} / 500`;
  charCount.style.color = len > 450 ? 'var(--red)' : '';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
  setTimeout(() => errorMsg.classList.add('hidden'), 5000);
}

function setOutput(text) {
  outputText.textContent = text;
  lastTranslation = text;
}

function clearOutput() {
  outputText.innerHTML = '<span class="placeholder">Translation will appear here…</span>';
  lastTranslation = '';
}

// ── Translation ───────────────────────────────────────────────────────────────

async function doTranslate() {
  const text = sourceText.value.trim();
  if (!text) return;
  if (text.length > 500) { showError('Please keep text under 500 characters.'); return; }

  translateBtn.disabled = true;
  translateBtn.textContent = 'Translating…';
  outputText.innerHTML = '<span class="placeholder">Translating…</span>';
  errorMsg.classList.add('hidden');

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang()}|${tgtLang()}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (data.responseStatus === 200) {
      setOutput(data.responseData.translatedText);
    } else {
      throw new Error(data.responseDetails || 'Translation failed');
    }
  } catch {
    clearOutput();
    showError('Could not translate. Check your connection and try again.');
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = 'Translate';
  }
}

translateBtn.addEventListener('click', doTranslate);
sourceText.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doTranslate();
});
sourceText.addEventListener('input', updateCharCount);

// ── Swap ─────────────────────────────────────────────────────────────────────

swapBtn.addEventListener('click', () => {
  direction = direction === 'en-ja' ? 'ja-en' : 'en-ja';
  updateLabels();
  const prev = sourceText.value;
  sourceText.value = lastTranslation;
  clearOutput();
  updateCharCount();
  if (prev) doTranslate();
});

// ── Clear ─────────────────────────────────────────────────────────────────────

clearBtn.addEventListener('click', () => {
  sourceText.value = '';
  clearOutput();
  updateCharCount();
  errorMsg.classList.add('hidden');
});

// ── Copy ──────────────────────────────────────────────────────────────────────

copyBtn.addEventListener('click', () => {
  if (!lastTranslation) return;
  navigator.clipboard.writeText(lastTranslation)
    .then(() => {
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
    })
    .catch(() => showError('Copy failed – please copy manually.'));
});

// ── Speak (TTS) ───────────────────────────────────────────────────────────────

speakBtn.addEventListener('click', () => {
  if (!lastTranslation || !window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(lastTranslation);
  utt.lang = tgtLocale();
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
});

// ── OCR Scan ──────────────────────────────────────────────────────────────────

scanBtn.addEventListener('click', () => imgInput.click());

imgInput.addEventListener('change', async () => {
  const file = imgInput.files[0];
  if (!file) return;
  imgInput.value = '';

  scanBtn.disabled = true;
  errorMsg.classList.add('hidden');
  ocrProgress.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressLabel.textContent = 'Loading OCR…';

  try {
    const result = await Tesseract.recognize(file, ocrLang(), {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          progressFill.style.width = `${pct}%`;
          progressLabel.textContent = `Scanning… ${pct}%`;
        } else if (m.status === 'loading tesseract core') {
          progressLabel.textContent = 'Loading OCR engine…';
        } else if (m.status === 'loading language traineddata') {
          progressLabel.textContent = `Loading ${direction === 'ja-en' ? 'Japanese' : 'English'} model…`;
        }
      },
    });

    const text = result.data.text.trim();
    if (!text) { showError('No text detected in image. Try a clearer photo.'); return; }
    sourceText.value = text;
    updateCharCount();
    doTranslate();
  } catch (err) {
    showError('OCR failed. Please try again with a clearer image.');
  } finally {
    scanBtn.disabled = false;
    ocrProgress.classList.add('hidden');
  }
});

// ── Speech Recognition ────────────────────────────────────────────────────────

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  listenBtn.disabled = true;
  listenBtn.title = 'Speech recognition not supported in this browser';
} else {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = e => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('');
    sourceText.value = transcript;
    updateCharCount();
    doTranslate();
  };

  recognition.onerror = e => {
    if (e.error !== 'no-speech') showError(`Microphone error: ${e.error}`);
    stopListening();
  };

  recognition.onend = stopListening;

  function startListening() {
    recognizing = true;
    recognition.lang = srcLocale();
    recognition.start();
    listenBtn.textContent = '🔴 Stop';
    listenBtn.classList.add('active');
  }

  function stopListening() {
    recognizing = false;
    listenBtn.textContent = '🎤 Listen';
    listenBtn.classList.remove('active');
  }

  listenBtn.addEventListener('click', () => {
    if (recognizing) {
      recognition.stop();
    } else {
      startListening();
    }
  });
}

// ── Phrasebook ────────────────────────────────────────────────────────────────

PHRASES.forEach(p => {
  const card = document.createElement('div');
  card.className = 'phrase-card';
  card.innerHTML = `<div class="en">${p.en}</div><div class="ja">${p.ja}</div><div class="ro">${p.ro}</div>`;
  card.addEventListener('click', () => {
    direction = 'en-ja';
    updateLabels();
    sourceText.value = p.en;
    updateCharCount();
    doTranslate();
  });
  phrasesGrid.appendChild(card);
});

// ── Init ──────────────────────────────────────────────────────────────────────

updateLabels();
