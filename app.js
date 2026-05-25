import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getDatabase, ref, onValue, set, remove }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js';
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL, deleteObject }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js';

/* ─── Firebase ─── */
const firebaseConfig = {
  apiKey:            'AIzaSyDqZ50JZvva8IJ_OMrEWnY9qdCCTyrT4Oo',
  authDomain:        'screens-6e2be.firebaseapp.com',
  projectId:         'screens-6e2be',
  storageBucket:     'screens-6e2be.firebasestorage.app',
  messagingSenderId: '797589477913',
  appId:             '1:797589477913:web:9969b6514aaca29228e888',
  databaseURL:       'https://screens-6e2be-default-rtdb.europe-west1.firebasedatabase.app',
};
const app     = initializeApp(firebaseConfig);
const db      = getDatabase(app);
const storage = getStorage(app);

/* ─── Screen definitions ─── */
const SCREENS = [
  { id: 'outside_building',  name: 'מסך מחוץ למבנה הענק', icon: '🏢', width: 288,  height: 432,  img: 'imgs/gadder.jpeg'   },
  { id: 'technoda_entrance', name: 'מסך בכניסה לטכנודע',  icon: '🚪', width: 319,  height: 636,  img: 'imgs/outside.jpeg'  },
  { id: 'lobby',             name: 'מסך המבואה',           icon: '🏛️', width: 1920, height: 1080, img: 'imgs/mevoa.jpeg'    },
  { id: 'reception',         name: 'מסך מעל למשרד קבלה', icon: '📋', width: 1920, height: 1080, img: 'imgs/reception.jpeg' },
];

/* ─── State ─── */
let selectedScreenId = null;
let screensData      = {};
let selectedFile     = null;
let currentParsedUrl = null;
let libraryData      = {};
let libPendingFile   = null;
let selectedLibItems = [];   // ordered array of lib IDs for multi-select
let scheduleEntries  = [];   // { time, content, label } working copy for current screen

/* ─── DOM refs — layout ─── */
const screensNav     = document.getElementById('screens-nav');
const welcome        = document.getElementById('welcome');
const detail         = document.getElementById('screen-detail');
const libraryNavItem = document.getElementById('library-nav');
const libraryPage    = document.getElementById('library-page');

/* ─── DOM refs — screen detail ─── */
const detailName       = document.getElementById('detail-name');
const detailDims       = document.getElementById('detail-dims');
const detailOrient     = document.getElementById('detail-orient');
const detailUpdated    = document.getElementById('detail-updated');
const currentPreview   = document.getElementById('current-preview');
const currentTypeBadge    = document.getElementById('current-type-badge');
const currentUrl          = document.getElementById('current-url');
const currentSchedBadge   = document.getElementById('current-schedule-badge');
const currentSchedSummary = document.getElementById('current-schedule-summary');
const timeline24h         = document.getElementById('timeline-24h');
const SCHED_COLORS        = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6'];
const connectionDot    = document.querySelector('.dot');
const connectionText   = document.getElementById('connection-text');
const toast            = document.getElementById('toast');

/* ─── DOM refs — upload tab ─── */
const dropZone           = document.getElementById('drop-zone');
const fileInput          = document.getElementById('file-input');
const uploadPreview      = document.getElementById('upload-preview');
const previewMediaCont   = document.getElementById('preview-media-container');
const previewFilename    = document.getElementById('preview-filename');
const previewFilesize    = document.getElementById('preview-filesize');
const uploadDescription  = document.getElementById('upload-description');
const btnClearFile       = document.getElementById('btn-clear-file');
const uploadProgressWrap = document.getElementById('upload-progress');
const progressFill       = document.getElementById('progress-fill');
const progressText       = document.getElementById('progress-text');

/* ─── DOM refs — URL tab ─── */
const urlInput         = document.getElementById('url-input');
const urlTypeIndicator = document.getElementById('url-type-indicator');
const urlPreviewWrap   = document.getElementById('url-preview');
const urlPreviewIframe = document.getElementById('url-preview-iframe');
const urlError         = document.getElementById('url-error');
const urlDescWrap      = document.getElementById('url-desc-wrap');
const urlDescription   = document.getElementById('url-description');

/* ─── DOM refs — screen library tab ─── */
const screenLibEmpty  = document.getElementById('screen-lib-empty');
const screenLibGrid   = document.getElementById('screen-lib-grid');
const libSelCount     = document.getElementById('lib-sel-count');
const libSelClear     = document.getElementById('lib-sel-clear');
const screenLibDurRow = document.getElementById('screen-lib-dur-row');
const screenLibDur    = document.getElementById('screen-lib-dur');

/* ─── DOM refs — schedule ─── */
const scheduleToggle    = document.getElementById('schedule-toggle');
const scheduleBuilder   = document.getElementById('schedule-builder');
const scheduleListEl    = document.getElementById('schedule-list');
const scheduleFromInput = document.getElementById('schedule-from-input');
const scheduleToInput   = document.getElementById('schedule-to-input');
const scheduleSelPrev   = document.getElementById('schedule-sel-preview');
const btnAddEntry       = document.getElementById('btn-add-schedule-entry');
const btnSaveSchedule   = document.getElementById('btn-save-schedule');

/* ─── DOM refs — publish ─── */
const btnPublish  = document.getElementById('btn-publish');
const publishText = document.getElementById('publish-text');
const publishIcon = document.getElementById('publish-icon');

