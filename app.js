import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getDatabase, ref, onValue, set, remove, get, push }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
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
const auth    = getAuth(app);
const provider = new GoogleAuthProvider();

/* ─── Auth constants ─── */
const SUPER_ADMIN = 'papasnir@gmail.com';
const emailToKey  = (e) => e.toLowerCase().replace(/\./g, ',');

/* ─── Auth DOM refs ─── */
const authOverlay       = document.getElementById('auth-overlay');
const notAuthOverlay    = document.getElementById('not-auth-overlay');
const notAuthMsg        = document.getElementById('not-auth-msg');
const btnGoogleSignin   = document.getElementById('btn-google-signin');
const authError         = document.getElementById('auth-error');
const appEl             = document.getElementById('app');
const userBar           = document.getElementById('user-bar');
const userAvatar        = document.getElementById('user-avatar');
const userNameEl        = document.getElementById('user-name');
const userEmailDisplay  = document.getElementById('user-email-display');
const btnSignout        = document.getElementById('btn-signout');
const btnSignoutUnauth  = document.getElementById('btn-signout-unauth');
const btnManageAdmins   = document.getElementById('btn-manage-admins');
const adminModal        = document.getElementById('admin-modal');
const adminListEl       = document.getElementById('admin-list');
const newAdminName      = document.getElementById('new-admin-name');
const newAdminEmail     = document.getElementById('new-admin-email');
const btnAddAdmin       = document.getElementById('btn-add-admin');
const btnCloseAdminModal = document.getElementById('btn-close-admin-modal');

/* ─── Auth logic ─── */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    authOverlay.classList.remove('hidden');
    notAuthOverlay.classList.add('hidden');
    appEl.classList.add('hidden');
    userBar.classList.add('hidden');
    return;
  }
  const email = user.email.toLowerCase();
  if (email === SUPER_ADMIN) {
    await set(ref(db, `admins/${emailToKey(email)}`), {
      email, name: user.displayName || '', addedAt: Date.now(),
    });
  }
  const snap = await get(ref(db, `admins/${emailToKey(email)}`));
  if (snap.exists()) {
    authOverlay.classList.add('hidden');
    notAuthOverlay.classList.add('hidden');
    appEl.classList.remove('hidden');
    userBar.classList.remove('hidden');
    userAvatar.src            = user.photoURL || '';
    userNameEl.textContent    = user.displayName || email;
    userEmailDisplay.textContent = user.email;
    if (email === SUPER_ADMIN) btnManageAdmins.classList.remove('hidden');
  } else {
    authOverlay.classList.add('hidden');
    notAuthOverlay.classList.remove('hidden');
    appEl.classList.add('hidden');
    notAuthMsg.textContent = `${user.email} אינו מורשה לגשת למערכת`;
  }
});

btnGoogleSignin.addEventListener('click', async () => {
  authError.classList.add('hidden');
  btnGoogleSignin.disabled = true;
  try {
    await signInWithPopup(auth, provider);
  } catch {
    authError.textContent = 'שגיאה בהתחברות';
    authError.classList.remove('hidden');
    btnGoogleSignin.disabled = false;
  }
});
btnSignout.addEventListener('click',       () => signOut(auth));
btnSignoutUnauth.addEventListener('click', () => signOut(auth));

/* ─── Admin management ─── */
btnManageAdmins.addEventListener('click', () => { adminModal.classList.remove('hidden'); renderAdminList(); });
btnCloseAdminModal.addEventListener('click', () => adminModal.classList.add('hidden'));
adminModal.addEventListener('click', (e) => { if (e.target === adminModal) adminModal.classList.add('hidden'); });

async function renderAdminList() {
  const snap   = await get(ref(db, 'admins'));
  const admins = snap.val() || {};
  const rows   = Object.entries(admins);
  if (!rows.length) {
    adminListEl.innerHTML = '<div style="padding:12px;font-size:13px;color:var(--muted);">אין משתמשים</div>';
    return;
  }
  adminListEl.innerHTML = rows.map(([key, val]) => `
    <div class="admin-row">
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
        ${val.name ? `<span style="font-weight:600;">${escHtml(val.name)}</span>` : ''}
        <span style="font-size:11px;color:var(--muted);direction:ltr;">${val.email || key.replace(/,/g,'.')}</span>
      </div>
      ${(val.email||'').toLowerCase() !== SUPER_ADMIN
        ? `<button class="admin-del-btn" data-key="${key}">🗑️</button>`
        : '<span class="admin-super-badge">ראשי</span>'}
    </div>`).join('');
  adminListEl.querySelectorAll('.admin-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await remove(ref(db, `admins/${btn.dataset.key}`));
      renderAdminList();
      showToast('משתמש הוסר', 'success');
    });
  });
}

btnAddAdmin.addEventListener('click', async () => {
  const email = newAdminEmail.value.trim().toLowerCase();
  const name  = newAdminName.value.trim();
  if (!email || !email.includes('@')) { showToast('אימייל לא תקין', 'error'); return; }
  await set(ref(db, `admins/${emailToKey(email)}`), { email, name, addedAt: Date.now() });
  newAdminEmail.value = ''; newAdminName.value = '';
  renderAdminList();
  showToast('משתמש נוסף ✓', 'success');
});

/* ─── Screen definitions ─── */
const SCREENS = [
  { id: 'outside_building',  name: 'מסך מחוץ למבנה הענק', icon: '🏢', width: 288,  height: 432,  img: 'imgs/gadder.jpeg'    },
  { id: 'technoda_entrance', name: 'מסך בכניסה לטכנודע',  icon: '🚪', width: 319,  height: 636,  img: 'imgs/outside.jpeg'   },
  { id: 'lobby',             name: 'מסך המבואה',           icon: '🏛️', width: 1920, height: 1080, img: 'imgs/mevoa.jpeg'     },
  { id: 'reception',         name: 'מסך מעל למשרד קבלה',  icon: '📋', width: 1920, height: 1080, img: 'imgs/reception.jpeg' },
  { id: 'lab_1_2',           name: 'מעל מעבדות 1-2',       icon: '🔬', width: 1920, height: 1080, img: 'imgs/1-2.jpeg'  },
  { id: 'lab_3_4',           name: 'מעל מעבדות 3-4',       icon: '🔬', width: 1920, height: 1080, img: 'imgs/34.jpeg'   },
  { id: 'lab_5_6',           name: 'מעל מעבדות 5-6',       icon: '🔬', width: 1920, height: 1080, img: 'imgs/5-6.jpeg'  },
  { id: 'management',        name: 'מסך מנהלה',             icon: '👔', width: 3840, height: 2160, img: 'imgs/management.jpeg' },
];

/* ─── State ─── */
let selectedScreenId     = null;
let screensData          = {};
let libraryData          = {};
let savedTemplates       = {};
let scheduleEntries      = [];
let wizContentItems      = [];
let schedSelectedItems   = [];
let libPendingFile       = null;
let libParsedUrl         = null;
let libSelectedScreenIds = [];
let remapItemId          = null;
let importSelectedIds    = [];

/* ─── DOM refs — layout ─── */
const screensNav     = document.getElementById('screens-nav');
const welcome        = document.getElementById('welcome');
const detail         = document.getElementById('screen-detail');
const libraryNavItem = document.getElementById('library-nav');
const libraryPage    = document.getElementById('library-page');

/* ─── DOM refs — screen header ─── */
const detailName    = document.getElementById('detail-name');
const detailDims    = document.getElementById('detail-dims');
const detailOrient  = document.getElementById('detail-orient');
const detailUpdated = document.getElementById('detail-updated');

/* ─── DOM refs — wizard ─── */
const wizBreadcrumb    = document.getElementById('wizard-breadcrumb');

/* ─── DOM refs — current view ─── */
const currentPreview      = document.getElementById('current-preview');
const currentTypeBadge    = document.getElementById('current-type-badge');
const currentUrl          = document.getElementById('current-url');
const currentSchedBadge   = document.getElementById('current-schedule-badge');
const currentSchedSummary = document.getElementById('current-schedule-summary');
const timeline24h         = document.getElementById('timeline-24h');
const SCHED_COLORS        = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6'];

