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
  //  一次判定: 栽培不可アラート
  //  ※ 加温ハウスは survivalTempMin 制約をスキップ
  // ════════════════════════════════════════
  let viable = true;
  let alert  = null;

  if (cultivationMode !== 'heatedGreenhouse' && corrTemp !== null) {
    const c = crop.conditions;
    // survivalTempMin が未定義のときは tempMeanMin - 3 でフォールバック
    const survivalMin = (c.survivalTempMin !== undefined && c.survivalTempMin !== null)
      ? c.survivalTempMin
      : c.tempMeanMin - 3;

    if (corrTemp < survivalMin) {
      viable = false;
      alert  = `推定気温 ${corrTemp.toFixed(1)}℃ が生育限界温度 ${survivalMin.toFixed(1)}℃ を下回るため、${modeLabel}では栽培不可と判定されました。`;
    }
  }

  // ════════════════════════════════════════
  //  1. 緯度スコア (25点)
  // ════════════════════════════════════════
  maxScore += 25;
  if (lat !== null) {
    const c = crop.conditions;
    if (lat >= c.latMin && lat <= c.latMax) {
      score += 25;
      details.push({ ok: true, text: `緯度 ${lat.toFixed(2)}° — 適正範囲内` });
    } else {
      const dist = Math.min(Math.abs(lat - c.latMin), Math.abs(lat - c.latMax));
      const s    = Math.max(0, 25 - dist * 10);
      score += s;
      details.push({ ok: s > 0, text: `緯度 ${lat.toFixed(2)}° — 適正外 (${c.latMin}–${c.latMax}°)` });
    }
  }

  // ════════════════════════════════════════
  //  2. 標高スコア (20点)
  // ════════════════════════════════════════
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

  // ════════════════════════════════════════
  //  3. 気温スコア (25点)
  //     栽培方式補正済みの corrTemp を使用
  // ════════════════════════════════════════
  maxScore += 25;
  if (corrTemp !== null) {
    const c = crop.conditions;
    if (corrTemp >= c.tempMeanMin && corrTemp <= c.tempMeanMax) {
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
  if (soilType && soilType !== 'unknown') {
    if (crop.conditions.soilTypes.includes(soilType)) {
      score += 15;
      details.push({ ok: true,  text: '土壌タイプ — 適合' });
    } else {
      details.push({ ok: false, text: '土壌タイプ — 非推奨（土壌改良を要検討）' });
    }
  } else {
    // 未入力: 中間値 7.5点
    score += 7;
    details.push({ ok: null, text: '土壌タイプ未入力 — 推定値使用' });
  }

  // ════════════════════════════════════════
  //  5. pH スコア (15点)
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

  return { crop, score: pct, details, viable, alert, cultivationMode };
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
  const per10a = crop.fertilizer;
  const area10a = areaSqm / 1000; // 1000㎡ = 10a
  return {
    N:       (per10a.N * area10a).toFixed(1),
    P:       (per10a.P * area10a).toFixed(1),
    K:       (per10a.K * area10a).toFixed(1),
    area10a: area10a.toFixed(2),
    notes:   per10a.notes,
  };
}