/* ─── DOM refs — library management page ─── */
const libCountBadge    = document.getElementById('lib-count-badge');
const libCountNav      = document.getElementById('library-count');
const libDropZone      = document.getElementById('lib-drop-zone');
const libFileInput     = document.getElementById('lib-file-input');
const libUploadPreview = document.getElementById('lib-upload-preview');
const libPreviewMedia  = document.getElementById('lib-preview-media');
const libPreviewFname  = document.getElementById('lib-preview-filename');
const libPreviewFsize  = document.getElementById('lib-preview-filesize');
const libDescription   = document.getElementById('lib-description');
const libBtnClear      = document.getElementById('lib-btn-clear');
const libProgressWrap  = document.getElementById('lib-progress-wrap');
const libProgressFill  = document.getElementById('lib-progress-fill');
const libProgressText  = document.getElementById('lib-progress-text');
const libBtnUpload     = document.getElementById('lib-btn-upload');
const libBtnUploadText = document.getElementById('lib-btn-upload-text');
const libPageEmpty     = document.getElementById('lib-page-empty');
const libGrid          = document.getElementById('lib-grid');

/* ═══════════════════════════════════════════
   URL Parsing
═══════════════════════════════════════════ */
const YT_RX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/;

function parseURL(url) {
  url = url.trim();

  const ytM = url.match(YT_RX);
  if (ytM) {
    const id = ytM[1];
    return {
      type: 'youtube', label: 'YouTube', url,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0`,
    };
  }

  const drM = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
              url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (drM) {
    const id = drM[1];
    return {
      type: 'drive', label: 'Google Drive', url,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    };
  }

  if (/^https?:\/\/.+/.test(url)) {
    return { type: 'webpage', label: 'אתר אינטרנט', url, embedUrl: url };
  }

  return null;
}

/* ═══════════════════════════════════════════
   Firebase listeners
═══════════════════════════════════════════ */
onValue(ref(db, 'screens'), (snap) => {
  screensData = snap.val() || {};
  renderNav();
  if (selectedScreenId) renderDetail(selectedScreenId);
}, () => setConnection(false));

onValue(ref(db, '.info/connected'), (snap) => setConnection(snap.val() === true));

onValue(ref(db, 'library'), (snap) => {
  libraryData = snap.val() || {};
  updateLibCounts();
  if (!libraryPage.classList.contains('hidden')) renderLibGrid();
  renderScreenLibGrid();
});

function setConnection(ok) {
  connectionDot.className    = 'dot ' + (ok ? 'connected' : 'error');
  connectionText.textContent = ok ? 'מחובר' : 'לא מחובר';
}

/* ═══════════════════════════════════════════
   Render sidebar nav
═══════════════════════════════════════════ */
function renderNav() {
  screensNav.innerHTML = '';
  SCREENS.forEach(screen => {
    const content   = screensData[screen.id]?.content;
    const typeLabel = content?.type ? contentTypeLabel(content.type) : 'ריק';
    const item      = document.createElement('div');
    item.className  = 'screen-nav-item' + (selectedScreenId === screen.id ? ' active' : '');
    item.innerHTML  = `
      <div class="nav-thumb">
        <img src="${screen.img}" alt="${screen.name}" onerror="this.parentElement.innerHTML='${screen.icon}'">
      </div>
      <div>
        <div class="nav-name">${screen.name}</div>
        <div class="nav-dims">${screen.width}×${screen.height}</div>
        <div class="nav-type ${content ? '' : 'no-content'}">${typeLabel}</div>
      </div>`;
    item.addEventListener('click', () => selectScreen(screen.id));
    screensNav.appendChild(item);
  });
}

/* ═══════════════════════════════════════════
   Navigation
═══════════════════════════════════════════ */
function selectScreen(id) {
  selectedScreenId = id;
  libraryNavItem.classList.remove('active');
  welcome.classList.add('hidden');
  libraryPage.classList.add('hidden');
  detail.classList.remove('hidden');
  resetInputs();
  renderNav();
  renderDetail(id);
}

libraryNavItem.addEventListener('click', showLibraryPage);

function showLibraryPage() {
  selectedScreenId = null;
  welcome.classList.add('hidden');
  detail.classList.add('hidden');
  libraryPage.classList.remove('hidden');
  document.querySelectorAll('.screen-nav-item').forEach(el => el.classList.remove('active'));
  libraryNavItem.classList.add('active');
  renderLibGrid();
}

/* ═══════════════════════════════════════════
   Screen detail rendering
═══════════════════════════════════════════ */
function renderDetail(id) {
  const screen  = SCREENS.find(s => s.id === id);
  const content = screensData[id]?.content;
  const orient  = screen.width > screen.height ? 'לרוחב' : 'לאורך';

  detailName.textContent   = screen.name;
  detailDims.textContent   = `${screen.width}×${screen.height}px`;
  detailOrient.textContent = orient;

  const locationWrap = document.getElementById('location-wrap');
  const locationImg  = document.getElementById('location-img');
  if (screen.img) {
    locationImg.src = screen.img;
    locationWrap.classList.remove('hidden');
  } else {
    locationWrap.classList.add('hidden');
  }

  const ratio = screen.width / screen.height;
  const maxW = 260, maxH = 180;
  let pw, ph;
  if (ratio <= 1) { ph = maxH; pw = Math.round(maxH * ratio); }
  else            { pw = maxW; ph = Math.round(maxW / ratio); }
  currentPreview.style.width  = pw + 'px';
  currentPreview.style.height = ph + 'px';

  if (content?.updatedAt) {
    const d = new Date(content.updatedAt);
    detailUpdated.textContent = `עודכן: ${d.toLocaleString('he-IL')}`;
    detailUpdated.classList.remove('hidden');
  } else {
    detailUpdated.textContent = '';
  }

  if (content?.type) {
    if (content.type === 'playlist') {
      const count = (content.items || []).length;
      currentTypeBadge.textContent = `📋 פלייליסט · ${count} פריטים`;
      currentTypeBadge.className   = 'current-type-badge';
      currentUrl.textContent       = (content.items || []).map(i => i.filename || contentTypeLabel(i.type)).join(' ← ');
    } else {
      currentTypeBadge.textContent = contentTypeLabel(content.type);
      currentTypeBadge.className   = 'current-type-badge';
      currentUrl.textContent       = content.filename || content.url || content.embedUrl || '—';
    }
    if (content.scheduledFrom && content.scheduledTo) {
      currentSchedBadge.textContent = `📅 תזמון: ${content.scheduledFrom}–${content.scheduledTo}`;
      currentSchedBadge.classList.remove('hidden');
    } else {
      currentSchedBadge.classList.add('hidden');
    }
    renderCurrentPreview(content);
  } else {
    currentTypeBadge.textContent = 'אין תוכן';
    currentTypeBadge.className   = 'current-type-badge empty';
    currentUrl.textContent       = '—';
    currentSchedBadge.classList.add('hidden');
    currentPreview.innerHTML     = `<span class="no-content-icon">⬛</span>`;
  }

  // Load schedule FIRST, then render everything
  scheduleEntries = [];
  const rawSchedule = screensData[id]?.schedule;
  if (rawSchedule) {
    const arr = Array.isArray(rawSchedule) ? rawSchedule : Object.values(rawSchedule);
    scheduleEntries = arr
      .filter(e => e?.from && e?.to && e?.content)
      .map(e => ({ from: e.from, to: e.to, content: e.content, label: e.label || contentLabelFromContent(e.content) }));
    scheduleEntries.sort((a, b) => a.from.localeCompare(b.from));
  }
  renderScheduleList();
  renderScheduleSummary(id);
  renderTimeline(id);
}

function renderCurrentPreview(content) {
  let html = '';
  switch (content.type) {
    case 'youtube': case 'drive':
      html = `<iframe src="${content.embedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`; break;
    case 'image':
      html = `<img src="${content.url}" alt="preview">`; break;
    case 'video':
      html = `<video src="${content.url}" muted autoplay loop playsinline></video>`; break;
    case 'pdf':
      html = `<iframe src="${content.url}#toolbar=0&navpanes=0" frameborder="0" style="width:100%;height:100%;"></iframe>`; break;
    case 'webpage':
      html = `<iframe src="${content.url}" frameborder="0" style="width:100%;height:100%;"></iframe>`; break;
    case 'playlist': {
      const count = (content.items || []).length;
      html = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:4px;">
        <div style="font-size:22px;">📋</div>
        <div style="font-size:11px;font-weight:700;color:var(--text);">${count} פריטים</div>
      </div>`; break;
    }
    default: html = `<span class="no-content-icon">⬛</span>`;
  }
  currentPreview.innerHTML = html;
  const vid = currentPreview.querySelector('video');
  if (vid) vid.play().catch(() => {});
}

function contentTypeLabel(type) {
  return { youtube: 'YouTube', drive: 'Google Drive', image: 'תמונה', video: 'סרטון', pdf: 'PDF', webpage: 'אתר', playlist: 'פלייליסט' }[type] || type;
}

/* ═══════════════════════════════════════════
   Main Tabs
═══════════════════════════════════════════ */
document.querySelectorAll('.main-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.main-tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
    if (tab.dataset.tab === 'library') renderScreenLibGrid();
    updatePublishButton();
  });
});

/* ═══════════════════════════════════════════
   Publish button — dynamic state
═══════════════════════════════════════════ */
function updatePublishButton() {
  const tab = document.querySelector('.main-tabs .tab.active')?.dataset.tab;
  if (!tab) return;

  if (tab === 'upload') {
    publishIcon.textContent = '📚';
    publishText.textContent = 'שמור בספרייה';
    btnPublish.disabled = !(selectedFile && uploadDescription.value.trim());
  } else if (tab === 'url') {
    publishIcon.textContent = '📚';
    publishText.textContent = 'שמור בספרייה';
    btnPublish.disabled = !(currentParsedUrl && urlDescription.value.trim());
  } else if (tab === 'library') {
    publishIcon.textContent = '📡';
    const n = selectedLibItems.length;
    if (n === 0) {
      publishText.textContent = 'שדר למסך';
      btnPublish.disabled = true;
    } else if (n === 1) {
      publishText.textContent = 'שדר למסך';
      btnPublish.disabled = false;
    } else {
      publishText.textContent = `שדר פלייליסט (${n} פריטים)`;
      btnPublish.disabled = false;
    }
  }
}

/* ═══════════════════════════════════════════
   Publish dispatcher
═══════════════════════════════════════════ */
btnPublish.addEventListener('click', async () => {
  if (!selectedScreenId) return;
  const activeTab = document.querySelector('.main-tabs .tab.active')?.dataset.tab;

  if (activeTab === 'upload')  await saveUploadToLibrary();
  else if (activeTab === 'url') await saveUrlToLibrary();
  else if (activeTab === 'library') {
    if (selectedLibItems.length === 1)      await broadcastSingle(selectedLibItems[0]);
    else if (selectedLibItems.length > 1)   await broadcastPlaylist(selectedLibItems);
  }
});

/* ═══════════════════════════════════════════
   Upload tab — file selection
═══════════════════════════════════════════ */
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFileSelect(fileInput.files[0]); });
btnClearFile.addEventListener('click', clearFileSelection);
uploadDescription.addEventListener('input', updatePublishButton);

function handleFileSelect(file) {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  const isPdf   = file.type === 'application/pdf';
  if (!isVideo && !isImage && !isPdf) { showToast('סוג קובץ לא נתמך', 'error'); return; }

  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewFilename.textContent = file.name;
  previewFilesize.textContent = formatBytes(file.size);

  dropZone.classList.add('hidden');
  uploadPreview.classList.remove('hidden');
  uploadProgressWrap.classList.add('hidden');

  if (isVideo) {
    previewMediaCont.innerHTML = '';
    const prevVid = document.createElement('video');
    prevVid.src = url;
    prevVid.muted = true;
    prevVid.loop = true;
    prevVid.playsInline = true;
    previewMediaCont.appendChild(prevVid);
    requestAnimationFrame(() => prevVid.play().catch(() => {}));
  } else if (isPdf) {
    previewMediaCont.innerHTML = `<iframe src="${url}#toolbar=0&navpanes=0" style="width:100%;height:100%;border:none;"></iframe>`;
  } else {
    previewMediaCont.innerHTML = `<img src="${url}" alt="preview">`;
  }

  uploadDescription.value = '';
  uploadDescription.focus();
  updatePublishButton();
}

function clearFileSelection() {
  selectedFile = null;
  fileInput.value = '';
  uploadDescription.value = '';
  dropZone.classList.remove('hidden');
  uploadPreview.classList.add('hidden');
  uploadProgressWrap.classList.add('hidden');
  progressFill.style.width = '0%';
  updatePublishButton();
}

/* ═══════════════════════════════════════════
   Upload tab — save to library
═══════════════════════════════════════════ */
async function saveUploadToLibrary() {
  if (!selectedFile || !uploadDescription.value.trim()) return;

  const file     = selectedFile;
  const desc     = uploadDescription.value.trim();
  const isVideo  = file.type.startsWith('video/');
  const isImage  = file.type.startsWith('image/');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `library/${Date.now()}_${safeName}`;

  btnPublish.disabled = true;
  publishIcon.textContent = '⏳';
  publishText.textContent = 'מעלה...';
  btnPublish.classList.add('loading');
  uploadProgressWrap.classList.remove('hidden');

  try {
    const task = uploadBytesResumable(sRef(storage, storagePath), file);

    const downloadURL = await new Promise((resolve, reject) => {
      task.on('state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          progressFill.style.width = pct + '%';
          progressText.textContent = pct + '%';
        },
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });

    const itemId = `lib_${Date.now()}`;
    await set(ref(db, `library/${itemId}`), {
      type:        isVideo ? 'video' : isImage ? 'image' : 'pdf',
      url:         downloadURL,
      storagePath,
      filename:    file.name,
      description: desc,
      size:        file.size,
      screenId:    selectedScreenId,
      createdAt:   Date.now(),
    });

    publishIcon.textContent = '✅';
    publishText.textContent = 'נשמר בספרייה!';
    btnPublish.classList.add('success');
    showToast('הקובץ נשמר בספרייה ✓', 'success');

    setTimeout(() => {
      btnPublish.classList.remove('success', 'loading');
      clearFileSelection();
    }, 2500);

  } catch (err) {
    console.error(err);
    publishIcon.textContent = '❌';
    publishText.textContent = 'שגיאה';
    showToast('שגיאה בהעלאה: ' + err.message, 'error');
    setTimeout(() => {
      btnPublish.classList.remove('loading');
      updatePublishButton();
    }, 2000);
  }
}

/* ═══════════════════════════════════════════
   URL tab — input handling
═══════════════════════════════════════════ */
urlInput.addEventListener('input', () => {
  urlError.classList.add('hidden');
  urlPreviewWrap.classList.add('hidden');
  urlDescWrap.classList.add('hidden');
  currentParsedUrl = null;

  if (!urlInput.value.trim()) { urlTypeIndicator.textContent = ''; updatePublishButton(); return; }

  const parsed = parseURL(urlInput.value);
  if (parsed) {
    urlTypeIndicator.textContent = '✓ ' + parsed.label;
    urlPreviewIframe.src         = parsed.embedUrl;
    urlPreviewWrap.classList.remove('hidden');
    urlDescWrap.classList.remove('hidden');
    currentParsedUrl = parsed;
  } else {
    urlTypeIndicator.textContent = '';
    urlError.classList.remove('hidden');
  }
  updatePublishButton();
});

urlDescription.addEventListener('input', updatePublishButton);

/* ═══════════════════════════════════════════
   URL tab — save to library
═══════════════════════════════════════════ */
async function saveUrlToLibrary() {
  if (!currentParsedUrl || !urlDescription.value.trim()) return;

  const parsed = currentParsedUrl;
  const desc   = urlDescription.value.trim();

  btnPublish.disabled = true;
  publishIcon.textContent = '⏳';
  publishText.textContent = 'שומר...';
  btnPublish.classList.add('loading');

  try {
    const itemId = `lib_${Date.now()}`;
    await set(ref(db, `library/${itemId}`), {
      type:        parsed.type,
      url:         parsed.url,
      embedUrl:    parsed.embedUrl,
      description: desc,
      size:        0,
      screenId:    selectedScreenId,
      createdAt:   Date.now(),
    });

    publishIcon.textContent = '✅';
    publishText.textContent = 'נשמר בספרייה!';
    btnPublish.classList.add('success');
    showToast('הקישור נשמר בספרייה ✓', 'success');

    setTimeout(() => {
      btnPublish.classList.remove('success', 'loading');
      urlInput.value               = '';
      urlTypeIndicator.textContent = '';
      urlPreviewWrap.classList.add('hidden');
      urlPreviewIframe.src         = '';
      urlError.classList.add('hidden');
      urlDescWrap.classList.add('hidden');
      urlDescription.value = '';
      currentParsedUrl     = null;
      updatePublishButton();
    }, 2500);

  } catch (err) {
    console.error(err);
    publishIcon.textContent = '❌';
    publishText.textContent = 'שגיאה';
    showToast('שגיאה: ' + err.message, 'error');
    setTimeout(() => {
      btnPublish.classList.remove('loading');
      updatePublishButton();
    }, 2000);
  }
}

/* ═══════════════════════════════════════════
   Library tab — multi-select grid
═══════════════════════════════════════════ */
libSelClear.addEventListener('click', () => {
  selectedLibItems = [];
  updateScreenLibSelection();
  updatePublishButton();
});

function renderScreenLibGrid() {
  const isActive = document.querySelector('.main-tabs .tab.active[data-tab="library"]');
  if (!isActive) return;

  // Drop any selected IDs that no longer exist or belong to a different screen
  selectedLibItems = selectedLibItems.filter(id => libraryData[id]?.screenId === selectedScreenId);

  const ids = sortedLibIds().filter(id => libraryData[id].screenId === selectedScreenId);
  if (!ids.length) {
    screenLibGrid.innerHTML = '';
    screenLibEmpty.classList.remove('hidden');
    updatePublishButton();
    return;
  }
  screenLibEmpty.classList.add('hidden');
  screenLibGrid.innerHTML = ids.map(id => buildSelectableLibCard(id, libraryData[id])).join('');

  screenLibGrid.querySelectorAll('.lib-card').forEach(card => {
    card.addEventListener('click', () => toggleLibItemSelection(card.dataset.id));
  });

  updateScreenLibSelection();
  updatePublishButton();
}

function buildSelectableLibCard(id, item) {
  let thumb;
  switch (item.type) {
    case 'image':
      thumb = `<img src="${item.url}" alt="" loading="lazy">`; break;
    case 'video':
      thumb = `<video src="${item.url}" muted autoplay loop playsinline preload="auto"></video>`; break;
    case 'youtube': {
      const ytId = (item.url || '').match(YT_RX)?.[1] || '';
      thumb = ytId ? `<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" alt="">` : `<span class="lib-type-icon">▶️</span>`;
      break;
    }
    case 'drive':
      thumb = `<span class="lib-type-icon">📁</span>`; break;
    case 'webpage':
      thumb = `<span class="lib-type-icon">🌐</span>`; break;
    default:
      thumb = `<span class="lib-type-icon">📄</span>`;
  }

  return `<div class="lib-card selectable" data-id="${id}">
    <div class="lib-thumb">${thumb}</div>
    <div class="lib-info">
      <div class="lib-desc" title="${escHtml(item.description)}">${escHtml(item.description)}</div>
      <div class="lib-meta">${contentTypeLabel(item.type)}</div>
    </div>
    <span class="lib-order-num"></span>
  </div>`;
}

function toggleLibItemSelection(id) {
  const idx = selectedLibItems.indexOf(id);
  if (idx === -1) selectedLibItems.push(id);
  else            selectedLibItems.splice(idx, 1);
  updateScreenLibSelection();
  updatePublishButton();
}

function updateScreenLibSelection() {
  screenLibGrid.querySelectorAll('.lib-card').forEach(card => {
    const id  = card.dataset.id;
    const idx = selectedLibItems.indexOf(id);
    const num = card.querySelector('.lib-order-num');
    if (idx !== -1) {
      card.classList.add('selected');
      if (num) { num.textContent = idx + 1; num.classList.add('visible'); }
    } else {
      card.classList.remove('selected');
      if (num) { num.textContent = ''; num.classList.remove('visible'); }
    }
  });

  libSelCount.textContent = `${selectedLibItems.length} נבחרו`;

  const showDur = selectedLibItems.length >= 2;
  screenLibDurRow.classList.toggle('hidden', !showDur);

  updateAddEntryBtn();
}

/* ═══════════════════════════════════════════
   Broadcast single item
═══════════════════════════════════════════ */
async function broadcastSingle(id) {
  const item = libraryData[id];
  if (!item) return;

  setPublishLoading('שולח...');

  try {
    await set(ref(db, `screens/${selectedScreenId}/content`), {
      type:      item.type,
      url:       item.url,
      embedUrl:  item.embedUrl || item.url,
      filename:  item.description,
      updatedAt: Date.now(),
    });

    publishIcon.textContent = '✅';
    publishText.textContent = 'שודר בהצלחה!';
    btnPublish.classList.add('success');
    showToast('התוכן שודר למסך ✓', 'success');
    setTimeout(() => { btnPublish.classList.remove('success', 'loading'); updatePublishButton(); }, 2500);

  } catch (err) {
    console.error(err);
    publishIcon.textContent = '❌';
    publishText.textContent = 'שגיאה';
    showToast('שגיאה: ' + err.message, 'error');
    setTimeout(() => { btnPublish.classList.remove('loading'); updatePublishButton(); }, 2000);
  }
}

/* ═══════════════════════════════════════════
   Broadcast playlist
═══════════════════════════════════════════ */
async function broadcastPlaylist(ids) {
  const dur = parseInt(screenLibDur.value) || 10;
  setPublishLoading('שולח...');

  try {
    const items = ids.map(id => {
      const item = libraryData[id];
      const obj  = {
        type:     item.type,
        url:      item.url,
        embedUrl: item.embedUrl || item.url,
        filename: item.description,
      };
      if (item.type !== 'video') obj.duration = dur;
      return obj;
    });

    await set(ref(db, `screens/${selectedScreenId}/content`), {
      type:      'playlist',
      items,
      updatedAt: Date.now(),
    });

    publishIcon.textContent = '✅';
    publishText.textContent = 'שודר בהצלחה!';
    btnPublish.classList.add('success');
    showToast(`הפלייליסט שודר (${items.length} פריטים) ✓`, 'success');
    setTimeout(() => { btnPublish.classList.remove('success', 'loading'); updatePublishButton(); }, 2500);

  } catch (err) {
    console.error(err);
    publishIcon.textContent = '❌';
    publishText.textContent = 'שגיאה';
    showToast('שגיאה: ' + err.message, 'error');
    setTimeout(() => { btnPublish.classList.remove('loading'); updatePublishButton(); }, 2000);
  }
}

function setPublishLoading(text) {
  btnPublish.disabled     = true;
  publishIcon.textContent = '⏳';
  publishText.textContent = text;
  btnPublish.classList.add('loading');
  btnPublish.classList.remove('success');
}

/* ═══════════════════════════════════════════
   Schedule
═══════════════════════════════════════════ */
scheduleToggle.addEventListener('change', () => {
  scheduleBuilder.classList.toggle('hidden', !scheduleToggle.checked);
});

scheduleFromInput.addEventListener('input', updateAddEntryBtn);
scheduleToInput.addEventListener('input', updateAddEntryBtn);

function updateAddEntryBtn() {
  const from = scheduleFromInput.value;
  const to   = scheduleToInput.value;
  btnAddEntry.disabled = !from || !to || !selectedLibItems.length;
  if (selectedLibItems.length) {
    const n = selectedLibItems.length;
    scheduleSelPrev.textContent = n === 1
      ? (libraryData[selectedLibItems[0]]?.description || '1 פריט')
      : `פלייליסט — ${n} פריטים`;
    scheduleSelPrev.classList.add('has-items');
  } else {
    scheduleSelPrev.textContent = 'בחר פריטים מהגריד';
    scheduleSelPrev.classList.remove('has-items');
  }
}

btnAddEntry.addEventListener('click', async () => {
  const from = scheduleFromInput.value;
  const to   = scheduleToInput.value;
  if (!from || !to || !selectedLibItems.length) return;

  const dur = parseInt(screenLibDur.value) || 10;
  let content, label;

  if (selectedLibItems.length === 1) {
    const item = libraryData[selectedLibItems[0]];
    content = { type: item.type, url: item.url, embedUrl: item.embedUrl || item.url, filename: item.description };
    label   = item.description;
  } else {
    const items = selectedLibItems.map(id => {
      const item = libraryData[id];
      const obj  = { type: item.type, url: item.url, embedUrl: item.embedUrl || item.url, filename: item.description };
      if (item.type !== 'video') obj.duration = dur;
      return obj;
    });
    content = { type: 'playlist', items };
    label   = `פלייליסט (${selectedLibItems.length} פריטים)`;
  }

  const existIdx = scheduleEntries.findIndex(e => e.from === from);
  if (existIdx !== -1) scheduleEntries.splice(existIdx, 1);
  scheduleEntries.push({ from, to, content, label });
  scheduleEntries.sort((a, b) => a.from.localeCompare(b.from));

  scheduleFromInput.value = '';
  scheduleToInput.value   = '';
  renderScheduleList();
  updateAddEntryBtn();

  if (!selectedScreenId) return;
  btnAddEntry.disabled = true;
  const prevText = btnAddEntry.textContent;
  btnAddEntry.textContent = '⏳';
  try {
    await set(ref(db, `screens/${selectedScreenId}/schedule`),
      scheduleEntries.map(e => ({ from: e.from, to: e.to, content: e.content, label: e.label })));
    renderScheduleSummary(selectedScreenId);
    renderTimeline(selectedScreenId);
    showToast('תזמון נוסף ונשמר ✓', 'success');
  } catch (err) {
    showToast('שגיאה בשמירה: ' + err.message, 'error');
  } finally {
    btnAddEntry.textContent = prevText;
    updateAddEntryBtn();
  }
});

function renderScheduleList() {
  if (!scheduleEntries.length) {
    scheduleListEl.innerHTML = '<div class="pl-empty">אין תזמונים — בחר פריטים, הגדר טווח שעות ולחץ + הוסף</div>';
    return;
  }
  scheduleListEl.innerHTML = scheduleEntries.map((entry, i) => `
    <div class="schedule-entry">
      <span class="schedule-time-badge">${entry.from}–${entry.to}</span>
      <span class="schedule-entry-desc">${escHtml(entry.label)}</span>
      <button class="schedule-entry-del" data-idx="${i}" title="מחק">🗑️</button>
    </div>
  `).join('');
  scheduleListEl.querySelectorAll('.schedule-entry-del').forEach(btn => {
    btn.addEventListener('click', () => {
      scheduleEntries.splice(parseInt(btn.dataset.idx), 1);
      renderScheduleList();
    });
  });
}

function renderScheduleSummary(id) {
  const raw   = screensData[id]?.schedule;
  const local = (id === selectedScreenId && scheduleEntries.length) ? scheduleEntries : null;
  const arr   = local || (raw ? (Array.isArray(raw) ? raw : Object.values(raw)) : []);
  const valid = arr.filter(e => e?.from && e?.to && e?.content);
  if (!valid.length) { currentSchedSummary.classList.add('hidden'); return; }

  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  currentSchedSummary.innerHTML = valid.map(e => {
    const [fh, fm] = e.from.split(':').map(Number);
    const [th, tm] = e.to.split(':').map(Number);
    const isActive = nowMins >= (fh * 60 + fm) && nowMins < (th * 60 + tm);
    const typeLabel = e.content.type === 'playlist'
      ? `📋 פלייליסט (${(e.content.items || []).length} פריטים)`
      : contentTypeLabel(e.content.type);
    const desc = e.label || e.content.filename || '';
    return `<div class="sched-row${isActive ? ' sched-active' : ''}">
      <span class="sched-time">${e.from}–${e.to}</span>
      <span class="sched-type">${typeLabel}</span>
      <span class="sched-desc">${escHtml(desc)}</span>
      ${isActive ? '<span class="sched-now-badge">▶ עכשיו</span>' : ''}
    </div>`;
  }).join('');
  currentSchedSummary.classList.remove('hidden');
}

function renderTimeline(id) {
  const raw   = screensData[id]?.schedule;
  const local = (id === selectedScreenId && scheduleEntries.length) ? scheduleEntries : null;
  const arr   = local || (raw ? (Array.isArray(raw) ? raw : Object.values(raw)) : []);
  const valid = arr.filter(e => e?.from && e?.to && e?.content);

  if (!valid.length) { timeline24h.classList.add('hidden'); return; }

  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowPct  = (nowMins / 1440 * 100).toFixed(2);

  // Hour marks: every 3 hours
  const hoursHTML = '<div class="timeline-hours">' +
    [0,3,6,9,12,15,18,21,24].map(h => `<span>${String(h).padStart(2,'0')}:00</span>`).join('') +
    '</div>';

  // Segments (handle midnight-crossing ranges)
  let segHTML = '';
  valid.forEach((e, i) => {
    const [fh, fm] = e.from.split(':').map(Number);
    const [th, tm] = e.to.split(':').map(Number);
    const fromMins = fh * 60 + fm;
    const toMins   = th * 60 + tm;
    const color    = SCHED_COLORS[i % SCHED_COLORS.length];
    const label    = escHtml((e.label || contentTypeLabel(e.content?.type || '')).substring(0, 18));
    const title    = escHtml(`${e.from}–${e.to}: ${e.label || ''}`);

    const seg = (s, t) => {
      const l = (s / 1440 * 100).toFixed(2);
      const w = ((t - s) / 1440 * 100).toFixed(2);
      return `<div class="timeline-segment" style="left:${l}%;width:${w}%;background:${color};" title="${title}">${label}</div>`;
    };

    if (toMins > fromMins) {
      segHTML += seg(fromMins, toMins);
    } else {
      segHTML += seg(fromMins, 1440);  // until midnight
      if (toMins > 0) segHTML += seg(0, toMins);  // from midnight
    }
  });

  const nowHTML = `<div class="timeline-now-line" style="left:${nowPct}%"></div>`;

  const legendHTML = '<div class="timeline-legend">' +
    valid.map((e, i) =>
      `<div class="legend-item">
        <div class="legend-dot" style="background:${SCHED_COLORS[i % SCHED_COLORS.length]}"></div>
        <span>${e.from}–${e.to} · ${escHtml(e.label || contentTypeLabel(e.content?.type || ''))}</span>
      </div>`
    ).join('') + '</div>';

  timeline24h.innerHTML = hoursHTML +
    `<div class="timeline-bar-wrap">${segHTML}${nowHTML}</div>` +
    legendHTML;
  timeline24h.classList.remove('hidden');
}

function contentLabelFromContent(c) {
  if (!c) return '—';
  if (c.type === 'playlist') return `פלייליסט (${(c.items || []).length} פריטים)`;
  return c.filename || contentTypeLabel(c.type);
}

btnSaveSchedule.addEventListener('click', async () => {
  if (!selectedScreenId) return;
  try {
    if (!scheduleEntries.length) {
      await remove(ref(db, `screens/${selectedScreenId}/schedule`));
    } else {
      await set(ref(db, `screens/${selectedScreenId}/schedule`),
        scheduleEntries.map(({ from, to, content, label }) => ({ from, to, content, label })));
    }
    renderScheduleSummary(selectedScreenId);
    renderTimeline(selectedScreenId);
    showToast('לו"ז נשמר ✓', 'success');
  } catch (err) {
    showToast('שגיאה בשמירת לו"ז: ' + err.message, 'error');
  }
});

/* ═══════════════════════════════════════════
   Library management page
═══════════════════════════════════════════ */
function updateLibCounts() {
  const count = Object.keys(libraryData).length;
  libCountBadge.textContent = `${count} פריטים`;
  libCountNav.textContent   = `${count} פריטים`;
}

function sortedLibIds() {
  return Object.keys(libraryData).sort((a, b) => (libraryData[b].createdAt || 0) - (libraryData[a].createdAt || 0));
}

function screenNameById(sid) {
  return SCREENS.find(s => s.id === sid)?.name || null;
}

function buildLibCard(id, item, showDelete) {
  let thumb;
  switch (item.type) {
    case 'image':
      thumb = `<img src="${item.url}" alt="" loading="lazy">`; break;
    case 'video':
      thumb = `<video src="${item.url}" muted autoplay loop playsinline preload="auto"></video>`; break;
    case 'youtube': {
      const ytId = (item.url || '').match(YT_RX)?.[1] || '';
      thumb = ytId ? `<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" alt="">` : `<span class="lib-type-icon">▶️</span>`;
      break;
    }
    case 'drive':
      thumb = `<span class="lib-type-icon">📁</span>`; break;
    case 'webpage':
      thumb = `<span class="lib-type-icon">🌐</span>`; break;
    default:
      thumb = `<span class="lib-type-icon">📄</span>`;
  }

  return `<div class="lib-card" data-id="${id}">
    <div class="lib-thumb">${thumb}</div>
    <div class="lib-info">
      <div class="lib-desc" title="${escHtml(item.description)}">${escHtml(item.description)}</div>
      <div class="lib-meta">${contentTypeLabel(item.type)} · ${formatBytes(item.size || 0)}${item.screenId ? ` · ${screenNameById(item.screenId) || item.screenId}` : ''}</div>
    </div>
    ${showDelete ? `<button class="lib-btn-delete" data-id="${id}" title="מחק">🗑️</button>` : ''}
  </div>`;
}

function renderLibGrid() {
  const ids = sortedLibIds();
  if (!ids.length) {
    libGrid.innerHTML = '';
    libPageEmpty.classList.remove('hidden');
    return;
  }
  libPageEmpty.classList.add('hidden');
  libGrid.innerHTML = ids.map(id => buildLibCard(id, libraryData[id], true)).join('');
  libGrid.querySelectorAll('.lib-btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteLibItem(btn.dataset.id);
    });
  });
}