/* ─── DOM refs — wiz-content ─── */
const wizLibEmpty       = document.getElementById('wiz-lib-empty');
const wizLibGrid        = document.getElementById('wiz-lib-grid');
const wizSelCount       = document.getElementById('wiz-sel-count');
const wizSelClear       = document.getElementById('wiz-sel-clear');
const wizBtnImport      = document.getElementById('wiz-btn-import');
const wizDurRow         = document.getElementById('wiz-dur-row');
const wizDur            = document.getElementById('wiz-dur');
const wizGotoLib        = document.getElementById('wiz-goto-lib');
const wizBtnDoBroadcast = document.getElementById('wiz-btn-do-broadcast');
const wizBroadcastIcon  = document.getElementById('wiz-broadcast-icon');
const wizBroadcastText  = document.getElementById('wiz-broadcast-text');
const delayedToggle     = document.getElementById('delayed-toggle');
const delayedBuilder    = document.getElementById('delayed-builder');
const delayedStart      = document.getElementById('delayed-start');
const delayedHasEnd     = document.getElementById('delayed-has-end');
const delayedEnd        = document.getElementById('delayed-end');

/* ─── DOM refs — wiz-schedule ─── */
const schedLibEmpty     = document.getElementById('sched-lib-empty');
const schedLibGrid      = document.getElementById('sched-lib-grid');
const schedSelCount     = document.getElementById('sched-sel-count');
const schedSelClear     = document.getElementById('sched-sel-clear');
const schedDurRow       = document.getElementById('sched-dur-row');
const schedDur          = document.getElementById('sched-dur');
const schedGotoLib      = document.getElementById('sched-goto-lib');
const scheduleListEl    = document.getElementById('schedule-list');
const scheduleFromInput = document.getElementById('schedule-from-input');
const scheduleToInput   = document.getElementById('schedule-to-input');
const scheduleSelPrev   = document.getElementById('schedule-sel-preview');
const btnAddEntry       = document.getElementById('btn-add-schedule-entry');
const btnSaveSchedule   = document.getElementById('btn-save-schedule');
const btnSaveTemplate   = document.getElementById('btn-save-template');
const savedTemplatesSection = document.getElementById('saved-templates-section');
const savedTemplatesList    = document.getElementById('saved-templates-list');

/* ─── DOM refs — connection + toast ─── */
const connectionDot  = document.querySelector('.dot');
const connectionText = document.getElementById('connection-text');
const toast          = document.getElementById('toast');

/* ─── DOM refs — library page ─── */
const libCountBadge      = document.getElementById('lib-count-badge');
const libCountNav        = document.getElementById('library-count');
const libDropZone        = document.getElementById('lib-drop-zone');
const libFileInput       = document.getElementById('lib-file-input');
const libUploadPreview   = document.getElementById('lib-upload-preview');
const libPreviewMedia    = document.getElementById('lib-preview-media');
const libPreviewFname    = document.getElementById('lib-preview-filename');
const libPreviewFsize    = document.getElementById('lib-preview-filesize');
const libDescription     = document.getElementById('lib-description');
const libBtnClear        = document.getElementById('lib-btn-clear');
const libProgressWrap    = document.getElementById('lib-progress-wrap');
const libProgressFill    = document.getElementById('lib-progress-fill');
const libProgressText    = document.getElementById('lib-progress-text');
const libBtnUpload       = document.getElementById('lib-btn-upload');
const libBtnUploadText   = document.getElementById('lib-btn-upload-text');
const libPageEmpty       = document.getElementById('lib-page-empty');
const libByScreens       = document.getElementById('lib-by-screens');
const libUrlInput        = document.getElementById('lib-url-input');
const libUrlTypeInd      = document.getElementById('lib-url-type-indicator');
const libUrlError        = document.getElementById('lib-url-error');
const libUrlDescWrap     = document.getElementById('lib-url-desc-wrap');
const libUrlDescription  = document.getElementById('lib-url-description');
const libScreenAssign    = document.getElementById('lib-screen-assign');
const libScreenCheckboxes = document.getElementById('lib-screen-checkboxes');

/* ─── DOM refs — import modal ─── */
const importModal      = document.getElementById('import-modal');
const importModalGrid  = document.getElementById('import-modal-grid');
const importModalEmpty = document.getElementById('import-modal-empty');
const importSelCount   = document.getElementById('import-sel-count');
const btnCloseImport   = document.getElementById('btn-close-import-modal');
const btnDoImport      = document.getElementById('btn-do-import');

/* ─── DOM refs — remap modal ─── */
const remapModal        = document.getElementById('remap-modal');
const remapItemInfo     = document.getElementById('remap-item-info');
const remapScreenChecks = document.getElementById('remap-screen-checks');
const btnCloseRemap     = document.getElementById('btn-close-remap-modal');
const btnSaveRemap      = document.getElementById('btn-save-remap');

/* ═══════════════════════════════════════════
   URL Parsing
═══════════════════════════════════════════ */
const YT_RX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/;

