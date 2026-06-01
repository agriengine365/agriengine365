// ═══════════════════════════════════════════
//  FIREBASE — 接続・設定モーダル
// ═══════════════════════════════════════════

let db = null;

function loadFirebaseConfig() {
  try {
    const raw = localStorage.getItem(CONFIG.FIREBASE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function initFirebase(cfg) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey:     cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId:  cfg.projectId,
      });
    }
    db = firebase.firestore();
    const el = document.getElementById('firebase-status');
    el.textContent    = '● Firebase接続済';
    el.style.color    = 'var(--green)';
    el.style.borderColor = 'var(--green3)';
    return true;
  } catch(e) {
    console.error(e);
    return false;
  }
}

function openModal() {
  const cfg = loadFirebaseConfig() || {};
  ['apiKey','authDomain','projectId'].forEach(k => {
    document.getElementById('cfg-' + k).value = cfg[k] || '';
  });
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function saveFirebaseConfig() {
  const cfg = {
    apiKey:     document.getElementById('cfg-apiKey').value.trim(),
    authDomain: document.getElementById('cfg-authDomain').value.trim(),
    projectId:  document.getElementById('cfg-projectId').value.trim(),
  };
  if (!cfg.apiKey || !cfg.projectId) {
    showToast('apiKeyとprojectIdは必須です', 'amber');
    return;
  }
  localStorage.setItem(CONFIG.FIREBASE_KEY, JSON.stringify(cfg));
  if (initFirebase(cfg)) {
    showToast('Firebase接続しました', 'green');
    closeModal();
    loadAreas();
  } else {
    showToast('接続に失敗しました。設定を確認してください', 'amber');
  }
}

// 起動時に保存済み設定があれば自動接続
(function autoInit() {
  const stored = loadFirebaseConfig();
  if (stored) initFirebase(stored);
})();