/* Library page upload */
libDropZone.addEventListener('click', () => libFileInput.click());
libDropZone.addEventListener('dragover', (e) => { e.preventDefault(); libDropZone.classList.add('drag-over'); });
libDropZone.addEventListener('dragleave', () => libDropZone.classList.remove('drag-over'));
libDropZone.addEventListener('drop', (e) => {
  e.preventDefault(); libDropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0]; if (f) handleLibFileSelect(f);
});
libFileInput.addEventListener('change', () => { if (libFileInput.files[0]) handleLibFileSelect(libFileInput.files[0]); });

function handleLibFileSelect(file) {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  const isPdf   = file.type === 'application/pdf';
  if (!isVideo && !isImage && !isPdf) { showToast('סוג קובץ לא נתמך', 'error'); return; }

  libPendingFile = file;
  const url = URL.createObjectURL(file);
  libPreviewFname.textContent = file.name;
  libPreviewFsize.textContent = formatBytes(file.size);

  if (isVideo)    libPreviewMedia.innerHTML = `<video src="${url}" muted autoplay loop playsinline></video>`;
  else if (isPdf) libPreviewMedia.innerHTML = `<iframe src="${url}#toolbar=0&navpanes=0" style="width:100%;height:100%;border:none;"></iframe>`;
  else            libPreviewMedia.innerHTML = `<img src="${url}" alt="preview">`;

  libDropZone.classList.add('hidden');
  libUploadPreview.classList.remove('hidden');
  libDescription.value = '';
  libDescription.focus();
  updateLibUploadBtn();
}

