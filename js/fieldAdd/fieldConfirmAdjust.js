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
    source:       'auto', // 'manual' | 'auto'
    previewLayer: null,   // L.Polygon（Editable編集対象。このモジュールが所有）
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
  function open(polygonLatLngs, options = {}) {
    const source = options.source === 'manual' ? 'manual' : 'auto';
    state.source = source;

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

    const hintEl = document.getElementById('fca-hint');
    if (hintEl) {
      hintEl.textContent = '頂点をドラッグして移動、長押しで削除。辺の中間点をタップすると頂点を追加できます';
    }

    updateLiveAreaDisplay();
  }

  // ─── 他フローからの防御的クリーンアップ（開始時の残骸処理など） ───
  function close() {
    _cleanupPreviewLayer();
    FieldAddController.hideAllPhases();
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

    // 中間点タップ等で新たに挿入された頂点はここで拾って長押し削除をバインドする
    map.on('editable:vertex:new', (e) => {
      if (e.layer !== state.previewLayer) return;
      if (e.vertex) _bindVertexLongPress(e.vertex);
      updateLiveAreaDisplay();
    });
    map.on('editable:vertex:dragend', (e) => {
      if (e.layer !== state.previewLayer) return;
      updateLiveAreaDisplay();
    });
    map.on('editable:vertex:deleted', (e) => {
      if (e.layer !== state.previewLayer) return;
      updateLiveAreaDisplay();
    });
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

    const ok = await showConfirmDialog('この頂点を削除しますか？', '削除する', 'キャンセル', true);
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
  };
})();