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
  // ナビを隠す（adp-viewが閉じたあとに復帰済みのため非表示にしない）
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.remove('hidden');
}

function closePage() {
  const page = document.getElementById('fs-page');
  if (!page) return;
  page.classList.remove('open');
  page.setAttribute('aria-hidden', 'true');
  // bottom-navアクティブ状態をクリア
  document.querySelectorAll('.bnav-btn[data-nav]').forEach(btn => btn.classList.remove('active'));
  // ナビを戻す
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.remove('hidden');
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

  // bottom-navアクティブ状態を連動
  const tabToNav = { areas: 'areas', analysis: 'analysis', records: 'records' };
  document.querySelectorAll('.bnav-btn[data-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === tabToNav[tab]);
  });

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
// バグ修正: 従来はダイアログを閉じるだけで、地図上に確定済みのポリゴンや
// currentPolygon が残ったままになっていた。ここで明示的にクリアする。
function cancelWizard() {
  hideWizard();
  if (typeof drawnItems !== 'undefined' && drawnItems) drawnItems.clearLayers();
  if (typeof currentPolygon !== 'undefined') currentPolygon = null;
  if (typeof pendingCultivationMode !== 'undefined') pendingCultivationMode = null;
  if (typeof resetStats === 'function') resetStats();
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

// ─── 続けてエリアを追加（完了画面から連続追加） ───
// Step5：PolygonDraw.start()直呼びから、入口統合後のFieldAddController.start()
// 経由に変更（仕様書3.1・9章）。これにより「地図を合わせる」画面（自動検出／
// 手動で描く の選択）を毎回経由するようになる。
function addAnotherArea() {
  hideWizard();
  FieldAddController.start();
}

// ─── エリア一覧へ移動 ───
function goToAreas() {
  hideWizard();
  openPage('areas');
}

// ─── このエリアのページへ移動（保存直後のエリアの分析パネルを開く） ───
// area.js の commitSaveArea() が保存完了時に currentSavedAreaId をセットしている
// ことを利用し、その1件だけを取得して selectArea() に渡す
// （selectArea は地図表示＋openAreaDetailPanel を内部で行う）。
async function goToAreaPage() {
  hideWizard();

  if (typeof currentSavedAreaId === 'undefined' || !currentSavedAreaId) {
    openPage('areas');
    return;
  }

  let area = null;
  try {
    if (typeof db !== 'undefined' && db) {
      const doc = await db.collection('areas').doc(currentSavedAreaId).get();
      if (doc.exists) area = { id: doc.id, ...doc.data() };
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      area = stored.find(a => a.id === currentSavedAreaId) || null;
    }
  } catch (e) {
    console.error(e);
  }

  if (!area || typeof selectArea !== 'function') {
    // 取得失敗時は一覧にフォールバック
    openPage('areas');
    return;
  }

  selectArea(area);
}

// ─── 初期化 ───
function initSheet() {
  // BottomSheet廃止。スワイプ閉じのみ初期化
  initFsSwipe();
}

// ═══════════════════════════════════════════
//  共通確認モーダル（confirm()代替）
// ═══════════════════════════════════════════

let _confirmResolve = null;

/**
 * confirm()の代替。Promiseを返す。
 * @param {string} message   本文
 * @param {string} [okLabel]    確定ボタンのラベル（デフォルト: '削除する'）
 * @param {string} [cancelLabel] キャンセルラベル（デフォルト: 'キャンセル'）
 * @param {boolean} [danger]  trueにすると確定ボタンが赤くなる
 * @returns {Promise<boolean>}
 */
function showConfirmDialog(message, okLabel = '削除する', cancelLabel = 'キャンセル', danger = true) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    const overlay = document.getElementById('confirm-modal-overlay');
    const msgEl   = document.getElementById('confirm-modal-message');
    const okBtn   = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    if (!overlay) { resolve(window.confirm(message)); return; }
    msgEl.textContent    = message;
    okBtn.textContent    = okLabel;
    cancelBtn.textContent = cancelLabel;
    okBtn.className = 'confirm-modal-btn confirm-modal-ok' + (danger ? ' danger' : '');
    overlay.classList.add('open');
  });
}

function _confirmModalAnswer(result) {
  const overlay = document.getElementById('confirm-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

// ═══════════════════════════════════════════
//  保存データ全削除（トップ画面の単独ボタン）
//  この端末（ブラウザ）のlocalStorageに保存されたデータを全て削除する。
//  Firestore等クラウド側のデータには触れない（ローカルのみを対象とする）。
// ═══════════════════════════════════════════

async function confirmClearLocalData() {
  const ok = await showConfirmDialog(
    'この端末に保存されているデータ（エリア・設定など）をすべて削除します。この操作は取り消せません。よろしいですか？',
    '削除する',
    'キャンセル',
    true
  );
  if (!ok) return;

  try {
    localStorage.clear();
  } catch (e) {
    console.error('[confirmClearLocalData] localStorage.clear失敗:', e);
    showToast('削除に失敗しました', 'amber');
    return;
  }

  showToast('保存データを削除しました');
  setTimeout(() => location.reload(), 600);
}