libDescription.addEventListener('input', updateLibUploadBtn);

function updateLibUploadBtn() {
  libBtnUpload.disabled = !libPendingFile || !libDescription.value.trim();
}

libBtnClear.addEventListener('click', clearLibUpload);

function clearLibUpload() {
  libPendingFile = null;
  libFileInput.value = '';
  libDescription.value = '';
  libDropZone.classList.remove('hidden');
  libUploadPreview.classList.add('hidden');
  libProgressWrap.classList.add('hidden');
  libBtnUpload.disabled       = true;
  libProgressFill.style.width = '0%';
}

libBtnUpload.addEventListener('click', async () => {
  if (!libPendingFile || !libDescription.value.trim()) return;

  const file        = libPendingFile;
  const desc        = libDescription.value.trim();
  const isVideo     = file.type.startsWith('video/');
  const isImage     = file.type.startsWith('image/');
  const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `library/${Date.now()}_${safeName}`;

  libBtnUpload.disabled        = true;
  libBtnUploadText.textContent = 'מעלה...';
  libProgressWrap.classList.remove('hidden');

  try {
    const task = uploadBytesResumable(sRef(storage, storagePath), file);

    const downloadURL = await new Promise((resolve, reject) => {
      task.on('state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          libProgressFill.style.width = pct + '%';
          libProgressText.textContent = pct + '%';
        },
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });

    const itemId = `lib_${Date.now()}`;
    await set(ref(db, `library/${itemId}`), {
      type:        isVideo ? 'video' : isImage ? 'image' : 'pdf',
      url:         downloadURL,
      storagePath,
      filename:    file.name,
      description: desc,
      size:        file.size,
      createdAt:   Date.now(),
    });

    libBtnUploadText.textContent = '✅ נשמר!';
    showToast('הקובץ נשמר בספרייה ✓', 'success');
    setTimeout(() => {
      clearLibUpload();
      libBtnUploadText.textContent = 'שמור בספרייה';
    }, 2000);

  } catch (err) {
    console.error(err);
    libBtnUploadText.textContent = '❌ שגיאה';
    showToast('שגיאה בהעלאה: ' + err.message, 'error');
    setTimeout(() => {
      libBtnUpload.disabled        = false;
      libBtnUploadText.textContent = 'שמור בספרייה';
    }, 2000);
  }
});

