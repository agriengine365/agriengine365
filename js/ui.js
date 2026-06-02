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
  // タブ切り替え時にシートを半開きに
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

  // 初期状態
  sheet.classList.add('peek');

  // ─── タッチ操作 ───
  let startY = 0;
  let startTranslate = 0;
  let isDragging = false;

  function getTranslate(el) {
    const style = window.getComputedStyle(el);
    const mat = new WebKitCSSMatrix(style.transform);
    return mat.m42;
  }

  handle.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    startTranslate = getTranslate(sheet);
    sheet.style.transition = 'none';
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    const newY = Math.max(0, startTranslate + dy);
    sheet.style.transform = `translateY(${newY}px)`;
  }, { passive: true });

  handle.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';
    sheet.style.transform = '';

    const endY = e.changedTouches[0].clientY;
    const dy   = endY - startY;
    const fullH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet-full'));

    // 現在の状態を取得
    const cur = SHEET_STATES.find(s => sheet.classList.contains(s)) || 'peek';
    const idx = SHEET_STATES.indexOf(cur);

    if (dy < -40 && idx < SHEET_STATES.length - 1) {
      setSheet(SHEET_STATES[idx + 1]); // 上にスワイプ → 次の状態へ
    } else if (dy > 40 && idx > 0) {
      setSheet(SHEET_STATES[idx - 1]); // 下にスワイプ → 前の状態へ
    } else {
      setSheet(cur); // 元の状態に戻す
    }
  });

  // ─── マウス操作（PC） ───
  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startTranslate = getTranslate(sheet);
    sheet.style.transition = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    const dy = e.clientY - startY;
    const newY = Math.max(0, startTranslate + dy);
    sheet.style.transform = `translateY(${newY}px)`;
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    const dy  = e.clientY - startY;
    const cur = SHEET_STATES.find(s => sheet.classList.contains(s)) || 'peek';
    const idx = SHEET_STATES.indexOf(cur);

    if (dy < -40 && idx < SHEET_STATES.length - 1) {
      setSheet(SHEET_STATES[idx + 1]);
    } else if (dy > 40 && idx > 0) {
      setSheet(SHEET_STATES[idx - 1]);
    } else {
      setSheet(cur);
    }
  }

  // ─── タブクリック時にシート半開き ───
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      const cur = SHEET_STATES.find(s => sheet.classList.contains(s)) || 'peek';
      if (cur === 'peek') setSheet('half');
    });
  });
}
