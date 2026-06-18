// ═══════════════════════════════════════════
//  ENGINE — 気候推定 / スコアリング / 施肥計算
// ═══════════════════════════════════════════

// ─── CLIMATE ───
const CLIMATE_TABLE = [
  { latMin:24, latMax:27, name:'亜熱帯',      tempMean:23, rain:2100 },
  { latMin:27, latMax:31, name:'温暖帯南部',   tempMean:19, rain:1800 },
  { latMin:31, latMax:34, name:'温暖帯',       tempMean:17, rain:1600 },
  { latMin:34, latMax:37, name:'温帯',         tempMean:14, rain:1300 },
  { latMin:37, latMax:40, name:'冷温帯',       tempMean:11, rain:1200 },
  { latMin:40, latMax:43, name:'亜寒帯南部',   tempMean:8,  rain:1100 },
  { latMin:43, latMax:46, name:'亜寒帯',       tempMean:6,  rain:1000 },
];

function getClimate(lat) {
  return CLIMATE_TABLE.find(c => lat >= c.latMin && lat < c.latMax)
    || CLIMATE_TABLE[CLIMATE_TABLE.length - 1];
}

// 標高補正: 100mごとに約0.6℃低下
function elevCorrect(tempMean, elev) {
  return tempMean - (elev / 100) * 0.6;
}

// ─── SCORING ───

// カテゴリ別 旬あたり日照時間デフォルト（時間）
// phenology.js の SUNSHINE_DEFAULT と同値を維持すること
const SUNSHINE_DEFAULT_ENGINE = {
  grain:      { min: 4.5, opt: 6.5 },
  fruit:      { min: 5.5, opt: 7.5 },
  leafy:      { min: 3.0, opt: 5.0 },
  herb:       { min: 3.0, opt: 5.0 },
  root:       { min: 4.0, opt: 6.0 },
  legume:     { min: 4.5, opt: 6.5 },
  vegetable:  { min: 4.0, opt: 6.0 },
  mushroom:   { min: 1.0, opt: 2.0 },
  specialty:  { min: 3.5, opt: 5.5 },
  _default:   { min: 3.5, opt: 5.5 },
};

/**
 * scoreCrop(crop, areaData)
 *
 * areaData shape:
 *   { lat, elev, soilType, climate, ph, cultivationMode }
 *   - ph              : number | null   (null = 評価不能)
 *   - cultivationMode : 'openField' | 'greenhouse' | 'heatedGreenhouse'
 *                       未指定は 'openField' として扱う
 *
 * 配点:  緯度25 + 標高20 + 気温25 + 土壌15 + pH15(nullなら除外)
 * 返却:  { crop, score, details, viable, alert, cultivationMode }
 */
