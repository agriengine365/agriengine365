// ═══════════════════════════════════════════
//  PLANTING LOGIC — 栽植設計 計算ロジック
//  area.js から抽出（栽植設計の純計算・ジオメトリ取得ロジック）
//  依存: RidgeGeometry（畝計算）, _adpGetCropById（cropDB参照ユーティリティ、area.js定義）
//  ※ _adpArea / _adpPracticecrops / _adpHouseMargin などの
//    「開いているエリア詳細パネルのインスタンス状態」には一切直接アクセスしない。
//    呼び出し側（area.js）が明示的に引数として渡すこと。
//  使用方法:
//    PlantingLogic.initDesign(cropId)
//    PlantingLogic.isProvisional(design, field)
//    PlantingLogic.applyProvisionalDefaults(design, cropId)
//    PlantingLogic.effectivePitchCm(design)
//    PlantingLogic.isDetailWidthMode(design)
//    PlantingLogic.getFieldPolygon(area)
//    PlantingLogic.getEffectiveFieldGeometry(area, houseMargin)
//    PlantingLogic.recalcAllBands(practicecrops, area, houseMargin)
//    PlantingLogic.recalcAnalysisRidgeSegments(design, pitchCm, area, houseMargin)
//    PlantingLogic.calcPlanting(design)
//    PlantingLogic.areaWarn(bandAreaSqm, rowAreaSqm)
// ═══════════════════════════════════════════

