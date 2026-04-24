const PHRASES = [
  { en: "Thank you",        ja: "ありがとうございます", ro: "Arigatou gozaimasu" },
  { en: "Excuse me",        ja: "すみません",           ro: "Sumimasen" },
  { en: "Where is…?",       ja: "…はどこですか？",     ro: "…wa doko desu ka?" },
  { en: "How much?",        ja: "いくらですか？",       ro: "Ikura desu ka?" },
  { en: "I don't understand",ja: "わかりません",        ro: "Wakarimasen" },
  { en: "Do you speak English?", ja: "英語を話せますか？", ro: "Eigo wo hanasemasu ka?" },
  { en: "Help!",            ja: "助けてください！",     ro: "Tasukete kudasai!" },
  { en: "One ticket please",ja: "チケットを一枚ください", ro: "Chiketto wo ichimai kudasai" },
  { en: "Delicious!",       ja: "おいしい！",           ro: "Oishii!" },
  { en: "Restroom?",        ja: "トイレはどこですか？", ro: "Toire wa doko desu ka?" },
  { en: "Good morning",     ja: "おはようございます",   ro: "Ohayou gozaimasu" },
  { en: "Goodbye",          ja: "さようなら",           ro: "Sayounara" },
];

const sourceLang   = document.getElementById("source-lang");
const targetLang   = document.getElementById("target-lang");
const swapBtn      = document.getElementById("swap-btn");
const sourceText   = document.getElementById("source-text");
const outputText   = document.getElementById("output-text");
const translateBtn = document.getElementById("translate-btn");
const clearBtn     = document.getElementById("clear-btn");
const copyBtn      = document.getElementById("copy-btn");
const speakBtn     = document.getElementById("speak-btn");
const charCount    = document.getElementById("char-count");
const errorMsg     = document.getElementById("error-msg");
const phrasesGrid  = document.getElementById("phrases-grid");

let lastTranslation = "";

// Build phrasebook
PHRASES.forEach(p => {
  const card = document.createElement("div");
  card.className = "phrase-card";
  card.innerHTML = `<div class="en">${p.en}</div><div class="ja">${p.ja}</div><div class="ro">${p.ro}</div>`;
  card.addEventListener("click", () => {
    sourceText.value = p.en;
    sourceLang.value = "en";
    targetLang.value = "ja";
    updateCharCount();
    doTranslate();
  });
  phrasesGrid.appendChild(card);
});

function updateCharCount() {
  const len = sourceText.value.length;
  charCount.textContent = `${len} / 500`;
  charCount.style.color = len > 450 ? "#e53935" : "";
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
  setTimeout(() => errorMsg.classList.add("hidden"), 4000);
}

async function doTranslate() {
  const text = sourceText.value.trim();
  if (!text) return;
  if (text.length > 500) { showError("Please keep text under 500 characters."); return; }

  translateBtn.disabled = true;
  translateBtn.textContent = "Translating…";
  outputText.innerHTML = '<span class="placeholder">Translating…</span>';
  errorMsg.classList.add("hidden");

  const src = sourceLang.value;
  const tgt = targetLang.value;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();

    if (data.responseStatus === 200) {
      lastTranslation = data.responseData.translatedText;
      outputText.textContent = lastTranslation;
    } else {
      throw new Error(data.responseDetails || "Translation failed");
    }
  } catch (err) {
    outputText.innerHTML = '<span class="placeholder">Translation will appear here…</span>';
    showError("Could not translate. Check your connection and try again.");
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = "Translate";
  }
}

translateBtn.addEventListener("click", doTranslate);

sourceText.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) doTranslate();
});

sourceText.addEventListener("input", updateCharCount);

clearBtn.addEventListener("click", () => {
  sourceText.value = "";
  outputText.innerHTML = '<span class="placeholder">Translation will appear here…</span>';
  lastTranslation = "";
  updateCharCount();
  errorMsg.classList.add("hidden");
});

copyBtn.addEventListener("click", () => {
  if (!lastTranslation) return;
  navigator.clipboard.writeText(lastTranslation)
    .then(() => { copyBtn.textContent = "✓ Copied!"; setTimeout(() => { copyBtn.textContent = "📋 Copy"; }, 1500); })
    .catch(() => showError("Copy failed – please copy manually."));
});

speakBtn.addEventListener("click", () => {
  if (!lastTranslation || !window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(lastTranslation);
  utt.lang = targetLang.value === "ja" ? "ja-JP" : targetLang.value;
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
});

swapBtn.addEventListener("click", () => {
  const tmp = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = tmp;
  const tmpTxt = sourceText.value;
  sourceText.value = lastTranslation;
  outputText.innerHTML = '<span class="placeholder">Translation will appear here…</span>';
  lastTranslation = "";
  updateCharCount();
  if (sourceText.value) doTranslate();
});