function scoreCrop(crop, areaData) {
  const {
    lat,
    elev,
    soilType,
    climate,
    ph   = null,
    cultivationMode = 'openField',
  } = areaData;

  let score    = 0;
  let maxScore = 0;
  const details = [];

  // ── 栽培方式ラベル ──
  const modeLabel = {
    openField:       '露地栽培',
    greenhouse:      'ハウス栽培',
    heatedGreenhouse:'加温ハウス栽培',
  }[cultivationMode] || '露地栽培';

  // ── 気温補正値を先に確定（survivalTempMin判定でも使う） ──
  let corrTemp = null;
  if (climate) {
    const base = elev ? elevCorrect(climate.tempMean, elev) : climate.tempMean;
    // ハウス: 最低気温を-4℃補正する効果を年均では+2℃相当で近似
    corrTemp = (cultivationMode === 'greenhouse' || cultivationMode === 'heatedGreenhouse')
      ? base + 2
      : base;
  }

  // ════════════════════════════════════════
  //  viable は常に true（スコアのみで評価）
  //  ※ 最低下限気温による除外は廃止
  // ════════════════════════════════════════
  const viable = true;
  let alert    = null;

  // ════════════════════════════════════════
  //  1. 緯度スコア (25点)
  //     latMin/latMax がない場合はスキップ
  // ════════════════════════════════════════
  const c0 = crop.conditions;
  if (lat !== null && c0.latMin != null && c0.latMax != null) {
    maxScore += 25;
    if (lat >= c0.latMin && lat <= c0.latMax) {
      score += 25;
      details.push({ ok: true, text: `緯度 ${lat.toFixed(2)}° — 適正範囲内` });
    } else {
      const dist = Math.min(Math.abs(lat - c0.latMin), Math.abs(lat - c0.latMax));
      const s    = Math.max(0, 25 - dist * 10);
      score += s;
      details.push({ ok: s > 0, text: `緯度 ${lat.toFixed(2)}° — 適正外 (${c0.latMin}–${c0.latMax}°)` });
    }
  } else if (c0.latMin == null || c0.latMax == null) {
    details.push({ ok: null, text: '緯度範囲データなし — 緯度軸は評価対象外' });
  }

  // ════════════════════════════════════════
  //  2. 標高スコア (20点)
  //     elevMax がない場合はスキップ
  // ════════════════════════════════════════
  if (crop.conditions.elevMax != null) {
    maxScore += 20;
    if (elev !== null) {
      if (elev <= crop.conditions.elevMax) {
        score += 20;
        details.push({ ok: true, text: `標高 ${Math.round(elev)}m — 適正範囲内` });
      } else {
        const over = elev - crop.conditions.elevMax;
        const s    = Math.max(0, 20 - over / 20);
        score += s;
        details.push({ ok: false, text: `標高 ${Math.round(elev)}m — 上限(${crop.conditions.elevMax}m)超過` });
      }
    }
  } else {
    details.push({ ok: null, text: '標高制限データなし — 標高軸は評価対象外' });
  }

  // ════════════════════════════════════════
  //  3. 気温スコア (25点)
  //     月別データがあれば生育期間と突合せ、なければ年均気温フォールバック
  // ════════════════════════════════════════
  maxScore += 25;

  // 旬配列（areaData.climate.decadeArr から取得）
  const _decadeArr = climate?.decadeArr ?? null; // { tMax[36], tMin[36], tMean[36], sun[36] }
  const hasDecadeCols = _decadeArr &&
    Array.isArray(_decadeArr.tMean) && _decadeArr.tMean.length === 36;

  // ハウス補正:
  //   greenhouse      → 旬別最低気温を -4℃ として計算（保温効果で下限カバー範囲を拡大）
  //   heatedGreenhouse → 旬別に個別計算するためここでは定義しない
  const houseMinOffset = cultivationMode === 'greenhouse' ? -4 : 0;
  const isHeated       = cultivationMode === 'heatedGreenhouse';

  // ── 生育旬を特定（0-indexed: 0=1月上旬 … 35=12月下旬）──
  let growthDecades = null; // null = 特定不能
  const cal = crop.calendar;
  if (cal && hasDecadeCols) {
    // calendar.manage + harvest の月キーから旬インデックスへ変換（月×3旬）
    const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const flagged = new Set();
    ['manage','harvest'].forEach(phase => {
      if (!Array.isArray(cal[phase])) return;
      cal[phase].forEach(mk => {
        const mi = monthKeys.indexOf(mk);
        if (mi >= 0) { flagged.add(mi*3); flagged.add(mi*3+1); flagged.add(mi*3+2); }
      });
    });
    if (flagged.size > 0) growthDecades = [...flagged].sort((a,b) => a-b);
  }

  if (!growthDecades && hasDecadeCols) {
    // growthPeriodMin/Max から生育可能旬を推定
    const c = crop.conditions;
    if (c.tempMeanMin != null && c.tempMeanMax != null) {
      const candidates = [];
      for (let i = 0; i < 36; i++) {
        const tMean = _decadeArr.tMean[i];
        if (tMean === null) continue;
        const tMin = _decadeArr.tMin[i];
        const tAdjusted = isHeated
          ? Math.max(tMean, c.tempMeanMin)
          : tMean + (houseMinOffset / 2);
        if (isHeated || (tAdjusted >= c.tempMeanMin && tAdjusted <= c.tempMeanMax)) {
          candidates.push({ idx: i, tMean: tAdjusted });
        }
      }
      const gpMin = c.growthPeriodMin ?? 0;
      const gpMax = c.growthPeriodMax ?? 120;
      const targetDecades = Math.round((gpMin + gpMax) / 2 / 10);
      if (candidates.length > 0) {
        const sorted = [...candidates].sort((a,b) => b.tMean - a.tMean);
        const picked = sorted.slice(0, Math.max(targetDecades, candidates.length));
        growthDecades = picked.map(p => p.idx).sort((a,b) => a-b);
      }
    }
  }

  // 加温ハウス: 特定不能なら全旬を生育旬とみなす
  if (isHeated && !growthDecades) {
    growthDecades = Array.from({length: 36}, (_, i) => i);
  }

  // decadeMatch: 36要素
  //   null        = 非生育旬
  //   true        = 適合
  //   'border'    = 境界（±2℃以内）
  //   false       = 不適合
  //   { heated, diff } = 加温ハウスで補填中
  let decadeMatch = null;
  // monthlyMatch: area.js の既存カラーバー互換（12要素）
  let monthlyMatch = null;

  if (hasDecadeCols && growthDecades && growthDecades.length > 0) {
    const c = crop.conditions;
    decadeMatch  = new Array(36).fill(null);
    monthlyMatch = new Array(12).fill(null);
    let totalPts = 0;

    growthDecades.forEach(i => {
      const tMean = _decadeArr.tMean[i];
      const tMin  = _decadeArr.tMin[i];
      const tMax  = _decadeArr.tMax[i];
      if (tMean === null) { decadeMatch[i] = null; return; }
      const tMin2 = c.tempMeanMin ?? -Infinity;
      const tMax2 = c.tempMeanMax ??  Infinity;

      if (isHeated) {
        if (tMean > tMax2 + 2) {
          decadeMatch[i] = false;
          totalPts += 0;
        } else {
          const diff = Math.max(0, tMin2 - tMean);
          const monthScore = diff === 0 ? 1.0
            : diff <= 5  ? 1.0 - diff * 0.06
            : diff <= 10 ? 0.7 - (diff - 5) * 0.06
            : Math.max(0.1, 0.4 - (diff - 10) * 0.06);
          decadeMatch[i] = { heated: true, diff: Math.round(diff * 10) / 10, score: monthScore };
          totalPts += monthScore;
        }
      } else {
        const tAdj = tMean + (houseMinOffset / 2);
        if (tAdj >= tMin2 && tAdj <= tMax2) {
          decadeMatch[i] = true;
          totalPts += 1.0;
        } else if (tAdj >= tMin2 - 2 && tAdj <= tMax2 + 2) {
          decadeMatch[i] = 'border';
          totalPts += 0.5;
        } else {
          decadeMatch[i] = false;
          totalPts += 0;
        }
      }
    });

    // monthlyMatch: 各月3旬の多数決で月判定を生成（既存カラーバー互換）
    for (let m = 0; m < 12; m++) {
      const trio = [decadeMatch[m*3], decadeMatch[m*3+1], decadeMatch[m*3+2]];
      const nonNull = trio.filter(v => v !== null);
      if (nonNull.length === 0) { monthlyMatch[m] = null; continue; }
      if (nonNull.every(v => v === true))   { monthlyMatch[m] = true; continue; }
      if (nonNull.every(v => v === false))  { monthlyMatch[m] = false; continue; }
      if (nonNull.some(v => v?.heated))     { monthlyMatch[m] = nonNull.find(v => v?.heated); continue; }
      monthlyMatch[m] = 'border';
    }

    const total = growthDecades.length;
    score += Math.round(25 * (totalPts / total));

    if (isHeated) {
      const heatingDecades = decadeMatch.filter(v => v?.heated && v.diff > 0);
      const maxDiff = heatingDecades.length
        ? Math.max(...heatingDecades.map(v => v.diff))
        : 0;
      const label = heatingDecades.length === 0
        ? '加温不要（外気温で適合）'
        : `最大${maxDiff}℃補填が必要`;
      details.push({
        ok:   maxDiff < 10,
        text: `生育期気温（加温ハウス）— ${label}`,
        monthlyMatch,
        decadeMatch,
      });
    } else {
      const matchCount = decadeMatch.filter(v => v === true).length;
      const matchLabel = `${matchCount}/${total}旬適合`;
      details.push({
        ok:   matchCount >= total * 0.6,
        text: `生育期気温 — ${matchLabel}（${modeLabel}）`,
        monthlyMatch,
        decadeMatch,
      });
    }
  } else if (corrTemp !== null) {
    // フォールバック: 年均気温
    const c = crop.conditions;
    if (isHeated) {
      // 加温ハウスは年均フォールバック時も viable=true・気温差でスコア
      const diff = Math.max(0, (c.tempMeanMin ?? 0) - corrTemp);
      const pts  = diff === 0 ? 1.0
        : diff <= 5  ? 1.0 - diff * 0.06
        : diff <= 10 ? 0.7 - (diff - 5) * 0.06
        : Math.max(0.1, 0.4 - (diff - 10) * 0.06);
      score += Math.round(25 * pts);
      details.push({ ok: diff < 10, text: `加温ハウス — 年均気温差 ${diff.toFixed(1)}℃補填` });
    } else if (corrTemp >= c.tempMeanMin && corrTemp <= c.tempMeanMax) {
      score += 25;
      details.push({ ok: true,  text: `推定年均気温 ${corrTemp.toFixed(1)}℃ — 適正（${modeLabel}補正後）` });
    } else {
      details.push({ ok: false, text: `推定年均気温 ${corrTemp.toFixed(1)}℃ — 適正外(${c.tempMeanMin}–${c.tempMeanMax}℃)` });
    }
  }

  // ════════════════════════════════════════
  //  4. 土壌スコア (15点)
  // ════════════════════════════════════════
  maxScore += 15;
  {
    // soilTypes が未定義の場合は [] でフォールバック
    const soilTypes = Array.isArray(crop.conditions.soilTypes) ? crop.conditions.soilTypes : [];
    if (soilType && soilType !== 'unknown') {
      if (soilTypes.length === 0 || soilTypes.includes(soilType)) {
        score += 15;
        details.push({ ok: true,  text: soilTypes.length === 0 ? '土壌タイプデータなし — 適合とみなす' : '土壌タイプ — 適合' });
      } else {
        details.push({ ok: false, text: '土壌タイプ — 非推奨（土壌改良を要検討）' });
      }
    } else {
      // 未入力: 中間値 7点
      score += 7;
      details.push({ ok: null, text: '土壌タイプ未入力 — 推定値使用' });
    }
  }

  // ════════════════════════════════════════
  //  5. 降水量スコア (15点) ※仮置き TODO: 配点・ロジック調整
  //     rainfallMin/Max がない場合はスキップ
  // ════════════════════════════════════════
  {
    const rain    = climate?.rain ?? null;
    const rMin    = crop.conditions.rainfallMin ?? null;
    const rMax    = crop.conditions.rainfallMax ?? null;
    if (rain !== null && rMin !== null && rMax !== null) {
      maxScore += 15;
      if (rain >= rMin && rain <= rMax) {
        score += 15;
        details.push({ ok: true,  text: `年間降水量 ${rain}mm — 適正範囲(${rMin}–${rMax}mm)` });
      } else {
        // TODO: 線形減点ロジックは後で調整
        const dist = Math.min(Math.abs(rain - rMin), Math.abs(rain - rMax));
        const s    = Math.max(0, 15 - Math.round(dist / 50));
        score += s;
        details.push({ ok: s > 0, text: `年間降水量 ${rain}mm — 適正外(${rMin}–${rMax}mm)` });
      }
    } else {
      details.push({ ok: null, text: '降水量データなし — 降水量軸は評価対象外' });
    }
  }

  // ════════════════════════════════════════
  //  6. 日照スコア (10点)
  //     旬別 sun[36] があれば生育旬の積算で評価
  //     なければ estimateSunshineHours(lat) フォールバック
  // ════════════════════════════════════════
  {
    const sunDef = SUNSHINE_DEFAULT_ENGINE[crop.conditions.category]
      || SUNSHINE_DEFAULT_ENGINE._default;
    const sunDecadeMin = crop.conditions.sunDecadeMin ?? sunDef.min;
    const sunDecadeOpt = crop.conditions.sunDecadeOpt ?? sunDef.opt;

    const hasSunDecade = hasDecadeCols &&
      Array.isArray(_decadeArr.sun) && _decadeArr.sun.length === 36;

    if (hasSunDecade && growthDecades && growthDecades.length > 0) {
      // 生育旬の日照を積算評価
      let sunScore = 0;
      let sunN = 0;
      growthDecades.forEach(i => {
        const s = _decadeArr.sun[i];
        if (s === null || s === undefined) return;
        if (s >= sunDecadeOpt) {
          sunScore += 1.0;
        } else if (s >= sunDecadeMin) {
          sunScore += (s - sunDecadeMin) / (sunDecadeOpt - sunDecadeMin);
        } else {
          sunScore += Math.max(0, s / sunDecadeMin * 0.5);
        }
        sunN++;
      });

      if (sunN > 0) {
        maxScore += 10;
        const pts  = Math.round(10 * (sunScore / sunN));
        score += pts;
        const pctStr = Math.round((sunScore / sunN) * 100);
        details.push({
          ok: pctStr >= 60,
          text: `生育期日照 — 充足度${pctStr}%（旬別実測値）`,
        });
      } else {
        details.push({ ok: null, text: '生育期日照データなし — 日照軸は評価対象外' });
      }
    } else if (lat !== null) {
      // フォールバック: 緯度推定年間日照時間
      const estSun = estimateSunshineHours(lat);
      // 年間日照 → 旬平均に換算（36旬）
      const estPerDecade = estSun / 36;
      maxScore += 10;
      if (estPerDecade >= sunDecadeOpt) {
        score += 10;
        details.push({ ok: true,  text: `推定年間日照 ${Math.round(estSun)}h — 十分（緯度推定値）` });
      } else if (estPerDecade >= sunDecadeMin) {
        const pts = Math.round(10 * (estPerDecade - sunDecadeMin) / (sunDecadeOpt - sunDecadeMin));
        score += pts;
        details.push({ ok: pts >= 5, text: `推定年間日照 ${Math.round(estSun)}h — やや不足（緯度推定値）` });
      } else {
        details.push({ ok: false, text: `推定年間日照 ${Math.round(estSun)}h — 不足（緯度推定値）` });
      }
    } else {
      details.push({ ok: null, text: '日照データなし — 日照軸は評価対象外' });
    }
  }

  // ════════════════════════════════════════
  //  7. pH スコア (15点)
  //     null のとき: maxScore から除外（評価不能）
  //     フォールバック: phMin=5.0 / phMax=7.5
  // ════════════════════════════════════════
  if (ph !== null) {
    maxScore += 15;
    const c      = crop.conditions;
    const phMin  = (c.phMin  !== undefined && c.phMin  !== null) ? c.phMin  : 5.0;
    const phMax  = (c.phMax  !== undefined && c.phMax  !== null) ? c.phMax  : 7.5;

    if (ph >= phMin && ph <= phMax) {
      score += 15;
      details.push({ ok: true, text: `土壌pH ${ph.toFixed(1)} — 適正範囲(${phMin}–${phMax})` });
    } else {
      // 範囲外: 0.5pt / 0.1pH 単位で線形減点、最低0
      const dist = Math.min(Math.abs(ph - phMin), Math.abs(ph - phMax));
      const s    = Math.max(0, 15 - Math.round(dist / 0.1) * 0.5);
      score += s;
      details.push({ ok: false, text: `土壌pH ${ph.toFixed(1)} — 適正外(${phMin}–${phMax})、矯正推奨` });
    }
  } else {
    // pH 情報なし: maxScore に加算せず評価不能扱い
    details.push({ ok: null, text: 'pH未入力 — pH軸は評価対象外' });
  }

  // ════════════════════════════════════════
  //  最終スコア (パーセント換算)
  // ════════════════════════════════════════
  const pct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;

  // decadeMatch / monthlyMatch を details から抽出してトップレベルに昇格
  const _mmDetail      = details.find(d => d.monthlyMatch || d.decadeMatch);
  const _monthlyMatch  = _mmDetail?.monthlyMatch  ?? monthlyMatch  ?? null;
  const _decadeMatch   = _mmDetail?.decadeMatch   ?? decadeMatch   ?? null;

  return {
    crop, score: pct, details, viable, alert, cultivationMode,
    monthlyMatch: _monthlyMatch,
    decadeMatch:  _decadeMatch,
  };
}

