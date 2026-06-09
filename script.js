// ── Vocabulary Data ──
const recognitionSamples = {
  drink:    { signOrder: ["我", "水", "喝", "要"], spokenText: "我要喝水",   confidence: "94%", history: "手語語序：我 / 水 / 喝 / 要 → 口語：我要喝水" },
  register: { signOrder: ["我", "掛號", "要"],     spokenText: "我要掛號",   confidence: "96%", history: "手語語序：我 / 掛號 / 要 → 口語：我要掛號" },
  help:     { signOrder: ["請", "我", "幫忙"],     spokenText: "請幫我一下", confidence: "91%", history: "手語語序：請 / 我 / 幫忙 → 口語：請幫我一下" },
};

const generationSamples = {
  "我要喝水":  ["我", "水", "喝", "要"],
  "請幫我一下": ["請", "我", "幫忙"],
  "我要掛號":  ["我", "掛號", "要"],
  "我想回家":  ["我", "家", "回", "想"],
  "你好":     ["你", "好"],
  "早安":     ["早", "安"],
  "晚安":     ["晚", "安"],
  "謝謝":     ["謝謝"],
  "對不起":   ["對不起"],
  "再見":     ["再", "見"],
  "請問":     ["請", "問"],
  "我不舒服":  ["我", "不舒服"],
  "我頭痛":   ["我", "頭", "痛"],
  "請叫醫生":  ["請", "叫", "醫生"],
  "請幫我":   ["請", "幫", "我"],
  "我要上課":  ["我", "上課", "要"],
  "我不懂":   ["我", "不", "懂"],
  "下課了":   ["下課", "了"],
  "我要去哪裡": ["我", "哪裡", "去", "要"],
  "請停車":   ["請", "停", "車"],
  "多少錢":   ["多少", "錢"],
  "謝謝司機":  ["謝謝", "司機"],
};

const vocabCategories = {
  greeting:  { label: "問候",  phrases: ["你好", "早安", "晚安", "謝謝", "對不起", "再見"] },
  medical:   { label: "醫療",  phrases: ["我不舒服", "我頭痛", "請叫醫生", "請幫我", "我要掛號", "我要喝水"] },
  school:    { label: "校園",  phrases: ["我要上課", "請問", "我不懂", "下課了", "我想回家", "謝謝"] },
  transport: { label: "交通",  phrases: ["我要去哪裡", "請停車", "多少錢", "謝謝司機", "請問", "再見"] },
};

// ── localStorage Keys ──
const STORAGE_GEN = "tsl_gen_history";
const STORAGE_REC = "tsl_rec_history";
const STORAGE_FAV = "tsl_favorites";
const MAX_HIST = 10;
const MAX_FAV  = 20;

// ── DOM refs ──
const previewVideo        = document.querySelector("#previewVideo");
const emptyPreview        = document.querySelector("#emptyPreview");
const videoUpload         = document.querySelector("#videoUpload");
const recognitionScenario = document.querySelector("#recognitionScenario");
const recognitionTokens   = document.querySelector("#recognitionTokens");
const spokenResult        = document.querySelector("#spokenResult");
const recognitionStatus   = document.querySelector("#recognitionStatus");
const cameraMessage       = document.querySelector("#cameraMessage");
const recognitionHistory  = document.querySelector("#recognitionHistory");
const generationHistory   = document.querySelector("#generationHistory");

function setRecStatus(text, state = "idle") {
  recognitionStatus.textContent = text;
  recognitionStatus.dataset.state = state;
}
const generationTokens    = document.querySelector("#generationTokens");
const textInput           = document.querySelector("#textInput");
const originalSentence    = document.querySelector("#originalSentence");
const generationStatus    = document.querySelector("#generationStatus");
const avatarStatus        = document.querySelector("#avatarStatus");
const activeToken         = document.querySelector("#activeToken");
const avatarFigure        = document.querySelector("#avatarFigure");
const videoModeButton     = document.querySelector("#videoModeButton");
const cameraModeButton    = document.querySelector("#cameraModeButton");
const catChips             = document.querySelector("#catChips");
const favBtn               = document.querySelector("#favBtn");
const favoritesList        = document.querySelector("#favoritesList");
const favAvatarFigure      = document.querySelector("#favAvatarFigure");
const favAvatarStatus      = document.querySelector("#favAvatarStatus");
const favSelectedSentence  = document.querySelector("#favSelectedSentence");
const favTokensEl          = document.querySelector("#favTokens");

