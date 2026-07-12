// ═══════════════════════════════════════════
//  EASY FIELD DETECT — 「かんたん圃場追加」
//  タップ地点を起点に、地図タイル（航空写真）をcanvas上で解析し、
//  エッジ考慮flood-fill（色距離 AND 勾配）で圃場らしき輪郭を自動検出する。
//
//  検出結果はあくまで「たたき台」。Leaflet.Editableで頂点をドラッグ
//  微調整してから、既存の保存フロー（onDrawPolygonComplete → showWizard）
//  にそのまま接続する。
//
//  Step2（圃場追加フロー刷新 仕様書）で以下を実装：
//  - flood-fill / モルフォロジー / 自動チューニング / 輪郭抽出 / 凸包 /
//    矩形計算などの純粋関数は js/fieldAdd/fieldDetectAlgorithms.js に
//    移設済みのため、ここではそれを呼び出すだけ（ロジックの重複実装をしない）
//  - waitForTilesLoaded()：タイル未読込のままラスタライズしてしまい、
//    フォールバック色 #7f9a72 との誤境界が生まれるバグを修正
//  - ensureMinZoomForDetect()：低ズーム時の非ブロッキング警告
//  - rasterizeMapToCanvas(480px cap)：自動チューニングの複数回flood-fillでも
//    実用速度を維持するための解像度キャップ（スケール係数を保持し座標変換に使用）
//  - 検出中キャンセル：cancelToken方式。専用キャンセルボタン（index.html側に追加）
//    から cancelDetect() を呼ぶと、autoTuneTolerance()の候補ループを抜ける
//  - 感度スライダーは「自動チューニング後の微調整用」。ラスタライズ結果・勾配マップは
//    キャッシュを再利用し、floodFillMaskEdgeAware()のみ150ms debounceで再実行する
//    （autoTuneToleranceの全候補再試行はしない）
//
//  Step3（確認・微調整画面の統合）で以下を変更：
//  - プレビューレイヤーの所有権・確認画面（旧efd-phase-preview）を
//    js/fieldAdd/fieldConfirmAdjust.js（FieldConfirmAdjust）へ完全移管。
//    検出成功時・感度スライダー再検出成功時は _buildAndShowPreviewFromMask() から
//    FieldConfirmAdjust.open(latlngs, {source:'auto', sensitivityValue}) を呼ぶだけになる
//  - confirm() / 旧efd-phase-preview関連のDOM操作（_showPreviewLayer 等）は削除。
//    「この形で確定」「やり直す」「手動に切替」はFieldConfirmAdjust側に統合済み
//  - onSensitivityChange()の150ms debounceはこのファイルに残す（仕様書5.3の
//    デバウンス責務の置き場所。FieldConfirmAdjust.onSensitivityChange()から呼ばれる）
//
//  Step5（入口統合）で以下を変更：
//  - start() → beginDetectFlow() にリネーム。「圃場を追加」の真の入口は
//    js/fieldAdd/fieldAddController.js（FieldAddController.start()）になり、
//    ここは「地図を合わせる」画面で「自動で検出」を選んだ後に呼ばれる
//    （FieldAddController.chooseAuto()から委譲）。
//  - フェーズ管理（ALL_PHASE_IDS／_showPhase等）をFieldAddControllerに一本化。
//    このファイルからは削除し、FieldAddController.showPhase() 等を呼ぶだけにした。
//  - 6章決定を今回のみ覆し、EFD-1「四角形」選択を復活。selectShape('rect')の
//    場合のみ、検出成功時にconvexHull()→minAreaRect()で矩形フィットする
//    （_buildAndShowPreviewFromMask()参照）。'complex'は従来通り
//    snapNearRightAnglesによる軽微な角度補正のみ（実際の輪郭形状を尊重）。
//
//  検出精度改善セッションで以下を変更（太郎さんより「精度が悪い、四角形でぎりぎり」との
//  フィードバックを受けての改修）：
//  - _rasterizeMapToCanvas(画面全体480px縮小) → _rasterizeCropToCanvas(タップ地点周辺のみ
//    高解像度クロップ)へ全面改修。cropSizeMはcultivationHintで使い分け
//    （ハウス/加温=20m四方、露地=50m四方）、解析解像度はtargetPx=1000固定。
//  - EDGE_THRESHOLD固定値60 → computeAdaptiveEdgeThreshold()による勾配ヒストグラム
//    パーセンタイル基準の動的算出に変更（タイルのコントラスト差に対応）。
//  - 採用したmaskに対し_postProcessMask()（open→close→シード連結成分抽出）を追加。
//    隣接農地への色類似リークを橋渡し部分で切断してから閉処理する。
//  - 矩形モード（isRect）でminAreaRect()フィット後、
//    FieldDetectAlgorithms.snapRectEdgesToGradient()で4辺を実際の勾配（エッジ）へ
//    局所的に再フィット（ハウス規格スナップより前段）。
//  - ensureMinZoomForDetect()を警告のみ→検出ブロックに変更。
//
//  検出感度改善セッション（第2弾）で以下を変更（「昔の仕様の方が検出しやすかった」
//  とのフィードバックを受けての改修）：
//  - エッジ考慮flood-fill（勾配で隣接農地への誤拡張を防ぐ仕組み）を廃止し、
//    単純な色距離のみのflood-fillに戻した（floodFillMaskEdgeAware自体は
//    js/fieldAdd/fieldDetectAlgorithms.js に残っているが、gradientMap/
//    edgeThresholdにnullを渡すことで色距離判定のみで動作させている）。
//    隣接圃場への誤拡張リスクは承知の上でシンプルさ・検出範囲の広さを優先する判断。
//  - 自動チューニング（複数tolerance候補から最良のものを自動選択する仕組み）を廃止し、
//    固定の初期感度値(DEFAULT_SENSITIVITY)のみによる単一検出に戻した。
//    旧TOLERANCE_CANDIDATES／autoTuneTolerance呼び出しはgit履歴を参照。
//  - computeAdaptiveEdgeThreshold呼び出し・EDGE_THRESHOLD_*定数・state.edgeThresholdは
//    上記に伴い削除。ただしgradientMap自体は矩形モードのsnapRectEdgesToGradient()で
//    引き続き使うため算出は残す。
//  - _postProcessMask()（open→close→シード連結成分抽出）はエッジ考慮を外した分の
//    誤拡張対策として維持。
//
//  検出感度改善セッション（第3弾）で以下を変更（「ハウスが実際は25mあるのに20m/21mで
//  打ち切られる」「北海道の圃場は100m超えも普通」とのフィードバックを受けての改修）：
//  - クロップ範囲（CROP_SIZE_M_HOUSE/FIELD）を固定値のまま使うのをやめ、
//    _detectAtCropSize()の結果がcrop端に接していたら（=対象がcrop範囲より大きく
//    はみ出している可能性が高い）、detect()内のループでcropSizeMを2倍ずつ最大5段階
//    まで広げて再検出するように変更（ハウス20→40→80→160→320m、露地50→100→200→
//    400→800m）。対象が小さいうちは従来通り初期値の高解像度のまま検出でき、
//    大きい対象の時だけ自動的に範囲が広がる（その分解像度は粗くなるが実用上問題ない）。
//  - FieldDetectAlgorithms.maskTouchesBoundary()を新設し、上記の判定に使用。
//  - 感度スライダー変更時（_reRunFromCache）にもcrop端接触チェックを追加し、
//    達した場合はトーストで案内する（自動での再クロップは行わない。頻繁な
//    スライダー操作のたびに毎回ラスタライズし直すのはコスト高のため）。
//
//  技術メモ：
//  - map.js側でタイルレイヤーに crossOrigin:true を指定しているため、
//    地理院タイル（Originヘッダー送信時のみCORS許可される仕様）を
//    canvas上でピクセル解析できる。
//  - タイル画像は既存の<img class="leaflet-tile-loaded">要素の
//    getBoundingClientRect()から実際の描画位置を取得してcanvasに
//    描き写す（Leaflet内部のタイル座標計算を再実装しない、DOM基準の
//    ラスタライズ方式）。
//  - 輪郭抽出は msqr（js/vendor/msqr.min.js, MIT License）を使用。
//    FieldDetectAlgorithms.traceContourMsqr() 経由で呼ぶ。
// ═══════════════════════════════════════════

