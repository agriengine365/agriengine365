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
//    PlantingLogic.migrateLegacyWidthFields(design)
//    PlantingLogic.deriveRidgeWidths(design)
//    PlantingLogic.getFieldPolygon(area)
//    PlantingLogic.getEffectiveFieldGeometry(area, houseMargin)
//    PlantingLogic.recalcAllBands(practicecrops, area, houseMargin, zonePriorityMode)
//      ↑ zonePriorityMode は省略可（省略時は従来どおり 'ratio'。Step1で 'fixed' を追加）
//    PlantingLogic.getLastZoneInfo()
//      ↑ UX見直し（2026-07）：直近のrecalcAllBands呼び出しで矩形/余剰形状ゾーン分割が
//        成立したかどうかをUI側（ゾーン判定バッジ表示）から参照するための読み取り専用API。
//    PlantingLogic.recalcAnalysisRidgeSegments(design, pitchCm, area, houseMargin)
//      ↑ 両関数とも design.ridgeInputMode==='count' なら内部で自動的に
//        畝数指定方式（calcRidgesByCount逆算）に切り替わる（呼び出し側の変更不要）
//    PlantingLogic.calcPlanting(design)
//    PlantingLogic.areaWarn(bandAreaSqm, rowAreaSqm)
// ═══════════════════════════════════════════