function parseURL(url) {
  url = url.trim();
  const ytM = url.match(YT_RX);
  if (ytM) {
    const id = ytM[1];
    return { type: 'youtube', label: 'YouTube', url,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0` };
  }
  const drM = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
              url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (drM) {
    const id = drM[1];
    return { type: 'drive', label: 'Google Drive', url, embedUrl: `https://drive.google.com/file/d/${id}/preview` };
  }
  if (/^https?:\/\/.+/.test(url)) return { type: 'webpage', label: 'אתר אינטרנט', url, embedUrl: url };
  return null;
}

/* ═══════════════════════════════════════════
   screenIds helper — backward compat
═══════════════════════════════════════════ */
function getItemScreenIds(item) {
  if (Array.isArray(item.screenIds)) return item.screenIds;
  if (item.screenId) return [item.screenId];
  return [];
}

function itemBelongsTo(item, screenId) {
  return getItemScreenIds(item).includes(screenId);
}

/* ═══════════════════════════════════════════
   Firebase listeners
═══════════════════════════════════════════ */
onValue(ref(db, 'screens'), (snap) => {
  screensData = snap.val() || {};
  renderNav();
  if (selectedScreenId && !detail.classList.contains('hidden')) {
    renderScreenHeader(selectedScreenId);
  }
}, () => setConnection(false));

onValue(ref(db, '.info/connected'), (snap) => setConnection(snap.val() === true));

onValue(ref(db, 'library'), (snap) => {
  libraryData = snap.val() || {};
  updateLibCounts();
  if (!libraryPage.classList.contains('hidden')) renderLibByScreens();
  const wizContentVisible  = !document.getElementById('wiz-content').classList.contains('hidden');
  const wizScheduleVisible = !document.getElementById('wiz-schedule').classList.contains('hidden');
  if (wizContentVisible)  renderWizLibGrid();
  if (wizScheduleVisible) renderSchedLibGrid();
});

onValue(ref(db, 'schedule_templates'), (snap) => {
  savedTemplates = snap.val() || {};
  renderSavedTemplates();
});

function setConnection(ok) {
  connectionDot.className    = 'dot ' + (ok ? 'connected' : 'error');
  connectionText.textContent = ok ? 'מחובר' : 'לא מחובר';
}

/* ═══════════════════════════════════════════
   Sidebar nav
═══════════════════════════════════════════ */
const LAB_IDS = ['lab_1_2', 'lab_3_4', 'lab_5_6'];
let labsGroupOpen = false;

function makeNavItem(screen) {
  const content   = screensData[screen.id]?.content;
  const typeLabel = content?.type ? contentTypeLabel(content.type) : 'ריק';
  const item      = document.createElement('div');
  item.className  = 'screen-nav-item' + (selectedScreenId === screen.id ? ' active' : '');
  item.innerHTML  = `
    <div class="nav-thumb">
      <img src="${screen.img || ''}" alt="${screen.name}" onerror="this.parentElement.innerHTML='${screen.icon}'">
    </div>
    <div>
      <div class="nav-name">${screen.name}</div>
      <div class="nav-dims">${screen.width}×${screen.height}</div>
      <div class="nav-type ${content ? '' : 'no-content'}">${typeLabel}</div>
    </div>`;
  item.addEventListener('click', () => selectScreen(screen.id));
  return item;
}

function renderNav() {
  screensNav.innerHTML = '';

  // Regular screens (not labs)
  SCREENS.filter(s => !LAB_IDS.includes(s.id)).forEach(screen => {
    screensNav.appendChild(makeNavItem(screen));
  });

  // Labs group
  const labScreens = SCREENS.filter(s => LAB_IDS.includes(s.id));
  const anyLabActive = LAB_IDS.includes(selectedScreenId);
  if (anyLabActive) labsGroupOpen = true;

  const group = document.createElement('div');
  group.className = 'nav-group';

  const header = document.createElement('div');
  header.className = 'nav-group-header' + (anyLabActive ? ' active' : '');
  header.innerHTML = `
    <span class="nav-group-icon">🔬</span>
    <div class="nav-group-label">
      <div class="nav-name">מסכים מעל המעבדות</div>
      <div class="nav-dims">${labScreens.length} מסכים</div>
    </div>
    <span class="nav-group-arrow ${labsGroupOpen ? 'open' : ''}">›</span>`;
  header.addEventListener('click', () => {
    labsGroupOpen = !labsGroupOpen;
    header.querySelector('.nav-group-arrow').classList.toggle('open', labsGroupOpen);
    items.classList.toggle('open', labsGroupOpen);
  });

  const items = document.createElement('div');
  items.className = 'nav-group-items' + (labsGroupOpen ? ' open' : '');
  labScreens.forEach(screen => {
    const el = makeNavItem(screen);
    el.classList.add('nav-group-child');
    items.appendChild(el);
  });

  group.appendChild(header);
  group.appendChild(items);
  screensNav.appendChild(group);
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
  wizContentItems    = [];
  schedSelectedItems = [];
  renderNav();
  renderScreenHeader(id);
  loadScheduleEntries(id);
  // Show calendar button only for management screen
  const calBtn = document.getElementById('wiz-btn-calendar');
  if (id === 'management') calBtn.classList.remove('hidden');
  else calBtn.classList.add('hidden');
  showWizStep('main');
}

/* ═══════════════════════════════════════════
   Calendar management (management screen)
═══════════════════════════════════════════ */
(function initCalendarWizard() {
  const calDateInput  = document.getElementById('cal-date');
  const calEventsList = document.getElementById('cal-events-list');
  const calTitle      = document.getElementById('cal-ev-title');
  const calSub        = document.getElementById('cal-ev-sub');
  const calImgUrl     = document.getElementById('cal-ev-img');
  const calFile       = document.getElementById('cal-ev-file');
  const calImgPrev    = document.getElementById('cal-img-preview');
  const calImgEl      = document.getElementById('cal-img-preview-el');
  const calAddBtn     = document.getElementById('cal-add-ev-btn');

  // Default date = today
  const todayStr = new Date().toISOString().slice(0, 10);
  calDateInput.value = todayStr;

  let calUnsubscribe = null;

  // Re-render event list whenever step becomes active
  const origShowWizStep = showWizStep;
  // We'll hook into showWizStep to trigger calendar load
  // (patched below after showWizStep is defined — see bottom of this IIFE)

  function loadCalendarForDate(dateStr) {
    if (calUnsubscribe) { calUnsubscribe(); calUnsubscribe = null; }
    if (!dateStr) return;
    calEventsList.innerHTML = '<div style="color:var(--muted);font-size:13px;">טוען...</div>';
    const dbRef = ref(db, `management/calendar/${dateStr}`);
    calUnsubscribe = onValue(dbRef, snap => {
      calEventsList.innerHTML = '';
      if (!snap.exists()) {
        calEventsList.innerHTML = '<div style="color:var(--muted);font-size:13px;">אין אירועים לתאריך זה</div>';
        return;
      }
      const entries = snap.val();
      Object.entries(entries)
        .sort(([,a],[,b]) => (a.order||0)-(b.order||0))
        .forEach(([key, ev]) => {
          const card = document.createElement('div');
          card.style.cssText = 'background:var(--surface2);border-radius:8px;padding:10px 12px;display:flex;align-items:flex-start;gap:10px;';
          card.innerHTML = `
            ${ev.imageUrl ? `<img src="${ev.imageUrl}" style="width:56px;height:40px;object-fit:cover;border-radius:5px;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:13px;">${ev.title||''}</div>
              ${ev.subtitle ? `<div style="font-size:12px;color:var(--muted);margin-top:2px;">${ev.subtitle}</div>` : ''}
            </div>
            <button data-key="${key}" data-date="${dateStr}" class="cal-del-btn btn-clear" style="color:#ef4444;font-size:11px;padding:3px 7px;flex-shrink:0;">✕ מחק</button>`;
          calEventsList.appendChild(card);
        });

      calEventsList.querySelectorAll('.cal-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('למחוק אירוע זה?')) return;
          await remove(ref(db, `management/calendar/${btn.dataset.date}/${btn.dataset.key}`));
          showToast('אירוע נמחק', 'success');
        });
      });
    });
  }

  calDateInput.addEventListener('change', () => loadCalendarForDate(calDateInput.value));

  // Enable add button only when title is filled
  calTitle.addEventListener('input', () => {
    calAddBtn.disabled = !calTitle.value.trim();
  });

  // Image file upload → Firebase Storage → fill URL input
  calFile.addEventListener('change', async () => {
    const file = calFile.files[0];
    if (!file) return;
    calAddBtn.disabled = true;
    calAddBtn.querySelector('span:last-child').textContent = 'מעלה...';
    try {
      const path = `management-calendar/${Date.now()}_${file.name}`;
      const snap  = await new Promise((res, rej) => {
        const task = uploadBytesResumable(sRef(storage, path), file);
        task.on('state_changed', null, rej, () => res(task.snapshot));
      });
      const url = await getDownloadURL(snap.ref);
      calImgUrl.value = url;
      calImgEl.src = url;
      calImgPrev.style.display = 'block';
    } catch(e) {
      showToast('שגיאה בהעלאת תמונה: ' + e.message, 'error');
    } finally {
      calAddBtn.disabled = !calTitle.value.trim();
      calAddBtn.querySelector('span:last-child').textContent = 'הוסף אירוע';
    }
  });

  // Preview image URL as typed
  calImgUrl.addEventListener('input', () => {
    const v = calImgUrl.value.trim();
    if (v) { calImgEl.src = v; calImgPrev.style.display = 'block'; }
    else calImgPrev.style.display = 'none';
  });

  // Add event
  calAddBtn.addEventListener('click', async () => {
    const dateStr = calDateInput.value;
    if (!dateStr || !calTitle.value.trim()) return;
    calAddBtn.disabled = true;
    calAddBtn.querySelector('span:last-child').textContent = 'שומר...';
    try {
      // Count existing events for order
      const snap = await get(ref(db, `management/calendar/${dateStr}`));
      const order = snap.exists() ? Object.keys(snap.val()).length : 0;
      await push(ref(db, `management/calendar/${dateStr}`), {
        title:    calTitle.value.trim(),
        subtitle: calSub.value.trim() || null,
        imageUrl: calImgUrl.value.trim() || null,
        order,
      });
      calTitle.value = '';
      calSub.value   = '';
      calImgUrl.value = '';
      calImgPrev.style.display = 'none';
      calFile.value  = '';
      showToast('אירוע נוסף ✓', 'success');
    } catch(e) {
      showToast('שגיאה: ' + e.message, 'error');
    } finally {
      calAddBtn.disabled = true;
      calAddBtn.querySelector('span:last-child').textContent = 'הוסף אירוע';
    }
  });

  // Hook: load calendar when calendar step is shown
  const _origShowWizStep = showWizStep;
  window._calendarStepHook = () => loadCalendarForDate(calDateInput.value);
})();

libraryNavItem.addEventListener('click', showLibraryPage);

function showLibraryPage() {
  selectedScreenId = null;
  welcome.classList.add('hidden');
  detail.classList.add('hidden');
  libraryPage.classList.remove('hidden');
  document.querySelectorAll('.screen-nav-item').forEach(el => el.classList.remove('active'));
  libraryNavItem.classList.add('active');
  renderLibByScreens();
  checkLibScreenAssign();
}

/* ═══════════════════════════════════════════
   Wizard
═══════════════════════════════════════════ */
const WIZ_STEPS = {
  'main':           { label: null,                        back: null },
  'current':        { label: 'מה משודר כרגע',            back: 'main' },
  'broadcast-type': { label: 'שדר תוכן חדש',             back: 'main' },
  'content':        { label: 'שידור תוכן חדש',           back: 'broadcast-type' },
  'schedule':       { label: 'שידור לפי לו"ז',           back: 'broadcast-type' },
  'calendar':       { label: 'לוח שנה מנהלה',            back: 'broadcast-type' },
};

function showWizStep(step) {
  document.querySelectorAll('.wiz-step').forEach(el => el.classList.add('hidden'));
  document.getElementById('wiz-' + step).classList.remove('hidden');
  updateWizBreadcrumb(step);
  if (step === 'current')  renderCurrentView(selectedScreenId);
  if (step === 'content')  { renderWizLibGrid(); updateWizBroadcastBtn(); }
  if (step === 'schedule') { renderSchedLibGrid(); renderScheduleList(); }
  if (step === 'calendar' && window._calendarStepHook) window._calendarStepHook();
}

function updateWizBreadcrumb(step) {
  if (step === 'main') { wizBreadcrumb.classList.add('hidden'); return; }
  wizBreadcrumb.classList.remove('hidden');

  const path = [];
  let cur = step;
  while (cur) {
    const cfg = WIZ_STEPS[cur];
    if (cfg.label) path.unshift({ step: cur, label: cfg.label, back: cfg.back });
    cur = cfg.back;
  }

  wizBreadcrumb.innerHTML = `
    <button class="wiz-back-btn" data-step="${WIZ_STEPS[step].back}">← חזור</button>
    <div class="wiz-crumb-path">
      ${path.map((p, i) =>
        i === path.length - 1
          ? `<span class="crumb-active">${p.label}</span>`
          : `<span class="crumb-link" data-step="${p.back}">${p.label}</span>`
      ).join('<span class="crumb-sep">›</span>')}
    </div>`;

  wizBreadcrumb.querySelectorAll('[data-step]').forEach(el => {
    el.addEventListener('click', () => showWizStep(el.dataset.step));
  });
}

document.getElementById('wiz-btn-current').addEventListener('click', () => showWizStep('current'));
document.getElementById('wiz-btn-new-broadcast').addEventListener('click', () => showWizStep('broadcast-type'));
document.getElementById('wiz-btn-content').addEventListener('click', () => showWizStep('content'));
document.getElementById('wiz-btn-schedule').addEventListener('click', () => showWizStep('schedule'));
document.getElementById('wiz-btn-calendar').addEventListener('click', () => showWizStep('calendar'));

wizGotoLib.addEventListener('click', showLibraryPage);
schedGotoLib.addEventListener('click', showLibraryPage);

/* ═══════════════════════════════════════════
   Screen header
═══════════════════════════════════════════ */
function renderScreenHeader(id) {
  const screen  = SCREENS.find(s => s.id === id);
  const content = screensData[id]?.content;
  detailName.textContent   = screen.name;
  detailDims.textContent   = `${screen.width}×${screen.height}px`;
  detailOrient.textContent = screen.width > screen.height ? 'לרוחב' : 'לאורך';
  const locationWrap = document.getElementById('location-wrap');
  const locationImg  = document.getElementById('location-img');
  if (screen.img) { locationImg.src = screen.img; locationWrap.classList.remove('hidden'); }
  else locationWrap.classList.add('hidden');
  if (content?.updatedAt) {
    detailUpdated.textContent = `עודכן: ${new Date(content.updatedAt).toLocaleString('he-IL')}`;
    detailUpdated.classList.remove('hidden');
  } else {
    detailUpdated.textContent = '';
  }
}

/* ═══════════════════════════════════════════
   Current content view
═══════════════════════════════════════════ */
function renderCurrentView(id) {
  const screen  = SCREENS.find(s => s.id === id);
  const content = screensData[id]?.content;

  const ratio = screen.width / screen.height;
  const maxW = 260, maxH = 180;
  let pw, ph;
  if (ratio <= 1) { ph = maxH; pw = Math.round(maxH * ratio); }
  else            { pw = maxW; ph = Math.round(maxW / ratio); }
  currentPreview.style.width  = pw + 'px';
  currentPreview.style.height = ph + 'px';

  if (content?.type) {
    if (content.type === 'playlist') {
      const count = (content.items || []).length;
      currentTypeBadge.textContent = `📋 פלייליסט · ${count} פריטים`;
      currentUrl.textContent       = (content.items || []).map(i => i.filename || contentTypeLabel(i.type)).join(' ← ');
    } else {
      currentTypeBadge.textContent = contentTypeLabel(content.type);
      currentUrl.textContent       = content.filename || content.url || content.embedUrl || '—';
    }
    currentTypeBadge.className = 'current-type-badge';
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
        <div style="font-size:11px;font-weight:700;color:var(--text);">${count} פריטים</div></div>`; break;
    }
    default: html = `<span class="no-content-icon">⬛</span>`;
  }
  currentPreview.innerHTML = html;
  const vid = currentPreview.querySelector('video');
  if (vid) vid.play().catch(() => {});
}

/* ═══════════════════════════════════════════
   Wizard content step — library grid
═══════════════════════════════════════════ */
function renderWizLibGrid() {
  const ids = sortedLibIds().filter(id => itemBelongsTo(libraryData[id], selectedScreenId));
  if (!ids.length) {
    wizLibGrid.innerHTML = '';
    wizLibEmpty.classList.remove('hidden');
    updateWizBroadcastBtn();
    return;
  }
  wizLibEmpty.classList.add('hidden');
  wizLibGrid.innerHTML = ids.map(id => buildSelectableCard(id, libraryData[id])).join('');
  wizLibGrid.querySelectorAll('.lib-card').forEach(card => {
    card.addEventListener('click', () => {
      const id  = card.dataset.id;
      const idx = wizContentItems.indexOf(id);
      if (idx === -1) wizContentItems.push(id);
      else wizContentItems.splice(idx, 1);
      updateWizSelection();
    });
  });
  updateWizSelection();
}

function updateWizSelection() {
  wizLibGrid.querySelectorAll('.lib-card').forEach(card => {
    const idx = wizContentItems.indexOf(card.dataset.id);
    card.classList.toggle('selected', idx !== -1);
    const num = card.querySelector('.lib-order-num');
    if (num) { num.textContent = idx !== -1 ? idx + 1 : ''; num.classList.toggle('visible', idx !== -1); }
  });
  wizSelCount.textContent = `${wizContentItems.length} נבחרו`;
  wizDurRow.classList.toggle('hidden', wizContentItems.length < 2);
  updateWizBroadcastBtn();
}

wizSelClear.addEventListener('click', () => { wizContentItems = []; updateWizSelection(); });

function updateWizBroadcastBtn() {
  const hasItems  = wizContentItems.length > 0;
  const isDelayed = delayedToggle.checked;
  const hasStart  = !!delayedStart.value;
  wizBtnDoBroadcast.disabled = !hasItems || (isDelayed && !hasStart);
  if (isDelayed && hasStart) {
    wizBroadcastIcon.textContent = '📅';
    wizBroadcastText.textContent = 'תזמן שידור';
  } else {
    wizBroadcastIcon.textContent = '📡';
    wizBroadcastText.textContent = 'שדר למסך';
  }
}

delayedToggle.addEventListener('change', () => {
  delayedBuilder.classList.toggle('hidden', !delayedToggle.checked);
  updateWizBroadcastBtn();
});
delayedHasEnd.addEventListener('change', () => {
  delayedEnd.disabled = !delayedHasEnd.checked;
  if (!delayedHasEnd.checked) delayedEnd.value = '';
});
delayedStart.addEventListener('input', updateWizBroadcastBtn);

wizBtnDoBroadcast.addEventListener('click', async () => {
  if (!wizContentItems.length || !selectedScreenId) return;
  if (delayedToggle.checked) await doDelayedBroadcast();
  else if (wizContentItems.length === 1) await broadcastSingle(wizContentItems[0]);
  else await broadcastPlaylist(wizContentItems, parseInt(wizDur.value) || 10);
});

async function doDelayedBroadcast() {
  const startVal = delayedStart.value;
  if (!startVal) { showToast('בחר תאריך ושעה להתחלה', 'error'); return; }
  const startAt = new Date(startVal).getTime();
  if (startAt <= Date.now()) { showToast('שעת ההתחלה חייבת להיות בעתיד', 'error'); return; }
  let endAt = null;
  if (delayedHasEnd.checked && delayedEnd.value) {
    endAt = new Date(delayedEnd.value).getTime();
    if (endAt <= startAt) { showToast('שעת הסיום חייבת להיות אחרי ההתחלה', 'error'); return; }
  }

  const dur = parseInt(wizDur.value) || 10;
  let content;
  if (wizContentItems.length === 1) {
    const item = libraryData[wizContentItems[0]];
    content = { type: item.type, url: item.url, embedUrl: item.embedUrl || item.url, filename: item.description };
  } else {
    const items = wizContentItems.map(id => {
      const item = libraryData[id];
      const obj  = { type: item.type, url: item.url, embedUrl: item.embedUrl || item.url, filename: item.description };
      if (item.type !== 'video') obj.duration = dur;
      return obj;
    });
    content = { type: 'playlist', items };
  }

  wizBtnDoBroadcast.disabled = true;
  wizBroadcastText.textContent = '⏳ שומר...';
  try {
    await set(ref(db, `screens/${selectedScreenId}/scheduled_broadcast`), {
      content, startAt, endAt, createdAt: Date.now(),
    });
    showToast('השידור תוזמן בהצלחה ✓', 'success');
    delayedToggle.checked = false;
    delayedBuilder.classList.add('hidden');
    delayedStart.value = ''; delayedEnd.value = '';
    delayedHasEnd.checked = false; delayedEnd.disabled = true;
    wizContentItems = [];
    updateWizSelection();
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
  } finally {
    updateWizBroadcastBtn();
  }
}

/* ═══════════════════════════════════════════
   Broadcast helpers
═══════════════════════════════════════════ */
async function broadcastSingle(id) {
  const item = libraryData[id];
  if (!item) return;
  wizBtnDoBroadcast.disabled = true;
  wizBroadcastText.textContent = 'שולח...';
  try {
    await set(ref(db, `screens/${selectedScreenId}/content`), {
      type: item.type, url: item.url,
      embedUrl: item.embedUrl || item.url,
      filename: item.description, updatedAt: Date.now(),
    });
    wizBroadcastIcon.textContent = '✅';
    wizBroadcastText.textContent = 'שודר בהצלחה!';
    showToast('התוכן שודר למסך ✓', 'success');
    setTimeout(() => { wizContentItems = []; updateWizSelection(); }, 2000);
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
    updateWizBroadcastBtn();
  }
}

async function broadcastPlaylist(ids, dur) {
  wizBtnDoBroadcast.disabled = true;
  wizBroadcastText.textContent = 'שולח...';
  try {
    const items = ids.map(id => {
      const item = libraryData[id];
      const obj  = { type: item.type, url: item.url, embedUrl: item.embedUrl || item.url, filename: item.description };
      if (item.type !== 'video') obj.duration = dur;
      return obj;
    });
    await set(ref(db, `screens/${selectedScreenId}/content`), { type: 'playlist', items, updatedAt: Date.now() });
    wizBroadcastIcon.textContent = '✅';
    wizBroadcastText.textContent = 'שודר בהצלחה!';
    showToast(`פלייליסט שודר (${items.length} פריטים) ✓`, 'success');
    setTimeout(() => { wizContentItems = []; updateWizSelection(); }, 2000);
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
    updateWizBroadcastBtn();
  }
}

/* ═══════════════════════════════════════════
   Wizard schedule step — library grid
═══════════════════════════════════════════ */
function renderSchedLibGrid() {
  const ids = sortedLibIds().filter(id => itemBelongsTo(libraryData[id], selectedScreenId));
  if (!ids.length) {
    schedLibGrid.innerHTML = '';
    schedLibEmpty.classList.remove('hidden');
    return;
  }
  schedLibEmpty.classList.add('hidden');
  schedLibGrid.innerHTML = ids.map(id => buildSelectableCard(id, libraryData[id])).join('');
  schedLibGrid.querySelectorAll('.lib-card').forEach(card => {
    card.addEventListener('click', () => {
      const id  = card.dataset.id;
      const idx = schedSelectedItems.indexOf(id);
      if (idx === -1) schedSelectedItems.push(id);
      else schedSelectedItems.splice(idx, 1);
      updateSchedSelection();
    });
  });
  updateSchedSelection();
}

function updateSchedSelection() {
  schedLibGrid.querySelectorAll('.lib-card').forEach(card => {
    const idx = schedSelectedItems.indexOf(card.dataset.id);
    card.classList.toggle('selected', idx !== -1);
    const num = card.querySelector('.lib-order-num');
    if (num) { num.textContent = idx !== -1 ? idx + 1 : ''; num.classList.toggle('visible', idx !== -1); }
  });
  schedSelCount.textContent = `${schedSelectedItems.length} נבחרו`;
  schedDurRow.classList.toggle('hidden', schedSelectedItems.length < 2);
  updateAddEntryBtn();
}

schedSelClear.addEventListener('click', () => { schedSelectedItems = []; updateSchedSelection(); });

/* ═══════════════════════════════════════════
   Schedule builder
═══════════════════════════════════════════ */
function loadScheduleEntries(id) {
  scheduleEntries = [];
  const raw = screensData[id]?.schedule;
  if (raw) {
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    scheduleEntries = arr
      .filter(e => e?.from && e?.to && e?.content)
      .map(e => ({ from: e.from, to: e.to, content: e.content, label: e.label || contentLabelFromContent(e.content) }));
    scheduleEntries.sort((a, b) => a.from.localeCompare(b.from));
  }
}

scheduleFromInput.addEventListener('input', updateAddEntryBtn);
scheduleToInput.addEventListener('input',   updateAddEntryBtn);

function updateAddEntryBtn() {
  const from = scheduleFromInput.value, to = scheduleToInput.value;
  btnAddEntry.disabled = !from || !to || !schedSelectedItems.length;
  if (schedSelectedItems.length) {
    const n = schedSelectedItems.length;
    scheduleSelPrev.textContent = n === 1
      ? (libraryData[schedSelectedItems[0]]?.description || '1 פריט')
      : `פלייליסט — ${n} פריטים`;
    scheduleSelPrev.classList.add('has-items');
  } else {
    scheduleSelPrev.textContent = 'בחר פריטים מהגריד';
    scheduleSelPrev.classList.remove('has-items');
  }
}

btnAddEntry.addEventListener('click', async () => {
  const from = scheduleFromInput.value, to = scheduleToInput.value;
  if (!from || !to || !schedSelectedItems.length) return;

  const dur = parseInt(schedDur.value) || 10;
  let content, label;

  if (schedSelectedItems.length === 1) {
    const item = libraryData[schedSelectedItems[0]];
    content = { type: item.type, url: item.url, embedUrl: item.embedUrl || item.url, filename: item.description };
    label   = item.description;
  } else {
    const items = schedSelectedItems.map(id => {
      const item = libraryData[id];
      const obj  = { type: item.type, url: item.url, embedUrl: item.embedUrl || item.url, filename: item.description };
      if (item.type !== 'video') obj.duration = dur;
      return obj;
    });
    content = { type: 'playlist', items };
    label   = `פלייליסט (${schedSelectedItems.length} פריטים)`;
  }

  const existIdx = scheduleEntries.findIndex(e => e.from === from);
  if (existIdx !== -1) scheduleEntries.splice(existIdx, 1);
  scheduleEntries.push({ from, to, content, label });
  scheduleEntries.sort((a, b) => a.from.localeCompare(b.from));
  scheduleFromInput.value = ''; scheduleToInput.value = '';
  renderScheduleList();
  updateAddEntryBtn();

  if (!selectedScreenId) return;
  btnAddEntry.disabled = true;
  const prevTxt = btnAddEntry.textContent;
  btnAddEntry.textContent = '⏳';
  try {
    await set(ref(db, `screens/${selectedScreenId}/schedule`),
      scheduleEntries.map(e => ({ from: e.from, to: e.to, content: e.content, label: e.label })));
    showToast('תזמון נוסף ונשמר ✓', 'success');
  } catch (err) {
    showToast('שגיאה בשמירה: ' + err.message, 'error');
  } finally {
    btnAddEntry.textContent = prevTxt;
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
    </div>`).join('');
  scheduleListEl.querySelectorAll('.schedule-entry-del').forEach(btn => {
    btn.addEventListener('click', () => { scheduleEntries.splice(parseInt(btn.dataset.idx), 1); renderScheduleList(); });
  });
}

btnSaveSchedule.addEventListener('click', async () => {
  if (!selectedScreenId) return;
  try {
    if (!scheduleEntries.length) await remove(ref(db, `screens/${selectedScreenId}/schedule`));
    else await set(ref(db, `screens/${selectedScreenId}/schedule`),
      scheduleEntries.map(({ from, to, content, label }) => ({ from, to, content, label })));
    showToast('לו"ז נשמר ✓', 'success');
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
  }
});

/* ═══════════════════════════════════════════
   Schedule summary & timeline
═══════════════════════════════════════════ */
function renderScheduleSummary(id) {
  const raw   = screensData[id]?.schedule;
  const local = (id === selectedScreenId && scheduleEntries.length) ? scheduleEntries : null;
  const arr   = local || (raw ? (Array.isArray(raw) ? raw : Object.values(raw)) : []);
  const valid = arr.filter(e => e?.from && e?.to && e?.content);
  if (!valid.length) { currentSchedSummary.classList.add('hidden'); return; }

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  currentSchedSummary.innerHTML = valid.map(e => {
    const [fh, fm] = e.from.split(':').map(Number);
    const [th, tm] = e.to.split(':').map(Number);
    const fMins = fh * 60 + fm, tMins = th * 60 + tm;
    const isActive = fMins > tMins ? (nowMins >= fMins || nowMins < tMins) : (nowMins >= fMins && nowMins < tMins);
    const typeLabel = e.content.type === 'playlist'
      ? `📋 פלייליסט (${(e.content.items || []).length} פריטים)` : contentTypeLabel(e.content.type);
    return `<div class="sched-row${isActive ? ' sched-active' : ''}">
      <span class="sched-time">${e.from}–${e.to}</span>
      <span class="sched-type">${typeLabel}</span>
      <span class="sched-desc">${escHtml(e.label || e.content.filename || '')}</span>
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

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const nowPct  = (nowMins / 1440 * 100).toFixed(2);
  const hoursHTML = '<div class="timeline-hours">' +
    [0,3,6,9,12,15,18,21,24].map(h => `<span>${String(h).padStart(2,'0')}:00</span>`).join('') + '</div>';

  let segHTML = '';
  valid.forEach((e, i) => {
    const [fh, fm] = e.from.split(':').map(Number);
    const [th, tm] = e.to.split(':').map(Number);
    const fromMins = fh * 60 + fm, toMins = th * 60 + tm;
    const color = SCHED_COLORS[i % SCHED_COLORS.length];
    const label = escHtml((e.label || contentTypeLabel(e.content?.type || '')).substring(0, 18));
    const title = escHtml(`${e.from}–${e.to}: ${e.label || ''}`);
    const seg   = (s, t) => {
      const l = (s / 1440 * 100).toFixed(2), w = ((t - s) / 1440 * 100).toFixed(2);
      return `<div class="timeline-segment" style="left:${l}%;width:${w}%;background:${color};" title="${title}">${label}</div>`;
    };
    if (toMins > fromMins) segHTML += seg(fromMins, toMins);
    else { segHTML += seg(fromMins, 1440); if (toMins > 0) segHTML += seg(0, toMins); }
  });

  const legendHTML = '<div class="timeline-legend">' +
    valid.map((e, i) => `<div class="legend-item">
      <div class="legend-dot" style="background:${SCHED_COLORS[i % SCHED_COLORS.length]}"></div>
      <span>${e.from}–${e.to} · ${escHtml(e.label || contentTypeLabel(e.content?.type || ''))}</span>
    </div>`).join('') + '</div>';

  timeline24h.innerHTML = hoursHTML + `<div class="timeline-bar-wrap">${segHTML}<div class="timeline-now-line" style="left:${nowPct}%"></div></div>` + legendHTML;
  timeline24h.classList.remove('hidden');
}

/* ═══════════════════════════════════════════
   Saved schedule templates
═══════════════════════════════════════════ */
btnSaveTemplate.addEventListener('click', async () => {
  if (!scheduleEntries.length) { showToast('אין תזמונים לשמירה', 'error'); return; }
  const name = prompt('שם הלוז:');
  if (!name?.trim()) return;
  await set(ref(db, `schedule_templates/tpl_${Date.now()}`), {
    name: name.trim(),
    entries: scheduleEntries.map(e => ({ from: e.from, to: e.to, content: e.content, label: e.label })),
    createdAt: Date.now(),
  });
  showToast(`לוז "${name.trim()}" נשמר ✓`, 'success');
});

function renderSavedTemplates() {
  const keys = Object.keys(savedTemplates);
  if (!keys.length) {
    savedTemplatesList.innerHTML = '<div class="pl-empty" style="font-size:12px;">אין לוזים שמורים</div>';
    return;
  }
  savedTemplatesList.innerHTML = keys
    .sort((a, b) => (savedTemplates[b].createdAt || 0) - (savedTemplates[a].createdAt || 0))
    .map(id => {
      const tpl = savedTemplates[id];
      const entries = tpl.entries || [];
      return `<div class="template-card">
        <div class="template-info">
          <div class="template-name">${escHtml(tpl.name)}</div>
          <div class="template-summary">${entries.length} תזמונים · ${entries.map(e => `${e.from}–${e.to}`).join(' · ')}</div>
        </div>
        <div class="template-actions">
          <button class="btn-apply-template" data-id="${id}">שגר</button>
          <button class="btn-del-template" data-id="${id}" title="מחק">🗑️</button>
        </div>
      </div>`;
    }).join('');
  savedTemplatesList.querySelectorAll('.btn-apply-template').forEach(btn => btn.addEventListener('click', () => applyTemplate(btn.dataset.id)));
  savedTemplatesList.querySelectorAll('.btn-del-template').forEach(btn => {
    btn.addEventListener('click', async () => { await remove(ref(db, `schedule_templates/${btn.dataset.id}`)); showToast('לוז נמחק', 'success'); });
  });
}

async function applyTemplate(id) {
  if (!selectedScreenId) { showToast('בחר מסך תחילה', 'error'); return; }
  const tpl = savedTemplates[id];
  if (!tpl?.entries?.length) return;
  const missing = [];
  for (const entry of tpl.entries) {
    const content = entry.content;
    if (!content) continue;
    const items = content.type === 'playlist' ? (content.items || []) : [content];
    for (const item of items) {
      if (['image','video','pdf'].includes(item.type)) {
        if (!Object.values(libraryData).some(l => l.url === item.url))
          missing.push(item.filename || '?');
      }
    }
  }
  if (missing.length) { showToast(`פריטים לא נמצאו: ${missing.join(', ')}`, 'error'); return; }
  try {
    await set(ref(db, `screens/${selectedScreenId}/schedule`),
      tpl.entries.map(e => ({ from: e.from, to: e.to, content: e.content, label: e.label })));
    scheduleEntries = tpl.entries.map(e => ({ ...e }));
    renderScheduleList();
    showToast(`לוז "${tpl.name}" שוגר ✓`, 'success');
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
  }
}

/* ═══════════════════════════════════════════
   Library — helpers
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

/* ═══════════════════════════════════════════
   Library — upload tabs
═══════════════════════════════════════════ */
document.querySelectorAll('.lib-upload-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lib-upload-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.libtab;
    document.getElementById('lib-tab-file').classList.toggle('hidden', which !== 'file');
    document.getElementById('lib-tab-url').classList.toggle('hidden',  which !== 'url');
    updateLibUploadBtn();
    checkLibScreenAssign();
  });
});

function checkLibScreenAssign() {
  const isFileTab = !document.getElementById('lib-tab-file').classList.contains('hidden');
  const fileReady = isFileTab && !!libPendingFile;
  const urlReady  = !isFileTab && !!libParsedUrl;
  if (fileReady || urlReady) {
    libScreenAssign.classList.remove('hidden');
    renderLibScreenCheckboxes();
  } else {
    libScreenAssign.classList.add('hidden');
  }
}

function renderLibScreenCheckboxes() {
  libScreenCheckboxes.innerHTML = SCREENS.map(s =>
    `<label class="screen-checkbox-label">
      <input type="checkbox" class="lib-screen-cb" value="${s.id}" ${libSelectedScreenIds.includes(s.id) ? 'checked' : ''}>
      ${s.icon} ${s.name}
    </label>`
  ).join('');
  libScreenCheckboxes.querySelectorAll('.lib-screen-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      libSelectedScreenIds = [...libScreenCheckboxes.querySelectorAll('.lib-screen-cb:checked')].map(c => c.value);
    });
  });
}

/* ─── File tab ─── */
libDropZone.addEventListener('click',    () => libFileInput.click());
libDropZone.addEventListener('dragover', (e) => { e.preventDefault(); libDropZone.classList.add('drag-over'); });
libDropZone.addEventListener('dragleave',() => libDropZone.classList.remove('drag-over'));
libDropZone.addEventListener('drop',     (e) => { e.preventDefault(); libDropZone.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) handleLibFileSelect(f); });
libFileInput.addEventListener('change',  () => { if (libFileInput.files[0]) handleLibFileSelect(libFileInput.files[0]); });

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
  checkLibScreenAssign();
  updateLibUploadBtn();
}