const recognitionSteps = [
  document.querySelector("#recognitionStep1"),
  document.querySelector("#recognitionStep2"),
  document.querySelector("#recognitionStep3"),
];

let recognitionTimer = null;
let avatarTimer      = null;
let favAvatarTimer   = null;
let currentStream    = null;
let currentGeneratedTokens = generationSamples["我要喝水"];
let uploadedVideoUrl = null;
let playInterval     = 850;
let favPlayInterval  = 850;

// ── Tab Navigation ──
const pageSections = document.querySelectorAll(".page-section");
const navLinks     = document.querySelectorAll(".site-nav a");

function showPage(id) {
  pageSections.forEach(s => { s.hidden = s.id !== id; });
  navLinks.forEach(a => {
    const active = a.getAttribute("href").slice(1) === id;
    a.classList.toggle("is-active", active);
    a.setAttribute("aria-current", active ? "page" : "false");
  });
}

navLinks.forEach(a => {
  a.addEventListener("click", e => { e.preventDefault(); showPage(a.getAttribute("href").slice(1)); });
});

document.querySelectorAll(".home-ctas a").forEach(a => {
  a.addEventListener("click", e => { e.preventDefault(); showPage(a.getAttribute("href").slice(1)); });
});

// ── Keyboard Shortcuts ──
document.addEventListener("keydown", e => {
  if (e.target.matches("input, textarea, select")) return;
  const recPage = !document.querySelector("#recognition").hidden;
  const genPage = !document.querySelector("#generation").hidden;

  switch (e.key) {
    case "1": showPage("home");        break;
    case "2": showPage("recognition"); break;
    case "3": showPage("generation");  break;
    case "4": showPage("favorites");   break;
    case "5": showPage("history");     break;
    case "Enter":
      if (recPage) simulateRecognition();
      if (genPage) updateGeneration();
      break;
    case " ":
      if (genPage) {
        e.preventDefault();
        if (avatarFigure.classList.contains("is-signing")) {
          stopAvatarPlayback();
          avatarStatus.textContent = "已暫停";
        } else {
          playAvatarSequence();
        }
      }
      break;
    case "Escape":
      stopAvatarPlayback();
      break;
  }
});

// ── localStorage: History ──
function saveHistory(key, text) {
  try {
    let arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr = arr.filter(t => t !== text);
    arr.unshift(text);
    localStorage.setItem(key, JSON.stringify(arr.slice(0, MAX_HIST)));
  } catch (_) {}
}

function loadHistory() {
  try {
    const genArr = JSON.parse(localStorage.getItem(STORAGE_GEN) || "[]");
    const recArr = JSON.parse(localStorage.getItem(STORAGE_REC) || "[]");
    if (genArr.length) { generationHistory.innerHTML = ""; genArr.forEach(t => addLi(generationHistory, t)); }
    if (recArr.length) { recognitionHistory.innerHTML = ""; recArr.forEach(t => addLi(recognitionHistory, t)); }
  } catch (_) {}
}

// ── localStorage: Favorites ──
function getFavorites() {
  try { return JSON.parse(localStorage.getItem(STORAGE_FAV) || "[]"); } catch (_) { return []; }
}

function saveFavorites(arr) {
  try { localStorage.setItem(STORAGE_FAV, JSON.stringify(arr)); } catch (_) {}
}