function calcConfidence(areaData) {
  let pts = 0;
  const items = [];
  if (areaData.lat)     { pts += 30; items.push('緯度情報 ✓'); }
  if (areaData.elev)    { pts += 25; items.push('標高情報 ✓'); }
  if (areaData.climate) { pts += 20; items.push('気候推定 ✓'); }
  if (areaData.soilType && areaData.soilType !== 'unknown') {
    pts += 25; items.push('土壌タイプ ✓');
  } else {
    items.push('土壌タイプ 未入力（精度↓）');
  }
  return { pct: pts, items };
}

// ─── RENDER HELPERS ───

/**
 * renderCropRanking(results, containerEl)
 *
 * scoreCrop() の結果配列を受け取り、#crop-ranking に描画する。
 * viable:false の品目には赤いアラートバナーを表示する。
 *
 * @param {Array}   results     scoreCrop() の返却値配列（score降順ソート済みを推奨）
 * @param {Element} containerEl 描画先 DOM 要素
 */
function renderCropRanking(results, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  if (!results || results.length === 0) {
    containerEl.innerHTML = '<p style="color:var(--text3);font-size:12px;">対象作物なし</p>';
    return;
  }

  results.forEach((r, i) => {
    const { crop, score, details, viable, alert: alertMsg, cultivationMode } = r;

    // ── ラッパー ──
    const wrap = document.createElement('div');
    wrap.className = 'crop-rank-item' + (viable ? '' : ' crop-rank-unavailable');

    // ── ヘッダー行 ──
    const header = document.createElement('div');
    header.className = 'crop-rank-header';
    header.innerHTML = `
      <span class="crop-rank-no">${i + 1}</span>
      <span class="crop-rank-name">${crop.name}</span>
      <span class="crop-rank-score ${scoreClass(score)}">${viable ? score + '%' : '—'}</span>
    `;
    wrap.appendChild(header);

    // ── 栽培不可アラート ──
    if (!viable && alertMsg) {
      const banner = document.createElement('div');
      banner.className = 'crop-alert-banner';
      banner.innerHTML = `⚠️ ${alertMsg}`;
      wrap.appendChild(banner);
    }

    // ── スコアバー（viable のときのみ） ──
    if (viable) {
      const barWrap = document.createElement('div');
      barWrap.className = 'crop-score-bar-wrap';
      barWrap.innerHTML = `
        <div class="crop-score-bar-track">
          <div class="crop-score-bar-fill ${scoreClass(score)}" style="width:${score}%"></div>
        </div>
      `;
      wrap.appendChild(barWrap);
    }

    // ── 詳細（アコーディオン） ──
    const detWrap = document.createElement('div');
    detWrap.className = 'crop-rank-details';
    details.forEach(d => {
      const row = document.createElement('div');
      row.className = 'crop-detail-row';
      const icon = d.ok === true ? '✓' : d.ok === false ? '✗' : '–';
      const cls  = d.ok === true ? 'det-ok' : d.ok === false ? 'det-ng' : 'det-na';
      row.innerHTML = `<span class="det-icon ${cls}">${icon}</span><span class="det-text">${d.text}</span>`;
      detWrap.appendChild(row);
    });
    wrap.appendChild(detWrap);

    containerEl.appendChild(wrap);
  });
}

/** スコア帯に応じた CSS クラスを返す */
function scoreClass(score) {
  if (score >= 80) return 'score-high';
  if (score >= 55) return 'score-mid';
  return 'score-low';
}

// ─── FERTILIZER ───
function calcFertilizer(crop, areaSqm) {
  // fertilizer が null の作物（CSV由来データ等）はスキップ
  if (!crop.fertilizer) return null;
  const per10a  = crop.fertilizer;
  const area10a = areaSqm / 1000; // 1000㎡ = 10a
  return {
    N:       (per10a.N * area10a).toFixed(1),
    P:       (per10a.P * area10a).toFixed(1),
    K:       (per10a.K * area10a).toFixed(1),
    area10a: area10a.toFixed(2),
    notes:   per10a.notes,
  };
}
// Core land-profile and profitability model.
function toNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function riskLevelFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function estimateSunshineHours(lat) {
  const n = toNum(lat, 35);
  if (n < 31) return 1850;
  if (n < 34) return 1900;
  if (n < 37) return 2050;
  if (n < 40) return 1800;
  if (n < 43) return 1700;
  return 1600;
}

