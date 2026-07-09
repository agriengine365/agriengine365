// ═══════════════════════════════════════════
//  AUTO DESIGN — 栽植設計 自動最適化エンジン（Step1／Step2）
//  仕様書: Agri_planting_auto_design_spec.MD
//  Step2（5.4）：畝ピッチfloor()境界の「僅差」判定を追加。
//  run()の結果 results[i].nearBoundary に判定結果を格納する（実際にtargetRowCountを
//  +1するかどうかはUI側（area.js）の確認ダイアログでのユーザー選択に委ねる）。
//  依存: RidgeGeometry（畝計算）, PlantingLogic（帯分割・畝再計算）,
//        _adpGetCropById（cropDB参照ユーティリティ、area.js定義）
//  ※ 既存の Step8-7（畝断面図UI）とは独立した新規シリーズ。
//  ※ _adpArea / _adpPracticecrops などの「開いているエリア詳細パネルの
//    インスタンス状態」には一切直接アクセスしない。呼び出し側（area.js）が
//    明示的に引数として渡すこと（PlantingLogicと同じ設計方針）。
//
//  使用方法:
//    AutoDesign.run({ practicecrops, area, houseMargin, zonePriorityMode, objective })
//    AutoDesign.normalizeYenPerKg(priceObj)
// ═══════════════════════════════════════════