//  境界プローブ改善セッションで以下を変更（「圃場は基本四角形〜穏やかな多角形の
//  はずなのに頂点が30〜40個も出る」「検出結果が隣の圃場まで被ってしまう」との
//  フィードバックを受けての改修）：
//  - 検出感度改善セッション（第2弾）で廃止した複数tolerance候補の自動チューニングを、
//    TOLERANCE_CANDIDATES（5候補）として再導入。ただし今回は単に妥当性スコア
//    （充填率+凸性）だけで選ぶのではなく、新設の境界プローブ信頼度スコア
//    （FieldDetectAlgorithms.scoreBoundaryConfidence）を掛け算した combinedScore で
//    最良候補を選ぶ。境界プローブはマスク輪郭のすぐ外側にプローブ点を置き、
//    採用予定のtoleranceより厳しい感度でもなお元マスクへ被ってくるかを確認する
//    軽量なローカル探索（フル画像のflood fillは増やさない）ため、「昔の方式が
//    重い／検出しにくかった」という過去の指摘とは別の設計になっている。
//  - _detectAtCropSize()を非同期化し、5候補のループ内でcancelToken確認と
//    _yieldFrame()を行うようにした（自動チューニング復活に伴い、キャンセルボタンが
//    このループ内でも効くようにするため）。
//  - detect()内の呼び出し元も await に変更。採用したtolerance値
//    （attemptResult.adoptedTolerance）を state.sensitivity に反映し、確認画面の
//    感度スライダーが実際に採用された値から始まるようにした（従来は固定の
//    DEFAULT_SENSITIVITYを表示していた）。
//  - _buildAndShowPreviewFromMask()の「複雑な形」パス（state.shapeMode!=='rect'）に、
//    douglasPeucker→mergeNearbyVertices→snapNearRightAnglesの既存パイプラインの後段として
//    FieldDetectAlgorithms.simplifyPolygonToTarget()を常に1回自動適用し、頂点数を
//    SIMPLIFY_MAX_VERTICES（10）以下へ絞り込むようにした。矩形モード（'rect'）は
//    元々4頂点固定のため対象外。
//  - 手動での追加絞り込み用に、確認・微調整画面（fieldConfirmAdjust.js）側に
//    「単純化」ボタンを新設（そちらはFieldConfirmAdjust.simplifyVertices()参照）。
// ═══════════════════════════════════════════

//  座標ズレ・頂点密集 修正セッションで以下を変更（「地図をパン/ズームしてから
//  感度スライダーで再検出すると座標がズレる」「頂点が3個以上不自然に固まる」
//  というフィードバックを受けての改修）：
//  - 座標ズレの原因：検出結果pxの最終lat/lng変換（_buildAndShowPreviewFromMask・
//    _applyHouseSnap）が、ラスタライズ時点のcontainer座標(state.rasterOriginPt)を
//    「今の地図ビュー」でmap.containerPointToLatLng()にかける実装になっており、
//    感度スライダー再検出（_reRunFromCache）はキャッシュ済みimageDataを使い回す
//    ため、その間に地図がパン/ズームされていると同じpx座標が別の実世界地点を
//    指してしまっていた。
//  - 修正：_rasterizeCropToCanvas()でクロップ北西角の実LatLngとWeb Mercator投影上の
//    px単価(mercPerPxX/Y)をラスタライズ時点で確定して保持し、以降の最終変換は
//    L.CRS.EPSG3857.project/unprojectのみで行う（map.containerPointToLatLng()等、
//    現在の地図表示状態に依存する変換を一切使わない）。state.rasterScale／
//    state.rasterOriginPtは廃止し、state.rasterOriginLatLng／mercPerPxX／
//    mercPerPxYに置き換えた。
//  - 頂点密集の原因：douglasPeucker→snapNearRightAnglesの単純化パイプラインに、
//    近接頂点を統合する処理が存在しなかった。
//  - 修正：FieldDetectAlgorithms.mergeNearbyVertices()を新設し、douglasPeucker直後
//    （'complex'形状モードのみ。'rect'は常に4隅のため対象外）に適用。近接クラスタは
//    重心へ潰すのではなく、各点の「角らしさ」（隣接2辺のなす角の180度からの乖離）が
//    最も高い1点だけを残す方式。
//
//  圃場追加フロー6項目改善セッションで以下を変更：
//  - クロップ範囲：CROP_SIZE_M_HOUSE(20m)・CROP_SIZE_M_FIELD(50m)の固定値を廃止し、
//    _computeZoomLinkedCropSizeM()で「画面（スコープ）の短辺の80%」に相当する実距離(m)を
//    現在のズーム・中心位置から動的算出してベースクロップサイズとするよう変更。
//    cultivationHint（ハウス/加温/露地）はクロップサイズの決定にはもう使わず、
//    _updateTapSubhint()の案内文言の強弱のみに使用する。CROP_GROW_FACTOR×
//    CROP_GROW_MAX_ATTEMPTSのはみ出し時フォールバック拡張ループは維持。
//  - efd-phase-tap画面に日本語ガイダンス文言（ズーム推奨・色判定の説明）を追加。
//    _updateTapSubhint()で#efd-tap-subhintへ描画。cultivationHintの有無で
//    「ハウス」「圃場」の呼称のみ出し分ける。
//  - 感度◀▶微調整ボタン（fieldConfirmAdjust.js側にnudgeSensitivity()追加）を
//    追加。既存のonSensitivityChange()デバウンス経路をそのまま再利用するため、
//    このファイル側の変更は不要。
// ═══════════════════════════════════════════

