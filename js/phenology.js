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
  //  変更点（v4）:
  //   1. 播種下限判定に C案マージン（-3℃）を適用
  //      - 下限判定: decadeArr.tMax >= tempMeanMin - 3
  //          「播種時は昼間気温が最低必要温度の3℃手前まで届いていれば許容」
  //          → 春先・晩秋の播種適期をより農業実態に近い幅に拡大
  //          → 生育期間に入れば通常の _isValidDecade（マージンなし）を維持
  //      - 上限判定: decadeArr.tMean <= tempMeanMax（変更なし）
  //      - null 旬はデータ欠損として許容（打ち切らない）
  //   2. 最低生育期間の棄却条件を minDecades × 0.7 に緩和
  //      - 棄却基準: runLen < Math.round(minDecades * 0.7)
  //          「連続適温期間が最低生育日数の7割以上あれば播種ウィンドウとして採用」
  //          → 短い適温窓でも候補に上がるため選択肢が増える
  //          → _windowScore は元の minDecades 基準を維持（品質評価は変えない）
  //   3. 収穫旬を GDD 積算ベースに変更（v2 から継続）
  //      - targetGDD = growthPeriodMid（日）×（tOpt − base）
  //      - base = tempMeanMin, tOpt = (tempMeanMin + tempMeanMax) / 2
  //      - 播種旬から tMean を積算し targetGDD 到達旬を収穫予測旬とする
  //      - 到達旬が growthPeriodMin×0.7〜growthPeriodMax×1.5 旬の範囲外は無効
  //      - tempMeanMin/Max が DB 未定義、または GDD で未決定の場合は
  //        従来通り growthPeriodMid 固定加算にフォールバック

  // 播種判定用マージン（℃）: 播種旬のみ最低温度をこの値だけ緩める
  const SOW_TMIN_MARGIN = 3;

  function sowingWindows(decadeArr, crop, cultivationMode = 'openField') {
    const cond     = crop.conditions || {};
    // ハウス(greenhouse/heatedGreenhouse)時は下限閾値のみ-4緩和（上限は無補正）
    const isHouse  = cultivationMode === 'greenhouse' || cultivationMode === 'heatedGreenhouse';
    const houseOffset = isHouse ? 4 : 0;
    const cropTMin = (cond.tempMeanMin ?? -99) - houseOffset; // 下限のみ緩和
    const cropTMax = cond.tempMeanMax ?? 99;   // 上限は一切補正しない
    const minDecades = Math.round((crop.growthPeriodMin ?? 60) / 10);
    const maxDecades = Math.round((crop.growthPeriodMax ?? 120) / 10);
    const gpMid      = ((crop.growthPeriodMin ?? 60) + (crop.growthPeriodMax ?? 120)) / 2;

    // GDD 目標値（tempMeanMin/Max 両方が DB に定義されている場合のみ有効）
    // GDD の base は作物固有の生値（ハウス補正前）を使う
    const hasTempConds = cond.tempMeanMin != null && cond.tempMeanMax != null;
    const gddBase   = cond.tempMeanMin ?? -99;           // GDD 積算用: 補正前の作物基準温度
    const tOpt      = (cropTMin + cropTMax) / 2;         // 適温中央（判定閾値ベース）
    const targetGDD = hasTempConds ? gpMid * Math.max(0, tOpt - gddBase) : 0;
    //   = gpMid × (cropTMax − cropTMin) / 2

    // ── 旬の適期判定（生育期間用・マージンなし）──────────────
    // tMax が作物最低温度に届いている && tMean が作物最高温度を超えていない
    function _isValidDecade(idx) {
      const hi  = decadeArr.tMax?.[idx];
      const avg = decadeArr.tMean?.[idx];
      if (hi === null && avg === null) return true;   // 両方null → データ欠損許容
      if (hi  !== null && hi  < cropTMin) return false; // 昼温が最低必要温度に届かない
      if (avg !== null && avg > cropTMax) return false;  // 平均が最高耐性温度を超える
      return true;
    }

    // ── 播種旬専用判定（C案: 下限を -SOW_TMIN_MARGIN℃ 緩める）──
    // 播種旬自身のみに適用し、区間継続判定は _isValidDecade を使う
    function _isValidSowDecade(idx) {
      const hi  = decadeArr.tMax?.[idx];
      const avg = decadeArr.tMean?.[idx];
      if (hi === null && avg === null) return true;
      if (hi  !== null && hi  < cropTMin - SOW_TMIN_MARGIN) return false;
      if (avg !== null && avg > cropTMax) return false;
      return true;
    }

    // 最低生育旬数の棄却閾値（×0.7 緩和）
    const minDecadesThreshold = Math.round(minDecades * 0.7);

    const windows = [];

    for (let s = 0; s < 36; s++) {
      // 播種旬は緩い判定（C案マージン適用）
      if (!_isValidSowDecade(s)) continue;

      // ── 区間内全旬チェック ────────────────────────────────────
      // len=1 は播種旬自身（既にチェック済み）、len=2 以降は通常判定
      // 適期外（_isValidDecade = false）: 即打ち切り
      let runLen = 1;
      for (let len = 2; len <= maxDecades && len <= 36; len++) {
        const idx = (s + len - 1) % 36;
        if (!_isValidDecade(idx)) break;
        runLen = len;
      }
      // 緩和された閾値で棄却（元の minDecades ×0.7）
      if (runLen < minDecadesThreshold) continue;
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
          if (tv !== null) cum += Math.max(0, tv - gddBase);
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