import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getDatabase, ref, onValue, set }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js';
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL }
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
  { id: 'outside_building',   name: 'מסך מחוץ למבנה הענק',      icon: '🏢', width: 288,  height: 432,  img: 'imgs/gadder.jpeg'   },
  { id: 'technoda_entrance',  name: 'מסך בכניסה לטכנודע',       icon: '🚪', width: 319,  height: 636,  img: 'imgs/outside.jpeg'  },
  { id: 'lobby',              name: 'מסך המבואה',                icon: '🏛️', width: 1920, height: 1080, img: 'imgs/mevoa.jpeg'    },
  { id: 'reception',          name: 'מסך מתחת למשרד קבלה',      icon: '📋', width: 1920, height: 1080, img: 'imgs/reception.jpeg' },
];

/* ─── State ─── */
let selectedScreenId = null;
let screensData      = {};
let pendingContent   = null;  // content ready to publish
let selectedFile     = null;

/* ─── DOM refs ─── */
const screensNav        = document.getElementById('screens-nav');
const welcome           = document.getElementById('welcome');
const detail            = document.getElementById('screen-detail');
const detailName        = document.getElementById('detail-name');
const detailDims        = document.getElementById('detail-dims');
const detailOrient      = document.getElementById('detail-orient');
const detailUpdated     = document.getElementById('detail-updated');
const currentPreview    = document.getElementById('current-preview');
const currentTypeBadge  = document.getElementById('current-type-badge');
const currentUrl        = document.getElementById('current-url');
const dropZone          = document.getElementById('drop-zone');
const fileInput         = document.getElementById('file-input');
const uploadPreview     = document.getElementById('upload-preview');
const previewMediaCont  = document.getElementById('preview-media-container');
const previewFilename   = document.getElementById('preview-filename');
const previewFilesize   = document.getElementById('preview-filesize');
const btnClearFile      = document.getElementById('btn-clear-file');
const uploadProgressWrap = document.getElementById('upload-progress');
const progressFill      = document.getElementById('progress-fill');
const progressText      = document.getElementById('progress-text');
const urlInput          = document.getElementById('url-input');
const urlTypeIndicator  = document.getElementById('url-type-indicator');
const urlPreviewWrap    = document.getElementById('url-preview');
const urlPreviewIframe  = document.getElementById('url-preview-iframe');
const urlError          = document.getElementById('url-error');
const btnPublish        = document.getElementById('btn-publish');
const publishText       = document.getElementById('publish-text');
const publishIcon       = document.getElementById('publish-icon');
const connectionDot     = document.querySelector('.dot');
const connectionText    = document.getElementById('connection-text');
const toast             = document.getElementById('toast');