const EasyFieldDetect = (() => {

  // ─── 定数（仕様書4章・確定値） ───
  const MIN_DETECT_ZOOM        = 17;   // 地理院タイルmaxNativeZoom=18を踏まえた暫定値。要現地調整
  // 検出精度改善セッション：旧RASTER_MAX_DIMENSION(480px・画面全体を縮小)を廃止し、
  // タップ地点周辺だけを高解像度でクロップする方式に変更（_rasterizeCropToCanvas参照）。
  // 圃場追加フロー6項目改善セッション：CROP_SIZE_M_HOUSE(20m)・CROP_SIZE_M_FIELD(50m)の
  // 固定値は廃止し、_computeZoomLinkedCropSizeM()による動的算出に置き換えた。
  // CROP_SIZE_M_FALLBACKは画面サイズ取得に失敗した場合などの異常値に対する保険値のみ。
  const CROP_SIZE_M_FALLBACK   = 50;   // _computeZoomLinkedCropSizeM()が異常値を返した場合の保険（露地相当）
  const CROP_SIZE_SCREEN_RATIO = 0.8;  // 画面短辺に対する基準クロップ幅の比率
  const CROP_RASTER_TARGET_PX  = 1000; // クロップ後の解析用キャンバス解像度
  // 検出感度改善セッション（第3弾）：「ハウスが実際は25mあるのに20m/21mで打ち切られる」
  // 「北海道の圃場は100mを超えることも普通」という指摘を受け、クロップ範囲を固定値
  // から段階拡張式に変更。初期値（上記）で検出したmaskがcrop端に接していたら
  // （＝crop範囲内に収まりきっていない可能性が高い）、cropSizeMを2倍にして再検出する。
  // 小さいハウス・圃場は従来通り初期値の高解像度のまま検出でき、大きい対象の時だけ
  // 自動的に範囲を広げる（その分解像度は粗くなるが、対象自体が大きいため実用上問題ない）。
  const CROP_GROW_FACTOR        = 2; // 1段階ごとにcropSizeMを何倍に広げるか
  const CROP_GROW_MAX_ATTEMPTS  = 5; // 初期値を含め最大5段階（ハウス20→40→80→160→320m、露地50→100→200→400→800m）
  // 検出感度改善セッション（第2弾）：自動チューニング（複数tolerance候補から自動選択）
  // を廃止したため、TOLERANCE_CANDIDATESは不要になった（旧値はgit履歴を参照）。
  // 検出感度改善セッション（第2弾）：エッジ考慮flood fill（隣接農地への誤拡張を
  // 勾配で防ぐ仕組み）を仕様変更前の単純な色距離flood fillへ戻すことにしたため、
  // computeAdaptiveEdgeThreshold関連の定数は不要になった（隣接圃場への誤拡張
  // リスクは承知の上でシンプルさを優先する、という判断）。
  // 旧EDGE_THRESHOLD_PERCENTILE/MIN/MAXの値はgit履歴を参照。
  const TILE_WAIT_TIMEOUT_MS   = 1500; // タイル読み込み待ちの基本タイムアウト
  const TILE_WAIT_EXTRA_MS     = 1000; // 基本タイムアウト超過時の延長待機
  const SENSITIVITY_DEBOUNCE_MS = 150; // 感度スライダーのデバウンス（仕様書5.3）
  const RIGHT_ANGLE_TOLERANCE_DEG = 5; // snapNearRightAnglesの角度許容値
  const DEFAULT_SENSITIVITY    = 28;   // 感度スライダー再検出時・自動チューニング全滅時のフォールバック値
  // 境界プローブ改善セッション：複数tolerance候補の自動チューニングを再導入（5候補）。
  // detect()の_detectAtCropSize()内でこの全候補を試し、妥当性スコア×境界プローブ
  // 信頼度が最良の1つを採用する。感度スライダーでの再検出（_reRunFromCache）は
  // 従来通りユーザー指定の単一値のみを使い、ここには含めない。
  const TOLERANCE_CANDIDATES   = [6, 15, 30, 50, 70];
  const BOUNDARY_PROBE_COUNT   = 8;    // 境界プローブの点数
  const SIMPLIFY_MAX_VERTICES  = 10;   // 自動絞り込みの目標頂点数上限
  const SIMPLIFY_ANGLE_TOLERANCE_DEG = 15; // 直線統合・直角スナップの角度許容値

  // ─── 内部状態 ───
  const state = {
    cultivationHint: null, // null(露地) | 'greenhouse' | 'heatedGreenhouse'。EFD-0で選択。
    shapeMode:    null,   // 'rect' | 'complex'（UI遷移用のみ。検出ロジックの分岐には未使用）
    tapLatLng:    null,   // L.LatLng（検出対象地点）
    canvas:       null,   // ラスタライズ済みcanvas（感度変更時の再利用用）
    imageData:    null,   // canvasから取得したImageData（同上）
    gradientMap:  null,   // computeGradientMap()の結果（同上）
    rasterOriginLatLng: null, // L.LatLng。クロップ北西角の実緯度経度（座標復元の基準点。地図ビューに非依存。座標ズレ修正で追加）
    mercPerPxX:   1,      // Web Mercator投影上で解析px1個が東方向に相当する距離（座標変換に使用）
    mercPerPxY:   1,      // Web Mercator投影上で解析px1個が南方向に相当する距離（座標変換に使用）
    seedX:        0,
    seedY:        0,
    sensitivity:  DEFAULT_SENSITIVITY, // 現在のtolerance値（自動チューニング結果 or 手動調整値）
    detecting:    false,
    cancelToken:  null,   // { cancelled: boolean }。detect()実行中のみセットされる
    sensitivityDebounceTimer: null,
  };

  // ═══════════════════════════════════════════
  //  フェーズ切替（map-draw-dialog内の他フェーズと排他）
  //  Step5：ALL_PHASE_IDS／_showPhase／_hideAllPhases／_openDialog／
  //  _closeDialogはfieldConfirmAdjust.js・polygonDraw.jsと3ファイルで
  //  ほぼ同じ実装が重複していたため、js/fieldAdd/fieldAddController.js
  //  に一本化した。ここではFieldAddController.showPhase() 等を呼ぶだけ。
  // ═══════════════════════════════════════════

  function _setScopeVisible(visible) {
    const el = document.getElementById('draw-scope');
    if (el) el.classList.toggle('active', visible);
  }

  // ─── 検出中／待機中のボタン表示切替（専用キャンセルボタン方式） ───
  // 検出中は既存3ボタン（キャンセル／検出／手動描画へ）を隠し、
  // 「検出中...（キャンセル）」ボタンのみを表示する。
  function _setDetectingUI(active) {
    const idle = document.getElementById('efd-tap-actions-idle');
    const busy = document.getElementById('efd-tap-actions-detecting');
    if (idle) idle.hidden = active;
    if (busy) busy.hidden = !active;
  }

  // ─── スコープ中心のLatLngを取得（PolygonDraw内のgetCenter()と同等ロジック） ───
  function _getScopeLatLng() {
    const scope = document.getElementById('draw-scope');
    if (!scope) return map.getCenter();
    const sr = scope.getBoundingClientRect();
    const mr = map.getContainer().getBoundingClientRect();
    const cx = sr.left + sr.width  / 2 - mr.left;
    const cy = sr.top  + sr.height / 2 - mr.top;
    return map.containerPointToLatLng(L.point(cx, cy));
  }

  // ─── ズーム連動クロップサイズ算出（圃場追加フロー6項目改善セッション） ───
  // 画面（スコープ）の短辺の CROP_SIZE_SCREEN_RATIO(80%) に相当する実距離(m)を、
  // 現在のズーム・中心位置から動的に算出する。cultivationHintはここでは使わない
  // （案内文言の強弱のみに使用。_updateTapSubhint参照）。
  function _computeZoomLinkedCropSizeM() {
    try {
      const size = map.getSize(); // L.Point（現在の地図表示ピクセルサイズ）
      const shortSidePx = Math.min(size.x, size.y);
      const targetPx = Math.max(shortSidePx * CROP_SIZE_SCREEN_RATIO, 1);

      const center   = map.getCenter();
      const centerPt = map.latLngToContainerPoint(center);
      const edgePt   = L.point(centerPt.x + targetPx / 2, centerPt.y);
      const edgeLatLng = map.containerPointToLatLng(edgePt);

      const cropSizeM = center.distanceTo(edgeLatLng) * 2;
      return Number.isFinite(cropSizeM) && cropSizeM > 0 ? cropSizeM : CROP_SIZE_M_FALLBACK;
    } catch (e) {
      console.warn('[EFD] ズーム連動クロップサイズの算出に失敗、フォールバック値を使用:', e);
      return CROP_SIZE_M_FALLBACK;
    }
  }

  // ─── efd-phase-tap画面の日本語ガイダンス文言を更新（圃場追加フロー6項目改善セッション） ───
  // cultivationHintの有無で対象の呼称（ハウス／圃場）のみ出し分ける。
  function _updateTapSubhint() {
    const el = document.getElementById('efd-tap-subhint');
    if (!el) return;
    const target = state.cultivationHint ? 'ハウス' : '圃場';
    el.innerHTML = `なるべく${target}いっぱいにズームしてください<br>色の違いで境界を判定しています`;
  }

  // ─── 1フレーム分だけ制御を返す（描画直後の座標ズレ対策・キャンセル割込み用） ───
  function _yieldFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  function _clearSensitivityDebounce() {
    clearTimeout(state.sensitivityDebounceTimer);
    state.sensitivityDebounceTimer = null;
  }

  // ═══════════════════════════════════════════
  //  公開フロー：開始 → 形状選択 → タップ検出 → プレビュー確定
  //  Step5：旧start()はFieldAddController.chooseAuto()から呼ばれる
  //  beginDetectFlow()にリネーム（「地図を合わせる」画面が真の入口になった
  //  ため、ここはその次のステップという位置づけに変更）。
  // ═══════════════════════════════════════════

  function beginDetectFlow() {
    if (typeof PolygonDraw !== 'undefined' && PolygonDraw.isActive()) {
      PolygonDraw.cancel();
    }
    if (state.cancelToken) state.cancelToken.cancelled = true;
    if (typeof FieldConfirmAdjust !== 'undefined') FieldConfirmAdjust.close();
    _clearSensitivityDebounce();
    state.cultivationHint = null;
    state.shapeMode    = null;
    state.tapLatLng    = null;
    state.canvas       = null;
    state.imageData    = null;
    state.gradientMap  = null;
    state.rasterOriginLatLng = null;
    state.mercPerPxX   = 1;
    state.mercPerPxY   = 1;
    state.sensitivity  = DEFAULT_SENSITIVITY;
    state.detecting    = false;
    state.cancelToken  = null;

    drawnItems.clearLayers();
    currentPolygon  = null;
    currentAreaData = null;
    if (typeof resetStats === 'function') resetStats();

    FieldAddController.openDialog();
    FieldAddController.showPhase('efd-phase-cultivation');
    showToast('圃場の種類を選んでください', '', 2400);
  }

  // ─── EFD-0：圃場の種類選択（露地／ハウス／加温） ───
  // 露地 → 従来通り「四角形／複雑な形」選択画面（efd-phase-shape）へ。
  // ハウス／加温 → パイプハウスは構造上ほぼ矩形になるため、形状選択はスキップし
  // 矩形固定（shapeMode='rect'）でそのまま検出画面（efd-phase-tap）へ進む。
  // 検出後の矩形フィット結果には _applyHouseSnap() で規格スナップを適用する
  // （_buildAndShowPreviewFromMask()参照）。
  function selectCultivation(mode) {
    state.cultivationHint = (mode === 'greenhouse' || mode === 'heatedGreenhouse') ? mode : null;

    if (!state.cultivationHint) {
      // 露地：従来通りの形状選択画面へ
      FieldAddController.showPhase('efd-phase-shape');
      updateMapDrawHint('検出したい圃場の形を選んでください');
      showDrawToast('形を選んでください');
      return;
    }

    // ハウス／加温：形状は矩形固定、選択画面をスキップして直接タップ検出へ
    state.shapeMode = 'rect';
    FieldAddController.showPhase('efd-phase-tap');
    _setDetectingUI(false);
    _setScopeVisible(true);
    _updateTapSubhint();
    updateMapDrawHint('地図を動かして中央をハウスに合わせてください');
    showDrawToast('地図をドラッグして検出したいハウスの中央にスコープを合わせ、「この地点で検出」をタップしてください');
  }

  function selectShape(mode) {
    // Step5決定（仕様書6章の矩形化廃止を今回のみ覆す）：
    // 「四角形」選択時のみ、検出成功時に矩形フィット（convexHull→minAreaRect）
    // を適用する。「複雑な形」は従来通りdouglasPeucker→snapNearRightAngles。
    // 分岐は_buildAndShowPreviewFromMask()内でstate.shapeModeを見て行う。
    state.shapeMode = mode;
    FieldAddController.showPhase('efd-phase-tap');
    _setDetectingUI(false);
    _setScopeVisible(true);
    _updateTapSubhint();
    updateMapDrawHint('地図を動かして中央を圃場に合わせてください');
    showDrawToast('地図をドラッグして検出したい圃場の中央にスコープを合わせ、「この地点で検出」をタップしてください');
  }

  function backToTap() {
    _clearSensitivityDebounce();
    // 「やり直す」＝新しい地点での再検出を前提とするため、キャッシュ済みの
    // ラスタライズ結果・勾配マップは破棄する（古い地点のデータの使い回しを防ぐ）。
    state.canvas       = null;
    state.imageData    = null;
    state.gradientMap  = null;
    state.rasterOriginLatLng = null;
    state.mercPerPxX   = 1;
    state.mercPerPxY   = 1;
    state.sensitivity  = DEFAULT_SENSITIVITY;
    FieldAddController.showPhase('efd-phase-tap');
    _setDetectingUI(false);
    _setScopeVisible(true);
    _updateTapSubhint();
    showDrawToast('地図を動かして再度合わせ、「この地点で検出」をタップしてください');
  }

  // ─── キャンセル（B案：即終了。「地図を合わせる」へは戻さない） ───
  // 動線改善セッション：以前はここで setSheet('half') を呼んでいたが、
  // BottomSheet廃止に伴いsetSheet('half')は「エリア一覧などのフルスクリーン
  // ページを強制的に開く」処理に変わっており（ui.js参照）、キャンセルしただけ
  // なのにエリア一覧へ強制的に飛ばされる不具合の原因になっていた。
  // closeDialog()で地図画面へ静かに戻るだけで十分なため削除
  //（保存ウィザードのcancelWizard()と同じ「戻る」の作法に統一）。
  function cancel() {
    if (state.cancelToken) state.cancelToken.cancelled = true;
    _clearSensitivityDebounce();
    _setScopeVisible(false);
    FieldAddController.hideAllPhases();
    FieldAddController.closeDialog();
    showToast('かんたん追加をキャンセルしました');
  }

  // ─── 手動描画へ退避（EFD-2の緊急退避ボタン。screen1経由せず直接手動描画へ） ───
  // FieldAddController.chooseManual()経由にすることで、PolygonDraw.start()内の
  // showPhase('draw-phase-drawing')呼び出しが効き、draw-phase-drawingのhidden
  // 解除漏れ（旧実装のバグ：手動描画に切り替えると描画UIが空白になる）を回避する。
  function fallbackManual() {
    if (state.cancelToken) state.cancelToken.cancelled = true;
    _clearSensitivityDebounce();
    _setScopeVisible(false);
    showToast('手動描画に切り替えました', 'amber');
    if (typeof FieldAddController !== 'undefined' && typeof FieldAddController.chooseManual === 'function') {
      FieldAddController.chooseManual();
    } else if (typeof PolygonDraw !== 'undefined') {
      PolygonDraw.start();
    }
  }

  // ─── 低ズーム時は検出をブロック（検出精度改善セッションで警告のみ→ブロックに変更） ───
  // クロップ高解像度化で分解能自体は上がったが、ズームが低いと1タイル画素が
  // 表す実距離が大きくなり効果が薄れるため、detect()の入口で止める。
  // 戻り値: true=検出続行可 / false=ズーム不足（呼び出し側でreturnする）
  function ensureMinZoomForDetect() {
    if (map.getZoom() < MIN_DETECT_ZOOM) {
      showDrawToast('もう少し拡大しないと検出できません（ズームを上げてください）', 'amber');
      return false;
    }
    return true;
  }

  // ─── タイル読み込み完了待ち（新規・バグ修正、仕様書4章） ───
  // 未読込タイルが残ったままラスタライズすると、フォールバック色#7f9a72が
  // シード色と一致しない偽の境界線を生む（旧実装のバグ）ため、これを待つ。
  function _tilesStillLoading() {
    return !!document.querySelector('.leaflet-tile-pane .leaflet-tile-loading');
  }

  async function waitForTilesLoaded(timeoutMs = TILE_WAIT_TIMEOUT_MS) {
    const pollInterval = 100;

    let waited = 0;
    while (_tilesStillLoading() && waited < timeoutMs) {
      await new Promise(r => setTimeout(r, pollInterval));
      waited += pollInterval;
    }
    if (!_tilesStillLoading()) return true;

    // タイムアウト時点でまだ残っていれば+1000msだけ延長再待機
    let extraWaited = 0;
    while (_tilesStillLoading() && extraWaited < TILE_WAIT_EXTRA_MS) {
      await new Promise(r => setTimeout(r, pollInterval));
      extraWaited += pollInterval;
    }
    return !_tilesStillLoading();
  }

  // ─── 検出実行 ───
  async function detect() {
    if (state.detecting) return;
    // 検出精度改善セッション：ズーム不足はここでブロックして即return（旧実装は警告のみ）。
    // state.detecting更新前にチェックすることで、ブロック時にUI状態を汚さない。
    if (!ensureMinZoomForDetect()) return;

    state.detecting = true;
    state.cancelToken = { cancelled: false };
    _setDetectingUI(true);

    try {
      state.tapLatLng = _getScopeLatLng();

      // レイアウト確定を1フレーム待ってから処理開始（描画直後の座標ズレ対策）
      await _yieldFrame();
      if (state.cancelToken.cancelled) { _onDetectCancelled(); return; }

      const tilesReady = await waitForTilesLoaded(TILE_WAIT_TIMEOUT_MS);
      if (state.cancelToken.cancelled) { _onDetectCancelled(); return; }
      if (!tilesReady) {
        _onDetectFailure('地図の読み込みが完了していません。少し待ってからもう一度お試しください。');
        return;
      }

      // 検出精度改善セッション：画面全体480px縮小ではなく、タップ地点周辺のみを
      // 高解像度でクロップして解析する（ハウス/加温は対象が小さいため狭い範囲で高精細に）。
      // 検出感度改善セッション（第3弾）：対象が初期クロップより大きい場合、maskがcrop端に
      // 接する（=はみ出している可能性が高い）ので、その時だけcropSizeMを段階的に広げて
      // 再検出する（_detectAtCropSize参照）。
      const baseCropSizeM = _computeZoomLinkedCropSizeM();

      let attemptResult = null;
      for (let attempt = 0; attempt < CROP_GROW_MAX_ATTEMPTS; attempt++) {
        if (state.cancelToken.cancelled) { _onDetectCancelled(); return; }

        const cropSizeM = baseCropSizeM * Math.pow(CROP_GROW_FACTOR, attempt);
        const r = await _detectAtCropSize(cropSizeM, state.cancelToken);

        if (r.error === 'cancelled') { _onDetectCancelled(); return; }
        if (r.error === 'cors') {
          _onDetectFailure('タイル画像を解析できませんでした（ブラウザのセキュリティ制限）。ページを再読み込みしてから、もう一度お試しください。');
          return;
        }
        if (r.error === 'outOfView') {
          _onDetectFailure('検出地点が画面外です。地図を動かしてやり直してください。');
          return;
        }

        if (r.mask) {
          attemptResult = r;
          if (!r.touchesBoundary) break; // crop範囲内に収まった＝これ以上広げる必要なし
        }
        // notFound、またはmaskがcrop端に接している場合は、次のループでcropSizeMを広げて再試行
      }

      if (state.cancelToken.cancelled) { _onDetectCancelled(); return; }

      if (!attemptResult) {
        _onDetectFailure('検出範囲を特定できませんでした。地図を動かして別の地点でお試しください。');
        return;
      }

      if (attemptResult.touchesBoundary) {
        // 最大段階まで広げてもなお対象がクロップ範囲に収まりきらなかった場合の保険
        showDrawToast('対象が広いため、検出範囲の端で打ち切られている可能性があります。頂点を手動で調整してください。', 'amber');
      }

      const { canvas, originLatLng, mercPerPxX, mercPerPxY, imageData, gradientMap, seedX, seedY, mask } = attemptResult;

      state.canvas      = canvas;
      state.imageData   = imageData;
      state.gradientMap = gradientMap;
      state.rasterOriginLatLng = originLatLng;
      state.mercPerPxX  = mercPerPxX;
      state.mercPerPxY  = mercPerPxY;
      state.seedX       = seedX;
      state.seedY       = seedY;
      // 境界プローブ改善セッション：複数候補から選ばれた実際のtolerance値を反映し、
      // 確認画面の感度スライダーがその値から始まるようにする（従来は固定値表示だった）。
      state.sensitivity = attemptResult.adoptedTolerance != null ? attemptResult.adoptedTolerance : DEFAULT_SENSITIVITY;

      _buildAndShowPreviewFromMask(mask, canvas.width, canvas.height);

    } catch (e) {
      console.error('[EasyFieldDetect] 検出エラー:', e);
      _onDetectFailure('検出中にエラーが発生しました。手動描画をご利用ください。');
    } finally {
      state.detecting = false;
      _setDetectingUI(false);
    }
  }

  // ─── 検出中キャンセル（新規） ───
  function cancelDetect() {
    if (state.cancelToken) state.cancelToken.cancelled = true;
  }

  function _onDetectCancelled() {
    showToast('検出をキャンセルしました');
    // efd-phase-tapに留まる（既にそのフェーズのため画面遷移は不要）。
    // ボタン表示の復帰はdetect()のfinallyで行う。
  }

  function _onDetectFailure(message) {
    showDrawToast(message, 'amber');
  }

  // ─── 感度スライダー変更時：キャッシュ済みimageData/gradientMapを使い回して再検出 ───
  // 5.3節：150ms debounce（このファイルが責務を持つ。呼び出し元の
  // FieldConfirmAdjust.onSensitivityChange()側では二重にデバウンスしない）。
  // autoTuneToleranceは再実行せず、floodFillMaskEdgeAware（単一tolerance）→
  // 輪郭抽出のみ再実行する。表示値の同期はFieldConfirmAdjust側が担当するため
  // ここではDOMを直接触らず、内部状態(state.sensitivity)の更新のみ行う。
  function onSensitivityChange(value) {
    const val = Number(value) || DEFAULT_SENSITIVITY;
    state.sensitivity = val;

    if (!state.imageData || !state.gradientMap) return;

    _clearSensitivityDebounce();
    state.sensitivityDebounceTimer = setTimeout(() => {
      _reRunFromCache(val);
    }, SENSITIVITY_DEBOUNCE_MS);
  }

  function _reRunFromCache(tolerance) {
    const { imageData, seedX, seedY } = state;
    const w = imageData.width, h = imageData.height;

    // 検出感度改善セッション（第2弾）：エッジ考慮を廃止し単純な色距離flood fillに
    // 戻したため、gradientMap/edgeThresholdは渡さない（隣接圃場への誤拡張リスクは
    // 承知の上でシンプルさ・スライダーの効きを優先）。
    const rawMask = FieldDetectAlgorithms.floodFillMaskEdgeAware(imageData, null, seedX, seedY, tolerance, null);
    if (!rawMask) {
      // 確認・微調整画面は既に開いたまま（直前の有効な形を維持）。
      // スライダー操作中に毎回showDrawToastだと煩わしいため短めのtoastに留める。
      showToast('検出範囲が小さすぎるか大きすぎます。感度を調整してください。', 'amber');
      return;
    }
    const closedMask = FieldDetectAlgorithms.morphologyClose(rawMask, w, h, 1);
    const processedMask = _postProcessMask(closedMask, w, h, seedX, seedY);

    if (FieldDetectAlgorithms.maskTouchesBoundary(processedMask, w, h)) {
      showToast('検出範囲の端に達しています。感度を下げるか、地図を動かして再検出してください。', 'amber');
    }

    _buildAndShowPreviewFromMask(processedMask, w, h);
  }

  // ─── 採用したmaskの後処理：open→close→シード連結成分のみ抽出 ───
  // 検出精度改善セッションで追加。detect()の自動チューニング結果・
  // _reRunFromCache()の感度スライダー再検出結果の両方から呼ばれる。
  function _postProcessMask(mask, w, h, seedX, seedY) {
    let m = FieldDetectAlgorithms.morphologyOpen(mask, w, h, 1);
    m = FieldDetectAlgorithms.morphologyClose(m, w, h, 1);
    m = FieldDetectAlgorithms.keepSeedComponentMask(m, w, h, seedX, seedY);
    return m;
  }

  // ─── 指定cropSizeMで1回分の検出を行うヘルパー（検出感度改善セッション第3弾で追加） ───
  // ラスタライズ→シード座標算出→複数tolerance候補での検出→最良候補の選択→
  // 後処理→crop端接触判定まで。detect()のクロップ拡張ループから呼ばれる。
  //
  // 境界プローブ改善セッション：TOLERANCE_CANDIDATES（5候補）それぞれで
  // flood fill→後処理まで行い、妥当性スコア（scoreMaskPlausibility）×境界プローブ
  // 信頼度（scoreBoundaryConfidence）が最良の候補を採用するよう変更。非同期化し、
  // 候補ループの合間でcancelToken確認・_yieldFrame()を行う。
  //
  // 戻り値：
  //   成功時: { canvas, scale, originContainerPt, imageData, gradientMap, seedX, seedY,
  //             mask, adoptedTolerance, touchesBoundary }
  //   失敗時: { error: 'cors' | 'outOfView' | 'notFound' | 'cancelled' }
  async function _detectAtCropSize(cropSizeM, cancelToken) {
    const { canvas, scale, originContainerPt, originLatLng, mercPerPxX, mercPerPxY } = _rasterizeCropToCanvas(state.tapLatLng, cropSizeM, CROP_RASTER_TARGET_PX);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (secErr) {
      console.warn('[EasyFieldDetect] getImageData失敗（CORS制限の可能性）:', secErr);
      return { error: 'cors' };
    }

    // シード座標：container座標 → クロップ原点基準へシフト → 解析解像度へ拡大
    const seedContainerPt = map.latLngToContainerPoint(state.tapLatLng);
    const seedX = Math.round((seedContainerPt.x - originContainerPt.x) * scale);
    const seedY = Math.round((seedContainerPt.y - originContainerPt.y) * scale);
    if (seedX < 0 || seedY < 0 || seedX >= canvas.width || seedY >= canvas.height) {
      return { error: 'outOfView' };
    }

    const gradientMap = FieldDetectAlgorithms.computeGradientMap(imageData);
    // gradientMapはflood fillの誤拡張防止（エッジ考慮）には使わなくなったが、
    // 矩形モード時のsnapRectEdgesToGradient()（辺を実際の勾配へ再フィット）で
    // 引き続き使用するため、算出自体は残す。

    // 検出感度改善セッション（第2弾）でエッジ考慮flood fillは廃止済みのため、
    // 各候補ともgradientMap/edgeThresholdはnullで渡す（色距離のみの判定）。
    let best = null;
    for (const tolerance of TOLERANCE_CANDIDATES) {
      if (cancelToken && cancelToken.cancelled) return { error: 'cancelled' };

      const rawMask = FieldDetectAlgorithms.floodFillMaskEdgeAware(imageData, null, seedX, seedY, tolerance, null);
      if (rawMask) {
        const closedMask = FieldDetectAlgorithms.morphologyClose(rawMask, canvas.width, canvas.height, 1);
        const processedMask = _postProcessMask(closedMask, canvas.width, canvas.height, seedX, seedY);

        const plausibility = FieldDetectAlgorithms.scoreMaskPlausibility(processedMask, canvas.width, canvas.height);
        const boundaryConfidence = FieldDetectAlgorithms.scoreBoundaryConfidence(
          imageData, processedMask, canvas.width, canvas.height, tolerance,
          { probeCount: BOUNDARY_PROBE_COUNT }
        );
        const combinedScore = plausibility * boundaryConfidence;

        if (!best || combinedScore > best.combinedScore) {
          best = { mask: processedMask, tolerance, combinedScore };
        }
      }

      if (cancelToken && cancelToken.cancelled) return { error: 'cancelled' };
      await _yieldFrame();
    }

    if (!best) return { error: 'notFound' };

    const touchesBoundary = FieldDetectAlgorithms.maskTouchesBoundary(best.mask, canvas.width, canvas.height);

    return {
      canvas, scale, originContainerPt, originLatLng, mercPerPxX, mercPerPxY,
      imageData, gradientMap, seedX, seedY,
      mask: best.mask, adoptedTolerance: best.tolerance, touchesBoundary,
    };
  }

  // ─── mask → 輪郭抽出 → 単純化・矩形フィット → FieldConfirmAdjustへ引き渡し ───
  // Step5決定：EFD-1「四角形」選択（state.shapeMode === 'rect'）の場合のみ、
  // 検出結果を凸包→最小外接矩形（convexHull→minAreaRect）でフィットする。
  // 「複雑な形」（'complex'）は従来通りdouglasPeucker→snapNearRightAnglesで
  // 実際の輪郭の形を尊重する（6章の軽微な角度補正のみ、という方針を維持）。
  // Step3：プレビュー表示・確認画面フェーズの所有権はFieldConfirmAdjustに移管済み。
  // 初回検出成功時／感度スライダー再検出成功時のいずれもここに集約される。
  function _buildAndShowPreviewFromMask(mask, w, h) {
    const diag = Math.sqrt(w * w + h * h);
    // msqr内蔵の点削減（RDP）許容値
    const msqrTolerance = Math.max(1.5, diag * 0.0015);
    const contour = FieldDetectAlgorithms.traceContourMsqr(mask, w, h, msqrTolerance);
    if (contour.length < 3) {
      _onDetectFailure('輪郭を検出できませんでした。感度を調整してください。');
      return;
    }

    let snapped;
    let houseSnapInfo = null;

    if (state.shapeMode === 'rect') {
      // ─ 四角形選択時のみ：矩形フィット（形状全体を回転矩形へ差し替え） ─
      const hull = FieldDetectAlgorithms.convexHull(contour);
      let rectCorners = hull.length >= 3 ? FieldDetectAlgorithms.minAreaRect(hull) : null;
      if (!rectCorners || rectCorners.length < 3) {
        _onDetectFailure('矩形を検出できませんでした。感度を調整するか、「複雑な形」をお試しください。');
        return;
      }

      // 検出精度改善セッション：色ベースのマスク外形だけでなく、実際の勾配（エッジ）に
      // 4辺を局所的に再フィットさせる（ハウス規格スナップより前に実行し、実測値を先に整えてから丸める）
      rectCorners = FieldDetectAlgorithms.snapRectEdgesToGradient(rectCorners, state.gradientMap, w, h);
      snapped = rectCorners;

      // ハウス／加温選択時のみ：短辺(間口)を規格値に、長辺(奥行き)を1m単位に調整
      if (state.cultivationHint) {
        houseSnapInfo = _applyHouseSnap(snapped);
        if (houseSnapInfo) snapped = houseSnapInfo.corners;
      }
    } else {
      let eps = Math.max(2, diag * 0.003);
      let simplified = FieldDetectAlgorithms.douglasPeucker(contour, eps);
      // 頂点が多すぎる場合は簡略度を上げて再調整（最大4回）
      let guard = 0;
      while (simplified.length > 40 && guard < 4) {
        eps *= 1.8;
        simplified = FieldDetectAlgorithms.douglasPeucker(contour, eps);
        guard++;
      }
      if (simplified.length < 3) simplified = FieldDetectAlgorithms.convexHull(contour);

      // 頂点密集バグ対策：douglasPeuckerだけでは輪郭のガタつき由来で数px以内に
      // 3点以上固まって残ることがあるため、近接クラスタを「最も角らしい」1点に統合する。
      const mergeMinDistPx = Math.max(4, diag * 0.006);
      simplified = FieldDetectAlgorithms.mergeNearbyVertices(simplified, mergeMinDistPx);

      snapped = FieldDetectAlgorithms.snapNearRightAngles(simplified, RIGHT_ANGLE_TOLERANCE_DEG);
      if (!snapped || snapped.length < 3) {
        _onDetectFailure('有効な形になりませんでした。感度を調整するか、手動描画をご利用ください。');
        return;
      }

      // 境界プローブ改善セッション：畑・田んぼは基本四角形〜穏やかな多角形という前提のもと、
      // 頂点数をSIMPLIFY_MAX_VERTICES以下へ自動で絞り込む（常に1回適用。既に条件を
      // 満たしている場合は直線頂点の掃除・直角スナップのみの軽い処理になる）。
      snapped = FieldDetectAlgorithms.simplifyPolygonToTarget(snapped, SIMPLIFY_MAX_VERTICES, SIMPLIFY_ANGLE_TOLERANCE_DEG);
      if (!snapped || snapped.length < 3) {
        _onDetectFailure('有効な形になりませんでした。感度を調整するか、手動描画をご利用ください。');
        return;
      }
    }

    // 座標ズレ修正：解析px座標 → 実緯度経度への変換は、地図の「今のビュー」に一切
    // 依存しないWeb Mercator投影ベースで行う（map.containerPointToLatLng()は使わない）。
    // state.rasterOriginLatLng・mercPerPxX/Yは検出（ラスタライズ）時点で確定した値のため、
    // この後に地図をパン/ズームしても結果はズレない。
    const CRS = map.options.crs || L.CRS.EPSG3857;
    const originProj = CRS.project(state.rasterOriginLatLng);
    const latlngs = snapped.map(p => CRS.unproject(L.point(
      originProj.x + p.x * state.mercPerPxX,
      originProj.y - p.y * state.mercPerPxY
    )));

    _setScopeVisible(false);
    FieldConfirmAdjust.open(latlngs, {
      source:           'auto',
      sensitivityValue: state.sensitivity,
      isRect:            state.shapeMode === 'rect',
      cultivationHint:   state.cultivationHint,
      houseSnapInfo:     houseSnapInfo,
    });
  }

  // ─── ハウス規格スナップ：矩形の短辺(間口)を規格幅に、長辺(奥行き)を1m単位に調整 ───
  // pixelCorners: minAreaRect()が返す4隅（ラスタキャンバスpixel座標、[p0,p1,p2,p3]の順で
  // p0→p1がU方向の辺、p1→p2がV方向の辺）。実距離(m)の計測にはlatlng変換とLeafletの
  // distanceTo()を使う（本ファイルはLeaflet依存が前提のため、ここで行う。
  // fieldDetectAlgorithms.js側はDOM/Leaflet非依存の純粋関数のみに留める）。
  // 戻り値: { corners: [新4隅(pixel座標)], widthM, depthM, widthSnapped } | null
  function _applyHouseSnap(pixelCorners) {
    const CRS = map.options.crs || L.CRS.EPSG3857;
    const originProj = CRS.project(state.rasterOriginLatLng);
    const toLatLng = (p) => CRS.unproject(L.point(
      originProj.x + p.x * state.mercPerPxX,
      originProj.y - p.y * state.mercPerPxY
    ));

    const p0 = pixelCorners[0], p1 = pixelCorners[1], p2 = pixelCorners[2];
    const ll0 = toLatLng(p0), ll1 = toLatLng(p1), ll2 = toLatLng(p2);

    const edgeULenM = ll0.distanceTo(ll1); // p0→p1（U方向の辺）の実距離
    const edgeVLenM = ll1.distanceTo(ll2); // p1→p2（V方向の辺）の実距離
    if (!(edgeULenM > 0) || !(edgeVLenM > 0)) return null;

    const shortIsU = edgeULenM <= edgeVLenM;
    const dims = FieldDetectAlgorithms.snapHouseDimensions(
      shortIsU ? edgeULenM : edgeVLenM,
      shortIsU ? edgeVLenM : edgeULenM
    );

    const newULenM = shortIsU ? dims.width : dims.depth;
    const newVLenM = shortIsU ? dims.depth : dims.width;
    const scaleU = newULenM / edgeULenM;
    const scaleV = newVLenM / edgeVLenM;

    // pixel空間でp0を固定アンカーとし、U/V方向の辺の長さだけをスケールして再構成
    const uVec = { x: p1.x - p0.x, y: p1.y - p0.y };
    const uLenPx = Math.hypot(uVec.x, uVec.y);
    const uUnit = { x: uVec.x / uLenPx, y: uVec.y / uLenPx };
    const vVec = { x: p2.x - p1.x, y: p2.y - p1.y };
    const vLenPx = Math.hypot(vVec.x, vVec.y);
    const vUnit = { x: vVec.x / vLenPx, y: vVec.y / vLenPx };

    const newULenPx = uLenPx * scaleU;
    const newVLenPx = vLenPx * scaleV;

    const newP0 = { x: p0.x, y: p0.y };
    const newP1 = { x: newP0.x + uUnit.x * newULenPx, y: newP0.y + uUnit.y * newULenPx };
    const newP2 = { x: newP1.x + vUnit.x * newVLenPx, y: newP1.y + vUnit.y * newVLenPx };
    const newP3 = { x: newP0.x + vUnit.x * newVLenPx, y: newP0.y + vUnit.y * newVLenPx };

    return {
      corners:      [newP0, newP1, newP2, newP3],
      widthM:       dims.width,
      depthM:       dims.depth,
      widthSnapped: dims.widthSnapped,
    };
  }

  // ═══════════════════════════════════════════
  //  ラスタライズ：タップ地点周辺のみを高解像度でcanvasへ描き写す
  //  （Leaflet内部のタイル座標を再実装せず、DOM上の実描画位置＝
  //   getBoundingClientRect()を基準にすることで常に正しい位置になる）
  //
  //  検出精度改善セッション：旧実装（画面全体を480pxへ縮小）を廃止し、
  //  中心地点からcropSizeM四方だけを切り出してtargetPxへ拡大する方式に変更。
  //  対象（ハウス間口3.6〜10m等）に対して1pxあたりの実距離を大幅に細かくし、
  //  JPEGノイズや影による数px単位のブレの実距離換算誤差を抑える狙い。
  //
  //  L.LatLng.toBounds(sizeInMeters) で「中心からsizeInMeters/2ずつ」の
  //  正方形boundsを取得し、そのNW/SEをcontainer座標へ変換してcrop範囲とする。
  //  戻り値のoriginContainerPtはcrop左上のcontainer座標、scaleは
  //  「cropのcontainer px→解析用canvas px」への拡大率。シード座標・輪郭座標を
  //  container座標へ戻す際は、pixel/scale してからoriginContainerPtを足す。
  // ═══════════════════════════════════════════

  function _rasterizeCropToCanvas(centerLatLng, cropSizeM, targetPx) {
    const mapContainer = map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();

    const bounds = centerLatLng.toBounds(cropSizeM);
    const nwLatLng = bounds.getNorthWest();
    const seLatLng = bounds.getSouthEast();
    const nwPt = map.latLngToContainerPoint(nwLatLng);
    const sePt = map.latLngToContainerPoint(seLatLng);

    const cropWpx = Math.max(1, sePt.x - nwPt.x);
    const cropHpx = Math.max(1, sePt.y - nwPt.y);
    const scale = targetPx / Math.max(cropWpx, cropHpx);

    const w = Math.max(1, Math.round(cropWpx * scale));
    const h = Math.max(1, Math.round(cropHpx * scale));

    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 透過タイルや未読込タイルがある場合の保険（自然な地表色に近い緑系）。
    // waitForTilesLoaded()により通常は未読込タイルは残っていないはずだが、
    // crop範囲が地図コンテナ端にかかる場合など取りこぼしがあった場合の保険。
    ctx.fillStyle = '#7f9a72';
    ctx.fillRect(0, 0, w, h);

    const tileImgs = mapContainer.querySelectorAll('.leaflet-tile-pane img.leaflet-tile-loaded');
    tileImgs.forEach(img => {
      const r = img.getBoundingClientRect();
      // container基準の座標 → crop原点(nwPt)基準へシフト → scaleで拡大
      const x = (r.left - mapRect.left - nwPt.x) * scale;
      const y = (r.top  - mapRect.top  - nwPt.y) * scale;
      const dw = r.width  * scale;
      const dh = r.height * scale;
      // crop範囲に一部でもかかっているタイルのみ描画（無駄な描画を避ける）
      if (x + dw < 0 || y + dh < 0 || x > w || y > h) return;
      try {
        ctx.drawImage(img, x, y, dw, dh);
      } catch (e) {
        // CORS未対応タイルが混ざっていた場合はスキップ（getImageData時に検知される）
      }
    });

    // 座標ズレ修正：解析px→実緯度経度の最終変換を「現在の地図ビュー」に依存させない
    // ようにするため、クロップ北西角の実LatLng、およびWeb Mercator投影上での
    // 解析px1個あたりの距離を、ここ（ラスタライズ時点）で確定して返す。
    // 呼び出し元（_buildAndShowPreviewFromMask・_applyHouseSnap）は、
    // map.containerPointToLatLng()等「今の地図表示状態」に依存する変換を一切使わず、
    // これらの値だけから直接座標を復元する。これにより、検出後に地図をパン/ズーム
    // してから感度スライダーで再検出しても、結果の実世界座標がズレなくなる。
    const CRS = map.options.crs || L.CRS.EPSG3857;
    const nwProj = CRS.project(nwLatLng);
    const seProj = CRS.project(seLatLng);
    const mercPerPxX = (seProj.x - nwProj.x) / w; // 東方向、解析px1個あたりの投影距離
    const mercPerPxY = (nwProj.y - seProj.y) / h; // 南方向、解析px1個あたりの投影距離

    return { canvas, scale, originContainerPt: nwPt, originLatLng: nwLatLng, mercPerPxX, mercPerPxY };
  }

  // ─── 公開API（Step5：start → beginDetectFlow にリネーム） ───
  return {
    beginDetectFlow,
    selectCultivation,
    selectShape,
    detect,
    cancelDetect,
    waitForTilesLoaded,
    ensureMinZoomForDetect,
    onSensitivityChange,
    backToTap,
    cancel,
    fallbackManual,
  };
})();