function estimateEnvironmentalRisk(areaData, correctedTemp) {
  const rain      = areaData.climate?.rain ?? areaData.annualRainfall ?? null;
  const slope     = toNum(areaData.slope, 0);
  const elev      = toNum(areaData.elev ?? areaData.elevation, 0);
  const temp      = toNum(correctedTemp, null);
  // AMeDAS実データがあれば真冬日日数でsnowRiskを補正
  const snowDays  = toNum(areaData.climate?.snowDays ?? areaData.meta?.amSnowDays, null);

  const floodRisk   = rain == null ? 25 : clamp((rain - 1100) / 9 + Math.max(0, 4 - slope) * 5, 0, 100);
  const droughtRisk = rain == null ? 25 : clamp((1150 - rain) / 8 + Math.max(0, slope - 8) * 3, 0, 100);
  // 推定値: 気温・標高ベース。AMeDAS真冬日日数があれば重み付きで補正
  const snowEstimate = temp == null ? 20 : clamp((10 - temp) * 8 + elev / 25, 0, 100);
  const snowRisk     = snowDays != null
    ? clamp(snowEstimate * 0.5 + clamp(snowDays / 60 * 100, 0, 100) * 0.5, 0, 100)
    : snowEstimate;

  return {
    floodRisk: Math.round(floodRisk),
    droughtRisk: Math.round(droughtRisk),
    snowRisk: Math.round(snowRisk),
    floodRiskLevel: riskLevelFromScore(floodRisk),
    droughtRiskLevel: riskLevelFromScore(droughtRisk),
    snowRiskLevel: riskLevelFromScore(snowRisk),
  };
}

function buildLandProfile(areaData = {}, soilInput = {}) {
  const lat = toNum(areaData.lat);
  const lng = toNum(areaData.lng);
  const elevation = toNum(areaData.elev ?? areaData.elevation);
  const climate = areaData.climate || (lat != null ? getClimate(lat) : null);
  const avgTemp = climate
    ? (elevation != null ? elevCorrect(climate.tempMean, elevation) : climate.tempMean)
    : toNum(areaData.avgTemp);
  const annualRainfall = climate?.rain ?? toNum(areaData.annualRainfall);
  const sunshineHours = toNum(areaData.sunshineHours, estimateSunshineHours(lat));
  const slope = toNum(areaData.slope, 0);
  const soilType = soilInput.soilType || areaData.soilType || areaData.meta?.soilType || 'unknown';
  const ph = toNum(soilInput.ph ?? areaData.ph);
  const risk = estimateEnvironmentalRisk({ ...areaData, climate }, avgTemp);

  return {
    lat,
    lng,
    elevation,
    slope,
    soilType,
    ph,
    avgTemp,
    annualRainfall,
    sunshineHours,
    floodRisk: risk.floodRisk,
    droughtRisk: risk.droughtRisk,
    snowRisk: risk.snowRisk,
    floodRiskLevel: risk.floodRiskLevel,
    droughtRiskLevel: risk.droughtRiskLevel,
    snowRiskLevel: risk.snowRiskLevel,
    climateName: climate?.name || null,
    source: {
      elevation: elevation == null ? 'missing' : 'gsi',
      climate: climate ? 'local-climate-table' : 'missing',
      sunshineHours: 'estimated',
      risks: 'estimated',
    },
  };
}

function areaDataFromLandProfile(areaData, landProfile) {
  const baseClimate = landProfile.lat != null ? getClimate(landProfile.lat) : areaData.climate;
  // AMeDAS実測値を元のclimateから引き継ぐ
  // (getClimate()の静的テーブルで上書きすると decadeArr 等が消えるため)
  const mergedClimate = {
    ...baseClimate,
    ...(areaData.climate ? {
      tempMean:      areaData.climate.tempMean      ?? baseClimate?.tempMean,
      rain:          areaData.climate.rain          ?? baseClimate?.rain,
      rainMonthly:   areaData.climate.rainMonthly   ?? null,
      sunshineHours: areaData.climate.sunshineHours ?? null,
      stationNo:     areaData.climate.stationNo     ?? null,
      stationName:   areaData.climate.stationName   ?? null,
      distKm:        areaData.climate.distKm        ?? null,
      decadeArr:     areaData.climate.decadeArr      ?? null, // 旬36点 {tMax,tMin,tMean,sun,keys}
    } : {}),
  };
  return {
    ...areaData,
    lat:      landProfile.lat,
    lng:      landProfile.lng,
    elev:     landProfile.elevation,
    soilType: landProfile.soilType,
    ph:       landProfile.ph,
    climate:  mergedClimate,
  };
}

function cropPricePerKg(crop) {
  // price が null の作物は 0 返却
  if (!crop.price) return 0;
  const avg = ((crop.price.min || 0) + (crop.price.max || 0)) / 2;
  const unit = crop.price.unit || '';
  if (unit.includes('60kg'))  return avg / 60;
  if (unit.includes('45kg'))  return avg / 45;
  if (unit.includes('30kg'))  return avg / 30;
  if (unit.includes('100kg')) return avg / 100;
  return avg || 0;
}

function cropYieldPer10aKg(crop) {
  // yield が null の作物は 0 返却
  if (!crop.yield) return 0;
  return ((crop.yield.min || 0) + (crop.yield.max || 0)) / 2;
}

// ═══════════════════════════════════════════════════════════════
//  収益計算エンジン（強化版）
//
//  設計方針:
//   - コストを種苗/資材/機械/労働/初期償却の5項目に分解
//   - 収量補正を標高・栽培方式・気温乖離の3軸で多段補正
//   - 出荷率をカテゴリ別ベース × 適合率 × 栽培方式で算出
//   - 初期費用は作物寿命年数で均等償却（果樹=10年、多年草=5年、一年草=3年）
//   - リスク控除はenv/作物/連作の3成分を重み付きで合算
// ═══════════════════════════════════════════════════════════════

// ── カテゴリ別コスト単価テーブル（円/10a・年） ─────────────────
// 種苗費: 種・苗・球根等の購入費
// 資材費: 農薬・肥料（化成）・マルチ・ネット等の消耗品
// 機械費: トラクター・管理機等の燃料・修繕の按分
// 労働費: 播種〜収穫の作業時間 × 地域最低賃金相当（≈1,000円/h）
// 初期費用: 苗木・整枝棚・灌漑設備等の初期投資（年数償却で使用）
// 償却年数: 初期費用を何年に分割するか
const COST_TABLE = {
  fruit:     { seed: 15000, material: 42000, machine: 28000, labor: 110000, initial: 350000, amortYears: 10 },
  grain:     { seed:  8000, material: 18000, machine: 35000, labor:  38000, initial:  40000, amortYears:  3 },
  legume:    { seed:  9000, material: 15000, machine: 28000, labor:  42000, initial:  35000, amortYears:  3 },
  leafy:     { seed: 12000, material: 25000, machine: 18000, labor:  80000, initial:  30000, amortYears:  3 },
  root:      { seed: 10000, material: 22000, machine: 25000, labor:  65000, initial:  32000, amortYears:  3 },
  fruit_veg: { seed: 14000, material: 30000, machine: 20000, labor:  90000, initial:  45000, amortYears:  3 },
  vegetable: { seed: 11000, material: 22000, machine: 20000, labor:  72000, initial:  30000, amortYears:  3 },
  wildveg:   { seed:  8000, material: 15000, machine: 15000, labor:  60000, initial:  80000, amortYears:  5 },
  herb:      { seed: 10000, material: 18000, machine: 12000, labor:  55000, initial:  35000, amortYears:  4 },
  mushroom:  { seed: 20000, material: 30000, machine: 15000, labor:  70000, initial: 120000, amortYears:  5 },
  forest:    { seed:  5000, material: 10000, machine: 20000, labor:  40000, initial: 100000, amortYears: 10 },
  oil:       { seed:  8000, material: 18000, machine: 30000, labor:  45000, initial:  50000, amortYears:  4 },
  fiber:     { seed:  7000, material: 16000, machine: 28000, labor:  50000, initial:  45000, amortYears:  4 },
  specialty: { seed: 12000, material: 25000, machine: 18000, labor:  60000, initial:  60000, amortYears:  5 },
  _default:  { seed: 10000, material: 22000, machine: 22000, labor:  60000, initial:  40000, amortYears:  3 },
};

// ── カテゴリ別 出荷率ベース ────────────────────────────────────
// 露地・標準適合率（suitabilityRate=1.0）での基準値
// ハウス・高適合率では上側に補正される
const MARKETABLE_BASE = {
  fruit:     0.78,
  grain:     0.92,
  legume:    0.88,
  leafy:     0.70,
  root:      0.80,
  fruit_veg: 0.75,
  vegetable: 0.78,
  wildveg:   0.82,
  herb:      0.80,
  mushroom:  0.88,
  forest:    0.85,
  oil:       0.90,
  fiber:     0.88,
  specialty: 0.80,
  _default:  0.78,
};

