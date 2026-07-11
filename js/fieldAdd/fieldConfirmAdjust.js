// ═══════════════════════════════════════════
//  FIELD CONFIRM ADJUST — 「確認・微調整」画面（手動・自動 共通）
//  仕様書5章・9章。手動描画の「完了」直後、および自動検出の「検出」成功直後は
//  同一のこの画面（#field-confirm-phase）に入る。プレビュー用のEditableポリゴン
//  レイヤーはこのモジュールが所有し、頂点ドラッグ／タップ追加／長押し削除・
//  リアルタイム面積表示をここに集約する（5章：手動描画側の課題も自動検出側の
//  頂点編集機能とまとめて解決する統合方針）。
//
//  Step3時点の接続状況：
//  - 自動検出（EasyFieldDetect）側は接続済み。detect()成功時・感度スライダー
//    変更による再検出成功時、いずれも _buildAndShowPreviewFromMask() から
//    FieldConfirmAdjust.open(latlngs, {source:'auto', sensitivityValue}) を呼ぶ。
//    旧efd-phase-preview（自動検出専用のプレビュー画面）はここで役目を終えたため
//    easyFieldDetect.js / index.htmlから撤去済み。
//  - 手動描画（PolygonDraw）側は未接続のまま（Step4で接続予定）。
//    そのためsource:'manual'のopen()は現時点では実際には呼ばれない
//    （field-confirm-phaseのUI自体はsource:'manual'表示にも対応済み）。
//
//  頂点編集タッチジェスチャー（仕様書5.2）：
//  - 頂点マーカーのドラッグ＝移動：Leaflet.Editable標準動作そのまま
//  - 中間点マーカーのタップ＝新規頂点追加：Leaflet.Editable標準動作
//    （MiddleMarkerのクリックハンドラが内部で新規頂点を挿入する。Leafletは
//    タッチのtapをclickイベントへ正規化するため独自実装は不要という判断で
//    実装しているが、実機タッチ操作での最終確認を推奨）
//  - 頂点マーカーの長押し(500ms)＝削除確認：独自実装（このファイル内）。
//    削除確認は ui.js の showConfirmDialog() を利用。
//    頂点数が3未満になる削除は無効化する。
//    ＊初期表示済みの頂点（enableEdit()時点で既に存在する頂点）には
//      'editable:vertex:new'イベントが発火しないため、_buildPreviewLayer()内で
//      editor.editLayer を直接走査して個別にバインドする。中間点タップ等で
//      後から追加された頂点は map レベルの 'editable:vertex:new' で拾う。
// ═══════════════════════════════════════════

