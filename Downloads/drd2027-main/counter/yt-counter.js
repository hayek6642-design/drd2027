let watchTime=0;let timerInterval=null;window.__COUNTER_READY__=false;

// Per-user watch time storage key
function getWatchTimeKey(userId) {
  return userId ? `watchTime_${userId}` : 'watchTime';
}

function sanitizeWatchTime(v){const n=Number(v);return isNaN(n)||n<0?0:n}
window.formatTime=function(milliseconds){const totalSeconds=Math.floor(sanitizeWatchTime(milliseconds)/1000);const seconds=totalSeconds%60;const minutes=Math.floor(totalSeconds/60)%60;const hours=Math.floor(totalSeconds/3600)%24;const days=Math.floor(totalSeconds/(3600*24))%365;const years=Math.floor(totalSeconds/(3600*24*365));const s=String(seconds).padStart(2,'0');const m=String(minutes).padStart(2,'0');const h=String(hours).padStart(2,'0');const d=String(days).padStart(3,'0');const y=String(years).padStart(1,'0');return `${s}:${m}:${h}:${d}:${y}`}
function updateCounterDisplay(){const el=document.getElementById('counter');if(!el)return;const time=window.formatTime(sanitizeWatchTime(watchTime));const digits=time.split('').map(d=>`<span>${d}<span class="shine"></span></span>`).join('');el.innerHTML=digits}
let __lastPersist=0;function tickCounter(){watchTime=sanitizeWatchTime(watchTime+1000);const now=Date.now();if(now-__lastPersist>=5000){try{const userId=window.APP_AUTH?.user?.id||window.AuthCore?.state?.userId;const key=getWatchTimeKey(userId);localStorage.setItem(key,String(watchTime))}catch(_){ }__lastPersist=now}updateCounterDisplay()}
function startCounter(userId){if(timerInterval)return;const key=getWatchTimeKey(userId);try{const stored=parseInt(localStorage.getItem(key)||localStorage.getItem('watchTime')||'0')||0;watchTime=sanitizeWatchTime(stored)}catch(_){watchTime=0}updateCounterDisplay();timerInterval=setInterval(tickCounter,1000);window.__COUNTER_READY__=true}
function stopCounter(){if(timerInterval){clearInterval(timerInterval);timerInterval=null}}
function resetCounter(userId){watchTime=0;const key=getWatchTimeKey(userId);try{localStorage.setItem(key,'0');localStorage.removeItem('watchTime')}catch(_){}updateCounterDisplay()}

// Reset counter when user switches (call this from auth handler)
function resetCounterForNewUser(newUserId) {
  stopCounter();
  watchTime = 0;
  updateCounterDisplay();
  startCounter(newUserId);
}
window.startCounter=startCounter;window.stopCounter=stopCounter;window.resetCounter=resetCounter;window.resetCounterForNewUser=resetCounterForNewUser;window.updateCounterDisplay=updateCounterDisplay;

// Listen for auth changes and reset counter for new user
window.addEventListener('auth:ready', function(e) {
  if (e && e.detail && e.detail.userId) {
    console.log('[Counter] Auth ready, starting for user:', e.detail.userId);
    startCounter(e.detail.userId);
  }
});

// Listen for session switch
window.addEventListener('auth:session-switch', function(e) {
  if (e && e.detail && e.detail.newUserId) {
    console.log('[Counter] Session switch detected, resetting for:', e.detail.newUserId);
    resetCounterForNewUser(e.detail.newUserId);
  }
});

// Also check for userId changes periodically
let __lastUserId = null;
setInterval(() => {
  const currentUserId = window.APP_AUTH?.user?.id || window.AuthCore?.state?.userId;
  if (currentUserId && currentUserId !== __lastUserId) {
    console.log('[Counter] User ID changed:', __lastUserId, '->', currentUserId);
    __lastUserId = currentUserId;
    resetCounterForNewUser(currentUserId);
  }
}, 2000);

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>{updateCounterDisplay();startCounter()})}else{updateCounterDisplay();startCounter()}