/**
 * calculateRiskDeductionRate(crop, landProfile)
 *
 * リスク控除率を3成分の重み付き合算で算出する。
 *
 * 成分:
 *   envRate    : 圃場環境リスク（洪水・干ばつ・積雪の平均）× 0.20
 *   cropRate   : 作物固有リスク（リスク項目のレベル別加算）
 *   continuousRate: 連作障害リスク（continuousCropYears=1 → 5%、それ以外 → 2%）
 *
 * 上限: 45%（過大な控除を防ぐ）
 */
function calculateRiskDeductionRate(crop, landProfile) {
  // 環境リスク: 3指標の平均（0〜100）を 0〜1 に正規化し 0.20 を乗じる
  const envAvg = (
    (landProfile.floodRisk   || 0) +
    (landProfile.droughtRisk || 0) +
    (landProfile.snowRisk    || 0)
  ) / 3;
  const envRate = (envAvg / 100) * 0.20;

  // 作物固有リスク: high=8% / medium=4% / low=1.5%
  const cropRate = (crop.risks || []).reduce((sum, r) => {
    return sum + (r.level === 'high' ? 0.08 : r.level === 'medium' ? 0.04 : 0.015);
  }, 0);

  // 連作障害リスク
  const continuousRate = crop.conditions?.continuousCropYears <= 1 ? 0.05 : 0.02;

  return clamp(envRate + cropRate + continuousRate, 0, 0.45);
}

/**
 * calculateProfitability(crop, areaData, scoreResult, landProfile)
 *
 * 収益性を多軸モデルで算出する。
 *
 * 収量補正3軸:
 *   1. 適合率補正     : suitabilityRate（スコア/100）をそのまま乗算
 *   2. 栽培方式補正   : greenhouse=+15%, heatedGreenhouse=+25%, openField=±0%
 *   3. 標高・気温補正 : DB最適気温からの乖離が大きいほど収量ペナルティ
 *
 * コスト5項目:
 *   seedCost / materialCost / machineCost / laborCost / amortizedInitialCost
 *
 * 返却フィールド（後方互換のため旧フィールドも維持）:
 *   area10a, baseYield, yieldCorrectionFactor, predictedYield,
 *   marketableYieldRate, marketableYield, averagePrice,
 *   revenue, seedCost, materialCost, machineCost, laborCost,
 *   amortizedInitialCost, annualCost (旧互換: seed+material+machine),
 *   riskDeduction, riskDeductionRate, averageProfit
 */
function calculateProfitability(crop, areaData, scoreResult, landProfile) {
  const area10a         = Math.max(0, (areaData.areaSqm || 0) / 1000);
  const suitabilityRate = clamp((scoreResult?.score || 0) / 100, 0, 1);
  const cultivationMode = areaData.cultivationMode || 'openField';
  const cat             = crop.conditions?.category || crop.category || '_default';
  const costRow         = COST_TABLE[cat] || COST_TABLE._default;

  // ── ① 収量補正係数 ──────────────────────────────────────────
  // 適合率補正
  const suitFactor = suitabilityRate;

  // 栽培方式補正
  const modeFactor = cultivationMode === 'heatedGreenhouse' ? 1.25
                   : cultivationMode === 'greenhouse'       ? 1.15
                   : 1.0;

  // 気温乖離補正: 年均気温と作物最適気温の差に基づくペナルティ
  // 最適気温 = (tempMeanMin + tempMeanMax) / 2
  const cond    = crop.conditions || {};
  let tempFactor = 1.0;
  if (cond.tempMeanMin != null && cond.tempMeanMax != null && landProfile.avgTemp != null) {
    const tOpt = (cond.tempMeanMin + cond.tempMeanMax) / 2;
    const diff  = Math.abs(landProfile.avgTemp - tOpt);
    // 2℃以内: ペナルティなし / 2〜8℃: 線形減少 / 8℃超: 最大20%減
    tempFactor = diff <= 2 ? 1.0
               : diff <= 8 ? 1.0 - (diff - 2) / 6 * 0.20
               : 0.80;
  }

  const yieldCorrectionFactor = Math.round(suitFactor * modeFactor * tempFactor * 1000) / 1000;

  // ── ② 収量計算 ───────────────────────────────────────────────
  const baseYield      = cropYieldPer10aKg(crop) * area10a;
  const predictedYield = baseYield * yieldCorrectionFactor;

  // ── ③ 出荷率 ─────────────────────────────────────────────────
  // カテゴリ別ベース × 適合率補正（±8%）× 栽培方式補正（ハウス+5%）
  const marketableBase     = MARKETABLE_BASE[cat] || MARKETABLE_BASE._default;
  const marketableAdj      = clamp(marketableBase + (suitabilityRate - 0.7) * 0.08, 0.45, 0.96);
  const marketableYieldRate = cultivationMode !== 'openField'
    ? clamp(marketableAdj + 0.05, 0.45, 0.97)
    : marketableAdj;
  const marketableYield    = predictedYield * marketableYieldRate;

  // ── ④ 販売収入 ───────────────────────────────────────────────
  const averagePrice = cropPricePerKg(crop);
  const revenue      = marketableYield * averagePrice;

  // ── ⑤ コスト5項目（円/10a × 面積） ─────────────────────────
  // ハウス栽培: 資材費+15%、機械費+10%（暖房・設備費を資材費に含む近似）
  const modeMatMult = cultivationMode !== 'openField' ? 1.15 : 1.0;
  const modeMacMult = cultivationMode !== 'openField' ? 1.10 : 1.0;

  // 肥料費補正: fertilizer.N/P/K 合計量 × 単価（DBにある場合のみ加算）
  const fert         = crop.fertilizer || { N: 0, P: 0, K: 0 };
  const fertAdj      = ((fert.N || 0) + (fert.P || 0) + (fert.K || 0)) * 800; // 800円/kg

  const seedCost             = costRow.seed     * area10a;
  const materialCost         = (costRow.material * modeMatMult + fertAdj) * area10a;
  const machineCost          = costRow.machine  * modeMacMult * area10a;
  const laborCost            = costRow.labor    * area10a;
  const amortizedInitialCost = (costRow.initial / costRow.amortYears) * area10a;

  // 後方互換: annualCost = 種苗+資材+機械（旧: 資材+肥料の扱い）
  const annualCost = seedCost + materialCost + machineCost;

  // ── ⑥ リスク控除 ─────────────────────────────────────────────
  const riskDeductionRate = calculateRiskDeductionRate(crop, landProfile);
  const riskDeduction     = revenue * riskDeductionRate;

  // ── ⑦ 純利益 ─────────────────────────────────────────────────
  const averageProfit = revenue
    - seedCost
    - materialCost
    - machineCost
    - laborCost
    - amortizedInitialCost
    - riskDeduction;

  return {
    // 面積
    area10a,
    // 収量
    baseYield,
    yieldCorrectionFactor,
    predictedYield,
    marketableYieldRate,
    marketableYield,
    // 収入
    averagePrice,
    revenue,
    // コスト（5項目）
    seedCost,
    materialCost,
    machineCost,
    laborCost,
    amortizedInitialCost,
    amortYears: costRow.amortYears,
    // 後方互換フィールド
    annualCost,
    initialCost: costRow.initial * area10a,   // 旧フィールド（未償却の総額）
    // リスク控除
    riskDeductionRate,
    riskDeduction,
    // 利益
    averageProfit,
  };
}

// ─── 営農条件スコア（最大20点） ───
/**
 * calcFarmingConditionScore(crop, conditions)
 *
 * ウィザードで入力した営農条件と作物特性の一致度を0〜20点で返す。
 * areaData.farmingConditions に格納された条件オブジェクトを受け取る。
 *
 * conditions shape:
 *   {
 *     priority:   'profit' | 'easywork' | 'lowrisk'   // 優先軸
 *     equipment:  'openField' | 'greenhouse' | 'paddy' // 設備
 *     period:     'short' | 'mid' | 'long'             // 栽培期間
 *     sales:      'direct' | 'ja' | 'roadside' | 'processing' | 'self' // 販売先
 *     scale:      'solo' | 'family' | 'hired'          // 規模
 *     experience: 'beginner' | 'mid' | 'expert'        // 経験
 *   }
 *
 * 返却: { score(0-20), details[{text,pts}] }
 */