const FieldConfirmAdjust = (() => {

  const LONG_PRESS_MS = 500;

  const state = {
    source:          'auto', // 'manual' | 'auto'
    previewLayer:    null,   // L.Polygon（Editable編集対象。このモジュールが所有）
    isRectMode:      false,  // true: EFD「四角形」検出由来の矩形（4頂点）
    rectLocked:      false,  // true: 矩形モード中、頂点編集を対角固定リサイズに拘束中
    cultivationHint: null,   // null | 'greenhouse' | 'heatedGreenhouse'
    houseSnapInfo:   null,   // easyFieldDetect.jsの_applyHouseSnap()結果
    _rectDrag:       null,   // ドラッグ中の一時作業領域（{anchorIdx, prevIdx, nextIdx, prevUnit, nextUnit, anchorPt}）
  };

  let _editableEventsBound = false;

  // ═══════════════════════════════════════════
  //  フェーズ切替・ダイアログ開閉
  //  Step5：easyFieldDetect.jsとほぼ同じ実装がここにも重複していたため、
  //  js/fieldAdd/fieldAddController.js に一本化。ここでは
  //  FieldAddController.showPhase() 等を呼ぶだけにする。
  // ═══════════════════════════════════════════

  // ═══════════════════════════════════════════
  //  画面を開く（手動・自動 共通の入口）
  // ═══════════════════════════════════════════

  // options.source: 'manual' | 'auto'
  // options.sensitivityValue: number | null（autoの場合のみスライダーへ反映）
  // options.isRect: true の場合、頂点編集を「対角固定・リサイズ型」に拘束する
  //（EFD「四角形」選択で検出した矩形が、自由編集で崩れてしまう問題への対応）。
  // options.cultivationHint / options.houseSnapInfo: ハウス規格スナップの結果表示用。
  function open(polygonLatLngs, options = {}) {
    const source = options.source === 'manual' ? 'manual' : 'auto';
    state.source          = source;
    state.isRectMode      = !!options.isRect;
    state.rectLocked      = state.isRectMode;
    state.cultivationHint = options.cultivationHint || null;
    state.houseSnapInfo   = options.houseSnapInfo || null;
    state._rectDrag       = null;

    _buildPreviewLayer(polygonLatLngs);

    FieldAddController.openDialog();
    FieldAddController.showPhase('field-confirm-phase');

    const sensRow       = document.getElementById('fca-sensitivity-row');
    const actionsAuto    = document.getElementById('fca-actions-auto');
    const actionsManual  = document.getElementById('fca-actions-manual');
    if (sensRow)      sensRow.hidden      = (source !== 'auto');
    if (actionsAuto)   actionsAuto.hidden   = (source !== 'auto');
    if (actionsManual) actionsManual.hidden = (source === 'auto');

    if (source === 'auto' && typeof options.sensitivityValue === 'number') {
      _syncSlider(options.sensitivityValue);
    }

    _updateRectLockUI();
    _updateHouseSnapNote();

    updateLiveAreaDisplay();
  }

  // ─── 矩形拘束状態に応じてヒント文言・「拘束を解除」ボタンの表示を切り替え ───
  function _updateRectLockUI() {
    const row = document.getElementById('fca-rect-lock-row');
    if (row) row.hidden = !(state.isRectMode && state.rectLocked);

    const hintEl = document.getElementById('fca-hint');
    if (hintEl) {
      hintEl.textContent = (state.isRectMode && state.rectLocked)
        ? '角をドラッグしてサイズ調整（矩形を維持したまま拡大・縮小できます）'
        : '頂点をドラッグして移動、長押しで削除。辺の中間点をタップすると頂点を追加できます';
    }
  }

  // ─── ハウス規格スナップの結果を確認画面に一言表示 ───
  function _updateHouseSnapNote() {
    const noteEl = document.getElementById('fca-house-snap-note');
    if (!noteEl) return;
    const info = state.houseSnapInfo;
    if (!info) { noteEl.hidden = true; return; }
    noteEl.hidden = false;
    noteEl.textContent = info.widthSnapped
      ? `間口を規格値 ${info.widthM}m に調整しました（奥行き 約${info.depthM}m）`
      : `間口 約${info.widthM.toFixed(1)}m は規格外のため未調整です（奥行き 約${info.depthM}m）`;
  }

  // ─── 「矩形の拘束を解除」ボタン：以後は自由編集（頂点追加・削除も可）に切り替える ───
  function unlockRect() {
    if (!state.isRectMode || !state.rectLocked) return;
    state.rectLocked = false;
    _updateRectLockUI();
    showDrawToast('矩形の拘束を解除しました。自由に編集できます', 'amber');
  }

  // ─── 他フローからの防御的クリーンアップ（開始時の残骸処理など） ───
  function close() {
    _cleanupPreviewLayer();
    FieldAddController.hideAllPhases();
    state.isRectMode      = false;
    state.rectLocked      = false;
    state.cultivationHint = null;
    state.houseSnapInfo   = null;
    state._rectDrag       = null;
  }

  // ═══════════════════════════════════════════
  //  リアルタイム面積表示（仕様書5.1）
  // ═══════════════════════════════════════════

  function updateLiveAreaDisplay() {
    const layer = state.previewLayer;
    if (!layer) return;
    const latlngs = layer.getLatLngs()[0];
    if (!latlngs || latlngs.length < 3) {
      _setAreaStatus(`頂点数: ${latlngs ? latlngs.length : 0}（3点以上必要）`, true);
      return;
    }
    try {
      const areaSqm = calcPolygonArea(latlngs);
      const ha = (areaSqm / 10000).toFixed(3);
      _setAreaStatus(`${latlngs.length}頂点・約 ${ha} ha`, false);
    } catch (e) {
      _setAreaStatus(`${latlngs.length}頂点`, false);
    }
  }

  function _setAreaStatus(text, isWarning) {
    const el = document.getElementById('fca-area-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('efd-preview-status-warn', !!isWarning);
  }

  // ═══════════════════════════════════════════
  //  感度スライダー（自動検出時のみ）：EasyFieldDetectへ委譲
  //  デバウンス（150ms）はEasyFieldDetect.onSensitivityChange側で実施済みのため
  //  ここでは二重にデバウンスしない（仕様書5.3）。
  // ═══════════════════════════════════════════

  function onSensitivityChange(value) {
    const valEl = document.getElementById('fca-sensitivity-val');
    if (valEl) valEl.textContent = String(value);

    if (state.source !== 'auto') return;
    if (typeof EasyFieldDetect !== 'undefined' && typeof EasyFieldDetect.onSensitivityChange === 'function') {
      EasyFieldDetect.onSensitivityChange(value);
    }
  }

  function _syncSlider(value) {
    const slider = document.getElementById('fca-sensitivity-slider');
    const valEl  = document.getElementById('fca-sensitivity-val');
    if (slider) slider.value = value;
    if (valEl)  valEl.textContent = String(value);
  }

  // ═══════════════════════════════════════════
  //  確定：既存の保存フロー（onDrawPolygonComplete）に接続
  // ═══════════════════════════════════════════

  function confirm() {
    if (!state.previewLayer) return;

    const rawLatLngs = state.previewLayer.getLatLngs()[0];
    if (!rawLatLngs || rawLatLngs.length < 3) {
      showDrawToast('頂点が足りません（3点以上必要）', 'amber');
      return;
    }

    const poly = L.polygon(rawLatLngs.map(ll => [ll.lat, ll.lng]), {
      color:       (typeof CONFIG !== 'undefined' && CONFIG.DRAW_COLOR) || '#4ade80',
      weight:      2,
      fillOpacity: 0.15,
      interactive: true,
    });

    // EFDで選択した栽培方式（ハウス/加温）をcommitSaveArea()側へ引き渡す。
    // グローバル変数pendingCultivationModeはmain.jsで宣言・commitSaveArea()側でリセット。
    if (typeof pendingCultivationMode !== 'undefined') {
      pendingCultivationMode = state.cultivationHint || null;
    }

    _cleanupPreviewLayer();
    FieldAddController.hideAllPhases();

    drawnItems.clearLayers();
    drawnItems.addLayer(poly);
    currentPolygon = poly;

    showDrawToast('圃場の形を確定しました', 'green');
    onDrawPolygonComplete(poly); // map.js: 統計計算 → showWizard()
  }

  // ─── やり直す（自動検出時のみ）：地図を合わせる画面（タップフェーズ）へ戻る ───
  function retry() {
    _cleanupPreviewLayer();
    if (typeof EasyFieldDetect !== 'undefined' && typeof EasyFieldDetect.backToTap === 'function') {
      EasyFieldDetect.backToTap();
    } else {
      FieldAddController.hideAllPhases();
      FieldAddController.closeDialog();
    }
  }

  // ─── 手動に切替（自動検出時のみ）：検出途中の頂点は引き継がず、手動描画をまっさらに開始 ───
  // Step5：FieldAddController.chooseManual()経由に変更。PolygonDraw.start()内の
  // showPhase('draw-phase-drawing')呼び出しがフェーズのhidden解除を担うため、
  // ここで先にhideAllPhases()/closeDialog()を呼ばない（旧実装ではこの後
  // PolygonDraw.start()がdraw-phase-drawingのhiddenを戻す処理を持っておらず、
  // 手動描画に切り替えると描画UIが空白になるバグがあった）。
  function switchToManual() {
    _cleanupPreviewLayer();
    showToast('手動描画に切り替えました', 'amber');
    if (typeof FieldAddController !== 'undefined' && typeof FieldAddController.chooseManual === 'function') {
      FieldAddController.chooseManual();
    } else if (typeof PolygonDraw !== 'undefined') {
      PolygonDraw.start();
    }
  }

  // ═══════════════════════════════════════════
  //  プレビューレイヤー生成・破棄
  // ═══════════════════════════════════════════

  function _buildPreviewLayer(latlngs) {
    _cleanupPreviewLayer();

    const poly = L.polygon(latlngs, {
      color:       (typeof CONFIG !== 'undefined' && CONFIG.DRAW_COLOR) || '#4ade80',
      weight:      2,
      fillOpacity: 0.15,
      interactive: true,
    }).addTo(map);

    if (typeof L.Editable !== 'undefined') {
      if (!map.editTools) map.editTools = new L.Editable(map);
      poly.enableEdit();
      // 初期表示済みの頂点（enableEdit()時点で既存の全頂点）に長押し削除を個別バインド。
      // これらは 'editable:vertex:new' が発火しないため、editor.editLayer を直接走査する。
      _bindAllExistingVertexLongPress(poly);
    } else {
      console.warn('[FieldConfirmAdjust] Leaflet.Editableが読み込まれていません。頂点の手動微調整はできません。');
    }

    state.previewLayer = poly;
    _bindMapEditableEvents();
  }

  function _cleanupPreviewLayer() {
    if (state.previewLayer) {
      try {
        if (state.previewLayer.editEnabled && state.previewLayer.editEnabled()) {
          state.previewLayer.disableEdit();
        }
      } catch (e) { /* noop */ }
      map.removeLayer(state.previewLayer);
      state.previewLayer = null;
    }
  }

  // ═══════════════════════════════════════════
  //  頂点編集タッチジェスチャー（仕様書5.2）
  //  Leaflet.Editableのmapレベルイベントにフックする
  //  （一度だけbindし、e.layerで現在のstate.previewLayerかどうかを判定する）。
  // ═══════════════════════════════════════════

  function _bindAllExistingVertexLongPress(poly) {
    if (!poly.editor || !poly.editor.editLayer || !L.Editable.VertexMarker) return;
    poly.editor.editLayer.eachLayer(layer => {
      if (layer instanceof L.Editable.VertexMarker) {
        _bindVertexLongPress(layer);
      }
    });
  }

  function _bindMapEditableEvents() {
    if (_editableEventsBound) return;
    _editableEventsBound = true;

    // 中間点タップ等で新たに挿入された頂点はここで拾って長押し削除をバインドする。
    // 矩形拘束中（isRectMode && rectLocked）に頂点が追加されると4頂点の矩形が
    // 崩れてしまうため、確認ダイアログを出し、同意しない場合は追加を取り消す。
    map.on('editable:vertex:new', async (e) => {
      if (e.layer !== state.previewLayer) return;
      if (e.vertex) _bindVertexLongPress(e.vertex);

      if (state.isRectMode && state.rectLocked) {
        const addedVertex = e.vertex;
        const ok = await showConfirmDialog(
          '頂点を追加すると、矩形の拘束が解除され自由に編集できるようになります。追加しますか？',
          '解除して追加', 'キャンセル', true
        );
        if (!ok) {
          try { if (addedVertex && typeof addedVertex.delete === 'function') addedVertex.delete(); } catch (err) { /* noop */ }
          updateLiveAreaDisplay();
          return;
        }
        state.rectLocked = false;
        _updateRectLockUI();
      }
      updateLiveAreaDisplay();
    });

    // ─── 矩形拘束中の頂点ドラッグ：対角固定・リサイズ型に変換 ───
    // ドラッグ開始頂点の対角（anchor）は固定したまま、隣接2頂点を
    // 「アンカーから見た元の辺方向」への投影で再計算し、常に矩形を維持する。
    map.on('editable:vertex:dragstart', (e) => {
      if (e.layer !== state.previewLayer) return;
      if (!state.isRectMode || !state.rectLocked) return;

      const latlngs = state.previewLayer.getLatLngs()[0];
      if (!latlngs || latlngs.length !== 4) { state.rectLocked = false; _updateRectLockUI(); return; }

      const idx       = e.vertex.getIndex();
      const anchorIdx = (idx + 2) % 4;
      const prevIdx   = (idx + 3) % 4;
      const nextIdx   = (idx + 1) % 4;
      const zoom      = map.getZoom();
      const project   = (ll) => map.project(ll, zoom);

      const anchorPt = project(latlngs[anchorIdx]);
      const prevPt0  = project(latlngs[prevIdx]);
      const nextPt0  = project(latlngs[nextIdx]);

      const prevVec = { x: prevPt0.x - anchorPt.x, y: prevPt0.y - anchorPt.y };
      const prevLen = Math.hypot(prevVec.x, prevVec.y) || 1;
      const nextVec = { x: nextPt0.x - anchorPt.x, y: nextPt0.y - anchorPt.y };
      const nextLen = Math.hypot(nextVec.x, nextVec.y) || 1;

      state._rectDrag = {
        anchorIdx, prevIdx, nextIdx, zoom,
        anchorPt,
        prevUnit: { x: prevVec.x / prevLen, y: prevVec.y / prevLen },
        nextUnit: { x: nextVec.x / nextLen, y: nextVec.y / nextLen },
      };
    });

    map.on('editable:vertex:drag', (e) => {
      if (e.layer !== state.previewLayer) return;
      if (!state.isRectMode || !state.rectLocked || !state._rectDrag) return;
      _applyRectConstraint(e.vertex);
    });

    map.on('editable:vertex:dragend', (e) => {
      if (e.layer !== state.previewLayer) return;
      if (state.isRectMode && state.rectLocked && state._rectDrag) {
        _applyRectConstraint(e.vertex);
      }
      state._rectDrag = null;
      updateLiveAreaDisplay();
    });

    map.on('editable:vertex:deleted', (e) => {
      if (e.layer !== state.previewLayer) return;
      updateLiveAreaDisplay();
    });
  }

  // ─── ドラッグ中の頂点位置から、矩形を維持するよう他2頂点を再計算して反映 ───
  function _applyRectConstraint(draggedVertexMarker) {
    const rd = state._rectDrag;
    if (!rd) return;

    const project   = (ll) => map.project(ll, rd.zoom);
    const unproject = (pt) => map.unproject(pt, rd.zoom);

    const draggedPt = project(draggedVertexMarker.latlng);
    const dx = draggedPt.x - rd.anchorPt.x;
    const dy = draggedPt.y - rd.anchorPt.y;

    const prevDot = dx * rd.prevUnit.x + dy * rd.prevUnit.y;
    const nextDot = dx * rd.nextUnit.x + dy * rd.nextUnit.y;

    const newPrevPt = { x: rd.anchorPt.x + rd.prevUnit.x * prevDot, y: rd.anchorPt.y + rd.prevUnit.y * prevDot };
    const newNextPt = { x: rd.anchorPt.x + rd.nextUnit.x * nextDot, y: rd.anchorPt.y + rd.nextUnit.y * nextDot };

    const markers = _getVertexMarkersByIndex(state.previewLayer);
    if (markers[rd.prevIdx]) markers[rd.prevIdx].setLatLng(unproject(newPrevPt));
    if (markers[rd.nextIdx]) markers[rd.nextIdx].setLatLng(unproject(newNextPt));

    updateLiveAreaDisplay();
  }

  // ─── 頂点インデックス → VertexMarker の対応表を取得 ───
  function _getVertexMarkersByIndex(poly) {
    const arr = [];
    if (!poly || !poly.editor || !poly.editor.editLayer || !L.Editable.VertexMarker) return arr;
    poly.editor.editLayer.eachLayer(layer => {
      if (layer instanceof L.Editable.VertexMarker) arr[layer.getIndex()] = layer;
    });
    return arr;
  }

  // ─── 頂点マーカーへの長押し（500ms）＝削除確認 バインド ───
  function _bindVertexLongPress(vertexMarker) {
    const el = vertexMarker.getElement && vertexMarker.getElement();
    if (!el || el._fcaLongPressBound) return;
    el._fcaLongPressBound = true;

    let pressTimer = null;

    const start = () => {
      pressTimer = setTimeout(() => {
        _handleVertexDeleteRequest(vertexMarker);
      }, LONG_PRESS_MS);
    };
    const cancelTimer = () => {
      clearTimeout(pressTimer);
      pressTimer = null;
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove',  cancelTimer, { passive: true });
    el.addEventListener('touchend',   cancelTimer);
    el.addEventListener('touchcancel', cancelTimer);
    // PC検証用（マウス操作でも同様に長押し削除を有効化）
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup',   cancelTimer);
    el.addEventListener('mouseleave', cancelTimer);

    // ドラッグ（頂点移動）が始まったら長押し削除とみなさない
    vertexMarker.on('dragstart', cancelTimer);
    vertexMarker.on('drag', cancelTimer);
  }

  async function _handleVertexDeleteRequest(vertexMarker) {
    const layer = state.previewLayer;
    if (!layer) return;
    const latlngs = layer.getLatLngs()[0];
    if (!latlngs || latlngs.length <= 3) {
      showToast('これ以上頂点を減らせません（最低3点）', 'amber');
      return;
    }

    const rectLockedAtRequest = state.isRectMode && state.rectLocked;
    const ok = rectLockedAtRequest
      ? await showConfirmDialog(
          '頂点を削除すると、矩形の拘束が解除され自由に編集できるようになります。削除しますか？',
          '解除して削除', 'キャンセル', true
        )
      : await showConfirmDialog('この頂点を削除しますか？', '削除する', 'キャンセル', true);
    if (!ok) return;

    try {
      if (typeof vertexMarker.delete === 'function') {
        vertexMarker.delete();
      } else {
        console.warn('[FieldConfirmAdjust] VertexMarker.delete()が見つかりません（Leaflet.Editableのバージョン差異の可能性）。');
      }
    } catch (e) {
      console.error('[FieldConfirmAdjust] 頂点削除に失敗:', e);
    }

    if (rectLockedAtRequest) {
      state.rectLocked = false;
      _updateRectLockUI();
    }
    updateLiveAreaDisplay();
  }

  // ─── 公開API（仕様書9章・確定シグネチャ＋防御的close()を追加） ───
  return {
    open,
    close,
    updateLiveAreaDisplay,
    onSensitivityChange,
    confirm,
    retry,
    switchToManual,
    unlockRect,
  };
})();