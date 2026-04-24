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
  errorMsg.style.color = 'var(--red)';
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
  setTimeout(() => errorMsg.classList.add('hidden'), 5000);
}

function showInfo(msg) {
  errorMsg.style.color = 'var(--muted)';
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
  setTimeout(() => errorMsg.classList.add('hidden'), 4000);
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

// Mobile browsers break when cancel() is called right before speak().
// If already speaking: cancel then wait 50ms; if voices aren't loaded yet: wait
// for voiceschanged. Phrase cards call this directly inside the click handler
// so the gesture context is intact — no async gap before speak().
function speakText(text, lang) {
  if (!text || !window.speechSynthesis) return;

  function doSpeak() {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    const voices = speechSynthesis.getVoices();
    const match = voices.find(v => v.lang === lang)
               || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (match) utt.voice = match;
    speechSynthesis.speak(utt);
  }

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    setTimeout(doSpeak, 50);
  } else if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
  } else {
    doSpeak();
  }
}

speakBtn.addEventListener('click', () => speakText(lastTranslation, tgtLocale()));

// ── OCR Scan ──────────────────────────────────────────────────────────────────

scanBtn.addEventListener('click', () => imgInput.click());

imgInput.addEventListener('change', async () => {
  const file = imgInput.files[0];
  if (!file) return;
  imgInput.value = '';

  scanBtn.disabled = true;
  errorMsg.classList.add('hidden');
  ocrProgress.classList.remove('hidden');
  progressFill.style.width = '30%';
  progressLabel.textContent = 'Scanning with AI…';

  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('direction', direction);

    progressFill.style.width = '60%';
    const res = await fetch('/api/scan', { method: 'POST', body: formData });
    progressFill.style.width = '90%';

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Server error');
    }

    const data = await res.json();
    if (!data.original && !data.translation) {
      showError('No text detected. Try a clearer, well-lit photo.');
      return;
    }

    sourceText.value = data.original || '';
    updateCharCount();
    setOutput(data.translation || '');
    progressFill.style.width = '100%';
  } catch (err) {
    showError(err.message || 'AI scan failed. Please try again.');
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
    // Set output directly — no API call needed, Japanese is already known.
    // Speaking here (inside the click handler) keeps the user-gesture context
    // intact for mobile browsers, which require speech to start synchronously.
    setOutput(p.ja);
    speakText(p.ja, 'ja-JP');
  });
  phrasesGrid.appendChild(card);
});

// ── Live Lens ─────────────────────────────────────────────────────────────────

const lensBtn        = document.getElementById('lens-btn');
const lensModal      = document.getElementById('lens-modal');
const lensClose      = document.getElementById('lens-close');
const lensVideo      = document.getElementById('lens-video');
const lensCanvas     = document.getElementById('lens-canvas');
const lensCapture    = document.getElementById('lens-capture');
const lensOverlay    = document.getElementById('lens-overlay');
const lensOriginal   = document.getElementById('lens-original');
const lensTranslation= document.getElementById('lens-translation');
const lensSpinner    = document.getElementById('lens-spinner');
const lensUseBtn     = document.getElementById('lens-use-btn');
const lensDirLabel   = document.getElementById('lens-dir-label');

let lensStream = null;
let lensState  = 'live'; // 'live' | 'captured'

function lensShowLive() {
  lensState = 'live';
  lensVideo.classList.remove('hidden');
  lensCanvas.classList.add('hidden');
  lensOverlay.classList.add('hidden');
  lensCapture.textContent = '📷 Capture & Translate';
  lensCapture.disabled = false;
}

async function openLens() {
  lensDirLabel.textContent = direction === 'en-ja' ? 'EN → JA' : 'JA → EN';
  lensModal.classList.remove('hidden');
  lensShowLive();
  try {
    lensStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    lensVideo.srcObject = lensStream;
  } catch {
    showError('Camera access denied.');
    closeLens();
  }
}

function closeLens() {
  if (lensStream) { lensStream.getTracks().forEach(t => t.stop()); lensStream = null; }
  lensModal.classList.add('hidden');
  lensVideo.srcObject = null;
}

async function captureAndTranslate() {
  lensCanvas.width  = lensVideo.videoWidth  || 1280;
  lensCanvas.height = lensVideo.videoHeight || 720;
  lensCanvas.getContext('2d').drawImage(lensVideo, 0, 0);

  lensVideo.classList.add('hidden');
  lensCanvas.classList.remove('hidden');
  lensOverlay.classList.add('hidden');
  lensSpinner.classList.remove('hidden');
  lensCapture.disabled = true;

  lensCanvas.toBlob(async blob => {
    try {
      const fd = new FormData();
      fd.append('image', blob, 'lens.jpg');
      fd.append('direction', direction);
      const res  = await fetch('/api/scan', { method: 'POST', body: fd });
      const data = await res.json();
      lensOriginal.textContent    = data.original    || '';
      lensTranslation.textContent = data.translation || 'No text found';
      lensOverlay.classList.remove('hidden');
    } catch {
      lensTranslation.textContent = 'Translation failed — try again';
      lensOriginal.textContent    = '';
      lensOverlay.classList.remove('hidden');
    } finally {
      lensSpinner.classList.add('hidden');
      lensState = 'captured';
      lensCapture.textContent = '🔄 Try Again';
      lensCapture.disabled = false;
    }
  }, 'image/jpeg', 0.85);
}

lensCapture.addEventListener('click', () => {
  if (lensState === 'live') {
    captureAndTranslate();
  } else {
    lensShowLive();
  }
});

lensUseBtn.addEventListener('click', () => {
  sourceText.value = lensOriginal.textContent;
  updateCharCount();
  setOutput(lensTranslation.textContent);
  closeLens();
});

lensBtn.addEventListener('click', openLens);
lensClose.addEventListener('click', closeLens);

// ── Init ──────────────────────────────────────────────────────────────────────

updateLabels();