libDescription.addEventListener('input', updateLibUploadBtn);
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
  checkLibScreenAssign();
}

/* ─── URL tab ─── */
libUrlInput.addEventListener('input', () => {
  libUrlError.classList.add('hidden');
  libUrlDescWrap.classList.add('hidden');
  libParsedUrl = null;
  libUrlTypeInd.textContent = '';
  if (!libUrlInput.value.trim()) { checkLibScreenAssign(); updateLibUploadBtn(); return; }
  const parsed = parseURL(libUrlInput.value);
  if (parsed) {
    libUrlTypeInd.textContent = '✓ ' + parsed.label;
    libUrlDescWrap.classList.remove('hidden');
    libParsedUrl = parsed;
  } else {
    libUrlError.classList.remove('hidden');
  }
  checkLibScreenAssign();
  updateLibUploadBtn();
});
libUrlDescription.addEventListener('input', updateLibUploadBtn);

function updateLibUploadBtn() {
  const isFileTab = !document.getElementById('lib-tab-file').classList.contains('hidden');
  libBtnUpload.disabled = isFileTab
    ? !libPendingFile || !libDescription.value.trim()
    : !libParsedUrl   || !libUrlDescription.value.trim();
}

libBtnUpload.addEventListener('click', async () => {
  const isFileTab = !document.getElementById('lib-tab-file').classList.contains('hidden');
  if (isFileTab) await libUploadFile();
  else           await libSaveUrl();
});

