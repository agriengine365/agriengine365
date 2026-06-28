// ═══════════════════════════════════════════
//  DashboardPane — 収穫ダッシュボード
//  実務側サブタブ「📊 ダッシュボード」の描画モジュール
//
//  データソース: _adpPracticecrops[].harvestRecords[]
//    各record: { id, date, weight, unit, price, priceUnit, grade }
//  エリア情報:  _adpArea（占有面積・作物ごとの ratio 利用）
//
//  外部依存: Chart.js（CDN）/ CROP_DB（cropDB.js）
// ═══════════════════════════════════════════

const DashboardPane = (() => {

  // ─── 内部状態 ───
  let _chartInstances = {};   // { chartId: ChartInstance } — 破棄管理用
  let _activeSubTab   = 'harvest';  // 'harvest' | 'revenue' | 'ratio' | 'yield'
  let _pieMode        = 'weight';   // 'weight' | 'revenue'

  // ─── 直近12ヶ月のラベル生成 ───
  function _getLast12Months() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${d.getMonth() + 1}月`,
      });
    }
    return months;
  }

  // ─── kg換算（現状 kg のみ対応。将来的に単位拡張可） ───
  function _toKg(weight, unit) {
    if (unit === 'g')  return weight / 1000;
    if (unit === 't')  return weight * 1000;
    return weight; // kg or 未指定
  }

  // ─── 収穫レコードを集計 ───
  // 返却: {
  //   cropId => {
  //     monthly: { 'YYYY-MM': { weight, revenue } },
  //     total:   { weight, revenue }
  //   }
  // }
  function _aggregate(practicecrops) {
    const result = {};
    for (const pc of practicecrops) {
      const records = pc.harvestRecords || [];
      if (!records.length) continue;
      const map = { monthly: {}, total: { weight: 0, revenue: 0 } };
      for (const r of records) {
        if (!r.date) continue;
        const monthKey = r.date.slice(0, 7); // 'YYYY-MM'
        if (!map.monthly[monthKey]) map.monthly[monthKey] = { weight: 0, revenue: 0 };
        const kg  = r.weight != null ? _toKg(r.weight, r.unit) : 0;
        const rev = (r.weight != null && r.price != null) ? r.weight * r.price : 0;
        map.monthly[monthKey].weight  += kg;
        map.monthly[monthKey].revenue += rev;
        map.total.weight  += kg;
        map.total.revenue += rev;
      }
      result[pc.cropId] = map;
    }
    return result;
  }

  // ─── 作物ごとのカラーパレット ───
  const PALETTE = [
    '#4ade80','#60a5fa','#f97316','#a78bfa','#fb7185',
    '#facc15','#34d399','#38bdf8','#e879f9','#94a3b8',
  ];
  function _cropColor(idx) {
    return PALETTE[idx % PALETTE.length];
  }

  // ─── 作物名取得 ───
  function _cropName(cropId) {
    if (typeof CROP_DB !== 'undefined') {
      const c = CROP_DB.find(x => x.id === cropId);
      if (c) return c.name;
    }
    return cropId;
  }

  // ─── Chartインスタンスを安全に破棄 ───
  function _destroyChart(id) {
    if (_chartInstances[id]) {
      _chartInstances[id].destroy();
      delete _chartInstances[id];
    }
  }

  // ─── 空状態HTML ───
  function _emptyHTML(msg) {
    return `<div class="db-empty"><div class="db-empty-icon">📭</div>${msg}</div>`;
  }

  // ══════════════════════════════════════
  //  サブタブ描画関数
  // ══════════════════════════════════════

  // ─── 月別棒グラフ（収穫量 / 収益 共用） ───
  function _renderBar(agg, months, mode, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;

    const cropIds = Object.keys(agg);
    if (!cropIds.length) {
      el.innerHTML = _emptyHTML('収穫記録がありません。<br>収穫タブから記録を追加してください。');
      return;
    }

    const isRevenue = (mode === 'revenue');
    const unit      = isRevenue ? '円' : 'kg';

    const datasets = cropIds.map((cropId, idx) => {
      const data = months.map(m => {
        const d = agg[cropId].monthly[m.key];
        if (!d) return 0;
        return isRevenue ? Math.round(d.revenue) : Math.round(d.weight * 10) / 10;
      });
      return {
        label:           _cropName(cropId),
        data,
        backgroundColor: _cropColor(idx),
        borderRadius:    3,
        borderSkipped:   false,
      };
    });

    el.innerHTML = `<div class="db-chart-wrap"><canvas id="${targetId}-canvas"></canvas></div>`;
    const ctx = document.getElementById(`${targetId}-canvas`).getContext('2d');
    _destroyChart(targetId);
    _chartInstances[targetId] = new Chart(ctx, {
      type: 'bar',
      data: { labels: months.map(m => m.label), datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} ${unit}`,
            },
          },
        },
        scales: {
          x: { stacked: true, ticks: { font: { size: 10 } } },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              font:     { size: 10 },
              callback: v => isRevenue ? `¥${v.toLocaleString()}` : `${v}kg`,
            },
          },
        },
      },
    });
  }

  // ─── 円グラフ（構成比） ───
  function _renderPie(agg, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;

    const cropIds = Object.keys(agg);
    if (!cropIds.length) {
      el.innerHTML = _emptyHTML('収穫記録がありません。');
      return;
    }

    const isRevenue = (_pieMode === 'revenue');
    const values    = cropIds.map(id => isRevenue
      ? Math.round(agg[id].total.revenue)
      : Math.round(agg[id].total.weight * 10) / 10
    );
    const total = values.reduce((a, b) => a + b, 0);
    if (!total) {
      el.innerHTML = _emptyHTML('集計できるデータがありません。');
      return;
    }

    const colors = cropIds.map((_, i) => _cropColor(i));

    // 凡例HTML
    const legendHTML = cropIds.map((id, i) => {
      const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : 0;
      const val = isRevenue
        ? `¥${values[i].toLocaleString()}`
        : `${values[i].toLocaleString()} kg`;
      return `
        <div class="db-legend-item">
          <div class="db-legend-dot" style="background:${colors[i]}"></div>
          <span class="db-legend-name">${_cropName(id)}</span>
          <span class="db-legend-val">${val}（${pct}%）</span>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="db-pie-toggle">
        <button class="db-pie-btn${_pieMode === 'weight'  ? ' active' : ''}" onclick="DashboardPane._setPieMode('weight',  '${targetId}')">収量</button>
        <button class="db-pie-btn${_pieMode === 'revenue' ? ' active' : ''}" onclick="DashboardPane._setPieMode('revenue', '${targetId}')">収益</button>
      </div>
      <div class="db-chart-wrap db-chart-wrap-pie"><canvas id="${targetId}-canvas"></canvas></div>
      <div class="db-pie-legend">${legendHTML}</div>`;

    const ctx = document.getElementById(`${targetId}-canvas`).getContext('2d');
    _destroyChart(targetId);
    _chartInstances[targetId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels:   cropIds.map(id => _cropName(id)),
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 2 }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed;
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
                return isRevenue ? `¥${v.toLocaleString()}（${pct}%）` : `${v} kg（${pct}%）`;
              },
            },
          },
        },
      },
    });
  }

  // ─── 反収グラフ（折れ線） ───
  function _renderYield(agg, months, practicecrops, area, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;

    const areaSqm = area?.areaSqm || 0;
    const cropIds = Object.keys(agg);

    if (!cropIds.length) {
      el.innerHTML = _emptyHTML('収穫記録がありません。');
      return;
    }
    if (!areaSqm) {
      el.innerHTML = _emptyHTML('エリア面積が未設定のため反収を計算できません。');
      return;
    }

    // 作物ごとの占有面積（㎡）
    const datasets = cropIds.map((cropId, idx) => {
      const pc         = practicecrops.find(c => c.cropId === cropId);
      const ratio      = pc?.ratio ?? 100;
      const occupySqm  = areaSqm * (ratio / 100);
      const occupy10a  = occupySqm / 1000; // 10a換算

      // 累計収量を月ごとに積算して反収を算出
      let cumWeight = 0;
      const data = months.map(m => {
        const d = agg[cropId].monthly[m.key];
        if (d) cumWeight += d.weight;
        if (!occupy10a) return null;
        return Math.round((cumWeight / occupy10a) * 10) / 10;
      });

      return {
        label:           _cropName(cropId),
        data,
        borderColor:     _cropColor(idx),
        backgroundColor: _cropColor(idx) + '33',
        tension:         0.3,
        fill:            false,
        pointRadius:     3,
        spanGaps:        true,
      };
    });

    el.innerHTML = `<div class="db-chart-wrap"><canvas id="${targetId}-canvas"></canvas></div>`;
    const ctx = document.getElementById(`${targetId}-canvas`).getContext('2d');
    _destroyChart(targetId);
    _chartInstances[targetId] = new Chart(ctx, {
      type: 'line',
      data: { labels: months.map(m => m.label), datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y ?? '—'} kg/10a（累計）`,
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: {
            beginAtZero: true,
            ticks: {
              font:     { size: 10 },
              callback: v => `${v}kg`,
            },
          },
        },
      },
    });
  }

  // ─── 灌水記録を月別集計 ───
  // 返却: { groupKey: { monthly: { 'YYYY-MM': totalWaterL }, total: totalWaterL } }
  // groupKey: '__area__'（cropId=null）または cropId
  function _aggregateIrrigation(records) {
    const result = {};
    for (const r of records) {
      if (!r.date) continue;
      const groupKey = r.cropId || '__area__';
      if (!result[groupKey]) result[groupKey] = { monthly: {}, total: 0 };
      const monthKey = r.date.slice(0, 7);
      if (!result[groupKey].monthly[monthKey]) result[groupKey].monthly[monthKey] = 0;
      const vol = r.totalWaterL || 0;
      result[groupKey].monthly[monthKey] += vol;
      result[groupKey].total += vol;
    }
    return result;
  }

  function _irrigationGroupName(key) {
    return key === '__area__' ? '🌍 エリア全体' : _cropName(key);
  }

  // ─── 月別灌水量棒グラフ ───
  function _renderIrrigationBar(months, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;

    const records = (typeof _adpIrrigationRecords !== 'undefined') ? _adpIrrigationRecords : [];
    const agg = _aggregateIrrigation(records);
    const groupKeys = Object.keys(agg);

    if (!groupKeys.length) {
      el.innerHTML = _emptyHTML('灌水記録がありません。<br>灌水タブから記録を追加してください。');
      return;
    }

    const datasets = groupKeys.map((key, idx) => {
      const data = months.map(m => {
        const v = agg[key].monthly[m.key];
        return v ? Math.round(v * 10) / 10 : 0;
      });
      return {
        label:           _irrigationGroupName(key),
        data,
        backgroundColor: key === '__area__' ? '#3b82f6' : _cropColor(idx),
        borderRadius:    3,
        borderSkipped:   false,
      };
    });

    el.innerHTML = `<div class="db-chart-wrap"><canvas id="${targetId}-canvas"></canvas></div>`;
    const ctx = document.getElementById(`${targetId}-canvas`).getContext('2d');
    _destroyChart(targetId);
    _chartInstances[targetId] = new Chart(ctx, {
      type: 'bar',
      data: { labels: months.map(m => m.label), datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} L`,
            },
          },
        },
        scales: {
          x: { stacked: true, ticks: { font: { size: 10 } } },
          y: {
            stacked:     true,
            beginAtZero: true,
            ticks: {
              font:     { size: 10 },
              callback: v => `${v}L`,
            },
          },
        },
      },
    });
  }

  // ══════════════════════════════════════
  //  サブタブUI描画
  // ══════════════════════════════════════

  function _renderSubTabs(activeKey) {
    const tabs = [
      { key: 'harvest',    label: '📦 収穫量' },
      { key: 'revenue',    label: '💴 収益'   },
      { key: 'ratio',      label: '🥧 構成比' },
      { key: 'yield',      label: '📉 反収'   },
      { key: 'irrigation', label: '💧 灌水量' },
    ];
    return tabs.map(t => `
      <button class="db-subtab${t.key === activeKey ? ' active' : ''}"
              onclick="DashboardPane._switchSubTab('${t.key}')">${t.label}</button>
    `).join('');
  }

  // ─── KPIサマリー行 ───
  function _renderKPI(agg) {
    const cropIds    = Object.keys(agg);
    const totalW     = cropIds.reduce((s, id) => s + agg[id].total.weight,  0);
    const totalR     = cropIds.reduce((s, id) => s + agg[id].total.revenue, 0);
    const cropCount  = cropIds.length;

    if (!cropCount) return '';

    return `
      <div class="db-summary-row">
        <div class="db-kpi"><span class="db-kpi-val">${Math.round(totalW).toLocaleString()}</span><span class="db-kpi-unit">kg 合計収量</span></div>
        <div class="db-kpi"><span class="db-kpi-val">¥${Math.round(totalR).toLocaleString()}</span><span class="db-kpi-unit">合計収益</span></div>
        <div class="db-kpi"><span class="db-kpi-val">${cropCount}</span><span class="db-kpi-unit">作物</span></div>
      </div>`;
  }

  // ══════════════════════════════════════
  //  公開API
  // ══════════════════════════════════════

  /**
   * メイン描画エントリポイント。_adpSwitchSubTabから呼ばれる。
   * @param {Array}  practicecrops  _adpPracticecrops
   * @param {Object} area           _adpArea
   */
  function render(practicecrops, area) {
    const el = document.getElementById('dashboard-result');
    if (!el) return;

    const months = _getLast12Months();
    const agg    = _aggregate(practicecrops || []);

    el.innerHTML = `
      <div class="db-wrap">
        <div class="db-subtabs" id="db-subtabs">${_renderSubTabs(_activeSubTab)}</div>
        ${_renderKPI(agg)}
        <div id="db-chart-area"></div>
      </div>`;

    _drawActiveChart(agg, months, practicecrops, area);
  }

  /** サブタブ切替（HTMLから呼ばれる） */
  function _switchSubTab(key) {
    _activeSubTab = key;

    // ボタンのactive更新
    document.querySelectorAll('#db-subtabs .db-subtab').forEach(btn => {
      const k = btn.getAttribute('onclick').match(/'(\w+)'/)?.[1];
      btn.classList.toggle('active', k === key);
    });

    // チャートエリアだけ再描画（_adpPracticecrops/_adpAreaはグローバル参照）
    const months = _getLast12Months();
    const agg    = _aggregate(
      (typeof _adpPracticecrops !== 'undefined') ? _adpPracticecrops : []
    );
    _drawActiveChart(
      agg, months,
      (typeof _adpPracticecrops !== 'undefined') ? _adpPracticecrops : [],
      (typeof _adpArea           !== 'undefined') ? _adpArea           : null
    );
  }

  /** 円グラフのweight/revenue切替 */
  function _setPieMode(mode, targetId) {
    _pieMode = mode;
    const months = _getLast12Months();
    const agg    = _aggregate(
      (typeof _adpPracticecrops !== 'undefined') ? _adpPracticecrops : []
    );
    _renderPie(agg, 'db-chart-area');
  }

  /** activeなサブタブのグラフを描画 */
  function _drawActiveChart(agg, months, practicecrops, area) {
    const id = 'db-chart-area';
    _destroyChart(id);
    switch (_activeSubTab) {
      case 'harvest':    _renderBar(agg, months, 'weight',  id); break;
      case 'revenue':    _renderBar(agg, months, 'revenue', id); break;
      case 'ratio':      _renderPie(agg, id);                    break;
      case 'yield':      _renderYield(agg, months, practicecrops, area, id); break;
      case 'irrigation': _renderIrrigationBar(months, id); break;
    }
  }

  // 公開
  return { render, _switchSubTab, _setPieMode };

})();
