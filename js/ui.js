// ═══════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════

// ─── タブ切り替え ───
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name)
  );
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === 'tab-' + name)
  );
  setSheet('half');
}

// ─── テキスト設定 ───
function setText(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ─── Toast ───
let _toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── Modal ───
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

// ─── Accordion ───
function toggleAccordion(header) {
  const card = header.closest('.accordion');
  card.classList.toggle('open');
}

// ═══════════════════════════════════════════
//  DRAW STEP INDICATOR
// ═══════════════════════════════════════════

// 状態: idle / drawing / editing / saving / done
const STEP_CONFIG = {
  idle: {
    step: 0,
    guide: '地図右上の <strong>📐ボタン</strong> を押して描画を開始してください',
  },
  drawing: {
    step: 1,
    guide: '地図をタップして頂点を追加してください。<br>最初の点をタップすると圃場が完成します',
  },
  editing: {
    step: 2,
    guide: '頂点をドラッグして位置を微調整できます。<br>完了したら <strong>編集を保存</strong> を押してください',
  },
  saving: {
    step: 2,
    guide: '保存中...',
  },
  done: {
    step: 3,
    guide: '圃場を保存しました ✓<br>エリア一覧から名前・土壌・メモを編集できます',
  },
};

function setDrawStep(state) {
  const cfg  = STEP_CONFIG[state] || STEP_CONFIG.idle;
  const steps = document.querySelectorAll('.draw-step');
  steps.forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < cfg.step)  el.classList.add('done');
    if (i === cfg.step) el.classList.add('active');
  });

  const guide = document.getElementById('draw-guide');
  if (guide) guide.innerHTML = cfg.guide;
}

// ═══════════════════════════════════════════
//  BOTTOM SHEET
// ═══════════════════════════════════════════

const SHEET_STATES = ['peek', 'half', 'open'];

function setSheet(state) {
  const sheet = document.getElementById('sheet');
  sheet.classList.remove(...SHEET_STATES);
  sheet.classList.add(state);
}

function initSheet() {
  const sheet  = document.getElementById('sheet');
  const handle = document.getElementById('sheet-handle');

  sheet.classList.add('peek');

  let startY = 0;
  let startTranslate = 0;
  let isDragging = false;

  function getTranslate(el) {
    const style = window.getComputedStyle(el);
    const mat   = new WebKitCSSMatrix(style.transform);
    return mat.m42;
  }

  handle.addEventListener('touchstart', (e) => {
    isDragging     = true;
    startY         = e.touches[0].clientY;
    startTranslate = getTranslate(sheet);
    sheet.style.transition = 'none';
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dy   = e.touches[0].clientY - startY;
    const newY = Math.max(0, startTranslate + dy);
    sheet.style.transform = `translateY(${newY}px)`;
  }, { passive: true });

  handle.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';
    sheet.style.transform  = '';
    const endY = e.changedTouches[0].clientY;
    const dy   = endY - startY;
    const cur  = SHEET_STATES.find(s => sheet.classList.contains(s)) || 'peek';
    const idx  = SHEET_STATES.indexOf(cur);
    if (dy < -40 && idx < SHEET_STATES.length - 1) setSheet(SHEET_STATES[idx + 1]);
    else if (dy > 40 && idx > 0)                    setSheet(SHEET_STATES[idx - 1]);
    else                                             setSheet(cur);
  });

  // ─── マウス操作（PC）───
  handle.addEventListener('mousedown', (e) => {
    isDragging     = true;
    startY         = e.clientY;
    startTranslate = getTranslate(sheet);
    sheet.style.transition = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    const dy   = e.clientY - startY;
    const newY = Math.max(0, startTranslate + dy);
    sheet.style.transform = `translateY(${newY}px)`;
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';
    sheet.style.transform  = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
    const dy  = e.clientY - startY;
    const cur = SHEET_STATES.find(s => sheet.classList.contains(s)) || 'peek';
    const idx = SHEET_STATES.indexOf(cur);
    if (dy < -40 && idx < SHEET_STATES.length - 1) setSheet(SHEET_STATES[idx + 1]);
    else if (dy > 40 && idx > 0)                    setSheet(SHEET_STATES[idx - 1]);
    else                                             setSheet(cur);
  }

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      const cur = SHEET_STATES.find(s => sheet.classList.contains(s)) || 'peek';
      if (cur === 'peek') setSheet('half');
    });
  });
}
