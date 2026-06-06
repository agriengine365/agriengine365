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
    // ハウス: +3℃ 補正
    corrTemp = (cultivationMode === 'greenhouse' || cultivationMode === 'heatedGreenhouse')
      ? base + 3
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

  // 月別気温配列（areaData.climate から取得）
  const _tMaxArr = climate?._tMaxArr ?? null;  // 月別日最高気温 [12]
  const _tMinArr = climate?._tMinArr ?? null;  // 月別日最低気温 [12]
  const hasMonthlyCols = _tMaxArr && _tMinArr &&
    _tMaxArr.length === 12 && _tMinArr.length === 12;

  // ハウス補正量（露地/ハウス用。加温ハウスは月別に個別計算するためここでは0）
  const houseOffset = cultivationMode === 'greenhouse' ? 3 : 0;
  const isHeated    = cultivationMode === 'heatedGreenhouse';

  // 生育月を特定（0-indexed: 0=1月 … 11=12月）
  let growthMonths = null; // null = 特定不能
  const cal = crop.calendar;
  if (cal) {
    // calendar.manage + harvest が存在する月を生育月とみなす
    const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const flagged = new Set();
    ['manage','harvest'].forEach(phase => {
      if (!Array.isArray(cal[phase])) return;
      cal[phase].forEach(mk => {
        const idx = monthKeys.indexOf(mk);
        if (idx >= 0) flagged.add(idx);
      });
    });
    if (flagged.size > 0) growthMonths = [...flagged].sort((a,b) => a-b);
  }

  if (!growthMonths && hasMonthlyCols) {
    // growthPeriodMin/Max から生育可能月を推定
    // 加温ハウスは全月を候補とし growthPeriod で絞る
    const c = crop.conditions;
    if (c.tempMeanMin != null && c.tempMeanMax != null) {
      const candidates = [];
      for (let i = 0; i < 12; i++) {
        const tMax = _tMaxArr[i], tMin = _tMinArr[i];
        if (tMax === null || tMin === null) continue;
        const tMid = isHeated
          ? Math.max((tMax + tMin) / 2, c.tempMeanMin) // 加温で最低温度まで引き上げ
          : (tMax + tMin) / 2 + houseOffset;
        if (isHeated || (tMid >= c.tempMeanMin && tMid <= c.tempMeanMax)) {
          candidates.push({ idx: i, tMid });
        }
      }
      const gpMin = c.growthPeriodMin ?? 0;
      const gpMax = c.growthPeriodMax ?? 12;
      const targetMonths = Math.round((gpMin + gpMax) / 2 / 30);
      if (candidates.length > 0) {
        const sorted = [...candidates].sort((a,b) => b.tMid - a.tMid);
        const picked = sorted.slice(0, Math.max(targetMonths, candidates.length));
        growthMonths = picked.map(p => p.idx).sort((a,b) => a-b);
      }
    }
  }

  // 加温ハウス: growthMonthsが特定できない場合は全月を生育月とみなす
  if (isHeated && !growthMonths) {
    growthMonths = [0,1,2,3,4,5,6,7,8,9,10,11];
  }

  // monthlyMatch: 12要素
  //   null        = 非生育月
  //   true        = 適合
  //   'border'    = 境界（±2℃以内）
  //   false       = 不適合
  //   { heated, diff } = 加温ハウスで補填中（燃料代計算用）
  let monthlyMatch = null;

  if (hasMonthlyCols && growthMonths && growthMonths.length > 0) {
    const c = crop.conditions;
    monthlyMatch = new Array(12).fill(null);
    let totalPts = 0;

    growthMonths.forEach(i => {
      const tMax = _tMaxArr[i], tMin = _tMinArr[i];
      if (tMax === null || tMin === null) { monthlyMatch[i] = null; return; }
      const tMidRaw = (tMax + tMin) / 2;
      const tMin2   = c.tempMeanMin ?? -Infinity;
      const tMax2   = c.tempMeanMax ??  Infinity;

      if (isHeated) {
        // 加温ハウス: 気温差を計算してスコアに反映
        // 上限超えは加温で解決できないため通常判定
        if (tMidRaw > tMax2 + 2) {
          monthlyMatch[i] = false;
          totalPts += 0;
        } else {
          const diff = Math.max(0, tMin2 - tMidRaw); // 不足℃（0なら補填不要）
          // 減点カーブ: diff=0→1.0, diff=5→0.7, diff=10→0.4, diff=15+→0.1
          const monthScore = diff === 0 ? 1.0
            : diff <= 5  ? 1.0 - diff * 0.06
            : diff <= 10 ? 0.7 - (diff - 5) * 0.06
            : Math.max(0.1, 0.4 - (diff - 10) * 0.06);
          monthlyMatch[i] = { heated: true, diff: Math.round(diff * 10) / 10, score: monthScore };
          totalPts += monthScore;
        }
      } else {
        // 露地・ハウス
        const tMid = tMidRaw + houseOffset;
        if (tMid >= tMin2 && tMid <= tMax2) {
          monthlyMatch[i] = true;
          totalPts += 1.0;
        } else if (tMid >= tMin2 - 2 && tMid <= tMax2 + 2) {
          monthlyMatch[i] = 'border';
          totalPts += 0.5;
        } else {
          monthlyMatch[i] = false;
          totalPts += 0;
        }
      }
    });

    const total = growthMonths.length;
    score += Math.round(25 * (totalPts / total));

    // details テキスト
    if (isHeated) {
      const heatingMonths = monthlyMatch.filter(v => v?.heated && v.diff > 0);
      const maxDiff = heatingMonths.length
        ? Math.max(...heatingMonths.map(v => v.diff))
        : 0;
      const label = heatingMonths.length === 0
        ? '加温不要（外気温で適合）'
        : `最大${maxDiff}℃補填が必要`;
      details.push({
        ok:   maxDiff < 10,
        text: `生育期気温（加温ハウス）— ${label}`,
        monthlyMatch,
      });
    } else {
      const matchCount  = monthlyMatch.filter(v => v === true).length;
      const borderCount = monthlyMatch.filter(v => v === 'border').length;
      const matchLabel  = `${matchCount}/${total}ヶ月適合`;
      details.push({
        ok:   matchCount >= total * 0.6,
        text: `生育期気温 — ${matchLabel}（${modeLabel}）`,
        monthlyMatch,
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
  //  6. pH スコア (15点)
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

  // monthlyMatch を details から抽出してトップレベルに昇格
  const _mmDetail = details.find(d => d.monthlyMatch);
  const _monthlyMatch = _mmDetail ? _mmDetail.monthlyMatch : monthlyMatch;

  return { crop, score: pct, details, viable, alert, cultivationMode, monthlyMatch: _monthlyMatch ?? null };
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
  // AMeDAS月別データ・実測値を元のclimateから引き継ぐ
  // (getClimate()の静的テーブルで上書きすると _tMaxArr/_tMinArr 等が消えるため)
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
      _tMaxArr:      areaData.climate._tMaxArr      ?? null,
      _tMinArr:      areaData.climate._tMinArr      ?? null,
      _sunArr:       areaData.climate._sunArr        ?? null,
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

function calculateRiskDeductionRate(crop, landProfile) {
  const envRisk = (
    (landProfile.floodRisk || 0) +
    (landProfile.droughtRisk || 0) +
    (landProfile.snowRisk || 0)
  ) / 300;
  const cropRisk = (crop.risks || []).reduce((sum, r) => {
    return sum + (r.level === 'high' ? 0.06 : r.level === 'medium' ? 0.035 : 0.015);
  }, 0);
  const continuous = crop.conditions?.continuousCropYears <= 1 ? 0.05 : 0.02;
  return clamp(envRisk * 0.16 + cropRisk + continuous, 0, 0.45);
}

function calculateProfitability(crop, areaData, scoreResult, landProfile) {
  const area10a = Math.max(0, (areaData.areaSqm || 0) / 1000);
  const suitabilityRate = clamp((scoreResult?.score || 0) / 100, 0, 1);
  const baseYield = cropYieldPer10aKg(crop) * area10a;
  const predictedYield = baseYield * suitabilityRate;
  const marketableYieldRate = clamp(0.72 + suitabilityRate * 0.22, 0.45, 0.96);
  const marketableYield = predictedYield * marketableYieldRate;
  const demandScore = crop.category === 'fruit' || crop.category === 'wildveg' ? 1.08 : 1.0;
  const revenue = marketableYield * cropPricePerKg(crop) * demandScore;
  const fertilizer = crop.fertilizer || { N: 0, P: 0, K: 0 };
  const annualCost = area10a * (45000 + (fertilizer.N + fertilizer.P + fertilizer.K) * 1200);
  const initialCost = area10a * (crop.category === 'fruit' ? 120000 : crop.category === 'wildveg' ? 70000 : 35000);
  const laborCost = area10a * (crop.category === 'fruit' ? 90000 : crop.category === 'vegetable' ? 75000 : 48000);
  const riskDeductionRate = calculateRiskDeductionRate(crop, landProfile);
  const riskDeduction = revenue * riskDeductionRate;
  const averageProfit = revenue - annualCost - initialCost - laborCost - riskDeduction;

  return {
    area10a,
    predictedYield,
    marketableYieldRate,
    marketableYield,
    averagePrice: cropPricePerKg(crop),
    demandScore,
    revenue,
    initialCost,
    annualCost,
    laborCost,
    riskDeduction,
    riskDeductionRate,
    averageProfit,
  };
}

function buildAnalysisResult(areaData) {
  const landProfile = buildLandProfile(areaData);
  const scoringAreaData = areaDataFromLandProfile(areaData, landProfile);
  const cropScores = CROP_DB
    .map(crop => {
      const score = scoreCrop(crop, scoringAreaData);
      return {
        ...score,
        profitability: calculateProfitability(crop, areaData, score, landProfile),
      };
    })
    .sort((a, b) => {
      if (a.viable !== b.viable) return a.viable ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
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
  const profitability = calculateProfitability(crop, areaData, scoreResult, landProfile);
  const fertilizer    = calcFertilizer(crop, areaData.areaSqm || 0);
  const confidence    = calcConfidence(scoringAreaData);

  return {
    crop,
    landProfile,
    scoreResult,
    profitability,
    fertilizer,
    confidence,
    cultivationMode: scoringAreaData.cultivationMode,
  };
}