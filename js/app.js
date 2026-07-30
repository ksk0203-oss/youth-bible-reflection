/* ===================== 글씨 크기 조절 ===================== */
function setFontScale(scale) {
  document.documentElement.style.setProperty('--fs-scale', scale);
  document.querySelectorAll('.fs-btn').forEach(b=>b.classList.toggle('fs-active', parseFloat(b.dataset.scale)===scale));
  try { localStorage.setItem('fsScaleYouth', String(scale)); } catch(e) {}
}
(function initFontScale(){
  let s=null; try { s=localStorage.getItem('fsScaleYouth'); } catch(e) {}
  if (s) {
    document.documentElement.style.setProperty('--fs-scale', s);
    window.addEventListener('DOMContentLoaded', ()=>{
      document.querySelectorAll('.fs-btn').forEach(b=>b.classList.toggle('fs-active', parseFloat(b.dataset.scale)===parseFloat(s)));
    });
  }
})();

/* ===================== 맨 위로 버튼 ===================== */
function scrollToTop(){ window.scrollTo({top:0, behavior:'smooth'}); }
window.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btn.classList.add('is-visible');
    else btn.classList.remove('is-visible');
  });
});

/* ===================== TTS (음질 우선 고정) ===================== */
let currentPost = null;
let currentUtterance = null;
let currentRate = 1;
let isSpeaking = false;
let koVoiceCache = null;

function pickBestKoreanVoice() {
  if (koVoiceCache) return koVoiceCache;
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const ko = voices.filter(v => v.lang==='ko-KR'||v.lang==='ko_KR'||v.lang==='ko');
  if (!ko.length) return null;
  const ranked = ko.slice().sort((a,b)=>{
    const isHQ = v => /neural|premium|enhanced|natural|yuna|sora|online|google/i.test(v.name);
    const score = v => (isHQ(v)?3:0) + (!v.localService?2:0);
    return score(b)-score(a);
  });
  koVoiceCache = ranked[0];
  return koVoiceCache;
}
if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => { koVoiceCache = null; };

function getSpeechText(post) {
  const tmp = document.createElement('div');
  tmp.innerHTML = post.scripture.replace(/<span class="vnum">\d+<\/span>/g,' ');
  const s = tmp.textContent.replace(/\s+/g,' ').trim();
  return `${s}. 묵상. ${post.meditation} 적용. ${post.application} 기도. ${post.prayer}`;
}
function updateAudioUI() {
  const icon = document.getElementById('audio-play-icon');
  const status = document.getElementById('audio-status');
  if (!icon) return;
  if (isSpeaking) { icon.textContent='\u275A\u275A'; status.textContent='듣는 중 · '+currentRate+'x'; }
  else { icon.textContent='\u25B6'; status.textContent='듣기'; }
}
function speakFromStart() {
  if (!currentPost || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(getSpeechText(currentPost));
  utter.lang='ko-KR'; utter.rate=currentRate;
  const v = pickBestKoreanVoice(); if (v) utter.voice=v;
  utter.onend=()=>{isSpeaking=false;updateAudioUI();};
  utter.onerror=()=>{isSpeaking=false;updateAudioUI();};
  currentUtterance=utter;
  window.speechSynthesis.speak(utter);
  isSpeaking=true; updateAudioUI();
}
function togglePlay() {
  if (!window.speechSynthesis) { alert('이 브라우저는 음성 읽기를 지원하지 않습니다.'); return; }
  if (isSpeaking && window.speechSynthesis.speaking && !window.speechSynthesis.paused) { window.speechSynthesis.pause(); isSpeaking=false; updateAudioUI(); return; }
  if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); isSpeaking=true; updateAudioUI(); return; }
  speakFromStart();
}
function stopSpeech() { if (window.speechSynthesis) window.speechSynthesis.cancel(); isSpeaking=false; currentUtterance=null; }
function setRate(r) {
  currentRate=r;
  document.querySelectorAll('.speed-btn').forEach(b=>b.classList.toggle('is-active', parseFloat(b.dataset.rate)===r));
  if (isSpeaking || (window.speechSynthesis && window.speechSynthesis.speaking)) speakFromStart();
  updateAudioUI();
}

/* ===================== 공통 유틸 ===================== */
const WEEKDAY_LABELS = ['주일','월','화','수','목','금','토'];
function getWeekdayLabel(year, month, day) {
  const d = new Date(year, month - 1, day);
  return WEEKDAY_LABELS[d.getDay()];
}

async function loadPosts(dataUrl) {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error('posts.json 로드 실패');
  return await res.json();
}