/* Library delete */
async function handleDeleteLibItem(id) {
  const item = libraryData[id];
  if (!item) return;
  if (!confirm(`האם למחוק את "${item.description}"?\nהפעולה לא ניתנת לביטול.`)) return;

  try {
    if (item.storagePath) await deleteObject(sRef(storage, item.storagePath));
    await remove(ref(db, `library/${id}`));
    showToast('הפריט נמחק מהספרייה', 'success');
  } catch (err) {
    console.error(err);
    showToast('שגיאה במחיקה', 'error');
    try { await remove(ref(db, `library/${id}`)); } catch {}
  }
}

/* ═══════════════════════════════════════════
   Reset inputs
═══════════════════════════════════════════ */
function resetInputs() {
  clearFileSelection();

  urlInput.value               = '';
  urlTypeIndicator.textContent = '';
  urlPreviewWrap.classList.add('hidden');
  urlPreviewIframe.src         = '';
  urlError.classList.add('hidden');
  urlDescWrap.classList.add('hidden');
  urlDescription.value = '';
  currentParsedUrl     = null;

  selectedLibItems = [];
  screenLibGrid.innerHTML = '';
  screenLibEmpty.classList.remove('hidden');
  screenLibDurRow.classList.add('hidden');

  scheduleEntries = [];
  scheduleToggle.checked = false;
  scheduleBuilder.classList.add('hidden');
  scheduleFromInput.value = '';
  scheduleToInput.value   = '';
  currentSchedSummary.classList.add('hidden');
  timeline24h.classList.add('hidden');
  renderScheduleList();
  updateAddEntryBtn();

  document.querySelectorAll('.main-tabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.main-tabs .tab[data-tab="upload"]').classList.add('active');
  document.getElementById('tab-upload').classList.remove('hidden');

  btnPublish.classList.remove('success', 'loading');
  updatePublishButton();
}

/* ═══════════════════════════════════════════
   Helpers
═══════════════════════════════════════════ */
function formatBytes(bytes) {
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimeout;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className   = 'toast ' + type;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

/* ─── Init ─── */
renderNav();