async function libUploadFile() {
  if (!libPendingFile || !libDescription.value.trim()) return;
  const file     = libPendingFile;
  const desc     = libDescription.value.trim();
  const isVideo  = file.type.startsWith('video/');
  const isImage  = file.type.startsWith('image/');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  libBtnUpload.disabled        = true;
  libBtnUploadText.textContent = 'מעלה...';
  libProgressWrap.classList.remove('hidden');
  try {
    const task = uploadBytesResumable(sRef(storage, `library/${Date.now()}_${safeName}`), file);
    const downloadURL = await new Promise((resolve, reject) => {
      task.on('state_changed',
        (snap) => { const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100); libProgressFill.style.width = p + '%'; libProgressText.textContent = p + '%'; },
        reject, async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });
    await set(ref(db, `library/lib_${Date.now()}`), {
      type: isVideo ? 'video' : isImage ? 'image' : 'pdf',
      url: downloadURL, storagePath: `library/${Date.now()}_${safeName}`,
      filename: file.name, description: desc, size: file.size,
      screenIds: libSelectedScreenIds, createdAt: Date.now(),
    });
    libBtnUploadText.textContent = '✅ נשמר!';
    showToast('הקובץ נשמר בספרייה ✓', 'success');
    libSelectedScreenIds = [];
    setTimeout(() => { clearLibUpload(); libBtnUploadText.textContent = 'שמור בספרייה'; }, 2000);
  } catch (err) {
    libBtnUploadText.textContent = '❌ שגיאה';
    showToast('שגיאה: ' + err.message, 'error');
    setTimeout(() => { libBtnUpload.disabled = false; libBtnUploadText.textContent = 'שמור בספרייה'; }, 2000);
  }
}

