const $ = s => document.querySelector(s);
const chat = $("#chat"), input = $("#input"), mic = $("#mic");
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, listening = false;

function add(text, who="bot"){
  const el=document.createElement("div"); el.className="msg "+who; el.textContent=text;
  chat.appendChild(el); chat.scrollTop=chat.scrollHeight;
}
function speak(text){
  if(!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang="uz-UZ"; u.rate=1;
  speechSynthesis.speak(u);
}
function reply(command){
  const q=command.toLowerCase().trim();
  let answer="";
  if(/soat|vaqt/.test(q)){
    answer="Hozirgi vaqt: "+new Intl.DateTimeFormat("uz-UZ",{hour:"2-digit",minute:"2-digit"}).format(new Date());
  } else if(/sana|bugun/.test(q)){
    answer="Bugungi sana: "+new Intl.DateTimeFormat("uz-UZ",{day:"numeric",month:"long",year:"numeric"}).format(new Date());
  } else if(/youtube/.test(q)){
    answer="YouTube ochilmoqda."; window.open("https://www.youtube.com","_blank");
  } else if(/google/.test(q)){
    answer="Google ochilmoqda."; window.open("https://www.google.com","_blank");
  } else if(/salom|assal/.test(q)){
    answer="Va alaykum assalom. Buyruqni kutyapman.";
  } else if(/yordam|nima qila/.test(q)){
    answer="Hozircha vaqt va sanani aytaman, Google yoki YouTube'ni ochaman, ovozli buyruqni qabul qilaman. Haqiqiy AI suhbat va kompyuterni boshqarish keyingi bosqichda ulanadi.";
  } else {
    answer="Buyruqni qabul qildim: "+command+". Hozircha internetdagi AI modeli ulanmagan, shuning uchun erkin savollarga aqlli javob bera olmayman.";
  }
  add(answer); speak(answer);
}
function send(text){
  const value=(text||"").trim(); if(!value)return;
  add(value,"user"); input.value=""; reply(value);
}
$("#form").addEventListener("submit",e=>{e.preventDefault();send(input.value)});
document.querySelectorAll("[data-cmd]").forEach(b=>b.addEventListener("click",()=>send(b.dataset.cmd)));

if(Recognition){
  recognition=new Recognition(); recognition.lang="uz-UZ"; recognition.interimResults=false; recognition.maxAlternatives=1;
  recognition.onstart=()=>{listening=true;mic.classList.add("listening");$("#status").textContent="Tinglayapman...";$("#hint").textContent="Gapiring...";$("#live").textContent="● LISTENING";};
  recognition.onend=()=>{listening=false;mic.classList.remove("listening");$("#status").textContent="Tayyor.";$("#hint").textContent="Mikrofon tugmasini bosing";$("#live").textContent="● READY";};
  recognition.onerror=e=>{add("Mikrofon xatosi: "+e.error+". Brauzer ruxsatini tekshiring.");};
  recognition.onresult=e=>send(e.results[0][0].transcript);
  mic.addEventListener("click",()=>{if(listening)recognition.stop();else{try{recognition.start()}catch(e){}}});
  $("#live").textContent="● READY";
}else{
  $("#status").textContent="Bu brauzer ovoz tanishni qo‘llamaydi. Chrome orqali oching.";
  $("#hint").textContent="Matn orqali ishlatish mumkin";
  mic.addEventListener("click",()=>add("Ovoz tanish bu brauzerda mavjud emas. Android Chrome orqali sinab ko‘ring."));
}
