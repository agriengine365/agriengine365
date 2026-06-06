// ═══════════════════════════════════════════
//  AREA CHARTS — ADPパネル 気候ビジュアライゼーション
//  依存: Chart.js (CDN), AmedasLoader (amedas.js), engine.js
// ═══════════════════════════════════════════

const AreaCharts = (() => {

  // ── Chart.jsインスタンス管理（再生成時に destroy） ──
  let _chartInstances = {};

  // ── カラーパレット（style.css CSS変数と対応） ──
  const C = {
    green:  '#4ade80',
    green2: '#22c55e',
    amber:  '#fbbf24',
    red:    '#f87171',
    blue:   '#60a5fa',
    teal:   '#2dd4bf',
    purple: '#a78bfa',
    text:   '#e2ede3',
    text2:  '#8faa91',
    text3:  '#5a7a5c',
    border: '#2a3d2c',
    bg2:    '#162019',
    bg3:    '#1e2d20',
  };

  const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const MONTH_KEYS   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  // ─────────────────────────────────────────
  //  公開: ADPパネルへのチャートセクション描画
  // ─────────────────────────────────────────
  async function render(area) {
    const wrap = document.getElementById('adp-charts-wrap');
    if (!wrap) return;

    // 既存チャート破棄
    Object.values(_chartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
    _chartInstances = {};

    const lat = area.landProfile?.lat ?? area.meta?.lat ?? null;
    const lng = area.landProfile?.lng ?? area.meta?.lng ?? null;

    if (lat === null || lng === null) {
      wrap.innerHTML = `<div class="adpc-section"><div class="adpc-nodata">座標データがないため気候チャートを表示できません</div></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="adpc-section">
        <div class="adpc-section-title">土地環境</div>
        <div id="adpc-env-donut" class="adpc-env-donut-wrap"></div>
      </div>
      <div class="adpc-section adpc-loading-section">
        <div class="adpc-loading"><span class="adpc-spinner"></span><span>AMeDAS平年値を取得中...</span></div>
      </div>`;

    // まず土地環境ドーナツを即時描画
    _renderEnvDonut(area, null);

    let climate = null;
    let isFallback = false;

    try {
      climate = await _getClimateWithMonthly(lat, lng);
    } catch (e) {
      console.warn('[AreaCharts] AMeDAS取得失敗:', e);
      isFallback = true;
      climate    = _buildFallbackClimate(lat, area);
    }

    _renderAll(wrap, area, climate, isFallback);
  }

  // ─────────────────────────────────────────
  //  AMeDASから月別配列付きのclimateオブジェクトを返す
  // ─────────────────────────────────────────
  async function _getClimateWithMonthly(lat, lng) {
    const base = await AmedasLoader.getClimateAt(lat, lng);

    const res = await fetch(`data/monthly/${base.stationNo}.json`);
    if (!res.ok) throw new Error(`monthly fetch failed: ${res.status}`);
    const monthly = await res.json();

    const _tMaxArr = MONTH_KEYS.map(m => {
      const e = monthly['temp_mean']?.data?.[m];
      return (e && e.q !== 0) ? Math.round(e.v / 10 * 10) / 10 : null;
    });
    const _tMinArr = MONTH_KEYS.map(m => {
      const e = monthly['temp_min_mean']?.data?.[m];
      return (e && e.q !== 0) ? Math.round(e.v / 10 * 10) / 10 : null;
    });
    const _sunArr = MONTH_KEYS.map(m => {
      const e = monthly['sunshine_hours']?.data?.[m];
      return (e && e.q !== 0) ? Math.round(e.v / 10 * 10) / 10 : null;
    });

    return {
      ...base,
      _tMaxArr: _tMaxArr.some(v => v !== null) ? _tMaxArr : null,
      _tMinArr: _tMinArr.some(v => v !== null) ? _tMinArr : null,
      _sunArr:  _sunArr.some(v => v !== null)  ? _sunArr  : null,
    };
  }

  // ─────────────────────────────────────────
  //  フォールバック気候データ
  // ─────────────────────────────────────────
  function _buildFallbackClimate(lat, area) {
    const cl = (typeof getClimate === 'function') ? getClimate(lat) : null;
    const lp = area.landProfile || {};
    return {
      stationName:   null,
      distKm:        null,
      tempMean:      lp.avgTemp         ?? cl?.tempMean ?? null,
      rain:          lp.annualRainfall  ?? cl?.rain     ?? null,
      rainMonthly:   null,
      sunshineHours: lp.sunshineHours   ?? null,
      name:          lp.climateName     ?? cl?.name     ?? '—',
      _tMaxArr:      null,
      _tMinArr:      null,
      _sunArr:       null,
      _isFallback:   true,
    };
  }

  // ─────────────────────────────────────────
  //  全セクション描画
  // ─────────────────────────────────────────
  function _renderAll(wrap, area, climate, isFallback) {
    Object.values(_chartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
    _chartInstances = {};

    const stationBadge = isFallback
      ? '<span class="adpc-badge-warn">推定値</span>'
      : `<span class="adpc-badge-ok">${climate.stationName ?? ''}${climate.distKm != null ? '&nbsp;' + climate.distKm + 'km' : ''}</span>`;

    const hasMonthlyTemp = !!(climate._tMaxArr || climate._tMinArr);
    const hasMonthlyRain = !!(climate.rainMonthly && Object.keys(climate.rainMonthly).length);
    const hasSunshine    = !!(climate._sunArr);

    wrap.innerHTML = `
      <!-- ① 土地環境ドーナツ -->
      <div class="adpc-section">
        <div class="adpc-section-title">土地環境</div>
        <div id="adpc-env-donut" class="adpc-env-donut-wrap"></div>
      </div>

      <!-- ② 気候サマリー -->
      <div class="adpc-section">
        <div class="adpc-section-title">気候サマリー ${stationBadge}</div>
        <div id="adpc-summary-cards" class="adpc-summary-cards"></div>
        <div id="adpc-day-badges" class="adpc-day-badges"></div>
      </div>

      <!-- ③ 月別気温・降水量 複合チャート -->
      <div class="adpc-section">
        <div class="adpc-section-title">月別気温 / 降水量</div>
        ${(hasMonthlyTemp || hasMonthlyRain)
          ? '<div class="adpc-chart-wrap"><canvas id="adpc-climate-chart"></canvas></div>'
          : '<div class="adpc-nodata">月別データなし（AMeDAS未取得）</div>'}
      </div>

      <!-- ④ 月別日照時間 -->
      ${hasSunshine ? `
      <div class="adpc-section">
        <div class="adpc-section-title">月別日照時間</div>
        <div class="adpc-chart-wrap adpc-chart-wrap-sm"><canvas id="adpc-sun-chart"></canvas></div>
      </div>` : ''}

      <!-- ⑤ 月別降水量ヒートバー -->
      ${hasMonthlyRain ? `
      <div class="adpc-section">
        <div class="adpc-section-title">月別降水量</div>
        <div id="adpc-rain-bars" class="adpc-rain-bars"></div>
      </div>` : ''}

      <!-- ⑥ 環境リスク -->
      <div class="adpc-section">
        <div class="adpc-section-title">環境リスク</div>
        <div id="adpc-risk-gauges" class="adpc-risk-gauges"></div>
      </div>
    `;

    _renderEnvDonut(area, climate);
    _renderSummaryCards(climate, area);
    _renderDayBadges(climate, area);
    if (hasMonthlyTemp || hasMonthlyRain) _renderClimateChart(climate);
    if (hasSunshine)    _renderSunshineChart(climate);
    if (hasMonthlyRain) _renderRainBars(climate);
    _renderRiskGauges(area);
  }

  // ─────────────────────────────────────────
  //  ② 気候サマリー ビッグカード
  // ─────────────────────────────────────────
  function _renderSummaryCards(climate, area) {
    const el = document.getElementById('adpc-summary-cards');
    if (!el) return;

    const lp    = area.landProfile || {};
    const elev  = lp.elevation ?? area.meta?.elev ?? null;
    const ph    = lp.ph ?? null;
    const sunshine = climate.sunshineHours ?? lp.sunshineHours ?? null;

    const cards = [
      {
        icon: '🌡️',
        label: '年均気温',
        value: climate.tempMean != null ? climate.tempMean.toFixed(1) : '—',
        unit: '℃',
        sub: climate.tempMaxMean != null && climate.tempMinMean != null
          ? `最高 ${climate.tempMaxMean.toFixed(1)} / 最低 ${climate.tempMinMean.toFixed(1)} ℃`
          : null,
        color: _tempColor(climate.tempMean),
      },
      {
        icon: '🌧️',
        label: '年降水量',
        value: climate.rain != null ? Math.round(climate.rain).toLocaleString() : '—',
        unit: 'mm',
        sub: climate.rainDays50 != null ? `豪雨日(50mm超) ${climate.rainDays50}日/年` : null,
        color: C.blue,
      },
      {
        icon: '☀️',
        label: '年間日照',
        value: sunshine != null ? Math.round(sunshine).toLocaleString() : '—',
        unit: 'h',
        sub: null,
        color: C.amber,
      },
      {
        icon: '🏔️',
        label: '標高',
        value: elev != null ? Math.round(elev).toLocaleString() : '—',
        unit: 'm',
        sub: ph != null ? `土壌pH ${ph.toFixed(1)}` : null,
        color: C.text2,
      },
    ];

    el.innerHTML = `
      <div class="adpc-cards-grid">
        ${cards.map(c => `
          <div class="adpc-stat-card">
            <div class="adpc-stat-card-icon">${c.icon}</div>
            <div class="adpc-stat-card-body">
              <div class="adpc-stat-card-label">${c.label}</div>
              <div class="adpc-stat-card-value" style="color:${c.color}">
                ${c.value}<span class="adpc-stat-card-unit">${c.unit}</span>
              </div>
              ${c.sub ? `<div class="adpc-stat-card-sub">${c.sub}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="adpc-climate-zone">
        <span class="adpc-climate-zone-label">気候帯</span>
        <span class="adpc-climate-zone-value">${climate.name || lp.climateName || '—'}</span>
        ${climate.distKm != null ? `<span class="adpc-climate-zone-dist">最寄局 ${climate.distKm}km</span>` : ''}
      </div>
    `;
  }

  function _tempColor(t) {
    if (t == null) return C.text2;
    if (t >= 20)  return C.red;
    if (t >= 15)  return C.amber;
    if (t >= 10)  return C.green;
    return C.teal;
  }

  // ─────────────────────────────────────────
  //  ② 特徴日数バッジ
  // ─────────────────────────────────────────
  function _renderDayBadges(climate, area) {
    const el = document.getElementById('adpc-day-badges');
    if (!el) return;

    const lp = area.landProfile || {};
    // AMeDAS実データ or meta から取得
    const meta = area.meta || {};
    const daysBelow0  = climate.daysBelow0  ?? meta.amDaysBelow0  ?? null;
    const rainDays50  = climate.rainDays50  ?? meta.amRainDays50  ?? null;
    const snowDays    = climate.snowDays    ?? meta.amSnowDays    ?? null;

    const badges = [];
    if (daysBelow0 != null) badges.push({ icon: '🥶', label: '冬日',   value: daysBelow0,  unit: '日/年', color: C.teal });
    if (snowDays   != null) badges.push({ icon: '❄️', label: '真冬日', value: snowDays,    unit: '日/年', color: C.blue });
    if (rainDays50 != null) badges.push({ icon: '⛈️', label: '豪雨日', value: rainDays50,  unit: '日/年', color: C.purple });

    if (!badges.length) { el.style.display = 'none'; return; }

    el.innerHTML = `
      <div class="adpc-badge-row">
        ${badges.map(b => `
          <div class="adpc-day-badge">
            <span class="adpc-day-badge-icon">${b.icon}</span>
            <span class="adpc-day-badge-label">${b.label}</span>
            <span class="adpc-day-badge-value" style="color:${b.color}">${b.value}<span class="adpc-day-badge-unit">${b.unit}</span></span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─────────────────────────────────────────
  //  ③ 月別気温・降水量 複合チャート（Chart.js）
  // ─────────────────────────────────────────
  function _renderClimateChart(climate) {
    const canvas = document.getElementById('adpc-climate-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const rainData = MONTH_KEYS.map(m => climate.rainMonthly?.[m] ?? null);
    const hasRain  = rainData.some(v => v !== null);
    const hasTemp  = !!(climate._tMaxArr || climate._tMinArr);
    const datasets = [];

    if (hasRain) {
      datasets.push({
        type:            'bar',
        label:           '降水量 (mm)',
        data:            rainData,
        backgroundColor: 'rgba(96,165,250,0.30)',
        borderColor:     C.blue,
        borderWidth:     1,
        borderRadius:    3,
        yAxisID:         'yRain',
        order:           2,
      });
    }

    if (climate._tMaxArr) {
      datasets.push({
        type:             'line',
        label:            '日最高気温 (℃)',
        data:             climate._tMaxArr,
        borderColor:      C.amber,
        backgroundColor:  'rgba(251,191,36,0.08)',
        borderWidth:      2,
        pointRadius:      3,
        pointHoverRadius: 5,
        tension:          0.4,
        fill:             false,
        yAxisID:          'yTemp',
        order:            1,
      });
    }

    if (climate._tMinArr) {
      datasets.push({
        type:             'line',
        label:            '日最低気温 (℃)',
        data:             climate._tMinArr,
        borderColor:      C.teal,
        backgroundColor:  'rgba(45,212,191,0.08)',
        borderWidth:      2,
        pointRadius:      3,
        pointHoverRadius: 5,
        tension:          0.4,
        fill:             false,
        yAxisID:          'yTemp',
        order:            1,
      });
    }

    if (!hasTemp && climate.tempMean != null) {
      datasets.push({
        type:        'line',
        label:       '年均気温（推定）',
        data:        Array(12).fill(climate.tempMean),
        borderColor: C.green,
        borderWidth: 1.5,
        borderDash:  [5, 5],
        pointRadius: 0,
        tension:     0,
        fill:        false,
        yAxisID:     'yTemp',
        order:       1,
      });
    }

    if (!datasets.length) return;

    const scales = {
      x: {
        ticks: { color: C.text2, font: { size: 10 }, maxRotation: 0 },
        grid:  { color: 'rgba(42,61,44,0.4)' },
      },
      yTemp: {
        type:     'linear',
        position: 'right',
        title:    { display: true, text: '℃', color: C.text3, font: { size: 10 } },
        ticks:    { color: C.amber, font: { size: 10 }, callback: v => `${v}℃` },
        grid:     { color: hasRain ? 'transparent' : 'rgba(42,61,44,0.4)' },
      },
    };

    if (hasRain) {
      scales.yRain = {
        type:     'linear',
        position: 'left',
        title:    { display: true, text: 'mm', color: C.text3, font: { size: 10 } },
        ticks:    { color: C.blue, font: { size: 10 } },
        grid:     { color: 'rgba(42,61,44,0.4)' },
        min:      0,
      };
    }

    const ctx = canvas.getContext('2d');
    _chartInstances.climate = new Chart(ctx, {
      data:    { labels: MONTH_LABELS, datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display:  true,
            position: 'bottom',
            labels:   { color: C.text2, font: { size: 10 }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
            backgroundColor: 'rgba(14,26,18,0.95)',
            borderColor:     C.border,
            borderWidth:     1,
            titleColor:      C.text,
            bodyColor:       C.text2,
            padding:         10,
          },
        },
        scales,
      },
    });
  }

  // ─────────────────────────────────────────
  //  ④ 月別日照時間 棒グラフ（Chart.js）
  // ─────────────────────────────────────────
  function _renderSunshineChart(climate) {
    const canvas = document.getElementById('adpc-sun-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (!climate._sunArr) return;

    const ctx = canvas.getContext('2d');
    _chartInstances.sunshine = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MONTH_LABELS,
        datasets: [{
          label:           '日照時間 (h)',
          data:            climate._sunArr,
          backgroundColor: climate._sunArr.map(v =>
            v == null ? 'transparent' :
            v >= 180  ? 'rgba(251,191,36,0.75)' :
            v >= 120  ? 'rgba(251,191,36,0.45)' :
                        'rgba(251,191,36,0.2)'
          ),
          borderColor:  C.amber,
          borderWidth:  1,
          borderRadius: 3,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(14,26,18,0.95)',
            borderColor:     C.border,
            borderWidth:     1,
            titleColor:      C.text,
            bodyColor:       C.text2,
            padding:         10,
            callbacks: { label: ctx => `${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : '—'} h` },
          },
        },
        scales: {
          x: { ticks: { color: C.text2, font: { size: 10 }, maxRotation: 0 }, grid: { color: 'rgba(42,61,44,0.4)' } },
          y: {
            ticks:   { color: C.amber, font: { size: 10 }, callback: v => `${v}h` },
            grid:    { color: 'rgba(42,61,44,0.4)' },
            min:     0,
          },
        },
      },
    });
  }

  // ─────────────────────────────────────────
  //  ⑤ 月別降水量ヒートバー（SVG）
  //  雨量に応じて青のグラデーションで色変化
  // ─────────────────────────────────────────
  function _renderRainBars(climate) {
    const el = document.getElementById('adpc-rain-bars');
    if (!el || !climate.rainMonthly) return;

    const vals = MONTH_KEYS.map(m => climate.rainMonthly[m] ?? 0);
    const maxVal = Math.max(...vals, 1);

    el.innerHTML = `
      <div class="adpc-rain-table">
        ${MONTH_KEYS.map((m, i) => {
          const v   = vals[i];
          const pct = Math.round(v / maxVal * 100);
          const intensity = v / maxVal;
          // 低雨量: 淡青 → 高雨量: 濃青・紫
          const r = Math.round(96  + (167 - 96)  * (1 - intensity));
          const g = Math.round(165 + (139 - 165) * intensity);
          const b = Math.round(250 + (250 - 250) * intensity);
          const barColor = intensity > 0.7
            ? `rgba(167,139,250,${0.4 + intensity * 0.5})`
            : `rgba(96,165,250,${0.25 + intensity * 0.6})`;

          return `
            <div class="adpc-rain-row">
              <span class="adpc-rain-month">${MONTH_LABELS[i]}</span>
              <div class="adpc-rain-track">
                <div class="adpc-rain-bar" style="width:${pct}%;background:${barColor};"></div>
              </div>
              <span class="adpc-rain-val">${Math.round(v)}<span class="adpc-rain-unit">mm</span></span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ─────────────────────────────────────────
  //  ① 環境ドーナツ（既存ロジック流用）
  // ─────────────────────────────────────────
  function _renderEnvDonut(area, climate) {
    const wrap = document.getElementById('adpc-env-donut');
    if (!wrap) return;

    const lp   = area.landProfile || {};
    const temp = climate?.tempMean ?? lp.avgTemp        ?? null;
    const rain = climate?.rain     ?? lp.annualRainfall ?? null;
    const elev = lp.elevation      ?? area.meta?.elev   ?? null;
    const ph   = lp.ph                                  ?? null;

    const rings = [
      _calcRing('年均気温', temp,  '℃',  -5,  40,  12,  22, C.green, C.amber, C.red),
      _calcRing('土壌pH',   ph,    '',   3.5,   9, 5.5,   7, C.green, C.amber, C.red),
      _calcRing('標高',     elev,  'm',    0, 2000,   0, 600, C.green, C.amber, C.red),
      _calcRing('年降水量', rain,  'mm',   0, 3500, 900, 2200, C.green, C.amber, C.red),
    ];

    const SIZE = 160, CX = 80, CY = 80, GAP = 5, THICK = 13, R_BASE = 28;

    function arcPath(cx, cy, r, startDeg, endDeg) {
      const toRad = d => (d - 90) * Math.PI / 180;
      const x1 = cx + r * Math.cos(toRad(startDeg));
      const y1 = cy + r * Math.sin(toRad(startDeg));
      const x2 = cx + r * Math.cos(toRad(endDeg));
      const y2 = cy + r * Math.sin(toRad(endDeg));
      return `M ${x1} ${y1} A ${r} ${r} 0 ${(endDeg - startDeg) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
    }

    let ringsSvg = '';
    rings.forEach((ring, i) => {
      const r   = R_BASE + i * (THICK + GAP);
      const pct = ring.score !== null ? ring.score : 0;
      const deg = pct / 100 * 359.9;

      ringsSvg += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="#2a3d2c" stroke-width="${THICK}" opacity="0.55"/>`;
      if (ring.score !== null && pct > 0) {
        ringsSvg += `
          <path d="${arcPath(CX, CY, r, 0, deg)}" fill="none" stroke="${ring.color}"
            stroke-width="${THICK}" stroke-linecap="round"
            style="filter:drop-shadow(0 0 4px ${ring.color}66)">
            <animate attributeName="stroke-dashoffset" from="${2*Math.PI*r}" to="0"
              dur="0.7s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0 1"/>
          </path>`;
      }
    });

    const legendHTML = rings.map(ring => `
      <div class="adpc-legend-row">
        <span class="adpc-legend-dot" style="background:${ring.score !== null ? ring.color : '#2a3d2c'}"></span>
        <div class="adpc-legend-info">
          <div class="adpc-legend-top">
            <span class="adpc-legend-label">${ring.name}</span>
            <span class="adpc-legend-val" style="color:${ring.score !== null ? ring.color : C.text3}">${ring.displayVal}</span>
          </div>
          <span class="adpc-legend-status" style="color:${ring.score !== null ? ring.color : C.text3}">${ring.score !== null ? ring.statusLabel : 'データなし'}</span>
        </div>
      </div>`).join('');

    wrap.innerHTML = `
      <div class="adpc-donut-layout">
        <svg class="adpc-donut-svg" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
          ${ringsSvg}
          <text x="${CX}" y="${CY-5}" text-anchor="middle" fill="#5a7a5c" font-size="8" font-family="'DM Mono',monospace" letter-spacing="0.08em">LAND</text>
          <text x="${CX}" y="${CY+7}" text-anchor="middle" fill="#5a7a5c" font-size="8" font-family="'DM Mono',monospace" letter-spacing="0.08em">ENV</text>
        </svg>
        <div class="adpc-donut-legend">${legendHTML}</div>
      </div>`;
  }

  function _calcRing(name, value, unit, displayMin, displayMax, optMin, optMax, cGood, cWarn, cBad) {
    const fmt = v => {
      if (v == null) return '—';
      if (unit === '℃' || unit === '') return Number(v).toFixed(1) + unit;
      return Math.round(v) + unit;
    };
    if (value == null || !isFinite(value)) return { name, score: null, color: '#2a3d2c', displayVal: '—', statusLabel: 'データなし', unit };

    let score, color, statusLabel;
    if (value >= optMin && value <= optMax) {
      score = 100; color = cGood; statusLabel = '適合';
    } else {
      const overShoot = value < optMin
        ? (optMin - value) / (optMin - displayMin || 1)
        : (value - optMax) / (displayMax - optMax || 1);
      score = Math.max(0, Math.round((1 - overShoot) * 85));
      color = score >= 50 ? cWarn : cBad;
      statusLabel = score >= 50 ? '近接' : '範囲外';
    }
    return { name, score, color, displayVal: fmt(value), statusLabel, unit };
  }

  // ─────────────────────────────────────────
  //  ⑥ 環境リスクゲージ（積雪追加）
  // ─────────────────────────────────────────
  function _renderRiskGauges(area) {
    const wrap = document.getElementById('adpc-risk-gauges');
    if (!wrap) return;

    const lp = area.landProfile || {};
    const gauges = [
      { label: '浸水リスク',   icon: '🌊', value: lp.floodRisk   ?? null, level: lp.floodRiskLevel   ?? null },
      { label: '干ばつリスク', icon: '☀️', value: lp.droughtRisk ?? null, level: lp.droughtRiskLevel ?? null },
      { label: '積雪リスク',   icon: '❄️', value: lp.snowRisk    ?? null, level: lp.snowRiskLevel    ?? null },
    ];

    if (gauges.every(g => g.value === null)) {
      wrap.innerHTML = '<div class="adpc-nodata">分析実行後にリスクが表示されます</div>';
      return;
    }

    wrap.innerHTML = gauges.map(g => {
      const pct        = g.value !== null ? Math.min(100, Math.max(0, g.value)) : 0;
      const color      = g.level === 'high' ? C.red : g.level === 'medium' ? C.amber : C.green;
      const levelLabel = g.level === 'high' ? '高' : g.level === 'medium' ? '中' : g.value !== null ? '低' : '—';
      return `
        <div class="adpc-gauge-row">
          <span class="adpc-gauge-label">${g.icon} ${g.label}</span>
          <div class="adpc-gauge-track">
            <div class="adpc-gauge-bar" style="width:${pct}%;background:${color};box-shadow:0 0 6px ${color}55;transition:width 0.6s ease;"></div>
          </div>
          <span class="adpc-gauge-pct" style="color:${g.value !== null ? color : C.text3}">${g.value !== null ? pct + '%' : '—'}</span>
          <span class="adpc-gauge-val" style="color:${g.value !== null ? color : C.text3}">${g.value !== null ? levelLabel : '—'}</span>
        </div>`;
    }).join('');
  }

  return { render };
})();