const PlantingLogic = (() => {

  /**
   * UX見直し（2026-07）：_recalcAllBandsCore で計算した矩形／余剰形状ゾーン分割の
   * 判定結果を保持する読み取り専用の内部状態。ゾーン判定バッジ表示のためだけに
   * 追加したもので、帯分割の計算結果そのもの（bands）には影響しない。
   * getLastZoneInfo() 経由でのみ参照させ、直接の書き換えは想定しない。
   *
   * ⚠️ 設計上の注意（2026-07）：これはモジュール内シングルトンであり、
   * 「直前に _recalcAllBandsCore が呼ばれた1エリア分」の結果しか保持できない。
   * 現状のUI構造（エリア詳細パネルは常に1つだけ開く前提）では、呼び出し側
   * （area.js側）が常に「今開いているエリア」のために recalcAllBands を呼び、
   * その直後に getLastZoneInfo() で結果を読む、という単純な逐次アクセスしか
   * 発生しないため実害はない。
   * ただし将来、複数エリアを同時に開く／エリアを跨いで並行に再計算するような
   * 改修が入ると、あるエリアの計算結果を別のエリア用に取り違えて表示する
   * バグの温床になる。そのような改修に着手する際は、_lastZoneInfo を
   * エリアID等をキーにしたMapに置き換え、recalcAllBands / getLastZoneInfo の
   * 両方にエリア識別子を引数として渡すよう拡張すること
   * （呼び出し箇所は area.js 内の recalcAllBands 呼び出し全箇所・
   * getLastZoneInfo 呼び出し箇所を要確認）。
   */
  let _lastZoneInfo = { valid: false, leftoverAreaSqm: 0, rectAreaSqm: 0 };

  /**
   * 直近の recalcAllBands 呼び出し時点でのゾーン分割判定結果を返す。
   * valid:true かつ leftoverAreaSqm>0 のとき「余剰形状ゾーン」が実際に成立している。
   * ⚠️ グローバル1件だけを保持するシングルトン参照（詳細は _lastZoneInfo 宣言部のコメント参照）。
   * 必ず「対象エリアの recalcAllBands を呼んだ直後」に呼ぶこと。
   * @returns {{valid: boolean, leftoverAreaSqm: number, rectAreaSqm: number}}
   */
  function getLastZoneInfo() {
    return { ..._lastZoneInfo };
  }


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
      // ── 畝上比率（Step8-7：ridgeTopWidth/pathWidthの2値入力を廃止し1本化）──
      ridgeRatioPct:  null,   // ピッチ(rowWidth)に対する畝上幅の配分[%, 0-100]。未設定はnull（暫定値は50）
      // ── 畝配置の入力方式（ピッチ指定 or 畝数指定）──
      ridgeInputMode: 'pitch', // 'pitch'（ピッチ入力→畝数自動）| 'count'（畝数入力→ピッチ自動）
      targetRowCount: null,    // ridgeInputMode==='count'時の目標畝数。それ以外はnull
      // ── 作物比率連動・帯状分割（仕様書セクション1）── recalcAllBands が書き込むキャッシュ
      _bandPolygon:   null,   // このデザインが担当する帯ポリゴン [{lat,lng},...] | null（未割当 or 未計算）
      _bandAreaSqm:   null,   // 帯の実面積 [m²] | null
      provisionalFields,      // 暫定自動セットされたフィールド名（例: ['rowWidth','rowSpacing']）
      // ── 自動設計（Step1・Agri_planting_auto_design_spec.MD）── AutoDesign.run() の入力設定
      autoDesign: {
        fixedRatio:    false, // true時：自動設計は比率(ratio)を書き換えない
        minRatio:      0,     // 自動設計時にこの比率[%]を下回らない（fixedRatio時は無視）
        fixedRowCount: false, // true時：自動設計は畝数(targetRowCount)を書き換えない
      },
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

    // 旧データ（ridgeTopWidth/pathWidth方式）が残っていれば新モデルへ自動変換する。
    migrateLegacyWidthFields(design);

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

    // 畝上比率（ridgeRatioPct）の暫定デフォルト：未設定の場合のみ50%（均等）をセット。
    // 既存入力（migrateLegacyWidthFieldsによる逆算値も含む）は上書きしない。
    if (design.ridgeRatioPct == null) {
      design.ridgeRatioPct = 50;
      if (!design.provisionalFields.includes('ridgeRatioPct')) design.provisionalFields.push('ridgeRatioPct');
    }

    // 畝配置の入力方式：未設定（旧データ）は 'pitch'（従来どおりピッチ指定）にフォールバック。
    if (design.ridgeInputMode !== 'pitch' && design.ridgeInputMode !== 'count') {
      design.ridgeInputMode = 'pitch';
    }

    // 自動設計設定（Step1）：旧データ（autoDesign未導入時に保存されたもの）を救済する。
    if (!design.autoDesign || typeof design.autoDesign !== 'object') {
      design.autoDesign = { fixedRatio: false, minRatio: 0, fixedRowCount: false };
    }
  }

  /**
   * 旧データモデル（design.ridgeTopWidth・design.pathWidth）を
   * 新モデル（design.rowWidth・design.ridgeRatioPct）へ自動変換する（仕様書7.4）。
   * - 両方セット済み: rowWidth = ridgeTopWidth + pathWidth,
   *                   ridgeRatioPct = ridgeTopWidth / rowWidth * 100
   * - rowWidthのみ: rowWidthはそのまま維持、ridgeRatioPctは触らない（呼び出し元の
   *   applyProvisionalDefaultsが未設定なら50%をセットする）
   * - どちらも旧フィールドが無ければ何もしない（既に新モデル、または初回生成）
   * 変換後は旧フィールドをdeleteして以後の分岐を無くす。冪等（複数回呼んでも安全）。
   * @param {object} design - plantingDesign（破壊的に変更する）
   */
  function migrateLegacyWidthFields(design) {
    if (!design) return;
    const hasLegacy = design.ridgeTopWidth != null || design.pathWidth != null;
    if (!hasLegacy) return;

    if (design.ridgeTopWidth != null && design.pathWidth != null) {
      const top  = Number(design.ridgeTopWidth);
      const path = Number(design.pathWidth);
      if (top > 0 && path >= 0) {
        const rowWidth = top + path;
        design.rowWidth = rowWidth;
        design.ridgeRatioPct = rowWidth > 0 ? Math.round((top / rowWidth) * 1000) / 10 : 50;
      }
    }
    // rowWidthのみ・不正値のみの場合はrowWidthをそのまま維持し、ridgeRatioPctには触れない
    // （未設定ならapplyProvisionalDefaults側で50%デフォルトが入る）。

    delete design.ridgeTopWidth;
    delete design.pathWidth;
  }

  /**
   * design.rowWidth（ピッチ）と design.ridgeRatioPct（畝上比率%）から、
   * 畝の実効幅（畝上幅）・畝間（通路幅）[cm] を派生算出する。
   * 保存はせず、断面図描画・拡大詳細図・境界ギャップ計算など表示・計算の都度呼ぶ。
   * @param {object} design - plantingDesign
   * @returns {{topCm: number, pathCm: number}|null} 算出不可時（rowWidth未設定等）はnull
   */
  function deriveRidgeWidths(design) {
    if (!design) return null;
    const rowWidth = Number(design.rowWidth);
    if (!(rowWidth > 0)) return null;
    const ratio = design.ridgeRatioPct != null ? Number(design.ridgeRatioPct) : 50;
    const clampedRatio = Math.min(100, Math.max(0, ratio));
    const topCm  = Math.round(rowWidth * clampedRatio / 100 * 10) / 10;
    const pathCm = Math.round((rowWidth - topCm) * 10) / 10;
    return { topCm, pathCm };
  }

  // ═══════════════════════════════════════════
  //  畝の実効幅／畝間分離・作物比率連動 帯状分割
  //  （仕様書：畝設計拡張仕様書 セクション1・2）
  // ═══════════════════════════════════════════

  /**
   * 実効ピッチ（畝の中心間距離＝RidgeGeometry.calcRidgesに渡すrowWidth）[cm] を返す。
   * Step8-7でモデルを rowWidth（ピッチ）＋ ridgeRatioPct（畝上比率）の1組に一本化した
   * ため、モード分岐は無くなり design.rowWidth をそのまま返すだけになる。
   * 呼び出し前に旧データが残っていれば migrateLegacyWidthFields で変換しておくこと
   * （念のためここでも変換を試みる）。
   * @param {object} design - plantingDesign
   * @returns {number|null} ピッチ [cm]（不正・未入力時は null）
   */
  function effectivePitchCm(design) {
    if (!design) return null;
    if (design.ridgeTopWidth != null || design.pathWidth != null) migrateLegacyWidthFields(design);
    return design.rowWidth != null && Number(design.rowWidth) > 0 ? Number(design.rowWidth) : null;
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
   * houseMargin が設定済みであれば、栽培モード（露地／ハウス問わず）
   * RidgeGeometry.computeHouseGeometry() で外周マージンの内側オフセット＋
   * 入口・反対側（Uターン）帯の穴を反映した形状を返す。
   * 【圃場マージン再設計】従来はハウス（greenhouse/heatedGreenhouse）限定の
   * isHouseゲートがあったが撤去し、露地でも圃場マージンを適用できるようにした。
   * houseMargin が未設定の場合は、従来どおり素の圃場ポリゴンをそのまま返す
   * （holesは常に空配列）。
   *
   * @param {object} area - _adpArea 相当のエリアオブジェクト
   * @param {object|null} houseMargin - _adpHouseMargin 相当の圃場マージン設定
   * @returns {{polygon: Array<{lat:number,lng:number}>, holes: Array<Array<{lat:number,lng:number}>>,
   *            entranceEdgeIndex: number, availableAreaSqm: number|null} | null}
   */
  function getEffectiveFieldGeometry(area, houseMargin) {
    const raw = getFieldPolygon(area);
    if (!raw) return null;

    if (!houseMargin || typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.computeHouseGeometry !== 'function') {
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
   * design の「畝間（pathWidth）」を、境界ギャップ計算用にメートル単位で返す。
   * 【圃場マージン再設計】作物境界には必ず1畝間分の隙間を確保する仕様のため、
   * 隣接する2作物のpathWidthのうち大きい方を境界の隙間幅として採用する。
   * Step8-7：rowWidth・ridgeRatioPctから deriveRidgeWidths で派生算出する
   * （ridgeRatioPctが未設定＝比率未確定の作物は0として扱い、境界の隙間は
   * 隣接する他方のpathWidthだけで確保される）。
   * @param {object} design - plantingDesign
   * @returns {number} pathWidth [m]（未設定時は0）
   */
  function _boundaryPathWidthM(design) {
    if (!design || design.ridgeRatioPct == null) return 0;
    const derived = deriveRidgeWidths(design);
    return derived && derived.pathCm > 0 ? derived.pathCm / 100 : 0;
  }

  /**
   * 圃場全体（穴のみ考慮・境界ギャップ未考慮）の実効面積 [m²] を取得する共通ヘルパー。
   * splitPolygonByRatio に ratios=[100] を渡して1帯だけ返させることで、
   * 「占有率100% = 圃場実面積（穴除外後）」の基準値を面積計算ロジックを重複させずに取得する。
   * @returns {number} 実効面積 [m²]（計算不可時は0）
   */
  function _wholeEffectiveAreaSqm(polygon, dir, holes) {
    try {
      const res = RidgeGeometry.splitPolygonByRatio(polygon, dir.p1, dir.p2, [100], holes);
      return res?.[0]?.areaSqm || 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * 指定ゾーン（矩形／余剰形状いずれかのポリゴン）に割り当てられた作物群について、
   * 「圃場全体に対する占有率」を保ったまま、そのゾーン自身の実効面積を基準とした
   * ローカル占有率（%）に引き直してから splitPolygonByRatio を呼び出す。
   * 【矩形補正拡張】ゾーンごとに独立して帯分割するため、境界ギャップ（gapWidthsM）も
   * ゾーン内の隣接作物同士でのみ計算する（ゾーンをまたぐ隙間は考慮しない）。
   *
   * @param {Array<{idx:number, crop:object}>} entries — このゾーンに属する作物（元のpracticecrops内インデックス付き）
   * @param {Array<{lat:number,lng:number}>} zonePolygon
   * @param {object} dir — { p1, p2 }
   * @param {Array<Array<{lat:number,lng:number}>>} holes — 圃場全体の穴（入口・反対側帯）。
   *   関数内部で zonePolygon に交差クリップしてから使用する（バグ修正・下記参照）。
   * @param {number} wholeBasisSqm — 圃場全体の実効面積（占有率の絶対基準）
   * @param {number[]} pathWidthsM — 全作物ぶんのpathWidth配列（元のpracticecrops順）
   * @param {Array<object|null>} outBands — 結果を書き込む出力先（元のpracticecrops順の配列、idxで直接代入）
   */
  function _recalcZone(entries, zonePolygon, dir, holes, wholeBasisSqm, pathWidthsM, outBands) {
    if (!entries.length) return;

    // 【矩形補正拡張・バグ修正】holes（入口帯・反対側帯）は圃場全体基準のため、
    // そのままこのゾーンの面積計算・帯分割に渡すと、実際にはこのゾーンの外にある
    // 穴まで誤って減算されてしまう（splitPolygonByRatio内部の_bandAreaWithHolesは
    // 穴を畝方向の範囲でクリップしないため）。ゾーンポリゴンに交差クリップしてから
    // 渡すことで、「このゾーンに実際に重なる部分の穴」だけを正しく反映する。
    const zoneHoles = (typeof RidgeGeometry.clipHolesToZone === 'function')
      ? RidgeGeometry.clipHolesToZone(holes, zonePolygon)
      : holes;

    const zoneBasisSqm = _wholeEffectiveAreaSqm(zonePolygon, dir, zoneHoles);
    if (!(zoneBasisSqm > 0)) return;

    const localRatios = entries.map(({ crop }) => {
      const requiredAreaSqm = wholeBasisSqm * ((Number(crop.ratio) || 0) / 100);
      return (requiredAreaSqm / zoneBasisSqm) * 100;
    });
    const zonePathWidthsM = entries.map(({ idx }) => pathWidthsM[idx]);
    const zoneGapWidthsM  = zonePathWidthsM.slice(0, -1).map((w, i) => Math.max(w, zonePathWidthsM[i + 1]));

    let zoneBands;
    try {
      zoneBands = RidgeGeometry.splitPolygonByRatio(zonePolygon, dir.p1, dir.p2, localRatios, zoneHoles, zoneGapWidthsM);
    } catch (e) {
      return;
    }
    if (!Array.isArray(zoneBands)) return;

    entries.forEach(({ idx }, i) => { outBands[idx] = zoneBands[i] || null; });
  }

  /**
   * recalcAllBands の帯分割コア処理。
   * 圃場に「入口辺＋畝方向」から作れる矩形ゾーンが成立する場合は、占有率の高い作物から
   * 順に矩形ゾーンへ詰め、矩形に収まりきらない作物（以降すべて）は余剰形状ゾーンへ回す
   * （畝設計UI統合仕様書・矩形補正拡張 Q1=連続配置／Q2=要求面積から矩形奥行きを逆算／
   * Q3=占有率順の完全自動割当／Q4=矩形に収まりきらない作物は丸ごと余剰形状側）。
   * ゾーン分割が成立しない（入口辺未設定・矩形が極端に浅い等）場合は、
   * 従来どおり圃場全体を1つのポリゴンとして帯分割する（後方互換フォールバック）。
   *
   * @param {'ratio'|'fixed'} [zonePriorityMode='ratio'] - 5.2 ゾーン優先度モード。
   *   'ratio'（デフォルト）：占有率の大きい作物から矩形ゾーンへ（従来ロジック）。
   *   'fixed'：自動設計で固定チェック済みの作物を比率に関わらず矩形ゾーンへ優先配置し、
   *   残りは占有率順で配分する（Step1・Agri_planting_auto_design_spec.MD 5.2）。
   * @returns {Array<object|null>|null} practicecropsと同じ順・同じ長さの帯配列（不成立時はnull）
   */
  function _recalcAllBandsCore(practicecrops, polygon, holes, dir, entranceEdgeIndex, pathWidthsM, zonePriorityMode) {
    let zoned = null;
    if (Number.isInteger(entranceEdgeIndex) && entranceEdgeIndex >= 0 &&
        typeof RidgeGeometry.computeZonedFieldGeometry === 'function') {
      const z = RidgeGeometry.computeZonedFieldGeometry(polygon, dir.p1, dir.p2, entranceEdgeIndex);
      // 余剰形状が実質ゼロ（圃場がほぼ矩形そのもの）ならゾーン分割の意味が無いためフォールバック
      if (z && z.valid && z.rectPolygon && z.leftoverPolygon && z.leftoverAreaSqm > 0.5) {
        zoned = z;
      }
    }

    // UX見直し（2026-07）：このコアが呼ばれるたびに最新のゾーン判定結果を記録する
    // （フォールバックしてzoned===nullの場合＝余剰形状ゾーンは不成立、として明示的に記録）。
    // ⚠️ _lastZoneInfo はエリアを区別しないグローバル1件保持（詳細は宣言部コメント参照）。
    // このコアが呼ばれるたびに直前の結果を無条件に上書きする。
    _lastZoneInfo = zoned
      ? { valid: true, leftoverAreaSqm: zoned.leftoverAreaSqm, rectAreaSqm: zoned.rectAreaSqm }
      : { valid: false, leftoverAreaSqm: 0, rectAreaSqm: 0 };

    if (!zoned) {
      // ── 従来ロジック：圃場全体を1つのポリゴンとして帯分割 ──
      const ratios = practicecrops.map(c => Number(c.ratio) || 0);
      const gapWidthsM = pathWidthsM.slice(0, -1).map((w, i) => Math.max(w, pathWidthsM[i + 1]));
      try {
        return RidgeGeometry.splitPolygonByRatio(polygon, dir.p1, dir.p2, ratios, holes, gapWidthsM);
      } catch (e) {
        return null;
      }
    }

    // ── ゾーン分割ロジック：矩形ゾーン＋余剰形状ゾーン ──
    const wholeBasisSqm = _wholeEffectiveAreaSqm(polygon, dir, holes);

    // 占有率が高い順に矩形ゾーンへ積み上げ、収まりきらなくなった作物以降はすべて余剰形状側へ（Q4=A）
    // 【Step1・5.2】zonePriorityMode==='fixed' の場合は、自動設計で固定チェック済みの作物を
    // 比率に関わらず優先（isFixedを第一キーに）し、同グループ内は従来どおり比率順とする。
    const order = practicecrops
      .map((c, idx) => ({
        idx,
        ratio: Number(c.ratio) || 0,
        isFixed: zonePriorityMode === 'fixed' &&
          !!(c.plantingDesign?.autoDesign?.fixedRatio || c.plantingDesign?.autoDesign?.fixedRowCount),
      }))
      .sort((a, b) => (b.isFixed - a.isFixed) || (b.ratio - a.ratio));

    const rectIdxSet = new Set();
    let cumulativeSqm = 0;
    for (const { idx, ratio } of order) {
      const requiredAreaSqm = wholeBasisSqm * (ratio / 100);
      if (cumulativeSqm + requiredAreaSqm <= zoned.rectAreaSqm + 1e-6) {
        rectIdxSet.add(idx);
        cumulativeSqm += requiredAreaSqm;
      } else {
        break;
      }
    }

    // 元の並び順を維持したまま矩形／余剰形状それぞれの作物リストに振り分ける
    const rectEntries = [];
    const leftoverEntries = [];
    practicecrops.forEach((crop, idx) => {
      (rectIdxSet.has(idx) ? rectEntries : leftoverEntries).push({ idx, crop });
    });

    const bands = new Array(practicecrops.length).fill(null);
    _recalcZone(rectEntries,     zoned.rectPolygon,     dir, holes, wholeBasisSqm, pathWidthsM, bands);
    _recalcZone(leftoverEntries, zoned.leftoverPolygon, dir, holes, wholeBasisSqm, pathWidthsM, bands);
    return bands;
  }

  /**
   * 実務側の全作物について、占有率（ratio）に応じた実面積比例の帯状分割を再計算し、
   * 各作物の plantingDesign に帯ポリゴン（_bandPolygon）・帯実面積（_bandAreaSqm）・
   * 帯内の畝セグメント（ridgeSegments）をキャッシュする中心的な関数。
   *
   * 呼び出しタイミング：エリア再オープン時／占有率変更時／作物追加・削除時／
   * 畝間設定（rowWidth・ridgeRatioPct）変更時。
   *
   * 前提が揃っていない場合（エリア共通の畝方向が未設定、圃場ポリゴン未取得、
   * 実務側に作物が無い等）は何もしない（既存のUI側メッセージ表示に委ねる）。
   * 占有率合計が100%未満の場合、割り当てられなかった残余分はそのまま
   * 「未割当」として扱われる（RidgeGeometry.splitPolygonByRatio の仕様どおり）。
   *
   * 【圃場マージン再設計】作物境界（帯と帯の間）には、隣接する2作物のうち
   * 大きい方のpathWidthを隙間として必ず確保する（_boundaryPathWidthM参照）。
   *
   * 【矩形補正拡張】入口辺（houseMarginのentranceEdgeIndex）が設定済みで、
   * かつ入口辺＋畝方向から成立する矩形が圃場の一部だけを占める場合（＝圃場が
   * 完全な矩形ではない場合）、占有率の高い作物から順に矩形ゾーンへ詰め、
   * 矩形に収まりきらない作物は（それ以降すべて）余剰形状ゾーンへ自動的に
   * 割り当てる（実装詳細は _recalcAllBandsCore 参照）。入口辺未設定・矩形が
   * 成立しない場合は、従来どおり圃場全体を1つのポリゴンとして帯分割する。
   *
   * NOTE: 永続化（localStorageへの保存）は行わない。practicecrops の各要素を
   * 直接書き換える（副作用あり）ため、呼び出し側が戻り値 true を確認した上で
   * 保存処理（_adpSavePracticecrops等）を呼ぶこと。
   *
   * @param {Array} practicecrops - _adpPracticecrops 相当の配列（要素を直接書き換える）
   * @param {object} area - _adpArea 相当のエリアオブジェクト
   * @param {object|null} houseMargin - _adpHouseMargin 相当のハウスマージン設定
   * @param {'ratio'|'fixed'} [zonePriorityMode='ratio'] - 5.2 ゾーン優先度モード（省略時は従来どおり比率順）
   * @returns {boolean} 再計算を実行できたか（false の場合は前提未整備でスキップ）
   */
  function recalcAllBands(practicecrops, area, houseMargin, zonePriorityMode) {
    if (!practicecrops || !practicecrops.length) return false;
    const dir = area?.meta?.ridgeBaseDirection;
    if (!dir?.p1 || !dir?.p2) return false;
    if (typeof RidgeGeometry === 'undefined' || typeof RidgeGeometry.splitPolygonByRatio !== 'function') return false;

    const geometry = getEffectiveFieldGeometry(area, houseMargin);
    if (!geometry) return false;
    const { polygon, holes, entranceEdgeIndex } = geometry;

    // 境界iと境界i+1（作物iと作物i+1の間）の隙間幅 = 両側pathWidthのうち大きい方
    const pathWidthsM = practicecrops.map(c => _boundaryPathWidthM(c.plantingDesign || {}));

    const bands = _recalcAllBandsCore(practicecrops, polygon, holes, dir, entranceEdgeIndex, pathWidthsM, zonePriorityMode);
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
        design._rowCountMismatch = null;
        return;
      }

      design._bandPolygon = band.polygon;
      design._bandAreaSqm = band.areaSqm;

      if (design.ridgeInputMode === 'count' && design.targetRowCount > 0) {
        // 畝数指定方式：目標畝数から敷地幅を均等分割し、逆算したピッチをrowWidthへ書き戻す。
        // calcRidges（ピッチ起点・中心対称展開）とは別系統のcalcRidgesByCountを使う。
        const gResult = RidgeGeometry.calcRidgesByCount(band.polygon, dir.p1, dir.p2, design.targetRowCount, holes);
        design.ridgeSegments = gResult.rows > 0 ? gResult.ridgeSegments : null;
        design.rowWidth = gResult.pitchM > 0 ? Math.round(gResult.pitchM * 100 * 10) / 10 : design.rowWidth;
        design._rowCountMismatch = gResult.matched ? null : { target: gResult.targetRows, actual: gResult.rows };
      } else {
        design._rowCountMismatch = null;
        const pitchCm = effectivePitchCm(design);
        if (pitchCm != null && pitchCm > 0) {
          const gResult = RidgeGeometry.calcRidges(band.polygon, dir.p1, dir.p2, pitchCm / 100, holes);
          design.ridgeSegments = gResult.rows > 0 ? gResult.ridgeSegments : null;
        } else {
          design.ridgeSegments = null;
        }
      }

      const calcForSave = calcPlanting(design);
      design.purchase = calcForSave?.purchase ?? null;
    });

    return true;
  }

  /**
   * 分析側（単一作物・圃場全体基準）の畝セグメントを、エリア共通の畝方向で再計算する。
   * 実務側の帯（バンド）分割とは異なり、圃場ポリゴン全体を対象にする。
   * design.ridgeInputMode==='count' の場合は pitchCm 引数を無視し、
   * design.targetRowCount から calcRidgesByCount で逆算する（畝数指定方式）。
   * @param {object} design - _adpAnalysisPlantingDesign 相当
   * @param {number|null} pitchCm - effectivePitchCm(design) の結果（pitchモード時のみ使用）
   * @param {object} area - _adpArea 相当のエリアオブジェクト
   * @param {object|null} houseMargin - _adpHouseMargin 相当のハウスマージン設定
   */
  function recalcAnalysisRidgeSegments(design, pitchCm, area, houseMargin) {
    if (!design) return;
    const dir = area?.meta?.ridgeBaseDirection;
    if (!dir?.p1 || !dir?.p2 || typeof RidgeGeometry === 'undefined') {
      design.ridgeSegments = null;
      design._rowCountMismatch = null;
      return;
    }

    if (design.ridgeInputMode === 'count' && design.targetRowCount > 0) {
      const geometry = getEffectiveFieldGeometry(area, houseMargin);
      if (!geometry) { design.ridgeSegments = null; design._rowCountMismatch = null; return; }
      const gResult = RidgeGeometry.calcRidgesByCount(geometry.polygon, dir.p1, dir.p2, design.targetRowCount, geometry.holes);
      design.ridgeSegments = gResult.rows > 0 ? gResult.ridgeSegments : null;
      design.rowWidth = gResult.pitchM > 0 ? Math.round(gResult.pitchM * 100 * 10) / 10 : design.rowWidth;
      design._rowCountMismatch = gResult.matched ? null : { target: gResult.targetRows, actual: gResult.rows };
      return;
    }

    design._rowCountMismatch = null;
    if (!(pitchCm > 0)) { design.ridgeSegments = null; return; }
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
      // 畝面積の算出には、実際にridgeSegments生成に使われた実効ピッチ（＝rowWidth）を使う。
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

    // ── 手動入力方式（後方互換・ridgeSegments未生成時のフォールバック）──
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
    migrateLegacyWidthFields,
    deriveRidgeWidths,
    getFieldPolygon,
    getEffectiveFieldGeometry,
    recalcAllBands,
    getLastZoneInfo,
    recalcAnalysisRidgeSegments,
    calcPlanting,
    areaWarn,
  };
})();