function calcFarmingConditionScore(crop, conditions) {
  if (!conditions) return { score: 0, details: [] };

  const c   = crop.conditions || {};
  const cat = crop.category   || '';
  let pts   = 0;
  const details = [];

  // ── 1. 優先軸（最大5点） ──
  const priority = conditions.priority;
  if (priority === 'profit') {
    // 収益重視：価格レンジが広い・収量が多い作物を優遇
    const priceRange = crop.price ? (crop.price.max || 0) - (crop.price.min || 0) : 0;
    const yieldMid   = crop.yield ? ((crop.yield.min || 0) + (crop.yield.max || 0)) / 2 : 0;
    const p = priceRange > 200 || yieldMid > 3000 ? 5 : priceRange > 80 || yieldMid > 1000 ? 3 : 1;
    pts += p;
    details.push({ text: `優先軸(収益)`, pts: p });
  } else if (priority === 'easywork') {
    // 手間最小：管理期間が短い・リスクが少ない作物を優遇
    const riskCount = (crop.risks || []).length;
    const gpMid = c.growthPeriodMax ? (c.growthPeriodMin || 0 + c.growthPeriodMax) / 2 : 180;
    const p = riskCount <= 1 && gpMid <= 120 ? 5 : riskCount <= 2 ? 3 : 1;
    pts += p;
    details.push({ text: `優先軸(手間最小)`, pts: p });
  } else if (priority === 'lowrisk') {
    // リスク分散：high リスクが少ない作物を優遇
    const highRisks = (crop.risks || []).filter(r => r.level === 'high').length;
    const p = highRisks === 0 ? 5 : highRisks === 1 ? 2 : 0;
    pts += p;
    details.push({ text: `優先軸(低リスク)`, pts: p });
  }

  // ── 2. 設備（最大4点） ──
  const equipment = conditions.equipment;
  if (equipment === 'paddy') {
    // 水田可：水稲・蓮根など水田系を優遇
    const p = ['grain', 'root'].includes(cat) ? 4 : 1;
    pts += p;
    details.push({ text: `設備(水田)`, pts: p });
  } else if (equipment === 'greenhouse') {
    // ハウスあり：果菜・ハーブ・葉菜を優遇
    const p = ['fruit_veg', 'herb', 'leafy', 'fruit'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `設備(ハウス)`, pts: p });
  } else {
    // 露地のみ：露地向き作物を優遇
    const p = ['grain', 'legume', 'root', 'wildveg', 'oil', 'fiber'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `設備(露地)`, pts: p });
  }

  // ── 3. 栽培期間（最大4点） ──
  const period  = conditions.period;
  const gpMin   = c.growthPeriodMin ?? 60;
  const gpMax   = c.growthPeriodMax ?? 180;
  const gpMid   = (gpMin + gpMax) / 2;
  if (period === 'short') {
    const p = gpMid <= 90 ? 4 : gpMid <= 150 ? 2 : 0;
    pts += p;
    details.push({ text: `栽培期間(短期)`, pts: p });
  } else if (period === 'mid') {
    const p = gpMid > 90 && gpMid <= 240 ? 4 : 2;
    pts += p;
    details.push({ text: `栽培期間(中期)`, pts: p });
  } else if (period === 'long') {
    // 長期・樹木可：果樹・林産を優遇
    const p = ['fruit', 'forest'].includes(cat) || gpMid > 240 ? 4 : 2;
    pts += p;
    details.push({ text: `栽培期間(長期)`, pts: p });
  }

  // ── 4. 販売先（最大4点） ──
  const sales = conditions.sales;
  if (sales === 'direct' || sales === 'roadside') {
    // 直売・道の駅：付加価値の高い野菜・果物・ハーブ向き
    const p = ['fruit', 'herb', 'leafy', 'fruit_veg', 'wildveg'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `販売先(直売)`, pts: p });
  } else if (sales === 'ja') {
    // JA出荷：大量生産向き穀物・根菜
    const p = ['grain', 'legume', 'root', 'oil', 'fiber'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `販売先(JA)`, pts: p });
  } else if (sales === 'processing') {
    // 加工業者：油脂・繊維・豆類向き
    const p = ['oil', 'fiber', 'legume', 'grain'].includes(cat) ? 4 : 2;
    pts += p;
    details.push({ text: `販売先(加工)`, pts: p });
  } else {
    // 自家消費：何でも2点
    pts += 2;
    details.push({ text: `販売先(自家消費)`, pts: 2 });
  }

  // ── 5. 規模・経験（最大3点、合算） ──
  const scale      = conditions.scale;
  const experience = conditions.experience;
  const riskCount  = (crop.risks || []).length;
  const gpMid2     = (gpMin + gpMax) / 2;

  // 規模：一人なら手間が少ない作物を優遇
  if (scale === 'solo') {
    const p = riskCount <= 1 && gpMid2 <= 150 ? 2 : 1;
    pts += p;
    details.push({ text: `規模(一人)`, pts: p });
  } else if (scale === 'family') {
    pts += 1;
    details.push({ text: `規模(家族)`, pts: 1 });
  } else {
    // 雇用あり：手間のかかる果樹・野菜を優遇
    const p = ['fruit', 'fruit_veg', 'leafy'].includes(cat) ? 2 : 1;
    pts += p;
    details.push({ text: `規模(雇用)`, pts: p });
  }

  // 経験：初心者はリスクが少ない作物を優遇
  if (experience === 'beginner') {
    const highRisks = (crop.risks || []).filter(r => r.level === 'high').length;
    const p = highRisks === 0 ? 1 : 0;
    pts += p;
    details.push({ text: `経験(初心者)`, pts: p });
  } else {
    pts += 1;
    details.push({ text: `経験(中〜上級)`, pts: 1 });
  }

  return { score: Math.min(20, Math.round(pts)), details };
}

function buildAnalysisResult(areaData) {
  const landProfile     = buildLandProfile(areaData);
  const scoringAreaData = areaDataFromLandProfile(areaData, landProfile);
  const farmCond        = areaData.farmingConditions || null;

  const cropScores = CROP_DB
    .map(crop => {
      const scoreResult = scoreCrop(crop, scoringAreaData);

      // 営農条件スコアを合算（条件がある場合のみ）
      let totalScore      = scoreResult.score;
      let farmingScore    = null;
      let farmingDetails  = [];
      if (farmCond) {
        const fs        = calcFarmingConditionScore(crop, farmCond);
        farmingScore    = fs.score;
        farmingDetails  = fs.details;
        // 既存スコア(0-100)に対して最大+20点加算後、100点満点に正規化
        totalScore = Math.min(100, Math.round(scoreResult.score * (100 / 120) + farmingScore * (100 / 120)));
      }

      return {
        ...scoreResult,
        score:          totalScore,
        baseScore:      scoreResult.score,  // 元の気候・土壌スコア
        farmingScore,                        // 営農条件スコア（null=未入力）
        farmingDetails,
        profitability:  calculateProfitability(crop, areaData, scoreResult, landProfile),
      };
    })
    .sort((a, b) => {
      if (a.viable !== b.viable) return a.viable ? -1 : 1;
      if (b.score  !== a.score)  return b.score - a.score;
      return b.profitability.averageProfit - a.profitability.averageProfit;
    });

  return {
    landProfile,
    cropScores,
    topCrop: cropScores[0] || null,
  };
}

// ─── 単一作物×エリア 詳細分析エンジン ───
/**
 * buildSingleCropAnalysis(cropId, areaData)
 *
 * ウィザードで選択した1作物とエリアデータの突合せ結果を返す。
 * buildAnalysisResult() と同じlandProfile/scoringAreaDataを使いつつ、
 * 対象作物1件のみをスコアリング・収益計算・施肥計算する。
 *
 * @param {string} cropId   - CROP_DB の id
 * @param {object} areaData - currentAreaData（cultivationMode含む）
 * @returns {{
 *   crop, landProfile, scoreResult, profitability,
 *   fertilizer, confidence, cultivationMode
 * } | null}
 */
