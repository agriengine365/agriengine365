// ═══════════════════════════════════════════
//  FIELD ADD CONTROLLER — 「圃場を追加」入口統合（Step5）
//  仕様書3.1/3.2・8章・9章。
//
//  これまでボトムナビに「圃場追加」（手動描画へ直接）「かんたん追加」
//  （EasyFieldDetect.start()）の2ボタンが分かれていたが、Step5で
//  「圃場追加」1ボタンに統合し、新設の「地図を合わせる」画面
//  （field-add-scope-phase：自動検出／手動で描く の2択）を必ず経由する。
//
//  フェーズ管理の一元化：
//  easyFieldDetect.js・fieldConfirmAdjust.js・polygonDraw.jsがそれぞれ
//  独自にほぼ同じALL_PHASE_IDS／_showPhase／_hideAllPhases／_openDialog／
//  _closeDialogを持っていた（3ファイルでの重複実装）ため、ここに一本化。
//  他モジュールはFieldAddController.showPhase(id) / hideAllPhases() /
//  openDialog() / closeDialog() を呼ぶだけにする。
//
//  この一本化により、「手動に切替」「手動描画へ」経由でPolygonDraw.start()
//  を呼んだ際に draw-phase-drawing の hidden が解除されず描画UIが
//  空白になっていたバグ（PolygonDraw.start()側でFieldAddController.showPhase()
//  を呼ぶよう修正）も根本的に解消される。
//
//  キャンセル・失敗時の戻り先（決定事項・B案＝現状維持）：
//  「キャンセル」は即ダイアログを閉じて終了、自動検出の失敗はその場
//  （地図を合わせる画面へは戻さず）に留まりトーストのみ、という従来の
//  挙動をそのまま踏襲する。backToScopeAlign()はAPIとして提供するのみで、
//  現時点で呼び出す箇所は限定的（将来の拡張用）。
// ═══════════════════════════════════════════

const FieldAddController = (() => {

  // ─── フェーズ管理（他モジュールと共有・唯一の定義） ───
  const ALL_PHASE_IDS = [
    'field-add-scope-phase',
    'draw-phase-drawing',
    'draw-phase-wizard',
    'efd-phase-cultivation',
    'efd-phase-shape',
    'efd-phase-tap',
    'field-confirm-phase',
  ];

  function showPhase(targetId) {
    ALL_PHASE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = (id !== targetId);
    });
  }

  function hideAllPhases() {
    ALL_PHASE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function openDialog() {
    const dlg = document.getElementById('map-draw-dialog');
    if (dlg) {
      dlg.hidden = false;
      dlg.removeAttribute('aria-hidden');
    }
    if (typeof closePage === 'function') closePage();
    document.documentElement.classList.add('draw-dialog-active');
  }

  function closeDialog() {
    const dlg = document.getElementById('map-draw-dialog');
    if (dlg) {
      if (typeof _blurIfInside === 'function') _blurIfInside(dlg);
      dlg.hidden = true;
      dlg.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('draw-dialog-active');
  }

  // ─── 「地図を合わせる」画面（field-add-scope-phase）用のスコープ表示 ───
  // 自動検出のタップ待機（efd-phase-tap）・手動描画（draw-phase-drawing）は
  // それぞれ独自にスコープを表示するため、遷移先でこのスコープを一旦隠す。
  function _setScopeVisible(visible) {
    const el = document.getElementById('draw-scope');
    if (el) el.classList.toggle('active', visible);
  }

  // ═══════════════════════════════════════════
  //  公開フロー
  // ═══════════════════════════════════════════

  // ─── 「圃場を追加」タップ時：唯一の入口 ───
  function start() {
    if (typeof PolygonDraw !== 'undefined' && PolygonDraw.isActive()) {
      PolygonDraw.cancel();
    }
    if (typeof FieldConfirmAdjust !== 'undefined') FieldConfirmAdjust.close();

    drawnItems.clearLayers();
    currentPolygon  = null;
    currentAreaData = null;
    if (typeof resetStats === 'function') resetStats();

    openDialog();
    showPhase('field-add-scope-phase');
    _setScopeVisible(true);
    updateMapDrawHint('地図を動かして、圃場の中心にスコープを合わせてください');
  }

  // ─── 「自動で検出」選択 ───
  function chooseAuto() {
    _setScopeVisible(false);
    if (typeof EasyFieldDetect !== 'undefined' && typeof EasyFieldDetect.beginDetectFlow === 'function') {
      EasyFieldDetect.beginDetectFlow();
    } else {
      showToast('自動検出機能を読み込み中です', 'amber');
    }
  }

  // ─── 「手動で描く」選択 ───
  function chooseManual() {
    _setScopeVisible(false);
    if (typeof PolygonDraw !== 'undefined' && typeof PolygonDraw.start === 'function') {
      PolygonDraw.start();
    } else {
      showToast('手動描画機能を読み込み中です', 'amber');
    }
  }

  // ─── 「地図を合わせる」画面からキャンセル（B案：即終了） ───
  function cancel() {
    _setScopeVisible(false);
    hideAllPhases();
    closeDialog();
    if (typeof setSheet === 'function') setSheet('half');
    showToast('圃場追加をキャンセルしました');
  }

  // ─── 各フェーズから「地図を合わせる」へ戻る共通処理（API提供のみ・呼び出し箇所は限定的） ───
  function backToScopeAlign() {
    showPhase('field-add-scope-phase');
    _setScopeVisible(true);
    updateMapDrawHint('地図を動かして、圃場の中心にスコープを合わせてください');
  }

  // ─── 公開API（仕様書9章・確定シグネチャ＋フェーズ管理の共通関数を追加） ───
  return {
    start,
    chooseAuto,
    chooseManual,
    cancel,
    backToScopeAlign,
    showPhase,
    hideAllPhases,
    openDialog,
    closeDialog,
  };
})();