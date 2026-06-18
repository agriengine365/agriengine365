// ═══════════════════════════════════════════
//  phenology.js — 旬データ変換 / GDD積算 / 播種収穫ウィンドウ計算
//
//  依存: なし（純粋関数のみ）
//  呼び出し元: amedas.js, engine.js, area.js
// ═══════════════════════════════════════════

const Phenology = (() => {

  // ── 定数 ──────────────────────────────────

  // カテゴリ別 旬あたり日照時間デフォルト（時間）
  // cropDB.conditions に sunDecadeMin/Opt があればそちらを優先
  const SUNSHINE_DEFAULT = {
    grain:      { min: 4.5, opt: 6.5 },
    fruit:      { min: 5.5, opt: 7.5 },
    leafy:      { min: 3.0, opt: 5.0 },
    herb:       { min: 3.0, opt: 5.0 },
    root:       { min: 4.0, opt: 6.0 },
    legume:     { min: 4.5, opt: 6.5 },
    vegetable:  { min: 4.0, opt: 6.0 },
    mushroom:   { min: 1.0, opt: 2.0 }, // 菌茸類は低日照
    specialty:  { min: 3.5, opt: 5.5 },
    _default:   { min: 3.5, opt: 5.5 },
  };

  const DECADE_KEYS = (() => {
    const months = ['jan','feb','mar','apr','may','jun',
                    'jul','aug','sep','oct','nov','dec'];
    const parts   = ['early','mid','late'];
    const keys = [];
    for (const m of months) for (const p of parts) keys.push(`${m}_${p}`);
    return keys; // 36要素
  })();

  // ── 旬配列ビルダー ─────────────────────────
  //  monthly: fetchMonthly() で取得した生JSONオブジェクト
  //  返却: { tMax, tMin, tMean, sun } — 各36要素Float配列（nullあり）
  function buildDecadeArray(monthly) {
    const tMax  = DECADE_KEYS.map(k => _dval(monthly, 'temp_max_mean', k, 10));
    const tMin  = DECADE_KEYS.map(k => _dval(monthly, 'temp_min_mean', k, 10));
    const tMean = DECADE_KEYS.map(k => _dval(monthly, 'temp_mean',     k, 10));
    const sun   = DECADE_KEYS.map(k => _dval(monthly, 'sunshine_hours',k, 10));
    return { tMax, tMin, tMean, sun, keys: DECADE_KEYS };
  }

  // 旬JSONから値取得（q=0は null）
  function _dval(monthly, key, decadeKey, divisor) {
    const elem = monthly[key];
    if (!elem) return null;
    const entry = elem.data?.[decadeKey];
    if (!entry || entry.q === 0) return null;
    return entry.v / divisor;
  }

  // ── GDD積算カーブ ─────────────────────────
  //  tMean: 36要素配列（°C）
  //  base:  基準温度（cropDB.conditions.tempMeanMin 等）
  //  startDecade: 積算開始旬インデックス(0-35)
  //  返却: 36要素 累積GDD配列（startDecade基点）
  function accumulateGDD(tMean, base, startDecade = 0) {
    const gdd = new Array(36).fill(null);
    let cum = 0;
    for (let i = 0; i < 36; i++) {
      const idx = (startDecade + i) % 36;
      const t = tMean[idx];
      if (t !== null) {
        const contrib = Math.max(0, t - base);
        cum += contrib;
      }
      gdd[(startDecade + i) % 36] = cum;
    }
    return gdd;
  }

  // ── 播種適期ウィンドウ ─────────────────────
  //  decadeArr: buildDecadeArray() の返却値
  //  crop: cropDB エントリ（conditions付き）
  //  返却: [ { startDecade, endDecade, harvestDecade, score } ] — 最大12件
  //
  //  変更点（v2）:
  //   1. 播種ウィンドウ妥当性判定を「全旬チェック」に厳格化
  //      - 区間内で最初に tempMeanMin/Max 範囲外の旬が出た時点で打ち切り
  //      - null 旬はデータ欠損として許容（打ち切らない）
  //   2. 収穫旬を GDD 積算ベースに変更
  //      - targetGDD = growthPeriodMid（日）×（tOpt − base）
  //      - base = tempMeanMin, tOpt = (tempMeanMin + tempMeanMax) / 2
  //      - 播種旬から tMean を積算し targetGDD 到達旬を収穫予測旬とする
  //      - 到達旬が growthPeriodMin×0.7〜growthPeriodMax×1.5 旬の範囲外は無効
  //      - tempMeanMin/Max が DB 未定義、または GDD で未決定の場合は
  //        従来通り growthPeriodMid 固定加算にフォールバック
  function sowingWindows(decadeArr, crop) {
    const cond = crop.conditions || {};
    const tMin = cond.tempMeanMin ?? -99;
    const tMax = cond.tempMeanMax ?? 99;
    const minDecades = Math.round((crop.growthPeriodMin ?? 60) / 10);
    const maxDecades = Math.round((crop.growthPeriodMax ?? 120) / 10);
    const gpMid      = ((crop.growthPeriodMin ?? 60) + (crop.growthPeriodMax ?? 120)) / 2;

    // GDD 目標値（tempMeanMin/Max 両方が DB に定義されている場合のみ有効）
    // ?? デフォルト値（-99/99）のまま計算すると targetGDD が発散するため
    // null チェックで明示的に定義済みの場合に限定する
    const hasTempConds = cond.tempMeanMin != null && cond.tempMeanMax != null;
    const base      = tMin;
    const tOpt      = (tMin + tMax) / 2;
    const targetGDD = hasTempConds ? gpMid * Math.max(0, tOpt - base) : 0;
    //   = gpMid × (tMax − tMin) / 2

    const windows = [];

    for (let s = 0; s < 36; s++) {
      const t = decadeArr.tMean[s];
      if (t === null || t < tMin || t > tMax) continue;

      // ── 区間内全旬チェック ────────────────────────────────────
      // len=1 は播種旬自身（既にチェック済み）、len=2 以降を順に検証
      // ・範囲外（non-null かつ tMin/tMax 逸脱）: 即打ち切り
      // ・null（データ欠損）: 許容してカウント継続
      let runLen = 1;
      for (let len = 2; len <= maxDecades && len <= 36; len++) {
        const idx = (s + len - 1) % 36;
        const tv  = decadeArr.tMean[idx];
        if (tv !== null && (tv < tMin || tv > tMax)) break;
        runLen = len;
      }
      if (runLen < minDecades) continue;
      const validEnd = (s + Math.min(runLen, maxDecades) - 1) % 36;

      // ── GDD 積算ベース収穫旬推定 ─────────────────────────────
      let harvestDecade    = null;
      const fallback       = Math.round(gpMid / 10);
      const minHDecades    = Math.round(minDecades * 0.7);
      const maxHDecades    = Math.round(maxDecades * 1.5);
      const maxSearch      = Math.min(maxHDecades, 36);

      if (targetGDD > 0) {
        let cum = 0;
        for (let i = 1; i <= maxSearch; i++) {
          const idx = (s + i - 1) % 36;
          const tv  = decadeArr.tMean[idx];
          if (tv !== null) cum += Math.max(0, tv - base);
          if (cum >= targetGDD) {
            // 安全クランプ: 生育日数の 0.7〜1.5 倍旬の範囲内のみ採用
            if (i >= minHDecades && i <= maxHDecades) {
              harvestDecade = (s + i - 1) % 36;
            }
            break;
          }
        }
      }
      // GDD で未決定（条件なし / 範囲外到達）→ 固定中央値フォールバック
      if (harvestDecade === null) harvestDecade = (s + fallback - 1) % 36;

      const score = _windowScore(decadeArr, s, validEnd, cond);
      windows.push({ startDecade: s, endDecade: validEnd, harvestDecade, score });
    }

    // score 降順ソート、上位 12 件
    windows.sort((a, b) => b.score - a.score);
    return windows.slice(0, 12);
  }

  function _windowScore(decadeArr, s, e, cond) {
    const tOpt = ((cond.tempMeanMin ?? 15) + (cond.tempMeanMax ?? 25)) / 2;

    // 日照デフォルト: cond に sunDecadeMin/Opt があれば優先、なければカテゴリデフォルト
    const sunDef = SUNSHINE_DEFAULT[cond.category] || SUNSHINE_DEFAULT._default;
    const sunMin = cond.sunDecadeMin ?? sunDef.min;
    const sunOpt = cond.sunDecadeOpt ?? sunDef.opt;

    let tempScore = 0, sunScore = 0;
    let tempN = 0, sunN = 0;
    const len = ((e - s + 36) % 36) + 1;

    for (let i = 0; i < len; i++) {
      const idx = (s + i) % 36;

      // 気温スコア
      const t = decadeArr.tMean[idx];
      if (t !== null) {
        const diff = Math.abs(t - tOpt);
        tempScore += Math.max(0, 1 - diff / 10);
        tempN++;
      }

      // 日照スコア（sun[36] が null の旬はスキップ、ペナルティなし）
      const sun = decadeArr.sun?.[idx];
      if (sun !== null && sun !== undefined) {
        if (sun >= sunOpt) {
          sunScore += 1.0;
        } else if (sun >= sunMin) {
          // min〜opt の間は線形補間
          sunScore += (sun - sunMin) / (sunOpt - sunMin);
        } else {
          // min 未満: 不足量に応じて減点（最低0）
          sunScore += Math.max(0, sun / sunMin * 0.5);
        }
        sunN++;
      }
    }

    const tNorm   = tempN > 0 ? tempScore / tempN : 0;
    const sNorm   = sunN  > 0 ? sunScore  / sunN  : tNorm; // 日照データなしは気温スコアで代替

    // 気温60% + 日照40%
    return tNorm * 0.6 + sNorm * 0.4;
  }

  // ── 旬ラベル生成（表示用）─────────────────
  //  index: 0-35
  function decadeLabel(index) {
    const monthNames = ['1月','2月','3月','4月','5月','6月',
                        '7月','8月','9月','10月','11月','12月'];
    const partNames  = ['上旬','中旬','下旬'];
    const m = Math.floor(index / 3);
    const p = index % 3;
    return monthNames[m] + partNames[p];
  }

  // ── 公開API ───────────────────────────────
  return {
    DECADE_KEYS,
    SUNSHINE_DEFAULT,
    buildDecadeArray,
    accumulateGDD,
    sowingWindows,
    decadeLabel,
  };
})();