function buildSingleCropAnalysis(cropId, areaData) {
  const crop = (typeof CROP_DB !== 'undefined')
    ? CROP_DB.find(c => c.id === cropId)
    : null;
  if (!crop) return null;

  const landProfile     = buildLandProfile(areaData);
  const scoringAreaData = areaDataFromLandProfile(areaData, landProfile);

  // cultivationMode を scoringAreaData に確実に反映
  scoringAreaData.cultivationMode = areaData.cultivationMode || 'openField';

  const scoreResult   = scoreCrop(crop, scoringAreaData);

  // 営農条件スコア合算
  const farmCond = areaData.farmingConditions || null;
  let totalScore     = scoreResult.score;
  let farmingScore   = null;
  let farmingDetails = [];
  if (farmCond) {
    const fs       = calcFarmingConditionScore(crop, farmCond);
    farmingScore   = fs.score;
    farmingDetails = fs.details;
    totalScore     = Math.min(100, Math.round(scoreResult.score * (100 / 120) + farmingScore * (100 / 120)));
  }

  const adjustedScoreResult = {
    ...scoreResult,
    score:         totalScore,
    baseScore:     scoreResult.score,
    farmingScore,
    farmingDetails,
  };

  const profitability = calculateProfitability(crop, areaData, adjustedScoreResult, landProfile);
  const fertilizer    = calcFertilizer(crop, areaData.areaSqm || 0);
  const confidence    = calcConfidence(scoringAreaData);

  return {
    crop,
    landProfile,
    scoreResult:    adjustedScoreResult,
    profitability,
    fertilizer,
    confidence,
    cultivationMode: scoringAreaData.cultivationMode,
  };
}

// ═══════════════════════════════════════════════════════════════
//  リスク計算エンジン群
//
//  共通ユーティリティ: _buildGrowDecades(startDecade, endDecade)
//    生育期間の旬インデックス配列を生成（年跨ぎ対応）
//    startDecade〜endDecade が null の場合は空配列を返す
// ═══════════════════════════════════════════════════════════════

function _buildGrowDecades(startDecade, endDecade) {
  if (startDecade == null || endDecade == null) return [];
  const arr = [];
  if (endDecade >= startDecade) {
    for (let i = startDecade; i <= endDecade; i++) arr.push(i % 36);
  } else {
    // 年跨ぎ（例: 11月上旬播種 → 翌4月収穫）
    for (let i = startDecade; i < 36; i++) arr.push(i);
    for (let i = 0; i <= endDecade; i++) arr.push(i);
  }
  return arr;
}

// ── リスクレベル共通マッピング ──────────────────────────────────
// count / threshold 比率（0〜1）からレベルを返す
function _riskLevelByRatio(ratio) {
  if (ratio === 0)       return { riskLevel: 'none', riskStars: '☆☆☆☆' };
  if (ratio <= 0.15)     return { riskLevel: 'low',  riskStars: '★☆☆☆' };
  if (ratio <= 0.35)     return { riskLevel: 'mid',  riskStars: '★★★☆' };
  return                        { riskLevel: 'high', riskStars: '★★★★' };
}

// ─── ① 高温リスク計算（強化版）───────────────────────────────
/**
 * calcHeatRisk(crop, decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別最高気温(tMax)が高温閾値以上となる旬を検出し、
 * 旬数カウント・超過温度積算・連続高温旬数を返す。
 *
 * 閾値は作物の heatType で決定:
 *   'warm' → 35℃（高温性：トマト・スイカ等）
 *   'cool' → 33℃（冷涼性：レタス・コムギ等、デフォルト）
 *
 * 返却:
 *   {
 *     hotDecadeCount      : number,  // 閾値超過旬数
 *     hotDayApprox        : number,  // 旬×10日換算（参考値）
 *     heatSeverityScore   : number,  // 超過℃の積算（生育期間全体）
 *     maxConsecutiveHot   : number,  // 最大連続高温旬数
 *     threshold           : number,  // 使用した閾値(℃)
 *     heatType            : string,  // 'warm' | 'cool'
 *     riskLevel           : string,  // 'none'|'low'|'mid'|'high'
 *     riskStars           : string,  // '★☆☆☆' 等（4段階）
 *     riskLabel           : string,  // 表示用テキスト
 *   }
 *   生育期間が未定・tMax配列なし の場合は null を返す
 */
function calcHeatRisk(crop, decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMax || !Array.isArray(decadeArr.tMax)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const heatType  = crop.heatType === 'warm' ? 'warm' : 'cool';
  const threshold = heatType === 'warm' ? 35 : 33;

  let hotDecadeCount    = 0;
  let heatSeverityScore = 0;
  let maxConsecutiveHot = 0;
  let curConsec         = 0;

  growDecades.forEach(i => {
    const t = decadeArr.tMax[i];
    if (t != null && t >= threshold) {
      hotDecadeCount++;
      heatSeverityScore += (t - threshold);
      curConsec++;
      if (curConsec > maxConsecutiveHot) maxConsecutiveHot = curConsec;
    } else {
      curConsec = 0;
    }
  });

  heatSeverityScore = Math.round(heatSeverityScore * 10) / 10;

  const ratio = growDecades.length > 0 ? hotDecadeCount / growDecades.length : 0;
  const { riskLevel, riskStars } = _riskLevelByRatio(ratio);

  const riskLabel = {
    none: 'リスクなし',
    low:  '低リスク',
    mid:  '中リスク',
    high: '高リスク',
  }[riskLevel];

  const hotDayApprox = hotDecadeCount * 10;
  return {
    hotDecadeCount, hotDayApprox, heatSeverityScore, maxConsecutiveHot,
    threshold, heatType, riskLevel, riskStars, riskLabel,
  };
}

// ─── ② 霜リスク計算 ────────────────────────────────────────────
/**
 * calcFrostRisk(decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別最低気温(tMin)が 0℃未満となる旬を検出し、
 * 霜の発生リスクレベルを返す。
 *
 * 返却:
 *   {
 *     frostDecadeCount : number,    // 0℃未満旬数
 *     frostDecades     : number[],  // 0℃未満旬インデックスリスト
 *     frostDayApprox   : number,    // 旬×10日換算（参考値）
 *     lowestTMin       : number,    // 最低気温（生育期間中の最小値）
 *     riskLevel        : string,    // 'none'|'low'|'mid'|'high'
 *     riskStars        : string,
 *     riskLabel        : string,
 *   }
 *   tMin配列なし の場合は null
 */
