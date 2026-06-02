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
function showToast(msg, type = '', duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/** 描画ステップの案内（やや長め表示） */
function showDrawToast(msg, type = '') {
  showToast(msg, type, 4200);
}

/** 地図下部ダイアログのヒント文 */
function updateMapDrawHint(text) {
  const el = document.getElementById('map-draw-dialog-hint');
  if (el) el.textContent = text;
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

// ─── Draw Step Indicator ───
const STEP_CONFIG = {
  idle: {
    step: 0,
    guide: '地図右上の <strong>📐ボタン</strong> を押して描画を開始してください',
  },
  drawing: {
    step: 1,
    guide: '地図をタップして頂点を置き、位置を調整して<strong>確定</strong>。<br>3点以上で<strong>完了</strong>、<strong>戻る</strong>で取り消し、<strong>リセット</strong>で最初から',
  },
  editing: {
    step: 2,
    guide: '頂点をドラッグして位置を微調整できます。<br>完了したら <strong>編集を保存</strong> を押してください',
  },
  wizard: {
    step: 3,
    guide: 'エリア情報を入力して保存してください',
  },
  done: {
    step: 3,
    guide: '圃場を保存しました ✓<br>エリア一覧から確認・編集できます',
  },
};

function setDrawStep(state) {
  const cfg   = STEP_CONFIG[state] || STEP_CONFIG.idle;
  const steps = document.querySelectorAll('#draw-phase-steps .draw-step');
  steps.forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < cfg.step)  el.classList.add('done');
    if (i === cfg.step) el.classList.add('active');
  });

  const guide = document.getElementById('draw-guide');
  if (guide) guide.innerHTML = cfg.guide;

  if (state === 'drawing') {
    updateMapDrawHint('地図をタップして頂点を配置');
  }
}

// ═══════════════════════════════════════════
//  SAVE WIZARD
// ═══════════════════════════════════════════

let _wizardStep = 0;