const AutoDesign = (() => {

  // ── 収束計算パラメータ（仕様書6章・未確定事項のデフォルト値。必要に応じ調整） ──
  const DEFAULT_MAX_ITERATIONS          = 8;    // 比率反復計算の上限回数
  const DEFAULT_CONVERGENCE_THRESHOLD   = 1;    // 比率変化がこの値[%pt]未満になったら収束とみなす
  const DEFAULT_DAMPING_NEW_WEIGHT      = 0.7;  // 5.1 ダンピング：新値の重み（残りは前回値）
  const RATIO_STEP                      = 5;    // UI側の比率プルダウン刻み（5%刻み）に合わせて丸める
  const BOUNDARY_RATIO_THRESHOLD        = 0.10; // 5.4 「僅差」判定：標準ピッチの10%以内なら確認ダイアログ対象

  // ── エラー種別 ──
  const ERR = {
    NO_CROPS:            'noCrops',
    NO_RIDGE_DIRECTION:  'noRidgeDirection',
    FIXED_RATIO_OVER100: 'fixedRatioOver100',
    MIN_RATIO_OVER100:   'minRatioOver100',
    GEOMETRY_FAILED:     'geometryFailed',
  };

  const ERR_MESSAGES = {
    [ERR.NO_CROPS]:            '作物が1つも選択されていません。作物を追加してください。',
    [ERR.NO_RIDGE_DIRECTION]:  '畝方向（エリア共通）が未設定です。先に畝方向を設定してください。',
    [ERR.FIXED_RATIO_OVER100]: '固定した比率の合計が100%を超えています。固定比率を見直してください。',
    [ERR.MIN_RATIO_OVER100]:   '固定比率＋最低比率の合計が100%を超えています。最低比率を見直してください。',
    [ERR.GEOMETRY_FAILED]:     '圃場ジオメトリの計算に失敗しました（圃場形状・畝方向をご確認ください）。',
  };

  /**
   * 1作物ぶんの自動設計設定を取得（未設定時はデフォルト値でフォールバック）。
   * plantingDesign.autoDesign が無い旧データでも安全に動く。
   * @param {object} crop - practicecrops の1要素（{cropId, ratio, plantingDesign}）
   */
  function _getAutoSettings(crop) {
    const ad = crop?.plantingDesign?.autoDesign || {};
    return {
      fixedRatio:    !!ad.fixedRatio,
      minRatio:      Number(ad.minRatio) || 0,
      fixedRowCount: !!ad.fixedRowCount,
    };
  }

  /**
   * cropDBのprice（{min,max,unit}）を円/kgに正規化する。
   * unit文字列は "円/kg" "円/60kg" "円/トン" のように末尾に補足説明（括弧書き）が
   * 付く場合があるため、先頭の「円/数値?単位」パターンのみを見て判定する。
   * パースできない場合はnull（呼び出し側は0扱いとし収益最大化の対象から除外する）。
   * @param {{min:number,max:number,unit:string}|null|undefined} price
   * @returns {number|null} 円/kg単価（min-maxの平均値ベース）
   */
  function normalizeYenPerKg(price) {
    if (!price) return null;
    const min = Number(price.min);
    const max = Number(price.max);
    let avg;
    if (Number.isFinite(min) && Number.isFinite(max)) avg = (min + max) / 2;
    else if (Number.isFinite(min)) avg = min;
    else if (Number.isFinite(max)) avg = max;
    else return null;

    const unit = String(price.unit || '');
    const m = unit.match(/^円\s*\/\s*(\d+(?:\.\d+)?)?\s*(kg|トン|ｔ|ｋｇ)/i);
    if (!m) {
      // パース不能：単位不明のため換算せずそのまま返す（呼び出し側で桁違いのリスクは残るが、
      // 未知フォーマットで0扱いにして収益計算から無条件除外するよりは実害が小さいと判断）
      console.warn('[AutoDesign] price.unit をパースできませんでした:', unit);
      return avg;
    }
    const num  = m[1] ? Number(m[1]) : 1;
    const unitToken = m[2].toLowerCase();
    const isTon = unitToken === 'トン' || unitToken === 'ｔ';
    const kgPerUnit = isTon ? (num || 1) * 1000 : (num || 1);
    return kgPerUnit > 0 ? avg / kgPerUnit : null;
  }

  /**
   * 自動設計の最適化本体。practicecropsは複製して使用し、呼び出し元の実データは
   * 一切変更しない（プレビュー専用。確定はarea.js側で結果をpracticecropsへ書き戻す）。
   *
   * @param {object} params
   * @param {Array} params.practicecrops - _adpPracticecrops 相当（読み取り専用として扱う）
   * @param {object} params.area - _adpArea 相当
   * @param {object|null} params.houseMargin - _adpHouseMargin 相当
   * @param {'ratio'|'fixed'} [params.zonePriorityMode='ratio'] - 5.2 ゾーン優先度モード
   * @param {'yield'|'revenue'} [params.objective='yield'] - 5.3 目的関数
   * @param {number} [params.maxIterations]
   * @param {number} [params.convergenceThreshold]
   * @param {number} [params.dampingNewWeight]
   * @returns {{ok:true, results:Array<{cropId:string, ratio:number, targetRowCount:number,
   *             nearBoundary:{gapCm:number, rowWidthCm:number, currentRowCount:number, increasedRowCount:number}|null}>,
   *           iterations:number, converged:boolean}
   *           | {ok:false, errorType:string, message:string}}
   */
  function run(params) {
    const {
      practicecrops,
      area,
      houseMargin,
      zonePriorityMode = 'ratio',
      objective = 'yield',
      maxIterations = DEFAULT_MAX_ITERATIONS,
      convergenceThreshold = DEFAULT_CONVERGENCE_THRESHOLD,
      dampingNewWeight = DEFAULT_DAMPING_NEW_WEIGHT,
    } = params || {};

    if (!Array.isArray(practicecrops) || practicecrops.length === 0) {
      return { ok: false, errorType: ERR.NO_CROPS, message: ERR_MESSAGES[ERR.NO_CROPS] };
    }
    const dir = area?.meta?.ridgeBaseDirection;
    if (!dir?.p1 || !dir?.p2) {
      return { ok: false, errorType: ERR.NO_RIDGE_DIRECTION, message: ERR_MESSAGES[ERR.NO_RIDGE_DIRECTION] };
    }
    if (typeof PlantingLogic === 'undefined' || typeof RidgeGeometry === 'undefined') {
      return { ok: false, errorType: ERR.GEOMETRY_FAILED, message: ERR_MESSAGES[ERR.GEOMETRY_FAILED] };
    }
    const geometry = PlantingLogic.getEffectiveFieldGeometry(area, houseMargin);
    if (!geometry) {
      return { ok: false, errorType: ERR.GEOMETRY_FAILED, message: ERR_MESSAGES[ERR.GEOMETRY_FAILED] };
    }

    // ── 3.3 制約チェック（固定比率・最低比率の合計） ──
    const settingsList   = practicecrops.map(_getAutoSettings);
    const fixedRatioSum  = practicecrops.reduce((s, c, i) => s + (settingsList[i].fixedRatio ? (Number(c.ratio) || 0) : 0), 0);
    if (fixedRatioSum > 100 + 1e-9) {
      return { ok: false, errorType: ERR.FIXED_RATIO_OVER100, message: ERR_MESSAGES[ERR.FIXED_RATIO_OVER100] };
    }
    const minRatioSum = practicecrops.reduce((s, c, i) => s + (!settingsList[i].fixedRatio ? settingsList[i].minRatio : 0), 0);
    if (fixedRatioSum + minRatioSum > 100 + 1e-9) {
      return { ok: false, errorType: ERR.MIN_RATIO_OVER100, message: ERR_MESSAGES[ERR.MIN_RATIO_OVER100] };
    }

    // ── 作業用コピー（実データは変更しない） ──
    const working = practicecrops.map(c => ({
      cropId: c.cropId,
      ratio: Number(c.ratio) || 0,
      plantingDesign: {
        ...(c.plantingDesign || {}),
        ridgeInputMode: 'count', // 3.1：最適化中は畝数指定方式に統一
        targetRowCount: c.plantingDesign?.targetRowCount || null,
      },
    }));

    const nonFixedRatioIdx = working.map((_, i) => i).filter(i => !settingsList[i].fixedRatio);
    const remainingPool    = 100 - fixedRatioSum;

    // ── 3.2 手順1：初期化（固定していない作物へ均等割り） ──
    if (nonFixedRatioIdx.length > 0) {
      const share = remainingPool / nonFixedRatioIdx.length;
      nonFixedRatioIdx.forEach(i => { working[i].ratio = Math.max(share, settingsList[i].minRatio); });
    }

    let iterations = 0;
    let converged  = false;

    // 5.4：畝ピッチfloor()境界判定用に、直近（最終）イテレーションで使われた
    // 帯幅[m]・標準ピッチ[cm]を作物インデックスごとに記録する（畝数固定の作物は対象外）。
    // ※ 常に「その時点の working[i].ratio に対応する」値だけを持たせるため、band不正／
    //   rowWidth不明の場合は古い値を残さず必ずクリアする（過去イテレーションの値が
    //   別の比率のときの結果と誤って混ざるのを防ぐ）。
    const lastBandWidthM = {};
    const lastRowWidthCm = {};

    /**
     * 現在の working[].ratio で帯を再計算し、各作物の targetRowCount と
     * lastBandWidthM/lastRowWidthCm を更新する（手順2前半に相当）。
     * ループ内の毎イテレーションに加え、収束後の最終比率でも呼び出すことで、
     * results に含まれる targetRowCount/nearBoundary が最終的な ratio と
     * 必ず対応するようにする。
     * @returns {boolean} 帯の再計算に成功したか
     */
    function _recalcTargetRowCounts() {
      if (!PlantingLogic.recalcAllBands(working, area, houseMargin, zonePriorityMode)) {
        return false;
      }
      working.forEach((w, i) => {
        if (settingsList[i].fixedRowCount) return; // 畝数固定の作物はスキップ
        const design = w.plantingDesign;
        const band   = design._bandPolygon;
        if (!Array.isArray(band) || band.length < 3) {
          design.targetRowCount = 0;
          lastBandWidthM[i] = null;
          lastRowWidthCm[i] = 0;
          return;
        }
        const crop = _adpGetCropById(w.cropId);
        const std  = crop?.plantingStandard;
        const rowWidthCm = Number(std?.rowWidth) || Number(design.rowWidth) || 0;
        if (!(rowWidthCm > 0)) {
          design.targetRowCount = 0;
          lastBandWidthM[i] = null;
          lastRowWidthCm[i] = 0;
          return;
        }
        // 帯幅を「畝1本ぶん(n=1)」としてcalcRidgesByCountに通し、pitchM(=帯幅)を取得する
        const oneRow = RidgeGeometry.calcRidgesByCount(band, dir.p1, dir.p2, 1, geometry.holes);
        const bandWidthM = oneRow.pitchM || 0;
        design.targetRowCount = Math.max(0, Math.floor((bandWidthM * 100) / rowWidthCm));
        // 5.4：この作物の最終的な帯幅・標準ピッチを記録（境界判定は反復終了後にまとめて行う）
        lastBandWidthM[i] = bandWidthM;
        lastRowWidthCm[i] = rowWidthCm;
      });
      return true;
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;

      // ── 手順2 前半：現在の比率で帯を再計算し、帯幅を取得 ──
      if (!_recalcTargetRowCounts()) {
        return { ok: false, errorType: ERR.GEOMETRY_FAILED, message: ERR_MESSAGES[ERR.GEOMETRY_FAILED] };
      }

      // ── 手順2後半・手順3：更新された畝数で帯・畝セグメントを再計算し、期待収量密度を算出 ──
      if (!PlantingLogic.recalcAllBands(working, area, houseMargin, zonePriorityMode)) {
        return { ok: false, errorType: ERR.GEOMETRY_FAILED, message: ERR_MESSAGES[ERR.GEOMETRY_FAILED] };
      }

      const density = working.map((w, i) => {
        const design = w.plantingDesign;
        const crop   = _adpGetCropById(w.cropId);
        const std    = crop?.plantingStandard;
        const bandAreaSqm = Number(design._bandAreaSqm) || 0;
        if (!(bandAreaSqm > 0) || !Array.isArray(design.ridgeSegments) || !design.ridgeSegments.length) return 0;
        const seedlings = RidgeGeometry.totalPlants(design.ridgeSegments, Number(std?.linesPerRow), Number(std?.plantSpacing));
        const yieldKg   = seedlings * (Number(crop?.yieldPerPlant) || 0);
        const value     = objective === 'revenue'
          ? yieldKg * (normalizeYenPerKg(crop?.price) || 0)
          : yieldKg;
        return value / bandAreaSqm;
      });

      // ── 手順4：比率再配分（固定していない作物のみ、最低比率を下回らないよう配分） ──
      if (nonFixedRatioIdx.length > 0) {
        const minRatios  = nonFixedRatioIdx.map(i => settingsList[i].minRatio);
        const sumMin     = minRatios.reduce((s, v) => s + v, 0);
        const extraPool  = Math.max(0, remainingPool - sumMin);
        const weights    = nonFixedRatioIdx.map(i => Math.max(0, density[i]));
        const totalWeight = weights.reduce((s, v) => s + v, 0);

        const prevRatios = nonFixedRatioIdx.map(i => working[i].ratio);
        const targetRatios = nonFixedRatioIdx.map((i, k) => {
          const share = totalWeight > 0 ? (weights[k] / totalWeight) : (1 / nonFixedRatioIdx.length);
          return minRatios[k] + extraPool * share;
        });

        // 5.1 ダンピング：新値と旧値の加重平均で緩やかに寄せる（振動対策）
        const dampedRatios = targetRatios.map((t, k) => dampingNewWeight * t + (1 - dampingNewWeight) * prevRatios[k]);

        let maxChange = 0;
        nonFixedRatioIdx.forEach((i, k) => {
          maxChange = Math.max(maxChange, Math.abs(dampedRatios[k] - prevRatios[k]));
          working[i].ratio = dampedRatios[k];
        });

        if (maxChange < convergenceThreshold) {
          converged = true;
          break;
        }
      } else {
        converged = true;
        break;
      }
    }

    // ── 最終処理：5%刻みに丸め、合計100%に補正 ──
    if (nonFixedRatioIdx.length > 0) {
      const rawRatios = nonFixedRatioIdx.map(i => working[i].ratio);
      // 全体合計（固定比率＋非固定）が100になるよう、非固定側の合計を残りプール(remainingPool)に
      // 一致させつつ5%刻みに丸める
      const scaled = _roundToStepSummingTo(rawRatios, remainingPool, RATIO_STEP);
      nonFixedRatioIdx.forEach((i, k) => { working[i].ratio = scaled[k]; });
    }

    // ループ内で収束判定して break した場合、working[].ratio は「次のイテレーション用に
    // 更新済みの最終値」だが、targetRowCount/lastBandWidthM 側はその1つ前の比率のまま
    // になっている（1周期分のズレ）。5%刻み丸め後の最終比率で結果の整合性を取るため、
    // ここでもう一度だけ帯・畝数を再計算しておく。
    if (!_recalcTargetRowCounts()) {
      return { ok: false, errorType: ERR.GEOMETRY_FAILED, message: ERR_MESSAGES[ERR.GEOMETRY_FAILED] };
    }

    // 畝数が未確定（0）のまま残った場合は最低1本に補正しない（0=未割当として扱う。UI側で警告表示想定）
    const results = working.map((w, i) => {
      // 5.4：floor()境界の「僅差」判定。畝数固定の作物は対象外（ユーザー指定を尊重）。
      let nearBoundary = null;
      if (!settingsList[i].fixedRowCount && lastRowWidthCm[i] > 0) {
        const rowWidthCm  = lastRowWidthCm[i];
        const bandWidthCm = lastBandWidthM[i] * 100;
        const n     = Math.floor(bandWidthCm / rowWidthCm);
        const gapCm = (n + 1) * rowWidthCm - bandWidthCm; // あと何cmで畝を1本増やせるか
        if (gapCm > 0 && gapCm <= rowWidthCm * BOUNDARY_RATIO_THRESHOLD) {
          nearBoundary = {
            gapCm: Math.round(gapCm * 10) / 10,
            rowWidthCm,
            currentRowCount: n,
            increasedRowCount: n + 1,
          };
        }
      }
      return {
        cropId: practicecrops[i].cropId,
        ratio: Math.round(w.ratio),
        targetRowCount: Math.max(0, Math.round(w.plantingDesign.targetRowCount || 0)),
        nearBoundary,
      };
    });

    return { ok: true, results, iterations, converged };
  }

  /**
   * 値配列を、指定ステップ刻みで合計targetSumになるよう丸める。
   * @param {number[]} values
   * @param {number} targetSum
   * @param {number} step
   * @returns {number[]}
   */
  function _roundToStepSummingTo(values, targetSum, step) {
    if (!values.length) return [];
    const rounded = values.map(v => Math.round(v / step) * step);
    const total = rounded.reduce((s, v) => s + v, 0);
    let diff = Math.round((targetSum - total) / step) * step;
    if (diff === 0) return rounded;
    // 差分は最大値の要素に寄せる（複数作物間での見た目の違和感を最小化）
    let idx = 0, maxVal = -Infinity;
    rounded.forEach((v, i) => { if (v > maxVal) { maxVal = v; idx = i; } });
    rounded[idx] = Math.max(0, rounded[idx] + diff);
    return rounded;
  }

  return {
    run,
    normalizeYenPerKg,
    ERR,
  };
})();