function calcFrostRisk(decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMin || !Array.isArray(decadeArr.tMin)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const frostDecades = growDecades.filter(i => {
    const t = decadeArr.tMin[i];
    return t != null && t < 0;
  });

  const frostDecadeCount = frostDecades.length;
  const frostDayApprox   = frostDecadeCount * 10;

  // 最低気温（null は除外）
  const tMinVals  = growDecades.map(i => decadeArr.tMin[i]).filter(v => v != null);
  const lowestTMin = tMinVals.length > 0 ? Math.round(Math.min(...tMinVals) * 10) / 10 : null;

  const ratio = growDecades.length > 0 ? frostDecadeCount / growDecades.length : 0;
  const { riskLevel, riskStars } = _riskLevelByRatio(ratio);

  const riskLabel = {
    none: '霜リスクなし',
    low:  '霜リスク低（局所対策で回避可）',
    mid:  '霜リスク中（防霜対策が必要）',
    high: '霜リスク高（栽培時期の再検討推奨）',
  }[riskLevel];

  return {
    frostDecadeCount, frostDecades, frostDayApprox, lowestTMin,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ③ 冷害リスク計算 ──────────────────────────────────────────
/**
 * calcChillRisk(crop, decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別平均気温(tMean)が「作物最低必要温度 + 3℃」を下回る旬を
 * 冷害リスク旬として検出する（生育鈍化・障害の前兆も捕捉するため+3℃マージン）。
 *
 * 返却:
 *   {
 *     chillDecadeCount : number,   // 低温旬数
 *     chillDecades     : number[], // 低温旬インデックスリスト
 *     worstDiff        : number,   // 最大乖離℃（cropTMin+3 との差、正値）
 *     chillThreshold   : number,   // 使用した閾値（cropTMin + 3）
 *     riskLevel        : string,
 *     riskStars        : string,
 *     riskLabel        : string,
 *   }
 *   tMean配列なし の場合は null
 */
function calcChillRisk(crop, decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMean || !Array.isArray(decadeArr.tMean)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const cropTMin     = crop.conditions?.tempMeanMin ?? null;
  // cropTMin 未定義の場合はリスク計算不可
  if (cropTMin === null) return null;

  const chillThreshold = cropTMin + 3; // B案マージン

  const chillDecades = growDecades.filter(i => {
    const t = decadeArr.tMean[i];
    return t != null && t < chillThreshold;
  });

  const chillDecadeCount = chillDecades.length;

  // 最大乖離（最も寒い旬と閾値の差）
  const diffs = chillDecades.map(i => chillThreshold - (decadeArr.tMean[i] ?? chillThreshold));
  const worstDiff = diffs.length > 0 ? Math.round(Math.max(...diffs) * 10) / 10 : 0;

  const ratio = growDecades.length > 0 ? chillDecadeCount / growDecades.length : 0;
  const { riskLevel, riskStars } = _riskLevelByRatio(ratio);

  const riskLabel = {
    none: '冷害リスクなし',
    low:  '冷害リスク低（生育が一時的に鈍化する可能性）',
    mid:  '冷害リスク中（品質低下・収量減の可能性あり）',
    high: '冷害リスク高（栽培適期の再検討を推奨）',
  }[riskLevel];

  return {
    chillDecadeCount, chillDecades, worstDiff, chillThreshold,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ④ 日照不足リスク計算 ──────────────────────────────────────
/**
 * calcSunDeficitRisk(crop, decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別日照時間(sun)が作物の最低必要日照（sunDecadeMin）を
 * 下回る旬を検出し、日照充足率とリスクレベルを返す。
 *
 * 返却:
 *   {
 *     sufficiencyPct   : number,   // 日照充足率（0〜100%）
 *     deficitDecades   : number[], // 日照不足旬インデックスリスト
 *     deficitDecadeCount: number,
 *     sunDecadeMin     : number,   // 使用した最低基準（h/旬）
 *     riskLevel        : string,
 *     riskStars        : string,
 *     riskLabel        : string,
 *   }
 *   sun配列なし・生育期間データなし の場合は null
 */
function calcSunDeficitRisk(crop, decadeArr, startDecade, endDecade) {
  if (!decadeArr?.sun || !Array.isArray(decadeArr.sun)) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const cond   = crop.conditions || {};
  const sunDef = SUNSHINE_DEFAULT_ENGINE[cond.category] || SUNSHINE_DEFAULT_ENGINE._default;
  const sunDecadeMin = cond.sunDecadeMin ?? sunDef.min;
  const sunDecadeOpt = cond.sunDecadeOpt ?? sunDef.opt;

  // データがある旬のみ評価
  const validDecades = growDecades.filter(i => decadeArr.sun[i] != null);
  if (validDecades.length === 0) return null;

  const deficitDecades = validDecades.filter(i => decadeArr.sun[i] < sunDecadeMin);

  // 充足率: 各旬のスコア（0〜1）の平均
  let scoreSum = 0;
  validDecades.forEach(i => {
    const s = decadeArr.sun[i];
    if (s >= sunDecadeOpt) {
      scoreSum += 1.0;
    } else if (s >= sunDecadeMin) {
      scoreSum += (s - sunDecadeMin) / (sunDecadeOpt - sunDecadeMin);
    } else {
      scoreSum += Math.max(0, s / sunDecadeMin * 0.5);
    }
  });
  const sufficiencyPct = Math.round((scoreSum / validDecades.length) * 100);

  // 不足率からリスクレベル
  const deficitRatio = deficitDecades.length / validDecades.length;
  const { riskLevel, riskStars } = _riskLevelByRatio(deficitRatio);

  const riskLabel = {
    none: '日照リスクなし',
    low:  '日照やや不足（影響は軽微）',
    mid:  '日照不足（徒長・品質低下に注意）',
    high: '日照大幅不足（施設補光または作期変更を検討）',
  }[riskLevel];

  return {
    sufficiencyPct,
    deficitDecades,
    deficitDecadeCount: deficitDecades.length,
    sunDecadeMin,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ⑤ 寒暖差指数 ──────────────────────────────────────────────
/**
 * calcDiurnalIndex(decadeArr, startDecade, endDecade)
 *
 * 生育期間内の旬別日較差（tMax - tMin）を集計し、
 * 寒暖差の特性を返す。
 *
 * 日較差は糖度・色付き・香気など品質形成に正の影響を与えるため、
 * 大きいほど品質向上に有利な指数として扱う。
 *
 * riskLevel は「寒暖差のなさ」に対するリスクとして定義:
 *   none → 日較差大（品質形成に有利、平均10℃超）
 *   low  → 日較差やや大（7〜10℃）
 *   mid  → 日較差小（4〜7℃）
 *   high → 日較差極小（4℃未満、品質形成に不利）
 *
 * 返却:
 *   {
 *     avgRange   : number,  // 平均日較差（℃）
 *     maxRange   : number,  // 最大日較差
 *     minRange   : number,  // 最小日較差
 *     decadeCount: number,  // 評価旬数（nullを除く）
 *     riskLevel  : string,  // 'none'|'low'|'mid'|'high'（日較差不足リスク）
 *     riskStars  : string,
 *     riskLabel  : string,
 *   }
 *   tMax/tMin 配列なし の場合は null
 */
function calcDiurnalIndex(decadeArr, startDecade, endDecade) {
  if (!decadeArr?.tMax || !decadeArr?.tMin) return null;
  const growDecades = _buildGrowDecades(startDecade, endDecade);
  if (!growDecades.length) return null;

  const ranges = growDecades
    .map(i => {
      const hi = decadeArr.tMax[i];
      const lo = decadeArr.tMin[i];
      return (hi != null && lo != null) ? hi - lo : null;
    })
    .filter(v => v !== null);

  if (ranges.length === 0) return null;

  const avgRange = Math.round((ranges.reduce((s, v) => s + v, 0) / ranges.length) * 10) / 10;
  const maxRange = Math.round(Math.max(...ranges) * 10) / 10;
  const minRange = Math.round(Math.min(...ranges) * 10) / 10;

  // 日較差不足リスク（小さいほど高リスク）
  let riskLevel, riskStars, riskLabel;
  if (avgRange >= 10) {
    riskLevel = 'none'; riskStars = '☆☆☆☆'; riskLabel = '寒暖差大（品質形成に有利）';
  } else if (avgRange >= 7) {
    riskLevel = 'low';  riskStars = '★☆☆☆'; riskLabel = '寒暖差やや大（品質向上が期待できる）';
  } else if (avgRange >= 4) {
    riskLevel = 'mid';  riskStars = '★★★☆'; riskLabel = '寒暖差小（品質形成効果は限定的）';
  } else {
    riskLevel = 'high'; riskStars = '★★★★'; riskLabel = '寒暖差極小（品質向上効果は期待しにくい）';
  }

  return {
    avgRange, maxRange, minRange,
    decadeCount: ranges.length,
    riskLevel, riskStars, riskLabel,
  };
}

// ─── ラッパー: 全リスクをまとめて計算 ──────────────────────────
/**
 * calcAllRisks(crop, decadeArr, startDecade, endDecade)
 *
 * 5種のリスク関数を一括呼び出しし、まとめて返す。
 * 各関数が null を返した場合もそのまま格納する（呼び出し元でnullチェックを）。
 *
 * 返却:
 *   {
 *     heat      : calcHeatRisk の結果
 *     frost     : calcFrostRisk の結果
 *     chill     : calcChillRisk の結果
 *     sunDeficit: calcSunDeficitRisk の結果
 *     diurnal   : calcDiurnalIndex の結果
 *   }
 */
function calcAllRisks(crop, decadeArr, startDecade, endDecade) {
  return {
    heat:       calcHeatRisk(crop, decadeArr, startDecade, endDecade),
    frost:      calcFrostRisk(decadeArr, startDecade, endDecade),
    chill:      calcChillRisk(crop, decadeArr, startDecade, endDecade),
    sunDeficit: calcSunDeficitRisk(crop, decadeArr, startDecade, endDecade),
    diurnal:    calcDiurnalIndex(decadeArr, startDecade, endDecade),
  };
}

// ─── 気候推定ランキング（Phenologyベース・DBスコアと独立） ───
//  decadeArr : Phenology.buildDecadeArray() の返却値
//  crops     : cropDB の全作物配列
//  返却: [{ crop, score(0-100), startDecade, endDecade, harvestDecade, heatRisk, allRisks }] スコア降順
function computeClimateRanking(decadeArr, crops) {
  if (!decadeArr || !crops?.length) return [];

  return crops
    .map(crop => {
      const wins = Phenology.sowingWindows(decadeArr, crop);
      if (!wins.length) {
        return {
          crop, score: 0,
          startDecade: null, endDecade: null, harvestDecade: null,
          heatRisk: null, allRisks: null,
        };
      }
      const best    = wins[0];
      const endIdx  = best.harvestDecade ?? best.endDecade;
      const allRisks = calcAllRisks(crop, decadeArr, best.startDecade, endIdx);
      return {
        crop,
        score:         Math.round(best.score * 100),
        startDecade:   best.startDecade,
        endDecade:     best.endDecade,
        harvestDecade: best.harvestDecade,
        heatRisk:      allRisks.heat,   // 後方互換: 単独アクセス用
        allRisks,
      };
    })
    .sort((a, b) => b.score - a.score);
}