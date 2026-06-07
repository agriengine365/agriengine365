// ═══════════════════════════════════════════
//  phenology.js — 旬データ変換 / GDD積算 / 播種収穫ウィンドウ計算
//
//  依存: なし（純粋関数のみ）
//  呼び出し元: amedas.js, engine.js, area.js
// ═══════════════════════════════════════════

const Phenology = (() => {

  // ── 定数 ──────────────────────────────────
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
  //  返却: [ { startDecade, endDecade, score } ] — 最大12件
  function sowingWindows(decadeArr, crop) {
    const cond = crop.conditions || {};
    const tMin = cond.tempMeanMin ?? -99;
    const tMax = cond.tempMeanMax ?? 99;
    const windows = [];

    for (let s = 0; s < 36; s++) {
      const t = decadeArr.tMean[s];
      if (t === null) continue;
      if (t < tMin || t > tMax) continue;

      // 播種旬から成長期間（旬単位）連続してtMin-tMax内か確認
      const minDecades = Math.round((crop.growthPeriodMin ?? 60) / 10);
      const maxDecades = Math.round((crop.growthPeriodMax ?? 120) / 10);
      let validEnd = -1;
      for (let len = minDecades; len <= maxDecades && len <= 36; len++) {
        const endIdx = (s + len - 1) % 36;
        const te = decadeArr.tMean[endIdx];
        if (te !== null && te >= tMin && te <= tMax) {
          validEnd = (s + len - 1) % 36;
        }
      }
      if (validEnd === -1) continue;

      const score = _windowScore(decadeArr, s, validEnd, cond);
      windows.push({ startDecade: s, endDecade: validEnd, score });
    }

    // scoreで降順ソート、上位12件
    windows.sort((a, b) => b.score - a.score);
    return windows.slice(0, 12);
  }

  function _windowScore(decadeArr, s, e, cond) {
    const tOpt = ((cond.tempMeanMin ?? 15) + (cond.tempMeanMax ?? 25)) / 2;
    let score = 0, n = 0;
    const len = ((e - s + 36) % 36) + 1;
    for (let i = 0; i < len; i++) {
      const idx = (s + i) % 36;
      const t = decadeArr.tMean[idx];
      if (t !== null) {
        const diff = Math.abs(t - tOpt);
        score += Math.max(0, 1 - diff / 10);
        n++;
      }
    }
    return n > 0 ? score / n : 0;
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
    buildDecadeArray,
    accumulateGDD,
    sowingWindows,
    decadeLabel,
  };
})();