const PlantingLogic = (() => {

  /**
   * cropDB の plantingStandard から初期値を生成する。
   * cropDB に値が無い場合は全フィールドを null（手動入力）。
   * cropDBから値を埋めたフィールドは、生成時点で provisionalFields に記録し
   * 「暫定」バッジ対象にする（ユーザーが手動編集すると isProvisional 解除される）。
   */
  function initDesign(cropId) {
    const crop = _adpGetCropById(cropId);
    const std  = crop?.plantingStandard;

    const rowWidth     = std?.rowWidth     ?? null;
    const linesPerRow  = std?.linesPerRow  ?? null;
    const plantSpacing = std?.plantSpacing ?? null;
    const rowSpacing   = std?.rowSpacing   ?? null;

    const provisionalFields = [];
    if (rowWidth     != null) provisionalFields.push('rowWidth');
    if (linesPerRow  != null) provisionalFields.push('linesPerRow');
    if (plantSpacing != null) provisionalFields.push('plantSpacing');
    if (rowSpacing   != null) provisionalFields.push('rowSpacing');

    return {
      rows:           null,
      rowLength:      null,
      rowWidth,
      linesPerRow,
      plantSpacing,
      rowSpacing,
      missingRate:    null,
      // NOTE: ridgeDirection は旧・作物ごと畝方向の名残。エリア共通バー（_adpArea.meta.ridgeBaseDirection）
      // への一本化が完了したため、以後どこからも書き込まれない（後方互換のためフィールドのみ残置）。
      ridgeDirection: null,   // { p1:{lat,lng}, p2:{lat,lng} } | null（未使用・レガシー）
      ridgeSegments:  null,   // [{ length, p1:{lat,lng}, p2:{lat,lng} }] | null（地図自動計算結果キャッシュ）
      // ── 畝の実効幅／畝間分離（仕様書セクション2）──
      ridgeTopWidth:  null,   // 畝の実効幅（作付け部分）[cm]（詳細入力モード用）
      pathWidth:      null,   // 畝間（通路幅）[cm]（詳細入力モード用）
      // ── 作物比率連動・帯状分割（仕様書セクション1）── recalcAllBands が書き込むキャッシュ
      _bandPolygon:   null,   // このデザインが担当する帯ポリゴン [{lat,lng},...] | null（未割当 or 未計算）
      _bandAreaSqm:   null,   // 帯の実面積 [m²] | null
      provisionalFields,      // 暫定自動セットされたフィールド名（例: ['rowWidth','rowSpacing']）
    };
  }

  /**
   * design の指定フィールドが「暫定自動入力」中かどうかを判定。
   * 旧データ（provisionalFieldsが無い）でも安全に動くようフォールバックする。
   */
  function isProvisional(design, field) {
    return Array.isArray(design?.provisionalFields) && design.provisionalFields.includes(field);
  }

  /**
   * 畝方向確定時、未入力の rowWidth / linesPerRow / plantSpacing / rowSpacing を
   * cropDBのplantingStandardから暫定値として自動セットする。
   * Step5でセット済み（initDesign）の分は既にnullでないため通常は無害にスキップされる。
   * 旧セッションで作成済みのデータ（生成時点マーク導入前）に対する救済フォールバックとして残す。
   * 実際に埋めたフィールドは design.provisionalFields に記録し、
   * カードUIで「暫定」バッジ表示に使う（ユーザーが手動編集すると解除される）。
   */
  function applyProvisionalDefaults(design, cropId) {
    if (!design) return;
    if (!Array.isArray(design.provisionalFields)) design.provisionalFields = [];

    const crop = _adpGetCropById(cropId);
    const std  = crop?.plantingStandard;
    if (std) {
      ['rowWidth', 'linesPerRow', 'plantSpacing', 'rowSpacing'].forEach(field => {
        if (design[field] == null && std[field] != null) {
          design[field] = std[field];
          if (!design.provisionalFields.includes(field)) design.provisionalFields.push(field);
        }
      });
    }

    // 詳細入力モード（畝上幅・畝間）の共通暫定プリセット。
    // 一旦汎用値（畝上幅60cm・畝間30cm）で共通プリセットし、ユーザーに再設定を促す。
    // 既存入力を上書きしないよう、両方未入力の場合のみセットする。
    if (design.ridgeTopWidth == null && design.pathWidth == null) {
      design.ridgeTopWidth = 60;
      design.pathWidth = 30;
      ['ridgeTopWidth', 'pathWidth'].forEach(field => {
        if (!design.provisionalFields.includes(field)) design.provisionalFields.push(field);
      });
    }
  }

  // ═══════════════════════════════════════════
  //  畝の実効幅／畝間分離・作物比率連動 帯状分割
  //  （仕様書：畝設計拡張仕様書 セクション1・2）
  // ═══════════════════════════════════════════

  /**
   * 実効ピッチ（畝の中心間距離＝RidgeGeometry.calcRidgesに渡すrowWidth）[cm] を返す。
   * ridgeTopWidth（畝の実効幅）・pathWidth（畝間）が両方入力されていれば
   * その合計を優先し自動計算する（詳細入力モード）。
   * どちらか一方でも未入力の場合は、従来通り rowWidth（直接入力）にフォールバックする。
   * @param {object} design - plantingDesign
   * @returns {number|null} ピッチ [cm]（不正・未入力時は null）
   */
  function effectivePitchCm(design) {
    if (!design) return null;
    const top  = design.ridgeTopWidth;
    const path = design.pathWidth;
    if (top != null && path != null && Number(top) > 0 && Number(path) >= 0) {
      return Number(top) + Number(path);
    }
    return design.rowWidth != null && Number(design.rowWidth) > 0 ? Number(design.rowWidth) : null;
  }

  /**
   * design が「詳細入力モード」（ridgeTopWidth/pathWidthで管理）かどうかを判定。
   * カードUIの表示切替（詳細セクションの初期展開状態）に使う。
   */
  function isDetailWidthMode(design) {
    return !!(design && design.ridgeTopWidth != null && design.pathWidth != null);
  }

  /**
   * エリアの圃場ポリゴン（緯度経度配列）を取得する共通ヘルパー。
   * geojsonのパース処理を一箇所に集約する。
   * @param {object} area - _adpArea 相当のエリアオブジェクト（geojsonを持つ）
   * @returns {Array<{lat:number,lng:number}>|null} 頂点3点未満・パース失敗時は null
   */
  function getFieldPolygon(area) {
    try {
      const gj = typeof area?.geojson === 'string' ? JSON.parse(area.geojson) : area?.geojson;
      const coords = gj?.geometry?.coordinates?.[0] || gj?.coordinates?.[0] || [];
      const latLngs = coords.map(([lng, lat]) => ({ lat, lng }));
      return latLngs.length >= 3 ? latLngs : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 畝計算・苗数計算で実際に使うべき「実効ポリゴン」を返す共通ヘルパー。
   * ハウス（greenhouse/heatedGreenhouse）かつ houseMargin が設定済みの場合のみ、
   * RidgeGeometry.computeHouseGeometry() で外膜マージンの内側オフセット＋
   * 入口・設備通路の穴を反映した形状を返す。それ以外（露地・未設定）は
   * 素の圃場ポリゴンをそのまま返す（holesは常に空配列）。
   *
   * @param {object} area - _adpArea 相当のエリアオブジェクト
   * @param {object|null} houseMargin - _adpHouseMargin 相当のハウスマージン設定
   * @returns {{polygon: Array<{lat:number,lng:number}>, holes: Array<Array<{lat:number,lng:number}>>,
   *            entranceEdgeIndex: number, availableAreaSqm: number|null} | null}
   */
  function getEffectiveFieldGeometry(area, houseMargin) {
    const raw = getFieldPolygon(area);
    if (!raw) return null;

    const isHouse = area?.cultivationMode === 'greenhouse' || area?.cultivationMode === 'heatedGreenhouse';
    if (!isHouse || !houseMargin || typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.computeHouseGeometry !== 'function') {
      return { polygon: raw, holes: [], entranceEdgeIndex: -1, availableAreaSqm: null };
    }

    const geo = RidgeGeometry.computeHouseGeometry(raw, houseMargin);
    if (!Array.isArray(geo.outerPolygon) || geo.outerPolygon.length < 3) {
      return { polygon: raw, holes: [], entranceEdgeIndex: -1, availableAreaSqm: null };
    }
    return {
      polygon:           geo.outerPolygon,
      holes:              geo.holes || [],
      entranceEdgeIndex:  geo.entranceEdgeIndex,
      availableAreaSqm:   geo.availableAreaSqm,
    };
  }

  /**
   * 実務側の全作物について、占有率（ratio）に応じた実面積比例の帯状分割を再計算し、
   * 各作物の plantingDesign に帯ポリゴン（_bandPolygon）・帯実面積（_bandAreaSqm）・
   * 帯内の畝セグメント（ridgeSegments）をキャッシュする中心的な関数。
   *
   * 呼び出しタイミング：エリア再オープン時／占有率変更時／作物追加・削除時／
   * 畝間設定（ridgeTopWidth・pathWidth・rowWidth）変更時。
   *
   * 前提が揃っていない場合（エリア共通の畝方向が未設定、圃場ポリゴン未取得、
   * 実務側に作物が無い等）は何もしない（既存のUI側メッセージ表示に委ねる）。
   * 占有率合計が100%未満の場合、割り当てられなかった残余分はそのまま
   * 「未割当」として扱われる（RidgeGeometry.splitPolygonByRatio の仕様どおり）。
   *
   * NOTE: 永続化（localStorageへの保存）は行わない。practicecrops の各要素を
   * 直接書き換える（副作用あり）ため、呼び出し側が戻り値 true を確認した上で
   * 保存処理（_adpSavePracticecrops等）を呼ぶこと。
   *
   * @param {Array} practicecrops - _adpPracticecrops 相当の配列（要素を直接書き換える）
   * @param {object} area - _adpArea 相当のエリアオブジェクト
   * @param {object|null} houseMargin - _adpHouseMargin 相当のハウスマージン設定
   * @returns {boolean} 再計算を実行できたか（false の場合は前提未整備でスキップ）
   */
  function recalcAllBands(practicecrops, area, houseMargin) {
    if (!practicecrops || !practicecrops.length) return false;
    const dir = area?.meta?.ridgeBaseDirection;
    if (!dir?.p1 || !dir?.p2) return false;
    if (typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.splitPolygonByRatio !== 'function') return false;

    const geometry = getEffectiveFieldGeometry(area, houseMargin);
    if (!geometry) return false;
    const { polygon, holes } = geometry;

    const ratios = practicecrops.map(c => Number(c.ratio) || 0);
    let bands;
    try {
      bands = RidgeGeometry.splitPolygonByRatio(polygon, dir.p1, dir.p2, ratios);
    } catch (e) {
      return false;
    }
    if (!Array.isArray(bands) || bands.length !== practicecrops.length) return false;

    practicecrops.forEach((entry, idx) => {
      if (!entry.plantingDesign) entry.plantingDesign = initDesign(entry.cropId);
      const design = entry.plantingDesign;
      const band   = bands[idx];

      if (!band || !Array.isArray(band.polygon) || band.polygon.length < 3 || !(band.areaSqm > 0)) {
        // 占有率0% や分割失敗時は「未割当」扱い（畝計算は行わない）
        design._bandPolygon = null;
        design._bandAreaSqm = 0;
        design.ridgeSegments = null;
        return;
      }

      design._bandPolygon = band.polygon;
      design._bandAreaSqm = band.areaSqm;

      const pitchCm = effectivePitchCm(design);
      if (pitchCm != null && pitchCm > 0) {
        const gResult = RidgeGeometry.calcRidges(band.polygon, dir.p1, dir.p2, pitchCm / 100, holes);
        design.ridgeSegments = gResult.rows > 0 ? gResult.ridgeSegments : null;
      } else {
        design.ridgeSegments = null;
      }

      const calcForSave = calcPlanting(design);
      design.purchase = calcForSave?.purchase ?? null;
    });

    return true;
  }

  /**
   * 分析側（単一作物・圃場全体基準）の畝セグメントを、エリア共通の畝方向で再計算する。
   * 実務側の帯（バンド）分割とは異なり、圃場ポリゴン全体を対象にする。
   * @param {object} design - _adpAnalysisPlantingDesign 相当
   * @param {number|null} pitchCm - effectivePitchCm(design) の結果
   * @param {object} area - _adpArea 相当のエリアオブジェクト
   * @param {object|null} houseMargin - _adpHouseMargin 相当のハウスマージン設定
   */
  function recalcAnalysisRidgeSegments(design, pitchCm, area, houseMargin) {
    if (!design) return;
    const dir = area?.meta?.ridgeBaseDirection;
    if (!dir?.p1 || !dir?.p2 || typeof RidgeGeometry === 'undefined' || !(pitchCm > 0)) {
      design.ridgeSegments = null;
      return;
    }
    const geometry = getEffectiveFieldGeometry(area, houseMargin);
    if (!geometry) { design.ridgeSegments = null; return; }
    const gResult = RidgeGeometry.calcRidges(geometry.polygon, dir.p1, dir.p2, pitchCm / 100, geometry.holes);
    design.ridgeSegments = gResult.rows > 0 ? gResult.ridgeSegments : null;
  }

  /**
   * 栽植設計の計算ロジック。
   * ridgeSegments が存在する場合は積算方式（地図自動計算）、
   * 無い場合は手動入力（rows×rowLength）にフォールバック。
   * 返り値: { seedlings, purchase, rowAreaSqm, density, totalLine, autoCalc } or null
   */
  function calcPlanting(d) {
    const linesPerRow = Number(d.linesPerRow);
    const plantSpacing= Number(d.plantSpacing);
    const missingRate = (d.missingRate !== null && d.missingRate !== '') ? Number(d.missingRate) : null;

    // ── 積算方式（ridgeSegments あり）──
    if (Array.isArray(d.ridgeSegments) && d.ridgeSegments.length > 0) {
      // ①バグ修正：畝面積の算出には、実際にridgeSegments生成に使われた実効ピッチ
      // （詳細入力モード時は畝上幅＋畝間、それ以外はrowWidth）を使う。
      // 生のrowWidthをそのまま使うと詳細入力モード時に乖離・null化の原因になる。
      const pitchCm = effectivePitchCm(d);
      if (!pitchCm || !linesPerRow || !plantSpacing) return null;
      if (typeof RidgeGeometry === 'undefined') return null;

      const seedlings  = RidgeGeometry.totalPlants(d.ridgeSegments, linesPerRow, plantSpacing);
      const purchase   = missingRate !== null
        ? Math.ceil(seedlings * (1 + missingRate / 100))
        : Math.ceil(seedlings);
      const totalLen   = d.ridgeSegments.reduce((s, seg) => s + seg.length, 0);
      const rowAreaSqm = Math.round(totalLen * (pitchCm / 100) * 10) / 10;
      const density    = rowAreaSqm > 0 ? Math.round(seedlings / rowAreaSqm * 10) / 10 : null;
      const totalLine  = Math.round(totalLen * linesPerRow * 10) / 10;
      const rows       = d.ridgeSegments.length;
      const rowLength  = rows > 0 ? Math.round((totalLen / rows) * 10) / 10 : 0;

      return { seedlings, purchase, rowAreaSqm, density, totalLine, rows, rowLength, autoCalc: true };
    }

    // ── 手動入力方式（後方互換・詳細入力モード非対応のためrowWidthを直接使用）──
    const rows      = Number(d.rows);
    const rowLength = Number(d.rowLength);
    const rowWidth  = Number(d.rowWidth);

    if (!rows || !rowLength || !rowWidth || !linesPerRow || !plantSpacing) return null;

    const seedlings    = Math.floor((rowLength * 100 / plantSpacing) * rows * linesPerRow);
    const purchase     = missingRate !== null
      ? Math.ceil(seedlings * (1 + missingRate / 100))
      : Math.ceil(seedlings);
    const rowAreaSqm   = Math.round(rows * rowLength * rowWidth / 100 * 10) / 10;
    const density      = rowAreaSqm > 0 ? Math.round(seedlings / rowAreaSqm * 10) / 10 : null;
    const totalLine    = Math.round(rowLength * rows * linesPerRow * 10) / 10;

    return { seedlings, purchase, rowAreaSqm, density, totalLine, rows, rowLength, autoCalc: false };
  }

  /**
   * 帯実面積（占有率で実ポリゴン分割した後の実面積 _bandAreaSqm）と畝面積の
   * 不一致を判定する（5%超で警告）。
   * bandAreaSqm が null/0（未割当・分析側等）の場合は警告しない。
   *
   * Step7-x: 従来は「圃場全体面積 × 占有率」という単純比率換算
   * （_adpPracticeAreaSqm）と比較していたが、ハウスマージン・入口穴などで
   * 登録面積と実効面積がズレる場合に無関係な誤差が混ざる問題があった。
   * 実際にrecalcAllBandsで分割された帯ポリゴンの実面積と比較することで、
   * 「畝の敷き詰め効率」だけをフェアに警告する。
   */
  function areaWarn(bandAreaSqm, rowAreaSqm) {
    if (bandAreaSqm === null || bandAreaSqm === undefined || !(bandAreaSqm > 0) || rowAreaSqm === null) return null;
    const diff = Math.abs(bandAreaSqm - rowAreaSqm) / bandAreaSqm;
    return diff > 0.05 ? { bandAreaSqm, rowAreaSqm, diffPct: Math.round(diff * 100) } : null;
  }

  return {
    initDesign,
    isProvisional,
    applyProvisionalDefaults,
    effectivePitchCm,
    isDetailWidthMode,
    getFieldPolygon,
    getEffectiveFieldGeometry,
    recalcAllBands,
    recalcAnalysisRidgeSegments,
    calcPlanting,
    areaWarn,
  };
})();