async function libSaveUrl() {
  if (!libParsedUrl || !libUrlDescription.value.trim()) return;
  const parsed = libParsedUrl, desc = libUrlDescription.value.trim();
  libBtnUpload.disabled        = true;
  libBtnUploadText.textContent = 'שומר...';
  try {
    await set(ref(db, `library/lib_${Date.now()}`), {
      type: parsed.type, url: parsed.url, embedUrl: parsed.embedUrl,
      description: desc, size: 0,
      screenIds: libSelectedScreenIds, createdAt: Date.now(),
    });
    libBtnUploadText.textContent = '✅ נשמר!';
    showToast('הקישור נשמר בספרייה ✓', 'success');
    libSelectedScreenIds = [];
    libUrlInput.value = ''; libUrlTypeInd.textContent = '';
    libUrlDescWrap.classList.add('hidden'); libUrlDescription.value = '';
    libParsedUrl = null; libUrlError.classList.add('hidden');
    checkLibScreenAssign();
    setTimeout(() => { libBtnUpload.disabled = true; libBtnUploadText.textContent = 'שמור בספרייה'; }, 2000);
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
    setTimeout(() => { libBtnUpload.disabled = false; libBtnUploadText.textContent = 'שמור בספרייה'; }, 2000);
  }
}

/* ═══════════════════════════════════════════
   Library — render by screens
═══════════════════════════════════════════ */
function renderLibByScreens() {
  const allIds = sortedLibIds();
  if (!allIds.length) {
    libByScreens.innerHTML = '';
    libPageEmpty.classList.remove('hidden');
    return;
  }
  libPageEmpty.classList.add('hidden');

  const groups     = {};
  const unassigned = [];
  allIds.forEach(id => {
    const screens = getItemScreenIds(libraryData[id]);
    if (!screens.length) { unassigned.push(id); return; }
    screens.forEach(sid => { if (!groups[sid]) groups[sid] = []; groups[sid].push(id); });
  });

  let html = '';
  SCREENS.forEach(screen => {
    const ids = groups[screen.id] || [];
    if (!ids.length) return;
    html += `<div class="lib-screen-group">
      <div class="lib-screen-group-title">${screen.icon} ${screen.name}
        <span class="lib-group-count">${ids.length} פריטים</span>
      </div>
      <div class="lib-grid">${ids.map(id => buildLibCard(id, libraryData[id])).join('')}</div>
    </div>`;
  });
  if (unassigned.length) {
    html += `<div class="lib-screen-group">
      <div class="lib-screen-group-title">📂 לא משוייך
        <span class="lib-group-count">${unassigned.length} פריטים</span>
      </div>
      <div class="lib-grid">${unassigned.map(id => buildLibCard(id, libraryData[id])).join('')}</div>
    </div>`;
  }

  libByScreens.innerHTML = html;
  libByScreens.querySelectorAll('.lib-btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); handleDeleteLibItem(btn.dataset.id); });
  });
  libByScreens.querySelectorAll('.lib-btn-remap').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openRemapModal(btn.dataset.id); });
  });
}