function renderFavorites() {
  const arr = getFavorites();
  favoritesList.innerHTML = "";
  if (!arr.length) {
    addLi(favoritesList, "尚無收藏", "empty-item");
    return;
  }
  arr.forEach(text => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button class="fav-play" data-text="${escHtml(text)}" aria-label="播放 ${escHtml(text)} 的手語">
        <svg width="9" height="10" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><polygon points="0,0 10,6 0,12"/></svg>
      </button>
      <span class="fav-sentence" data-text="${escHtml(text)}">${escHtml(text)}</span>
      <button class="fav-del" data-text="${escHtml(text)}" aria-label="移除收藏">×</button>`;
    favoritesList.appendChild(li);
  });
}

function updateFavBtnState() {
  const sentence = textInput.value.trim();
  const isFav = getFavorites().includes(sentence);
  favBtn.textContent = isFav ? "★ 已收藏" : "☆ 收藏";
  favBtn.classList.toggle("is-favorited", isFav);
}

favBtn?.addEventListener("click", () => {
  const sentence = textInput.value.trim();
  if (!sentence) return;
  let arr = getFavorites();
  if (arr.includes(sentence)) {
    arr = arr.filter(t => t !== sentence);
  } else {
    arr.unshift(sentence);
    arr = arr.slice(0, MAX_FAV);
  }
  saveFavorites(arr);
  updateFavBtnState();
  renderFavorites();
});

favoritesList?.addEventListener("click", e => {
  // 移除收藏
  const delBtn = e.target.closest(".fav-del");
  if (delBtn) {
    const text = delBtn.dataset.text;
    saveFavorites(getFavorites().filter(t => t !== text));
    renderFavorites();
    updateFavBtnState();
    return;
  }

  // 播放手語：點播放鈕或句子文字 → 在收藏頁右側播放
  const playTrigger = e.target.closest(".fav-play") || e.target.closest(".fav-sentence");
  if (playTrigger) {
    const text = playTrigger.dataset.text;
    if (!text) return;
    const tokens = convertToSignOrder(text);
    favSelectedSentence.textContent = text;
    renderTokens(favTokensEl, tokens);
    setFavStatus("準備中", "idle");
    playFavAvatarSequence(tokens);
  }
});

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Category Vocabulary Tabs ──
function renderCatChips(cat) {
  catChips.innerHTML = "";
  (vocabCategories[cat]?.phrases || []).forEach(phrase => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn sample-text";
    btn.dataset.text = phrase;
    btn.textContent = phrase;
    btn.addEventListener("click", () => { textInput.value = phrase; updateGeneration(); });
    catChips.appendChild(btn);
  });
}

const catSelect = document.querySelector("#catSelect");
catSelect?.addEventListener("change", () => {
  renderCatChips(catSelect.value);
});

// ── Favorites Avatar ──
function setFavStatus(text, state = "idle") {
  if (!favAvatarStatus) return;
  favAvatarStatus.textContent = text;
  favAvatarStatus.dataset.state = state;
}

function stopFavAvatarPlayback() {
  clearInterval(favAvatarTimer);
  favAvatarFigure?.classList.remove("is-signing");
}

function playFavAvatarSequence(tokens) {
  if (!tokens.length) return;
  stopFavAvatarPlayback();
  favAvatarFigure.classList.add("is-signing");
  setFavStatus("播放中", "active");

  let index = 0;
  renderTokens(favTokensEl, tokens, index);

  favAvatarTimer = setInterval(() => {
    index += 1;
    if (index >= tokens.length) {
      stopFavAvatarPlayback();
      renderTokens(favTokensEl, tokens);
      setFavStatus("播放完成", "done");
      return;
    }
    renderTokens(favTokensEl, tokens, index);
  }, favPlayInterval);
}

document.querySelectorAll(".fav-speed-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".fav-speed-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    favPlayInterval = parseInt(btn.dataset.speed, 10);
  });
});

// ── Playback Speed ──
document.querySelectorAll(".speed-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    playInterval = parseInt(btn.dataset.speed, 10);
  });
});

// ── Helpers ──
function setPressed(button, pressed) {
  button.setAttribute("aria-pressed", String(pressed));
  button.classList.toggle("is-active", pressed);
}

function renderTokens(container, tokens, highlightedIndex = -1) {
  container.innerHTML = "";
  tokens.forEach((token, index) => {
    const span = document.createElement("span");
    span.className = "token";
    if (index === highlightedIndex) span.classList.add("is-highlighted");
    span.style.animationDelay = `${index * 55}ms`;
    span.textContent = token;
    container.appendChild(span);
  });
}

function addLi(list, text, cls = "") {
  const li = document.createElement("li");
  if (cls) li.className = cls;
  li.textContent = text;
  list.appendChild(li);
}

function resetRecognitionSteps() {
  recognitionSteps.forEach(s => s.classList.remove("is-active", "is-complete"));
}

function addHistoryItem(listEl, text) {
  const empty = listEl.querySelector(".empty-item, li");
  if (empty && (empty.classList.contains("empty-item") || empty.textContent.includes("尚無"))) listEl.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = text;
  listEl.prepend(li);
}

function stopCameraStream() {
  if (currentStream) { currentStream.getTracks().forEach(t => t.stop()); currentStream = null; }
}

function clearUploadedVideo() {
  if (uploadedVideoUrl) { URL.revokeObjectURL(uploadedVideoUrl); uploadedVideoUrl = null; }
}

function showPreview(hasPreview) {
  previewVideo.hidden = !hasPreview;
  emptyPreview.hidden = hasPreview;
}

// ── Camera ──
async function openCameraPreview() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraMessage.textContent = "目前瀏覽器不支援攝影機，請改用影片上傳。";
    return;
  }
  try {
    stopCameraStream();
    clearUploadedVideo();
    previewVideo.removeAttribute("src");
    currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    previewVideo.srcObject = currentStream;
    previewVideo.play();
    showPreview(true);
    cameraMessage.textContent = "攝影機已開啟，請讓雙手完整出現在畫面中。";
    setPressed(videoModeButton, false);
    setPressed(cameraModeButton, true);
  } catch {
    cameraMessage.textContent = "無法開啟攝影機，請確認權限或改用影片上傳。";
  }
}

function useUploadMode() {
  stopCameraStream();
  previewVideo.srcObject = null;
  showPreview(Boolean(previewVideo.getAttribute("src")));
  setPressed(videoModeButton, true);
  setPressed(cameraModeButton, false);
  cameraMessage.textContent = "請上傳手語影片，系統會先保留手語語序。";
}

// ── Recognition ──
function simulateRecognition() {
  const sample = recognitionSamples[recognitionScenario.value];
  clearTimeout(recognitionTimer);
  resetRecognitionSteps();
  renderTokens(recognitionTokens, []);
  spokenResult.textContent = "辨識中，請稍候…";
  setRecStatus("分析中", "active");
  recognitionSteps[0].classList.add("is-active");

  recognitionTimer = setTimeout(() => {
    recognitionSteps[0].classList.replace("is-active", "is-complete");
    recognitionSteps[1].classList.add("is-active");
    setRecStatus("語序辨識", "active");
    renderTokens(recognitionTokens, sample.signOrder);

    recognitionTimer = setTimeout(() => {
      recognitionSteps[1].classList.replace("is-active", "is-complete");
      recognitionSteps[2].classList.add("is-active");
      setRecStatus("口語轉換", "active");

      recognitionTimer = setTimeout(() => {
        recognitionSteps[2].classList.replace("is-active", "is-complete");
        spokenResult.textContent = sample.spokenText;
        setRecStatus("辨識完成", "done");
        cameraMessage.textContent = "已保留原始手語語序，並整理成口語句子。";
        saveHistory(STORAGE_REC, sample.history);
        addHistoryItem(recognitionHistory, sample.history);
      }, 700);
    }, 800);
  }, 700);
}

// ── Generation ──
function fallbackGeneration(sentence) {
  const cleaned = sentence.replace(/[，。！？\s]/g, "");
  if (!cleaned) return [];
  if (cleaned.includes("我要")) return ["我", cleaned.replace("我要", ""), "要"].filter(Boolean);
  return cleaned.split("").slice(0, 6);
}

function convertToSignOrder(sentence) {
  return generationSamples[sentence.trim()] || fallbackGeneration(sentence.trim());
}

function updateGeneration() {
  const sentence = textInput.value.trim();
  if (!sentence) {
    generationStatus.textContent = "請先輸入一句口語，例如：你好";
    originalSentence.textContent = "尚未輸入內容";
    renderTokens(generationTokens, []);
    currentGeneratedTokens = [];
    updateFavBtnState();
    return;
  }
  currentGeneratedTokens = convertToSignOrder(sentence);
  originalSentence.textContent = sentence;
  renderTokens(generationTokens, currentGeneratedTokens);
  avatarStatus.textContent = "已完成語序轉換";
  activeToken.textContent = currentGeneratedTokens[0] || "--";
  generationStatus.textContent = "已轉成台灣手語語序，現在可以播放虛擬人。";
  const histText = `原句：${sentence} → 手語語序：${currentGeneratedTokens.join(" / ")}`;
  saveHistory(STORAGE_GEN, histText);
  addHistoryItem(generationHistory, histText);
  updateFavBtnState();
}

function stopAvatarPlayback() {
  clearInterval(avatarTimer);
  avatarFigure.classList.remove("is-signing");
}

function playAvatarSequence() {
  if (!currentGeneratedTokens.length) {
    generationStatus.textContent = "請先完成手語語序轉換，再播放虛擬人。";
    return;
  }
  stopAvatarPlayback();
  avatarFigure.classList.add("is-signing");
  avatarStatus.textContent = "播放中";

  let index = 0;
  renderTokens(generationTokens, currentGeneratedTokens, index);
  activeToken.textContent = currentGeneratedTokens[index];

  avatarTimer = setInterval(() => {
    index += 1;
    if (index >= currentGeneratedTokens.length) {
      stopAvatarPlayback();
      renderTokens(generationTokens, currentGeneratedTokens);
      avatarStatus.textContent = "播放完成";
      activeToken.textContent = "--";
      return;
    }
    renderTokens(generationTokens, currentGeneratedTokens, index);
    activeToken.textContent = currentGeneratedTokens[index];
  }, playInterval);
}

// ── Event Listeners ──
document.querySelector("#toggleFontSize").addEventListener("click", e => {
  const next = !document.body.classList.contains("is-large-text");
  document.body.classList.toggle("is-large-text", next);
  e.currentTarget.setAttribute("aria-pressed", String(next));
});

videoUpload.addEventListener("change", e => {
  const [file] = e.currentTarget.files;
  stopCameraStream(); clearUploadedVideo();
  if (!file) { previewVideo.removeAttribute("src"); showPreview(false); return; }
  previewVideo.srcObject = null;
  uploadedVideoUrl = URL.createObjectURL(file);
  previewVideo.src = uploadedVideoUrl;
  showPreview(true);
  cameraMessage.textContent = `已載入影片：${file.name}`;
  setPressed(videoModeButton, true);
  setPressed(cameraModeButton, false);
});

document.querySelector("#openCamera").addEventListener("click", openCameraPreview);
videoModeButton.addEventListener("click", useUploadMode);
cameraModeButton.addEventListener("click", openCameraPreview);
document.querySelector("#startRecognition").addEventListener("click", simulateRecognition);

document.querySelector("#resetRecognition").addEventListener("click", () => {
  clearTimeout(recognitionTimer);
  resetRecognitionSteps();
  renderTokens(recognitionTokens, []);
  spokenResult.textContent = "尚未辨識";
  setRecStatus("等待輸入", "idle");
  cameraMessage.textContent = "系統先顯示手語語序，再整理成口語。";
});

document.querySelectorAll(".sample-text").forEach(btn => {
  btn.addEventListener("click", () => { textInput.value = btn.dataset.text; updateGeneration(); });
});

document.querySelector("#generateSign").addEventListener("click", updateGeneration);
document.querySelector("#playAvatar").addEventListener("click", playAvatarSequence);

document.querySelector("#clearText").addEventListener("click", () => {
  stopAvatarPlayback();
  textInput.value = "";
  originalSentence.textContent = "尚未輸入內容";
  renderTokens(generationTokens, []);
  generationStatus.textContent = "內容已清除，請重新輸入一句口語。";
  avatarStatus.textContent = "尚未播放";
  activeToken.textContent = "--";
  currentGeneratedTokens = [];
  updateFavBtnState();
});

textInput.addEventListener("input", updateFavBtnState);

window.addEventListener("beforeunload", () => {
  stopCameraStream();
  stopAvatarPlayback();
  stopFavAvatarPlayback();
  clearUploadedVideo();
});

// ── Init ──
showPage("home");
loadHistory();
renderFavorites();
renderCatChips(catSelect?.value || "greeting");
renderTokens(generationTokens, currentGeneratedTokens);
showPreview(false);
updateFavBtnState();