/* ═══════════════════════════════════════════
   URL Parsing
═══════════════════════════════════════════ */
function parseURL(url) {
  url = url.trim();

  // YouTube
  const ytRx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/;
  const ytM   = url.match(ytRx);
  if (ytM) {
    const id = ytM[1];
    return {
      type:     'youtube',
      label:    'YouTube',
      url,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0`,
    };
  }

  // Google Drive
  const drRx = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const drRx2 = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const drM   = url.match(drRx) || url.match(drRx2);
  if (drM) {
    const id = drM[1];
    return {
      type:     'drive',
      label:    'Google Drive',
      url,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    };
  }

  // Generic webpage (any http/https URL)
  if (/^https?:\/\/.+/.test(url)) {
    return {
      type:     'webpage',
      label:    'אתר אינטרנט',
      url,
      embedUrl: url,
    };
  }

  return null;
}

/* ═══════════════════════════════════════════
   Firebase — load all screens
═══════════════════════════════════════════ */
onValue(ref(db, 'screens'), (snap) => {
  screensData = snap.val() || {};
  renderNav();
  if (selectedScreenId) renderDetail(selectedScreenId);
}, (err) => {
  console.error(err);
  setConnection(false);
});

// Connection state
onValue(ref(db, '.info/connected'), (snap) => {
  setConnection(snap.val() === true);
});

function setConnection(ok) {
  connectionDot.className  = 'dot ' + (ok ? 'connected' : 'error');
  connectionText.textContent = ok ? 'מחובר' : 'לא מחובר';
}

/* ═══════════════════════════════════════════
   Render sidebar nav
═══════════════════════════════════════════ */
function renderNav() {
  screensNav.innerHTML = '';
  SCREENS.forEach(screen => {
    const content = screensData[screen.id]?.content;
    const typeLabel = content?.type ? contentTypeLabel(content.type) : 'ריק';
    const item = document.createElement('div');
    item.className = 'screen-nav-item' + (selectedScreenId === screen.id ? ' active' : '');
    item.innerHTML = `
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
   Select screen
═══════════════════════════════════════════ */
function selectScreen(id) {
  selectedScreenId = id;
  welcome.classList.add('hidden');
  detail.classList.remove('hidden');
  resetInputs();
  renderNav();
  renderDetail(id);
}

function renderDetail(id) {
  const screen  = SCREENS.find(s => s.id === id);
  const content = screensData[id]?.content;
  const orient  = screen.width > screen.height ? 'לרוחב' : 'לאורך';

  detailName.textContent   = screen.name;
  detailDims.textContent   = `${screen.width}×${screen.height}px`;
  detailOrient.textContent = orient;

  // Location photo
  const locationWrap = document.getElementById('location-wrap');
  const locationImg  = document.getElementById('location-img');
  if (screen.img) {
    locationImg.src = screen.img;
    locationWrap.classList.remove('hidden');
  } else {
    locationWrap.classList.add('hidden');
  }

  // Set preview dimensions to match real screen aspect ratio
  const ratio  = screen.width / screen.height;
  const maxW   = 260, maxH = 180;
  let pw, ph;
  if (ratio <= 1) {          // portrait
    ph = maxH;
    pw = Math.round(maxH * ratio);
  } else {                   // landscape
    pw = maxW;
    ph = Math.round(maxW / ratio);
  }
  currentPreview.style.width  = pw + 'px';
  currentPreview.style.height = ph + 'px';

  if (content?.updatedAt) {
    const d = new Date(content.updatedAt);
    detailUpdated.textContent = `עודכן: ${d.toLocaleString('he-IL')}`;
    detailUpdated.classList.remove('hidden');
  } else {
    detailUpdated.textContent = '';
  }

  // Current preview
  if (content?.type) {
    currentTypeBadge.textContent = contentTypeLabel(content.type);
    currentTypeBadge.className   = 'current-type-badge';
    currentUrl.textContent       = content.url || content.embedUrl || '—';
    renderCurrentPreview(content);
  } else {
    currentTypeBadge.textContent = 'אין תוכן';
    currentTypeBadge.className   = 'current-type-badge empty';
    currentUrl.textContent       = '—';
    currentPreview.innerHTML = `<span class="no-content-icon">⬛</span>`;
  }
}

function renderCurrentPreview(content) {
  let html = '';
  switch (content.type) {
    case 'youtube':
    case 'drive':
      html = `<iframe src="${content.embedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
      break;
    case 'image':
      html = `<img src="${content.url}" alt="preview">`;
      break;
    case 'video':
      html = `<video src="${content.url}" muted autoplay loop playsinline></video>`;
      break;
    case 'pdf':
      html = `<iframe src="${content.url}#toolbar=0&navpanes=0" frameborder="0" style="width:100%;height:100%;"></iframe>`;
      break;
    case 'webpage':
      html = `<iframe src="${content.url}" frameborder="0" style="width:100%;height:100%;"></iframe>`;
      break;
    default:
      html = `<span class="no-content-icon">⬛</span>`;
  }
  currentPreview.innerHTML = html;
}

function contentTypeLabel(type) {
  return { youtube: 'YouTube', drive: 'Google Drive', image: 'תמונה', video: 'סרטון', pdf: 'PDF', webpage: 'אתר' }[type] || type;
}

/* ═══════════════════════════════════════════
   Tabs
═══════════════════════════════════════════ */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
    resetPending();
  });
});

/* ═══════════════════════════════════════════
   File upload (drag & drop)
═══════════════════════════════════════════ */
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
});

btnClearFile.addEventListener('click', () => {
  clearFileSelection();
});

function handleFileSelect(file) {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  const isPdf   = file.type === 'application/pdf';

  if (!isVideo && !isImage && !isPdf) {
    showToast('סוג קובץ לא נתמך', 'error');
    return;
  }
  selectedFile = file;
  const url = URL.createObjectURL(file);

  previewFilename.textContent = file.name;
  previewFilesize.textContent = formatBytes(file.size);

  if (isVideo) {
    previewMediaCont.innerHTML = `<video src="${url}" muted autoplay loop playsinline></video>`;
  } else if (isPdf) {
    previewMediaCont.innerHTML = `<iframe src="${url}#toolbar=0&navpanes=0" style="width:100%;height:100%;border:none;"></iframe>`;
  } else {
    previewMediaCont.innerHTML = `<img src="${url}" alt="preview">`;
  }

  dropZone.classList.add('hidden');
  uploadPreview.classList.remove('hidden');
  uploadProgressWrap.classList.add('hidden');

  pendingContent = {
    type: isVideo ? 'video' : isPdf ? 'pdf' : 'image',
    _file: file,
  };
  btnPublish.disabled = false;
}

function clearFileSelection() {
  selectedFile  = null;
  pendingContent = null;
  fileInput.value = '';
  dropZone.classList.remove('hidden');
  uploadPreview.classList.add('hidden');
  uploadProgressWrap.classList.add('hidden');
  btnPublish.disabled = true;
  progressFill.style.width = '0%';
}

/* ═══════════════════════════════════════════
   URL input
═══════════════════════════════════════════ */
urlInput.addEventListener('input', () => {
  const parsed = parseURL(urlInput.value);
  urlError.classList.add('hidden');
  urlPreviewWrap.classList.add('hidden');
  pendingContent = null;
  btnPublish.disabled = true;

  if (!urlInput.value.trim()) {
    urlTypeIndicator.textContent = '';
    return;
  }

  if (parsed) {
    urlTypeIndicator.textContent = '✓ ' + parsed.label;
    urlPreviewIframe.src         = parsed.embedUrl;
    urlPreviewWrap.classList.remove('hidden');
    pendingContent      = parsed;
    btnPublish.disabled = false;
  } else {
    urlTypeIndicator.textContent = '';
    urlError.classList.remove('hidden');
  }
});

/* ═══════════════════════════════════════════
   Publish
═══════════════════════════════════════════ */
btnPublish.addEventListener('click', async () => {
  if (!pendingContent || !selectedScreenId) return;

  btnPublish.disabled = true;
  publishIcon.textContent = '⏳';
  publishText.textContent = 'שולח...';
  btnPublish.classList.add('loading');

  try {
    let contentToSave = { ...pendingContent };
    delete contentToSave._file;

    // If there's a file, upload it first
    if (pendingContent._file) {
      const file    = pendingContent._file;
      const ext     = file.name.split('.').pop();
      const path    = `screens/${selectedScreenId}/${Date.now()}.${ext}`;
      const fileRef = sRef(storage, path);
      const task    = uploadBytesResumable(fileRef, file);

      uploadProgressWrap.classList.remove('hidden');

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

      contentToSave = {
        type: pendingContent.type,
        url:      downloadURL,
        embedUrl: downloadURL,
        filename: pendingContent._file.name,
      };
    }

    contentToSave.updatedAt = Date.now();
    await set(ref(db, `screens/${selectedScreenId}/content`), contentToSave);

    publishIcon.textContent  = '✅';
    publishText.textContent  = 'שודר בהצלחה!';
    btnPublish.classList.add('success');
    showToast('התוכן שודר למסך בהצלחה ✓', 'success');

    setTimeout(() => {
      btnPublish.classList.remove('success', 'loading');
      publishIcon.textContent = '🚀';
      publishText.textContent = 'שדר למסך';
      btnPublish.disabled     = true;
      resetInputs();
    }, 2500);

  } catch (err) {
    console.error(err);
    publishIcon.textContent = '❌';
    publishText.textContent = 'שגיאה';
    showToast('שגיאה: ' + err.message, 'error');
    setTimeout(() => {
      btnPublish.classList.remove('loading');
      publishIcon.textContent = '🚀';
      publishText.textContent = 'שדר למסך';
      btnPublish.disabled     = false;
    }, 2000);
  }
});

/* ═══════════════════════════════════════════
   Helpers
═══════════════════════════════════════════ */
function resetInputs() {
  clearFileSelection();
  urlInput.value               = '';
  urlTypeIndicator.textContent = '';
  urlPreviewWrap.classList.add('hidden');
  urlError.classList.add('hidden');
  urlPreviewIframe.src         = '';
  pendingContent               = null;
  btnPublish.disabled          = true;
  btnPublish.classList.remove('success', 'loading');
  publishIcon.textContent      = '🚀';
  publishText.textContent      = 'שדר למסך';

  // Reset to first tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.tab[data-tab="upload"]').classList.add('active');
  document.getElementById('tab-upload').classList.remove('hidden');
}

function resetPending() {
  pendingContent      = null;
  btnPublish.disabled = true;
  selectedFile        = null;
}

function formatBytes(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

let toastTimeout;
function showToast(msg, type = '') {
  toast.textContent  = msg;
  toast.className    = 'toast ' + type;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

/* ─── Init ─── */
renderNav();
