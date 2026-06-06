// ═══════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════

// ─── フルスクリーンページ管理 ───
let _currentFsTab = 'areas';

const FS_TAB_TITLES = {
  areas:    'エリア一覧',
  analysis: '分析',
  records:  '記録',
};

function openPage(tab) {
  const page = document.getElementById('fs-page');
  if (!page) return;
  switchFsTab(tab || _currentFsTab);
  page.classList.add('open');
  page.removeAttribute('aria-hidden');
  // FABを隠す
  const fab = document.getElementById('fab-group');
  if (fab) fab.classList.add('hidden');
}

function closePage() {
  const page = document.getElementById('fs-page');
  if (!page) return;
  page.classList.remove('open');
  page.setAttribute('aria-hidden', 'true');
  // FABを戻す
  const fab = document.getElementById('fab-group');
  if (fab) fab.classList.remove('hidden');
}

function switchFsTab(tab) {
  _currentFsTab = tab;

  // タブボタン
  document.querySelectorAll('.fs-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // コンテンツ
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === 'tab-' + tab);
  });

  // タイトル更新
  const titleEl = document.getElementById('fs-title');
  if (titleEl) titleEl.textContent = FS_TAB_TITLES[tab] || '';

  // 記録タブ
  if (tab === 'records' && typeof renderRecordTab === 'function') renderRecordTab();
  // エリアタブ
  if (tab === 'areas'   && typeof loadAreas       === 'function') loadAreas();
}

// 後方互換（他jsから呼ばれる可能性）
function switchTab(name) {
  openPage(name);
}

function setSheet(state) {
  // BottomSheet廃止。呼び出し元との互換のみ保持
  if (state === 'half' || state === 'open') openPage(_currentFsTab);
}

// ─── スワイプ閉じ（フルスクリーンページ） ───
function initFsSwipe() {
  const page = document.getElementById('fs-page');
  if (!page) return;
  let startY = 0;
  let isDragging = false;

  page.addEventListener('touchstart', (e) => {
    // ヘッダー部分のみをスワイプ起点にする
    if (!e.target.closest('.fs-header')) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  page.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      page.style.transform = `translateY(${Math.min(dy * 0.4, 60)}px)`;
    }
  }, { passive: true });

  page.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dy = e.changedTouches[0].clientY - startY;
    page.style.transform = '';
    if (dy > 80) closePage();
  });
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

// ═══════════════════════════════════════════
//  SAVE WIZARD（ダイアログ内フェーズ切替）
// ═══════════════════════════════════════════

let _wizardStep = 0;

/** 描画フェーズ → ウィザードフェーズに切替 */
function showWizard() {
  const dlg = document.getElementById('map-draw-dialog');
  if (dlg) {
    dlg.hidden = false;
    dlg.removeAttribute('aria-hidden');
  }
  // フルスクリーンページを隠す（描画中はページ非表示）
  closePage();
  document.documentElement.classList.add('draw-dialog-active');

  const phaseDrawing = document.getElementById('draw-phase-drawing');
  const phaseWizard  = document.getElementById('draw-phase-wizard');
  if (phaseDrawing) phaseDrawing.hidden = true;
  if (phaseWizard)  phaseWizard.hidden  = false;

  const done = document.getElementById('wizard-done');
  if (done) done.classList.remove('active');

  _wizardStep = 0;
  _goToWizardSlide(0, 'none');

  const nameInput = document.getElementById('wizard-name');
  if (nameInput) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    nameInput.value = `エリア ${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setTimeout(() => nameInput.select(), 80);
  }
  const memo = document.getElementById('wizard-memo');
  if (memo) memo.value = '';

  document.querySelectorAll('.wizard-soil-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.soil === 'unknown');
  });
}

/** ウィザードを閉じる */
function hideWizard() {
  const dlg = document.getElementById('map-draw-dialog');
  if (dlg) {
    dlg.hidden = true;
    dlg.setAttribute('aria-hidden', 'true');
  }
  document.documentElement.classList.remove('draw-dialog-active');
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
  const current = document.querySelector('.wizard-slide.active');
  if (current && direction !== 'none') {
    current.classList.add('exit-left');
    setTimeout(() => current.classList.remove('exit-left'), 300);
  }
  slides.forEach(s => s.classList.remove('active', 'exit-left'));
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
  if (typeof currentAreaData !== 'undefined' && currentAreaData) {
    const ha = currentAreaData.areaSqm ? (currentAreaData.areaSqm / 10000).toFixed(3) + ' ha' : '—';
    document.getElementById('wsummary-area').textContent    = ha;
    document.getElementById('wsummary-climate').textContent = currentAreaData.climate?.name || '—';
  }
}

// ─── キャンセル ───
function cancelWizard() {
  hideWizard();
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
  await commitSaveArea({ name, memo, soilType });
  if (btn) { btn.disabled = false; btn.textContent = '✓ 保存する'; }
}

// ─── 完了画面に切替 ───
function showWizardDone(areaName) {
  document.querySelectorAll('.wizard-slide').forEach(s => s.classList.remove('active'));
  const done = document.getElementById('wizard-done');
  if (done) done.classList.add('active');
  const sub = document.getElementById('wizard-done-sub');
  if (sub) sub.textContent = `「${areaName}」をエリア一覧に追加しました`;
}

// ─── エリア一覧へ移動 ───
function goToAreas() {
  hideWizard();
  openPage('areas');
}

// ─── 初期化 ───
function initSheet() {
  // BottomSheet廃止。スワイプ閉じのみ初期化
  initFsSwipe();
}
