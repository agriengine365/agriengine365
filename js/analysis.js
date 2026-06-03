// ANALYSIS - land profile, crop matching, profitability, export

function fmtNum(value, digits = 1, empty = '-') {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : empty;
}

function fmtInt(value, empty = '-') {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)).toLocaleString() : empty;
}

function fmtYen(value) {
  if (!Number.isFinite(Number(value))) return '-';
  return Math.round(Number(value)).toLocaleString() + '円';
}

function riskBadge(level) {
  const label = level === 'high' ? '高' : level === 'medium' ? '中' : '低';
  return `<span class="risk-badge risk-${level}">${label}</span>`;
}

function rangeStatus(value, min, max) {
  if (!Number.isFinite(Number(value))) return 'missing';
  if (value < min || value > max) return 'out';
  return 'in';
}

function rangeGauge({ label, value, unit = '', min, max, displayMin, displayMax, optimalMin, optimalMax, survivalMin = null }) {
  const hasValue = Number.isFinite(Number(value));
  const lo = Number.isFinite(Number(displayMin)) ? displayMin : min;
  const hi = Number.isFinite(Number(displayMax)) ? displayMax : max;
  const span = Math.max(hi - lo, 0.0001);
  const pos = hasValue ? clamp((value - lo) / span * 100, 0, 100) : null;
  const optLeft  = clamp((optimalMin - lo) / span * 100, 0, 100);
  const optRight = clamp((optimalMax - lo) / span * 100, 0, 100);
  const optWidth = Math.max(2, optRight - optLeft);
  const status = rangeStatus(value, optimalMin, optimalMax);
  const statusLabel = status === 'missing' ? 'データなし' : status === 'out' ? '範囲外' : '適合';
  const statusClass = status === 'in' ? 'rg-status-in' : status === 'out' ? 'rg-status-out' : 'rg-status-missing';
  const valueText = hasValue ? `${fmtNum(value, value % 1 === 0 ? 0 : 1)}${unit}` : '-';
  const minText = `${fmtNum(optimalMin, optimalMin % 1 === 0 ? 0 : 1)}${unit}`;
  const maxText = `${fmtNum(optimalMax, optimalMax % 1 === 0 ? 0 : 1)}${unit}`;

  // survivalMinの赤縦線位置
  const survivalPos = (survivalMin !== null && Number.isFinite(Number(survivalMin)))
    ? clamp((survivalMin - lo) / span * 100, 0, 100)
    : null;

  // マーカーラベルの左右どちらに出すか（端に近い場合は反転）
  const markerLabelAlign = pos !== null && pos > 70 ? 'right' : 'left';

  return `
    <div class="rg-wrap rg-${status}">
      <div class="rg-head">
        <span class="rg-label">${label}</span>
        <span class="${statusClass}">${statusLabel}</span>
      </div>
      <div class="rg-track-wrap">
        <!-- グラデーション背景 -->
        <div class="rg-track">
          <!-- 適正範囲オーバーレイ -->
          <div class="rg-optimal" style="left:${optLeft}%;width:${optWidth}%"></div>
          <!-- survivalMin 赤縦線 -->
          ${survivalPos !== null ? `<div class="rg-survival-line" style="left:${survivalPos}%"></div>` : ''}
          <!-- 現在値マーカー（▼） -->
          ${pos !== null ? `
            <div class="rg-marker-wrap" style="left:${pos}%">
              <div class="rg-marker-label rg-marker-label-${markerLabelAlign}">${valueText}</div>
              <div class="rg-marker">▼</div>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="rg-scale">
        <span>${fmtNum(lo, lo % 1 === 0 ? 0 : 1)}${unit}</span>
        <span>適正 ${minText}〜 ${maxText}</span>
        <span>${fmtNum(hi, hi % 1 === 0 ? 0 : 1)}${unit}</span>
      </div>
      ${survivalPos !== null ? `
        <div class="rg-survival-note">
          <span class="rg-survival-dot"></span>耐寒限界 ${fmtNum(survivalMin, 1)}${unit}
        </div>
      ` : ''}
    </div>
  `;
}

function renderMatchRanges(result, profile) {
  const el = document.getElementById('match-ranges');
  if (!el) return;
  if (!result?.crop) {
    el.innerHTML = '<div class="empty-mini">作物が選択されていません</div>';
    return;
  }

  const c = result.crop.conditions || {};
  const survivalTempMin = c.survivalTempMin ?? (c.tempMeanMin - 3);
  const phMin = c.phMin ?? 5.0;
  const phMax = c.phMax ?? 7.5;
  const rainMin = c.rainfallMin ?? 900;
  const rainMax = c.rainfallMax ?? 2200;

  el.innerHTML = `
    <div class="range-target">
      <span>対象作物</span>
      <strong>${result.crop.name}</strong>
    </div>
    ${rangeGauge({
      label: '年均気温',
      value: profile.avgTemp,
      unit: 'C',
      min: survivalTempMin,
      max: c.tempMeanMax,
      displayMin: survivalTempMin - 4,
      displayMax: c.tempMeanMax + 4,
      optimalMin: c.tempMeanMin,
      optimalMax: c.tempMeanMax,
      survivalMin: survivalTempMin,
    })}
    ${rangeGauge({
      label: 'pH',
      value: profile.ph,
      min: 3.5,
      max: 9,
      displayMin: 3.5,
      displayMax: 9,
      optimalMin: phMin,
      optimalMax: phMax,
    })}
    ${rangeGauge({
      label: '標高',
      value: profile.elevation,
      unit: 'm',
      min: 0,
      max: c.elevMax,
      displayMin: 0,
      displayMax: Math.max(c.elevMax * 1.35, 300),
      optimalMin: 0,
      optimalMax: c.elevMax,
    })}
    ${rangeGauge({
      label: '年降水量',
      value: profile.annualRainfall,
      unit: 'mm',
      min: rainMin,
      max: rainMax,
      displayMin: Math.max(0, rainMin - 500),
      displayMax: rainMax + 500,
      optimalMin: rainMin,
      optimalMax: rainMax,
    })}
  `;
}

function renderLandProfile(profile) {
  const el = document.getElementById('land-profile');
  if (!el) return;
  el.innerHTML = `
    <div class="profile-grid">
      <div class="profile-cell"><span>緯度 / 経度</span><strong>${fmtNum(profile.lat, 5)} / ${fmtNum(profile.lng, 5)}</strong></div>
      <div class="profile-cell"><span>標高</span><strong>${fmtInt(profile.elevation)} m</strong></div>
      <div class="profile-cell"><span>傾斜</span><strong>${fmtNum(profile.slope, 1)} deg</strong></div>
      <div class="profile-cell"><span>土壌</span><strong>${profile.soilType || '不明'}</strong></div>
      <div class="profile-cell"><span>年均気温</span><strong>${fmtNum(profile.avgTemp, 1)} C</strong></div>
      <div class="profile-cell"><span>年降水量</span><strong>${fmtInt(profile.annualRainfall)} mm</strong></div>
      <div class="profile-cell"><span>日照時間</span><strong>${fmtInt(profile.sunshineHours)} h</strong></div>
      <div class="profile-cell"><span>pH</span><strong>${fmtNum(profile.ph, 1)}</strong></div>
    </div>
    <div class="risk-strip">
      <div>洪水 ${riskBadge(profile.floodRiskLevel)} <strong>${profile.floodRisk}%</strong></div>
      <div>干ばつ ${riskBadge(profile.droughtRiskLevel)} <strong>${profile.droughtRisk}%</strong></div>
      <div>積雪 ${riskBadge(profile.snowRiskLevel)} <strong>${profile.snowRisk}%</strong></div>
    </div>
  `;
}

function renderCropRanking(scores) {
  const rankEl = document.getElementById('crop-ranking');
  if (!rankEl) return;
  rankEl.innerHTML = scores.slice(0, 8).map((s, i) => `
    <div class="crop-item ${s.viable ? '' : 'crop-item-blocked'}">
      <div class="crop-rank">#${i + 1}</div>
      <div style="flex:1;min-width:0;">
        <div class="crop-name">${s.crop.name}</div>
        <div class="crop-score-bar">
          <div class="crop-score-bar-fill" style="width:${s.viable ? s.score : 0}%"></div>
        </div>
        ${s.alert ? `<div class="crop-alert-mini">${s.alert}</div>` : ''}
      </div>
      <div class="crop-score">${s.viable ? s.score + '%' : 'NG'}</div>
    </div>
  `).join('');
}

function renderProfitWaterfall(result) {
  const el = document.getElementById('profit-waterfall');
  if (!el) return;
  if (!result) {
    el.innerHTML = '<div class="empty-mini">作物データなし</div>';
    return;
  }

  const p = result.profitability;
  const maxAbs = Math.max(
    Math.abs(p.revenue),
    Math.abs(p.initialCost),
    Math.abs(p.annualCost + p.laborCost),
    Math.abs(p.riskDeduction),
    Math.abs(p.averageProfit),
    1
  );
  const row = (label, value, type) => {
    const width = Math.max(8, Math.min(100, Math.abs(value) / maxAbs * 100));
    return `
      <div class="waterfall-row">
        <div class="waterfall-label">${label}</div>
        <div class="waterfall-track">
          <div class="waterfall-bar ${type}" style="width:${width}%"></div>
        </div>
        <div class="waterfall-value">${fmtYen(value)}</div>
      </div>
    `;
  };

  el.innerHTML = `
    <div class="profit-summary">
      <div><span>対象作物</span><strong>${result.crop.name}</strong></div>
      <div><span>収量</span><strong>${fmtInt(p.predictedYield)} kg</strong></div>
      <div><span>出荷率</span><strong>${Math.round(p.marketableYieldRate * 100)}%</strong></div>
      <div><span>利益</span><strong class="${p.averageProfit >= 0 ? 'profit-plus' : 'profit-minus'}">${fmtYen(p.averageProfit)}</strong></div>
    </div>
    ${row('[+] 販売収入', p.revenue, 'plus')}
    ${row('[-] 初期費用', -p.initialCost, 'minus')}
    ${row('[-] 管理費＋人件費', -(p.annualCost + p.laborCost), 'minus')}
    ${row('[-] リスク控除', -p.riskDeduction, 'minus')}
    ${row('[=] 平均利益', p.averageProfit, p.averageProfit >= 0 ? 'plus' : 'minus')}
  `;
}

async function runAnalysis(areaName) {
  if (!currentAreaData) return;

  document.getElementById('analysis-empty').style.display  = 'none';
  document.getElementById('analysis-result').style.display = 'flex';

  // ローディング表示
  document.getElementById('crop-ranking').innerHTML =
    '<div style="color:var(--text3);font-size:12px;padding:8px 0;">AMeDASデータ取得中…</div>';

  const ad = currentAreaData;
  const result = await buildAnalysisResult(ad);
  const profile = result.landProfile;
  ad.landProfile = profile;
  ad.analysisSnapshot = {
    areaName,
    topCropId:  result.topCrop?.crop?.id || null,
    topScore:   result.topCrop?.score || null,
    topProfit:  result.topCrop?.profitability?.averageProfit || null,
  };

  const conf = calcConfidence(areaDataFromLandProfile(ad, profile));
  const confPct = conf.pct;
  const bar = document.getElementById('conf-bar');
  bar.style.width = confPct + '%';
  bar.className = 'conf-bar-fill' + (confPct < 40 ? ' vlow' : confPct < 70 ? ' low' : '');
  document.getElementById('conf-pct').textContent = confPct + '%';
  document.getElementById('conf-label').textContent =
    confPct >= 70 ? '高精度' : confPct >= 40 ? '中精度' : '低精度';
  document.getElementById('conf-detail').innerHTML = conf.items.map(i => `- ${i}`).join('<br>');

  document.getElementById('land-eval').innerHTML = `
    <div class="area-stat"><span class="label">気候帯</span><span class="value" style="font-size:12px;">${profile.climateName || '-'}</span></div>
    <div class="area-stat"><span class="label">年均気温</span><span class="value">${fmtNum(profile.avgTemp, 1)}<span class="unit">C</span></span></div>
    <div class="area-stat"><span class="label">年降水量</span><span class="value">${fmtInt(profile.annualRainfall)}<span class="unit">mm</span></span></div>
    <div class="area-stat"><span class="label">標高</span><span class="value">${fmtInt(profile.elevation)}<span class="unit">m</span></span></div>
    <div class="area-stat"><span class="label">土壌</span><span class="value" style="font-size:11px;">${profile.soilType || '不明'}</span></div>
  `;

  renderLandProfile(profile);
  renderMatchRanges(result.topCrop, profile);
  renderCropRanking(result.cropScores);
  renderProfitWaterfall(result.topCrop);

  const top = result.topCrop;
  const topCrop = top?.crop;
  if (topCrop && ad.areaSqm > 0) {
    const fert = calcFertilizer(topCrop, ad.areaSqm);
    document.getElementById('fert-result').innerHTML = `
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">対象：${topCrop.name} / ${fert.area10a} 10a</div>
      <div class="area-stat"><span class="label">N</span><span class="value">${fert.N}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">P</span><span class="value">${fert.P}<span class="unit">kg</span></span></div>
      <div class="area-stat"><span class="label">K</span><span class="value">${fert.K}<span class="unit">kg</span></span></div>
      <div class="notice notice-info" style="margin-top:8px;">${fert.notes}</div>
    `;
  } else {
    document.getElementById('fert-result').innerHTML =
      '<div style="color:var(--text3);font-size:11px;">面積データなし</div>';
  }

  const riskEl = document.getElementById('risk-result');
  riskEl.innerHTML = topCrop ? topCrop.risks.map(r => {
    const color = r.level === 'high' ? 'var(--red)' : r.level === 'medium' ? 'var(--amber)' : 'var(--green2)';
    return `
      <div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border);">
        <span style="color:${color};font-size:10px;font-family:var(--mono);padding-top:2px;flex-shrink:0;">${r.level.toUpperCase()}</span>
        <div>
          <div style="font-size:12px;font-weight:500;">${r.name}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;">${r.note}</div>
        </div>
      </div>
    `;
  }).join('') : '';
}

async function exportJSON() {
  if (!currentAreaData) return;
  const result = await buildAnalysisResult(currentAreaData);
  const data = {
    exportedAt: new Date().toISOString(),
    areaData: currentAreaData,
    landProfile: result.landProfile,
    analysis: {
      cropScores: result.cropScores.map(s => ({
        crop: s.crop.id,
        name: s.crop.name,
        score: s.score,
        viable: s.viable,
        averageProfit: s.profitability.averageProfit,
      })),
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agrisim_${Date.now()}.json`;
  a.click();
}
