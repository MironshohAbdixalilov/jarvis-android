const $ = s => document.querySelector(s);
const chat = $("#chat"), input = $("#input"), mic = $("#mic");
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const HISTORY_KEY = "jarvis_chat_history_v2";
const API_URL_KEY = "jarvis_api_url";
const ACCESS_KEY = "jarvis_access_code";
let recognition = null, listening = false, busy = false;
let history = [];

try {
  const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (Array.isArray(saved)) history = saved.filter(x =>
    x && ["user", "assistant"].includes(x.role) && typeof x.content === "string"
  ).slice(-30);
} catch (_) { history = []; }

function add(text, who = "bot", save = true) {
  const el = document.createElement("div");
  el.className = "msg " + who;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;

  if (save && (who === "user" || who === "bot")) {
    history.push({ role: who === "user" ? "user" : "assistant", content: text });
    history = history.slice(-30);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (_) {}
  }
}

function restoreHistory() {
  for (const item of history) add(item.content, item.role === "user" ? "user" : "bot", false);
}
restoreHistory();

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "uz-UZ";
    utterance.rate = 0.95;
    const voices = speechSynthesis.getVoices();
    const uzVoice = voices.find(v => /^uz([_-]|$)/i.test(v.lang));
    if (uzVoice) utterance.voice = uzVoice;
    speechSynthesis.speak(utterance);
  } catch (_) {}
}

function setStatus(text, liveText) {
  $("#status").textContent = text;
  if (liveText) $("#live").textContent = liveText;
}

function getLocalAnswer(command) {
  const q = command.toLowerCase().trim();
  if (/soat|vaqt/.test(q)) {
    return "Hozirgi vaqt: " + new Intl.DateTimeFormat("uz-UZ", {
      hour: "2-digit", minute: "2-digit"
    }).format(new Date());
  }
  if (/sana|bugun/.test(q)) {
    return "Bugungi sana: " + new Intl.DateTimeFormat("uz-UZ", {
      day: "numeric", month: "long", year: "numeric"
    }).format(new Date());
  }
  if (/youtube/.test(q)) {
    window.open("https://www.youtube.com", "_blank", "noopener");
    return "YouTube ochilmoqda.";
  }
  if (/google/.test(q)) {
    window.open("https://www.google.com", "_blank", "noopener");
    return "Google ochilmoqda.";
  }
  if (/salom|assal/.test(q)) return "Va alaykum assalom. Sizni tinglayapman.";
  if (/yordam|nima qila/.test(q)) {
    return "Vaqt va sanani aytaman, Google va YouTube'ni ochaman. AI server ulangach, boshqa savollarga ham javob bera olaman.";
  }
  return null;
}

function getConfig() {
  return {
    url: (localStorage.getItem(API_URL_KEY) || "").trim().replace(/\/+$/, ""),
    code: localStorage.getItem(ACCESS_KEY) || ""
  };
}

function openSettings() {
  const config = getConfig();
  $("#workerUrl").value = config.url;
  $("#accessCode").value = config.code;
  $("#settingsPanel").hidden = false;
  $("#settingsError").textContent = "";
  $("#workerUrl").focus();
}

function closeSettings() {
  $("#settingsPanel").hidden = true;
}

$("#settings").addEventListener("click", openSettings);
$("#cancelSettings").addEventListener("click", closeSettings);
$("#settingsForm").addEventListener("submit", event => {
  event.preventDefault();
  const url = $("#workerUrl").value.trim().replace(/\/+$/, "");
  const code = $("#accessCode").value.trim();

  if (!url || !/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(url)) {
    $("#settingsError").textContent = "Worker manzili https:// bilan boshlanishi kerak.";
    return;
  }
  if (!code) {
    $("#settingsError").textContent = "Maxfiy ulash kodini kiriting.";
    return;
  }

  localStorage.setItem(API_URL_KEY, url);
  localStorage.setItem(ACCESS_KEY, code);
  closeSettings();
  add("Sozlamalar saqlandi. Endi savol yozib AI ulanishini tekshiring.");
});

async function askAI() {
  const config = getConfig();
  if (!config.url || !config.code) {
    add("AI server hali sozlanmagan. «AI ulash» tugmasini bosing va Worker manzili hamda maxfiy kodni kiriting.");
    return;
  }

  setStatus("AI javob tayyorlayapti...", "● AI");
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + config.code
      },
      body: JSON.stringify({ messages: history.slice(-12) })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ("Server xatosi: " + response.status));
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Serverdan bo‘sh javob keldi.");
    }

    add(data.reply.trim());
    speak(data.reply.trim());
    setStatus("Tayyor.", "● AI READY");
  } catch (error) {
    add("AI ulanish xatosi: " + (error && error.message ? error.message : "Noma’lum xato"));
    setStatus("AI server bilan aloqa yo‘q.", "● ERROR");
  }
}

async function send(text) {
  const value = (text || "").trim();
  if (!value || busy) return;

  add(value, "user");
  input.value = "";

  const localAnswer = getLocalAnswer(value);
  if (localAnswer) {
    add(localAnswer);
    speak(localAnswer);
    return;
  }

  busy = true;
  input.disabled = true;
  const submit = $("#form button[type='submit']");
  if (submit) submit.disabled = true;
  await askAI();
  busy = false;
  input.disabled = false;
  if (submit) submit.disabled = false;
  input.focus();
}

$("#form").addEventListener("submit", event => {
  event.preventDefault();
  send(input.value);
});
document.querySelectorAll("[data-cmd]").forEach(button => {
  button.addEventListener("click", () => send(button.dataset.cmd));
});

if (Recognition) {
  recognition = new Recognition();
  recognition.lang = "uz-UZ";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    listening = true;
    mic.classList.add("listening");
    $("#status").textContent = "Tinglayapman...";
    $("#hint").textContent = "Gapiring...";
    $("#live").textContent = "● LISTENING";
  };
  recognition.onend = () => {
    listening = false;
    mic.classList.remove("listening");
    $("#status").textContent = "Tayyor.";
    $("#hint").textContent = "Mikrofon tugmasini bosing";
    $("#live").textContent = getConfig().url ? "● AI READY" : "● READY";
  };
  recognition.onerror = event => add("Mikrofon xatosi: " + event.error + ". Brauzer ruxsatini tekshiring.");
  recognition.onresult = event => send(event.results[0][0].transcript);
  mic.addEventListener("click", () => {
    if (listening) recognition.stop();
    else {
      try { recognition.start(); }
      catch (_) { add("Mikrofonni qayta ishga tushirib bo‘lmadi. Sahifani yangilang."); }
    }
  });
  $("#live").textContent = getConfig().url ? "● AI READY" : "● READY";
} else {
  $("#status").textContent = "Bu brauzer ovoz tanishni qo‘llamaydi. Chrome orqali oching.";
  $("#hint").textContent = "Matn orqali ishlatish mumkin";
  mic.addEventListener("click", () => add("Ovoz tanish bu brauzerda mavjud emas. Android Chrome orqali sinab ko‘ring."));
}