function buildLibCard(id, item) {
  let thumb;
  switch (item.type) {
    case 'image':   thumb = `<img src="${item.url}" alt="" loading="lazy">`; break;
    case 'video':   thumb = `<video src="${item.url}" muted autoplay loop playsinline preload="auto"></video>`; break;
    case 'youtube': { const ytId = (item.url||'').match(YT_RX)?.[1]||''; thumb = ytId ? `<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" alt="">` : `<span class="lib-type-icon">▶️</span>`; break; }
    case 'drive':   thumb = `<span class="lib-type-icon">📁</span>`; break;
    case 'webpage': thumb = `<span class="lib-type-icon">🌐</span>`; break;
    default:        thumb = `<span class="lib-type-icon">📄</span>`;
  }
  return `<div class="lib-card" data-id="${id}">
    <div class="lib-thumb">${thumb}</div>
    <div class="lib-info">
      <div class="lib-desc" title="${escHtml(item.description)}">${escHtml(item.description)}</div>
      <div class="lib-meta">${contentTypeLabel(item.type)} · ${formatBytes(item.size || 0)}</div>
    </div>
    <div class="lib-card-actions">
      <button class="lib-btn-remap" data-id="${id}" title="שייך מסכים">🗂️</button>
      <button class="lib-btn-delete" data-id="${id}" title="מחק">🗑️</button>
    </div>
  </div>`;
}

function buildSelectableCard(id, item) {
  let thumb;
  switch (item.type) {
    case 'image':   thumb = `<img src="${item.url}" alt="" loading="lazy">`; break;
    case 'video':   thumb = `<video src="${item.url}" muted autoplay loop playsinline preload="auto"></video>`; break;
    case 'youtube': { const ytId = (item.url||'').match(YT_RX)?.[1]||''; thumb = ytId ? `<img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" alt="">` : `<span class="lib-type-icon">▶️</span>`; break; }
    case 'drive':   thumb = `<span class="lib-type-icon">📁</span>`; break;
    case 'webpage': thumb = `<span class="lib-type-icon">🌐</span>`; break;
    default:        thumb = `<span class="lib-type-icon">📄</span>`;
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

async function handleDeleteLibItem(id) {
  const item = libraryData[id];
  if (!item || !confirm(`האם למחוק את "${item.description}"?`)) return;
  try {
    if (item.storagePath) await deleteObject(sRef(storage, item.storagePath));
    await remove(ref(db, `library/${id}`));
    showToast('הפריט נמחק', 'success');
  } catch {
    showToast('שגיאה במחיקה', 'error');
    try { await remove(ref(db, `library/${id}`)); } catch {}
  }
}

/* ═══════════════════════════════════════════
   Remap modal
═══════════════════════════════════════════ */
function openRemapModal(id) {
  remapItemId = id;
  const item  = libraryData[id];
  if (!item) return;
  remapItemInfo.textContent = item.description;
  const current = getItemScreenIds(item);
  remapScreenChecks.innerHTML = SCREENS.map(s =>
    `<label class="screen-checkbox-label">
      <input type="checkbox" class="remap-cb" value="${s.id}" ${current.includes(s.id) ? 'checked' : ''}>
      ${s.icon} ${s.name}
    </label>`
  ).join('');
  remapModal.classList.remove('hidden');
}

btnCloseRemap.addEventListener('click', () => remapModal.classList.add('hidden'));
remapModal.addEventListener('click', (e) => { if (e.target === remapModal) remapModal.classList.add('hidden'); });

btnSaveRemap.addEventListener('click', async () => {
  if (!remapItemId) return;
  const newIds = [...remapScreenChecks.querySelectorAll('.remap-cb:checked')].map(c => c.value);
  try {
    await set(ref(db, `library/${remapItemId}/screenIds`), newIds);
    await remove(ref(db, `library/${remapItemId}/screenId`));
    showToast('שיוך מסכים עודכן ✓', 'success');
    remapModal.classList.add('hidden');
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
  }
});

/* ═══════════════════════════════════════════
   Import modal
═══════════════════════════════════════════ */
wizBtnImport.addEventListener('click', () => {
  importSelectedIds = [];
  renderImportModal();
  importModal.classList.remove('hidden');
});
btnCloseImport.addEventListener('click', () => importModal.classList.add('hidden'));
importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.classList.add('hidden'); });