function showWizard() {
  // ウィザード表示・ドン完了画面を隠す
  const wizard = document.getElementById('save-wizard');
  const done   = document.getElementById('wizard-done');
  wizard.classList.add('active');
  done.classList.remove('active');

  // スライドをslide 0にリセット
  _wizardStep = 0;
  _goToWizardSlide(0, 'none');

  // 入力フィールドをリセット
  const nameInput = document.getElementById('wizard-name');
  if (nameInput) {
    // デフォルト名を日時から生成
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    nameInput.value = `エリア ${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    // 全選択して上書きしやすくする
    setTimeout(() => nameInput.select(), 80);
  }
  document.getElementById('wizard-memo').value = '';

  // 土壌を「不明」にリセット
  document.querySelectorAll('.wizard-soil-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.soil === 'unknown');
  });

  // リセットボタン非表示
  const clearBtn = document.getElementById('btn-clear-draw');
  if (clearBtn) clearBtn.style.display = 'none';

  // シートを half に
  setSheet('half');
}

function hideWizard() {
  document.getElementById('save-wizard').classList.remove('active');
  const clearBtn = document.getElementById('btn-clear-draw');
  if (clearBtn) clearBtn.style.display = '';
}

// ─── ドット更新 ───
function _updateWizardDots(step) {
  for (let i = 0; i < 3; i++) {
    const dot = document.getElementById('wdot-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < step)  dot.classList.add('done');
    if (i === step) dot.classList.add('active');
  }
}

// ─── スライド遷移 ───
function _goToWizardSlide(target, direction) {
  const slides = document.querySelectorAll('.wizard-slide');
  slides.forEach((s, i) => {
    s.classList.remove('active', 'exit-left');
    if (direction !== 'none' && s.classList.contains('active') && i !== target) {
      // 現在スライドにexit-leftを付ける（forwardなら左退場）
    }
  });
  slides.forEach((s, i) => {
    s.classList.remove('active', 'exit-left');
  });
  // 現在のスライドを退場させる
  const current = document.querySelector('.wizard-slide.active');
  if (current && direction !== 'none') {
    current.classList.add('exit-left');
    setTimeout(() => current.classList.remove('exit-left'), 300);
  }
  const targetSlide = document.getElementById('wslide-' + target);
  if (targetSlide) {
    if (direction === 'back') {
      targetSlide.style.transform = 'translateX(-60px)';
      targetSlide.style.transition = 'none';
      requestAnimationFrame(() => {
        targetSlide.style.transition = '';
        targetSlide.style.transform  = '';
        targetSlide.classList.add('active');
      });
    } else {
      targetSlide.classList.add('active');
    }
  }
  _wizardStep = target;
  _updateWizardDots(target);
}

// ─── 次へ ───
function wizardNext(from) {
  if (from === 0) {
    const name = document.getElementById('wizard-name').value.trim();
    if (!name) {
      document.getElementById('wizard-name').focus();
      showToast('エリア名を入力してください', 'amber');
      return;
    }
    _goToWizardSlide(1, 'forward');
  } else if (from === 1) {
    // Step2: サマリーを更新してから遷移
    _updateWizardSummary();
    _goToWizardSlide(2, 'forward');
  }
}

// ─── 戻る ───
function wizardBack(from) {
  _goToWizardSlide(from - 1, 'back');
}

// ─── 土壌選択 ───
function selectWizardSoil(btn) {
  document.querySelectorAll('.wizard-soil-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ─── サマリー更新 ───
function _updateWizardSummary() {
  const name = document.getElementById('wizard-name').value.trim();
  const soilBtn = document.querySelector('.wizard-soil-btn.selected');
  const soilKey = soilBtn ? soilBtn.dataset.soil : 'unknown';

  const soilMap = { sandy:'砂質土', loam:'壌土', clay:'粘土質', peat:'泥炭土', volcanic:'火山灰土', unknown:'不明' };

  document.getElementById('wsummary-name').textContent    = name || '—';
  document.getElementById('wsummary-soil').textContent    = soilMap[soilKey] || '—';

  // 面積・気候帯はcurrentAreaDataから
  if (typeof currentAreaData !== 'undefined' && currentAreaData) {
    const ha = currentAreaData.areaSqm ? (currentAreaData.areaSqm / 10000).toFixed(3) + ' ha' : '—';
    document.getElementById('wsummary-area').textContent    = ha;
    document.getElementById('wsummary-climate').textContent = currentAreaData.climate?.name || '—';
  }
}

// ─── キャンセル ───
function cancelWizard() {
  hideWizard();
  // ポリゴンは残す（ユーザーが再描画を選べるよう）
  setDrawStep('idle');
  showToast('保存をキャンセルしました');
}

// ─── コミット（保存実行） ───
async function wizardCommit() {
  const btn = document.getElementById('wizard-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }

  const name  = document.getElementById('wizard-name').value.trim() || '無名エリア';
  const memo  = document.getElementById('wizard-memo').value.trim();
  const soilBtn = document.querySelector('.wizard-soil-btn.selected');
  const soilType = soilBtn ? soilBtn.dataset.soil : 'unknown';

  // area.js の commitSaveArea に渡す
  await commitSaveArea({ name, memo, soilType });

  if (btn) { btn.disabled = false; btn.textContent = '✓ 保存する'; }
}

// ─── 完了画面に切替 ───
function showWizardDone(areaName) {
  document.querySelectorAll('.wizard-slide').forEach(s => s.classList.remove('active'));
  document.getElementById('wizard-done').classList.add('active');
  const sub = document.getElementById('wizard-done-sub');
  if (sub) sub.textContent = `「${areaName}」をエリア一覧に追加しました`;
  setDrawStep('done');
}

// ─── エリア一覧へ移動 ───
function goToAreas() {
  hideWizard();
  switchTab('areas');
  loadAreas();
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
