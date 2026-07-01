import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getDatabase, ref, onValue, set, remove } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js';

// Derive SCREEN_ID from URL path: /screens/lab-1-2/ → lab_1_2
const pathParts = window.location.pathname.split('/').filter(Boolean);
const SCREEN_ID = pathParts[pathParts.length - 1].replace(/-/g, '_');

const app = initializeApp({
  apiKey:            'AIzaSyDqZ50JZvva8IJ_OMrEWnY9qdCCTyrT4Oo',
  authDomain:        'screens-6e2be.firebaseapp.com',
  projectId:         'screens-6e2be',
  storageBucket:     'screens-6e2be.firebasestorage.app',
  messagingSenderId: '797589477913',
  appId:             '1:797589477913:web:9969b6514aaca29228e888',
  databaseURL:       'https://screens-6e2be-default-rtdb.europe-west1.firebasedatabase.app',
});

const db        = getDatabase(app);
const container = document.getElementById('container');

// ── Playlist state ──
let playlistItems = [], currentIdx = 0, itemTimer = null;

function clearItemTimer() {
  if (itemTimer) { clearTimeout(itemTimer); itemTimer = null; }
}

function playNext() {
  playItem((currentIdx + 1) % playlistItems.length);
}

function renderItem(item) {
  const old = [...container.children];
  const fadeOut = () => old.forEach(el => {
    el.style.transition = 'opacity 0.35s ease';
    el.style.opacity = '0';
    setTimeout(() => { if (el.parentNode) el.remove(); }, 370);
  });
  switch (item.type) {
    case 'video': {
      const v = document.createElement('video');
      v.src = item.url; v.muted = true; v.playsInline = true;
      Object.assign(v.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(v);
      v.addEventListener('ended', playNext);
      v.play().then(() => { v.style.opacity = '1'; fadeOut(); }).catch(() => { fadeOut(); v.style.opacity = '1'; });
      break;
    }
    case 'image': {
      const img = document.createElement('img');
      img.src = item.url; img.alt = '';
      Object.assign(img.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(img);
      requestAnimationFrame(() => requestAnimationFrame(() => { img.style.opacity = '1'; fadeOut(); }));
      itemTimer = setTimeout(playNext, (item.duration || 10) * 1000);
      break;
    }
    case 'youtube':
    case 'drive': {
      const f = document.createElement('iframe');
      f.src = item.embedUrl; f.allow = 'autoplay; fullscreen; encrypted-media'; f.allowFullscreen = true;
      Object.assign(f.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(f);
      f.onload = () => { f.style.opacity = '1'; fadeOut(); };
      itemTimer = setTimeout(playNext, (item.duration || 60) * 1000);
      break;
    }
    case 'pdf': {
      const f = document.createElement('iframe');
      f.src = item.url + '#toolbar=0&navpanes=0&scrollbar=0&view=Fit'; f.allow = 'fullscreen';
      Object.assign(f.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(f);
      f.onload = () => { f.style.opacity = '1'; fadeOut(); };
      itemTimer = setTimeout(playNext, (item.duration || 30) * 1000);
      break;
    }
    case 'webpage': {
      const f = document.createElement('iframe');
      f.src = item.url; f.allow = 'fullscreen; autoplay';
      f.setAttribute('scrolling', 'no');
      Object.assign(f.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(f);
      f.onload = () => { f.style.opacity = '1'; fadeOut(); };
      itemTimer = setTimeout(playNext, (item.duration || 30) * 1000);
      break;
    }
  }
}

function playItem(idx) {
  clearItemTimer();
  currentIdx = idx;
  const item = playlistItems[currentIdx];
  if (item) renderItem(item);
}

function render(content) {
  clearItemTimer();
  playlistItems = []; currentIdx = 0;
  container.innerHTML = '';
  if (!content || !content.type) return;

  if (content.type === 'playlist') {
    playlistItems = content.items || [];
    if (playlistItems.length) playItem(0);
    return;
  }

  const old = [...container.children];
  const fadeOut = () => old.forEach(el => {
    el.style.transition = 'opacity 0.35s ease';
    el.style.opacity = '0';
    setTimeout(() => { if (el.parentNode) el.remove(); }, 370);
  });
  switch (content.type) {
    case 'youtube':
    case 'drive': {
      const f = document.createElement('iframe');
      f.src = content.embedUrl; f.allow = 'autoplay; fullscreen; encrypted-media'; f.allowFullscreen = true;
      Object.assign(f.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(f);
      f.onload = () => { f.style.opacity = '1'; fadeOut(); };
      break;
    }
    case 'image': {
      const img = document.createElement('img');
      img.src = content.url; img.alt = '';
      Object.assign(img.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(img);
      requestAnimationFrame(() => requestAnimationFrame(() => { img.style.opacity = '1'; fadeOut(); }));
      break;
    }
    case 'video': {
      const v = document.createElement('video');
      v.src = content.url; v.muted = true; v.loop = true; v.playsInline = true;
      Object.assign(v.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(v);
      v.play().then(() => { v.style.opacity = '1'; fadeOut(); }).catch(() => { fadeOut(); v.style.opacity = '1'; });
      break;
    }
    case 'pdf': {
      const f = document.createElement('iframe');
      f.src = content.url + '#toolbar=0&navpanes=0&scrollbar=0&view=Fit'; f.allow = 'fullscreen';
      Object.assign(f.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(f);
      f.onload = () => { f.style.opacity = '1'; fadeOut(); };
      break;
    }
    case 'webpage': {
      const f = document.createElement('iframe');
      f.src = content.url; f.allow = 'fullscreen; autoplay';
      f.setAttribute('scrolling', 'no');
      Object.assign(f.style, { opacity: '0', transition: 'opacity 0.35s ease' });
      container.appendChild(f);
      f.onload = () => { f.style.opacity = '1'; fadeOut(); };
      break;
    }
  }
}

onValue(ref(db, `screens/${SCREEN_ID}/content`), snap => render(snap.val()));

// ── Schedule ──
let scheduledTimers = [], currentSchedule = null;

onValue(ref(db, `screens/${SCREEN_ID}/schedule`), snap => {
  currentSchedule = snap.val();
  applySchedule(currentSchedule);
});

function applySchedule(schedule) {
  scheduledTimers.forEach(t => clearTimeout(t));
  scheduledTimers = [];
  if (!schedule) return;
  const entries  = Array.isArray(schedule) ? schedule : Object.values(schedule);
  const now      = new Date();
  const nowMins  = now.getHours() * 60 + now.getMinutes();
  let activeEntry = null;
  entries.forEach(entry => {
    if (!entry?.from || !entry?.to || !entry?.content) return;
    const [fh, fm] = entry.from.split(':').map(Number);
    const [th, tm] = entry.to.split(':').map(Number);
    const fromMins = fh * 60 + fm;
    const toMins   = th * 60 + tm;
    const crosses  = fromMins > toMins;
    const inRange  = crosses ? (nowMins >= fromMins || nowMins < toMins) : (nowMins >= fromMins && nowMins < toMins);
    if (inRange) activeEntry = entry;
    const startDelay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), fh, fm, 0, 0) - now;
    if (startDelay > 0) {
      scheduledTimers.push(setTimeout(() => {
        set(ref(db, `screens/${SCREEN_ID}/content`), { ...entry.content, scheduledFrom: entry.from, scheduledTo: entry.to, updatedAt: Date.now() });
      }, startDelay));
    }
  });
  if (activeEntry) {
    set(ref(db, `screens/${SCREEN_ID}/content`), { ...activeEntry.content, scheduledFrom: activeEntry.from, scheduledTo: activeEntry.to, updatedAt: Date.now() });
  }
}

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
  setTimeout(() => { applySchedule(currentSchedule); scheduleMidnightReset(); }, midnight - now);
}
scheduleMidnightReset();

// ── Scheduled Broadcast ──
let sbStartTimer = null, sbEndTimer = null;
onValue(ref(db, `screens/${SCREEN_ID}/scheduled_broadcast`), snap => {
  if (sbStartTimer) { clearTimeout(sbStartTimer); sbStartTimer = null; }
  if (sbEndTimer)   { clearTimeout(sbEndTimer);   sbEndTimer   = null; }
  const sb = snap.val();
  if (!sb?.content) return;
  const now = Date.now();
  const activate = () => {
    set(ref(db, `screens/${SCREEN_ID}/content`), { ...sb.content, updatedAt: Date.now() });
    if (sb.endAt) {
      const endDelay = sb.endAt - Date.now();
      if (endDelay > 0) {
        sbEndTimer = setTimeout(() => {
          remove(ref(db, `screens/${SCREEN_ID}/scheduled_broadcast`));
          applySchedule(currentSchedule);
        }, endDelay);
      } else {
        remove(ref(db, `screens/${SCREEN_ID}/scheduled_broadcast`));
        applySchedule(currentSchedule);
      }
    }
  };
  const startDelay = sb.startAt - now;
  if (startDelay <= 0) {
    if (!sb.endAt || sb.endAt > now) activate();
    else remove(ref(db, `screens/${SCREEN_ID}/scheduled_broadcast`));
  } else {
    sbStartTimer = setTimeout(activate, startDelay);
  }
});