function renderImportModal() {
  const existingUrls = new Set(
    Object.values(libraryData).filter(item => itemBelongsTo(item, selectedScreenId)).map(item => item.url)
  );
  const ids = sortedLibIds().filter(id => !itemBelongsTo(libraryData[id], selectedScreenId) && !existingUrls.has(libraryData[id].url));

  if (!ids.length) {
    importModalGrid.innerHTML = '';
    importModalEmpty.classList.remove('hidden');
    btnDoImport.disabled = true;
    updateImportSelCount();
    return;
  }
  importModalEmpty.classList.add('hidden');
  importModalGrid.innerHTML = ids.map(id => {
    const item = libraryData[id];
    const src  = getItemScreenIds(item).map(s => screenNameById(s)).filter(Boolean).join(', ') || 'ספרייה';
    return buildSelectableCard(id, { ...item, description: `${item.description} · ${src}` });
  }).join('');
  importModalGrid.querySelectorAll('.lib-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = importSelectedIds.indexOf(card.dataset.id);
      if (idx === -1) importSelectedIds.push(card.dataset.id);
      else importSelectedIds.splice(idx, 1);
      importModalGrid.querySelectorAll('.lib-card').forEach(c => {
        const i = importSelectedIds.indexOf(c.dataset.id);
        c.classList.toggle('selected', i !== -1);
        const num = c.querySelector('.lib-order-num');
        if (num) { num.textContent = i !== -1 ? i + 1 : ''; num.classList.toggle('visible', i !== -1); }
      });
      updateImportSelCount();
    });
  });
  updateImportSelCount();
}

function updateImportSelCount() {
  importSelCount.textContent = `${importSelectedIds.length} נבחרו`;
  btnDoImport.disabled = !importSelectedIds.length;
}

btnDoImport.addEventListener('click', async () => {
  if (!importSelectedIds.length || !selectedScreenId) return;
  btnDoImport.disabled = true;
  btnDoImport.textContent = '⏳ מייבא...';
  try {
    for (const srcId of importSelectedIds) {
      const item = libraryData[srcId];
      if (!item) continue;
      const cur = getItemScreenIds(item);
      if (!cur.includes(selectedScreenId)) {
        await set(ref(db, `library/${srcId}/screenIds`), [...cur, selectedScreenId]);
        await remove(ref(db, `library/${srcId}/screenId`));
      }
    }
    showToast(`${importSelectedIds.length} פריטים יובאו ✓`, 'success');
    importModal.classList.add('hidden');
    importSelectedIds = [];
  } catch (err) {
    showToast('שגיאה: ' + err.message, 'error');
  } finally {
    btnDoImport.textContent = 'ייבא למסך';
    btnDoImport.disabled = !importSelectedIds.length;
  }
});

/* ═══════════════════════════════════════════
   Helpers
═══════════════════════════════════════════ */
function contentTypeLabel(type) {
  return { youtube: 'YouTube', drive: 'Google Drive', image: 'תמונה', video: 'סרטון', pdf: 'PDF', webpage: 'אתר', playlist: 'פלייליסט' }[type] || type;
}

function contentLabelFromContent(c) {
  if (!c) return '—';
  if (c.type === 'playlist') return `פלייליסט (${(c.items || []).length} פריטים)`;
  return c.filename || contentTypeLabel(c.type);
}

function formatBytes(bytes) {
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimeout;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className   = 'toast ' + type;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

/* ═══════════════════════════════════════════
   Auto-update publisher (super-admin only)
═══════════════════════════════════════════ */
const updVerInput      = document.getElementById('upd-ver');
const updDropArea      = document.getElementById('upd-drop-area');
const updFileInput     = document.getElementById('upd-file-input');
const updFileInfo      = document.getElementById('upd-file-info');
const updProgressWrap  = document.getElementById('upd-progress-wrap');
const updProgressFill  = document.getElementById('upd-progress-fill');
const updProgressText  = document.getElementById('upd-progress-text');
const btnPublishUpdate = document.getElementById('btn-publish-update');
const updateStatusList = document.getElementById('update-status-list');

let updFile = null;

function checkUpdReady() {
  btnPublishUpdate.disabled = !(updFile && updVerInput?.value.trim().match(/^\d+\.\d+\.\d+$/));
}

updVerInput?.addEventListener('input', checkUpdReady);

updDropArea?.addEventListener('click', () => updFileInput?.click());
updDropArea?.addEventListener('dragover', e => { e.preventDefault(); updDropArea.style.borderColor = 'var(--accent)'; });
updDropArea?.addEventListener('dragleave', () => { updDropArea.style.borderColor = 'var(--border)'; });
updDropArea?.addEventListener('drop', e => {
  e.preventDefault();
  updDropArea.style.borderColor = 'var(--border)';
  const f = e.dataTransfer.files[0];
  if (f) setUpdFile(f);
});
updFileInput?.addEventListener('change', () => { if (updFileInput.files[0]) setUpdFile(updFileInput.files[0]); });

function setUpdFile(f) {
  updFile = f;
  updFileInfo.textContent = `${f.name} — ${formatBytes(f.size)}`;
  checkUpdReady();
}

btnPublishUpdate?.addEventListener('click', async () => {
  if (!updFile) return;
  const ver = updVerInput.value.trim();
  btnPublishUpdate.disabled = true;
  updProgressWrap.classList.remove('hidden');

  try {
    const storageRef = sRef(storage, `updates/app-${ver}.asar`);
    const task = uploadBytesResumable(storageRef, updFile);

    await new Promise((resolve, reject) => {
      task.on('state_changed',
        snap => {
          const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
          updProgressFill.style.width = pct + '%';
          updProgressText.textContent = pct + '%';
        },
        reject,
        resolve,
      );
    });

    const url = await getDownloadURL(storageRef);
    await set(ref(db, 'system/version'), {
      ver, url, publishedAt: Date.now(), publishedBy: auth.currentUser?.email || '',
    });

    showToast(`✅ גרסה ${ver} פורסמה`, 'success');
    updFile = null;
    updFileInfo.textContent = '';
    updVerInput.value = '';
    updFileInput.value = '';
  } catch (err) {
    showToast('שגיאה בפרסום: ' + err.message, 'error');
  } finally {
    updProgressWrap.classList.add('hidden');
    updProgressFill.style.width = '0%';
    checkUpdReady();
  }
});

// Listen to update status for all screens and render inside modal
const UPD_STATUS_LABEL = { downloading: '⬇️ מוריד...', restarting: '🔄 מפעיל מחדש...', done: '✅ עודכן' };

function renderUpdateStatus(statuses) {
  if (!updateStatusList) return;
  if (!Object.keys(statuses).length) {
    updateStatusList.innerHTML = '<div style="font-size:12px;color:var(--muted);">טרם בוצע עדכון</div>';
    return;
  }
  updateStatusList.innerHTML = SCREENS.map(s => {
    const st = statuses[s.id];
    if (!st) return '';
    const label = UPD_STATUS_LABEL[st.status] || st.status;
    const ago   = st.at ? Math.round((Date.now() - st.at) / 60000) + ' דק\' ' : '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
      <span>${escHtml(s.icon)} ${escHtml(s.name)}</span>
      <span style="color:var(--muted);">${escHtml(st.ver || '')} &nbsp; ${label} &nbsp; <span style="font-size:10px;">${ago}</span></span>
    </div>`;
  }).join('');
}

{
  const statuses = {};
  SCREENS.forEach(s => {
    onValue(ref(db, `screens/${s.id}/updateStatus`), snap => {
      if (snap.val()) statuses[s.id] = snap.val();
      else delete statuses[s.id];
      renderUpdateStatus(statuses);
    });
  });
}

/* ─── Init ─── */
renderNav();
