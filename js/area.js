// ═══════════════════════════════════════════
//  AREA — 自動保存・一覧・削除・選択・インライン編集
// ═══════════════════════════════════════════

// ─── ウィザードからの確定保存 ───
async function commitSaveArea({ name, memo, soilType }) {
  if (!currentPolygon || !currentAreaData) {
    showToast('保存対象のエリアがありません', 'amber');
    return;
  }

  const geojson = currentPolygon.toGeoJSON();

  // Firestore はネスト配列不可 → climate内の配列フィールドを除去してから landProfile を生成
  const cleanedAreaData = { ...currentAreaData };
  if (cleanedAreaData.climate) {
    const { decadeArr, ...safeClimate } = cleanedAreaData.climate;
    cleanedAreaData.climate = safeClimate;
  }
  const landProfile = buildLandProfile({ ...cleanedAreaData, soilType });

  // GeoJSON座標はネスト配列のためFirestore非対応 → 文字列化して保存
  const geojsonStr = JSON.stringify(geojson);

  // ─── env フィールドを気候データから生成 ───
  // AMeDAS取得済みの場合は buildEnvFromClimate で変換、なければ空スキーマ
  let envPayload = null;
  if (typeof buildEnvFromClimate === 'function') {
    const climateForEnv = currentAreaData.climate || null;
    envPayload = buildEnvFromClimate(climateForEnv);
    // soilType はウィザードで選択したものを優先
    if (soilType) envPayload.soilType = soilType;
  }

  const payload = {
    name,
    memo,
    geojson: geojsonStr,
    landProfile,
    env: envPayload || (typeof createEmptyEnv === 'function' ? createEmptyEnv() : {}),
    meta: {
      areaSqm:         currentAreaData.areaSqm,
      areaHa:          currentAreaData.areaHa,
      perimeter:       currentAreaData.perimeter,
      vertexCount:     currentAreaData.vertexCount,
      lat:             currentAreaData.lat,
      lng:             currentAreaData.lng,
      elev:            currentAreaData.elev,
      climateName:     currentAreaData.climate?.name        || null,
      climateTempMean: currentAreaData.climate?.tempMean    ?? null,
      climateRain:     currentAreaData.climate?.rain        ?? null,
      climateSource:   currentAreaData.climate?.source      || 'table',
      // AMeDAS拡張フィールド（取得できた場合のみ）
      amStationNo:     currentAreaData.climate?.stationNo   || null,
      amStationName:   currentAreaData.climate?.stationName || null,
      amDistKm:        currentAreaData.climate?.distKm      ?? null,
      amTempMaxMean:   currentAreaData.climate?.tempMaxMean ?? null,
      amTempMinMean:   currentAreaData.climate?.tempMinMean ?? null,
      amTempMinJan:    currentAreaData.climate?.tempMinJan  ?? null,
      amSunshineHours: currentAreaData.climate?.sunshineHours ?? null,
      amDaysBelow0:    currentAreaData.climate?.daysBelow0  ?? null,
      amRainDays50:    currentAreaData.climate?.rainDays50  ?? null,
      amSnowDays:      currentAreaData.climate?.snowDays    ?? null,
      soilType:        soilType || null,
    },
    createdAt: new Date().toISOString(),
    profitOverrides: {},
  };

  try {
    if (db) {
      const ref = await db.collection('areas').add(payload);
      currentSavedAreaId = ref.id;
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      payload.id = 'local_' + Date.now();
      stored.push(payload);
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      currentSavedAreaId = payload.id;
    }
    showWizardDone(name);
    loadAreas();
  } catch(e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
  }
}

// ─── エリア一覧読み込み ───
async function loadAreas() {
  const list = document.getElementById('areas-list');
  list.innerHTML = '<div class="empty"><span class="spinner"></span> 読み込み中...</div>';

  let areas = [];
  try {
    if (db) {
      const snap = await db.collection('areas').orderBy('createdAt', 'desc').get();
      snap.forEach(doc => areas.push({ id: doc.id, ...doc.data() }));
    } else {
      areas = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]').reverse();
    }
  } catch(e) {
    console.error(e);
  }

  document.getElementById('areas-count').textContent = `${areas.length} エリア`;

  // 保存済み全エリアを地図に常時表示（初期表示・保存・編集・削除後すべてここを通る）
  if (typeof renderSavedAreasOnMap === 'function') renderSavedAreasOnMap(areas);

  if (areas.length === 0) {
    list.innerHTML = '<div class="empty"><div class="icon">🗾</div>保存されたエリアはありません。</div>';
    return;
  }

  list.innerHTML = '';
  areas.forEach(area => renderAreaItem(area, list));
}

// ─── エリアアイテム描画（2段構成: サマリー＋展開詳細） ───
function renderAreaItem(area, container) {
  const ha       = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
  const env      = area.env || {};
  const climate  = area.meta?.climateName || '—';
  const soil     = area.meta?.soilType ? soilLabel(area.meta.soilType) : '—';
  const tempMean = env.tempMean    != null ? env.tempMean.toFixed(1)    : (area.meta?.climateTempMean != null ? Number(area.meta.climateTempMean).toFixed(1) : '—');
  const rain     = env.rain        != null ? Math.round(env.rain)       : (area.meta?.climateRain     != null ? Math.round(area.meta.climateRain)            : '—');
  const ph       = env.ph          != null ? env.ph                     : '—';
  const gdd      = env.gdd         != null ? Math.round(env.gdd)        : '—';
  const ffDays   = env.frostFreeDays != null ? Math.round(env.frostFreeDays) : '—';
  const irrigSrc = { well:'井戸', river:'河川', pond:'溜池', none:'なし' }[env.irrigationSource] || '—';
  const roadW    = env.roadWidthM  != null ? env.roadWidthM + 'm'       : '—';
  const power    = env.hasPower === true ? 'あり' : env.hasPower === false ? 'なし' : '—';
  const wildlife = { low:'低', medium:'中', high:'高' }[env.wildlifeRisk] || '—';
  const hasEnv   = Object.keys(env).some(k => env[k] != null && k !== 'monthlyJson' && k !== 'decadeJson');
  const missingCount = typeof countMissingEnvFields === 'function' ? countMissingEnvFields(env) : 0;

  // 詳細フィールド表示ヘルパー
  function envRow(label, value) {
    return value != null && value !== ''
      ? `<div class="env-detail-row"><span class="env-detail-label">${label}</span><span class="env-detail-value">${value}</span></div>`
      : `<div class="env-detail-row env-detail-null"><span class="env-detail-label">${label}</span><span class="env-detail-value">—</span></div>`;
  }
  const lmap = { low:'低', medium:'中', high:'高' };
  const srcLabels = { well:'井戸', river:'河川', pond:'溜池', none:'なし' };

  const div = document.createElement('div');
  div.className = 'area-item';
  div.dataset.id = area.id;
  div.innerHTML = `
    <!-- ▲ サマリー行（常時表示） -->
    <div class="area-item-header">
      <div class="area-item-name" data-field="name">${escHtml(area.name)}</div>
      <div class="area-item-actions">
        <button class="pill-btn edit-btn" onclick="event.stopPropagation();toggleInlineEdit('${area.id}')">編集</button>
        <button class="btn btn-danger"    onclick="event.stopPropagation();deleteArea('${area.id}')">削除</button>
      </div>
    </div>

    <!-- サマリーバッジ行 -->
    <div class="area-summary-badges">
      <span class="area-badge">📐 ${ha}ha</span>
      <span class="area-badge">📍 ${climate}</span>
      <span class="area-badge">🌡️ ${tempMean}°C</span>
      <span class="area-badge">☔ ${rain}mm</span>
      <span class="area-badge">🌱 ${soil}</span>
      ${env.irrigationSource ? `<span class="area-badge">💧 ${irrigSrc}</span>` : ''}
      ${missingCount > 0 ? `<span class="area-badge area-badge-missing">📝 未入力${missingCount}件</span>` : ''}
    </div>
    <div class="area-summary-badges area-summary-badges-2">
      ${env.frostFreeDays != null ? `<span class="area-badge area-badge-sub">❄️ 無霜${ffDays}日</span>` : ''}
      ${env.gdd           != null ? `<span class="area-badge area-badge-sub">🌿 GDD ${gdd}</span>` : ''}
      ${env.ph            != null ? `<span class="area-badge area-badge-sub">🧪 pH ${ph}</span>` : ''}
      ${env.roadWidthM    != null ? `<span class="area-badge area-badge-sub">🚜 農道${roadW}</span>` : ''}
      ${env.hasPower      != null ? `<span class="area-badge area-badge-sub">⚡ 電源${power}</span>` : ''}
      ${env.wildlifeRisk  != null ? `<span class="area-badge area-badge-sub">🐗 獣害${wildlife}</span>` : ''}
    </div>
    ${area.memo ? `<div class="area-memo-display">${escHtml(area.memo)}</div>` : ''}

    <!-- ▼ 詳細展開ボタン -->
    <button class="area-detail-toggle" id="detail-toggle-${area.id}"
      onclick="event.stopPropagation();toggleAreaDetail('${area.id}')">
      <span>▼ 詳細</span>
    </button>

    <!-- ▼ 詳細展開パネル -->
    <div class="area-detail-panel" id="detail-panel-${area.id}" style="display:none;">

      <div class="env-detail-section">
        <div class="env-detail-section-title">🌡️ 気象</div>
        ${envRow('年均気温',       env.tempMean     != null ? env.tempMean.toFixed(1)+'°C' : null)}
        ${envRow('1月最低気温',    env.tempMinJan   != null ? env.tempMinJan.toFixed(1)+'°C' : null)}
        ${envRow('8月最高気温',    env.tempMax8     != null ? env.tempMax8.toFixed(1)+'°C' : null)}
        ${envRow('年降水量',       env.rain         != null ? Math.round(env.rain)+'mm' : null)}
        ${envRow('年日照時間',     env.sunshineHours!= null ? Math.round(env.sunshineHours)+'h' : null)}
        ${envRow('無霜期間',       env.frostFreeDays!= null ? Math.round(env.frostFreeDays)+'日' : null)}
        ${envRow('有効積算温度',   env.gdd          != null ? Math.round(env.gdd)+'GDD' : null)}
        ${envRow('最大積雪深',     env.maxSnowDepth != null ? env.maxSnowDepth+'cm' : null)}
        ${envRow('平均風速',       env.windSpeedMean!= null ? env.windSpeedMean+'m/s' : null)}
        ${envRow('冷気湖リスク',   lmap[env.coldLakeRisk] || null)}
        ${env.stationName ? envRow('観測局', env.stationName + (env.distKm != null ? ` (${env.distKm.toFixed(1)}km)` : '')) : ''}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">🏔️ 地形・土壌</div>
        ${envRow('傾斜',           env.slope        != null ? env.slope+'°' : null)}
        ${envRow('斜面向き',       env.aspect       || null)}
        ${envRow('遮蔽リスク',     lmap[env.shadingRisk] || null)}
        ${envRow('pH',             env.ph           != null ? env.ph : null)}
        ${envRow('有機物含量',     { high:'高', medium:'中', low:'低' }[env.organicMatter] || null)}
        ${envRow('保水性',         { high:'高', medium:'中', low:'低' }[env.waterRetention] || null)}
        ${envRow('塩類リスク',     lmap[env.salinityRisk] || null)}
        ${envRow('作付け履歴',     env.croppingHistory || null)}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">💧 水利</div>
        ${envRow('灌漑水源',       srcLabels[env.irrigationSource] || null)}
        ${envRow('灌漑距離',       env.irrigationDistM != null ? env.irrigationDistM+'m' : null)}
        ${envRow('排水設備',       { good:'良好', moderate:'普通', poor:'不良' }[env.drainageFacility] || null)}
        ${envRow('地下水位',       { deep:'深い', medium:'中程度', shallow:'浅い' }[env.groundwaterLevel] || null)}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">🚜 営農条件</div>
        ${envRow('圃場形状',       { regular:'整形', irregular:'不整形' }[env.fieldShapeScore] || null)}
        ${envRow('農道幅',         env.roadWidthM   != null ? env.roadWidthM+'m' : null)}
        ${envRow('電源',           env.hasPower === true ? 'あり' : env.hasPower === false ? 'なし' : null)}
        ${envRow('集荷場距離',     env.distToCollectionKm != null ? env.distToCollectionKm+'km' : null)}
      </div>

      <div class="env-detail-section">
        <div class="env-detail-section-title">🏘️ 地域環境</div>
        ${envRow('農業振興地域',   env.agriculturalZone === true ? 'あり' : env.agriculturalZone === false ? 'なし' : env.agriculturalZone === 'unknown' ? '不明' : null)}
        ${envRow('獣害リスク',     lmap[env.wildlifeRisk] || null)}
        ${envRow('周辺土地利用',   { farmland:'農地', forest:'山林', residential:'住宅地', mixed:'混在' }[env.surroundingLandUse] || null)}
      </div>

      <!-- 環境情報編集・再取得ボタン -->
      <div class="env-detail-actions">
        <button class="env-action-btn" onclick="event.stopPropagation();openEnvEditDialog(${JSON.stringify(JSON.stringify(area))})">
          ✏️ 環境情報を編集
        </button>
        <button class="env-action-btn env-action-btn-refresh" onclick="event.stopPropagation();_refreshEnvForArea('${area.id}')">
          🔄 AMeDAS更新
        </button>
      </div>
    </div>

    <!-- インラインエディット（名前・土壌・栽培方式・メモ） -->
    <div class="inline-edit" id="edit-${area.id}" style="display:none;">
      <div class="field">
        <label>エリア名</label>
        <input type="text" class="ie-name" value="${escHtml(area.name)}" placeholder="エリア名">
      </div>
      <div class="field">
        <label>土壌タイプ</label>
        <div class="soil-grid ie-soil-grid">
          ${['sandy','loam','clay','peat','volcanic','unknown'].map(s => `
            <div class="soil-btn${area.meta?.soilType === s ? ' selected' : ''}" data-soil="${s}" onclick="selectIESoil(this)">${soilLabel(s)}</div>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label>栽培方式（実務マスター・分析タブのサマリーバッジはこれとは独立した一時切替です）</label>
        <div class="ie-cult-row" style="display:flex;gap:8px;">
          <button type="button" class="adp-cult-btn${(area.cultivationMode || 'openField') === 'openField' ? ' active' : ''}" data-mode="openField" onclick="selectIECult(this)">露地</button>
          <button type="button" class="adp-cult-btn${area.cultivationMode === 'greenhouse' ? ' active' : ''}" data-mode="greenhouse" onclick="selectIECult(this)">ハウス</button>
          <button type="button" class="adp-cult-btn${area.cultivationMode === 'heatedGreenhouse' ? ' active' : ''}" data-mode="heatedGreenhouse" onclick="selectIECult(this)">加温</button>
        </div>
      </div>
      <div class="field">
        <label>メモ</label>
        <textarea class="ie-memo" placeholder="水はけが悪い、日当たり良好など">${escHtml(area.memo || '')}</textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="saveInlineEdit('${area.id}')">保存</button>
        <button class="btn btn-ghost"   style="flex:1;" onclick="toggleInlineEdit('${area.id}')">キャンセル</button>
      </div>
    </div>
  `;
  div.querySelector('.area-item-header').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    selectArea(area);
  });
  // 未入力件数バッジ：タップで直接env編集ダイアログを開く（▼詳細展開をスキップ）
  if (missingCount > 0) {
    const missingBadge = div.querySelector('.area-badge-missing');
    if (missingBadge) {
      missingBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof openEnvEditDialog === 'function') openEnvEditDialog(area);
      });
    }
  }
  container.appendChild(div);
}

// ─── 詳細パネル開閉 ───
function toggleAreaDetail(id) {
  const panel  = document.getElementById('detail-panel-' + id);
  const toggle = document.getElementById('detail-toggle-' + id);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (toggle) toggle.querySelector('span').textContent = isOpen ? '▼ 詳細' : '▲ 閉じる';
}

// ─── AMeDAS更新（エリアカードから呼び出し） ───
async function _refreshEnvForArea(areaId) {
  const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
  const area   = stored.find(a => a.id === areaId);
  if (!area) { showToast('エリアが見つかりません', 'amber'); return; }
  await refreshEnv(area);
  loadAreas();
}

// ─── インラインエディット開閉 ───
function toggleInlineEdit(id) {
  const el = document.getElementById('edit-' + id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  const btn = el.closest('.area-item').querySelector('.edit-btn');
  if (btn) btn.textContent = isOpen ? '編集' : '閉じる';
}

// ─── 土壌選択（インラインエディット内）───
function selectIESoil(btn) {
  btn.closest('.ie-soil-grid').querySelectorAll('.soil-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ─── 栽培方式選択（インラインエディット内・実務マスター用）───
function selectIECult(btn) {
  btn.closest('.ie-cult-row').querySelectorAll('.adp-cult-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ─── インラインエディット保存 ───
async function saveInlineEdit(id) {
  const el      = document.getElementById('edit-' + id);
  const name    = el.querySelector('.ie-name').value.trim();
  const memo    = el.querySelector('.ie-memo').value.trim();
  const soilBtn = el.querySelector('.soil-btn.selected');
  const soilType = soilBtn ? soilBtn.dataset.soil : null;
  const cultBtn  = el.querySelector('.ie-cult-row .adp-cult-btn.active');
  const cultivationMode = cultBtn ? cultBtn.dataset.mode : 'openField';

  if (!name) { showToast('エリア名を入力してください', 'amber'); return; }

  const update = { name, memo, cultivationMode, 'meta.soilType': soilType, 'landProfile.soilType': soilType };

  try {
    if (db && !id.startsWith('local_')) {
      await db.collection('areas').doc(id).update(update);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        stored[idx].name = name;
        stored[idx].memo = memo;
        stored[idx].cultivationMode = cultivationMode;
        stored[idx].meta = stored[idx].meta || {};
        stored[idx].meta.soilType = soilType;
        stored[idx].landProfile = stored[idx].landProfile || buildLandProfile(stored[idx].meta || {});
        stored[idx].landProfile.soilType = soilType;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
    showToast('更新しました ✓', 'green');
    loadAreas();
  } catch(e) {
    showToast('更新に失敗しました', 'amber');
    console.error(e);
  }
}

// ─── 削除 ───
async function deleteArea(id) {
  const ok = await showConfirmDialog('このエリアを削除しますか？', '削除する', 'キャンセル', true);
  if (!ok) return;
  try {
    if (db && !id.startsWith('local_')) {
      await db.collection('areas').doc(id).delete();
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored.filter(a => a.id !== id)));
    }
    showToast('削除しました', 'green');
    loadAreas();
  } catch(e) {
    showToast('削除に失敗しました', 'amber');
  }
}

// ─── エリア選択（分析へ）───
function selectArea(area) {
  drawnItems.clearLayers();
  const geojsonData = typeof area.geojson === 'string' ? JSON.parse(area.geojson) : area.geojson;
  const layer = L.geoJSON(geojsonData, {
    style: { color: CONFIG.DRAW_COLOR, weight: 2, fillOpacity: 0.2 },
  });
  layer.addTo(drawnItems);
  map.fitBounds(layer.getBounds());

  // normalizeAreaData が env 含む全フィールドを正規化（areaEnv.js）
  currentAreaData = (typeof normalizeAreaData === 'function')
    ? normalizeAreaData(area)
    : {
        lat:      area.landProfile?.lat       ?? area.meta?.lat      ?? null,
        lng:      area.landProfile?.lng       ?? area.meta?.lng      ?? null,
        elev:     area.landProfile?.elevation ?? area.meta?.elev     ?? null,
        climate:  getClimate(area.landProfile?.lat ?? area.meta?.lat ?? 35),
        soilType: area.landProfile?.soilType  ?? area.meta?.soilType ?? null,
        ph:       area.landProfile?.ph        ?? null,
        slope:    area.landProfile?.slope     ?? 0,
        areaSqm:  area.meta?.areaSqm          || 0,
        areaHa:   area.meta?.areaHa           || 0,
      };

  // landProfile が未保存 or リスク項目が欠損している場合は buildLandProfile() で補完
  // （_adpRenderLandRiskGauges / _adpRenderEnvDonut が参照するため）
  if (!area.landProfile ||
      area.landProfile.floodRisk == null ||
      area.landProfile.droughtRisk == null) {
    area.landProfile = buildLandProfile({
      ...currentAreaData,
      soilType: currentAreaData.soilType,
    });
  }

  // AMeDAS・天気予報をパネルオープン前にプリフェッチ開始
  _adpPrefetch(area);

  // 詳細パネルを開く
  openAreaDetailPanel(area);
}

// ═══════════════════════════════════════════
//  AREA DETAIL PANEL — カレンダー付き詳細パネル
// ═══════════════════════════════════════════

let _adpArea          = null;   // 現在表示中のエリア
let _adpYear          = 0;
let _adpMonth         = 0;
let _adpSelDate       = null;   // 選択中の日付文字列 'YYYY-MM-DD'
let _adpEditId        = null;   // 編集中レコードID
let _adpClimateCache  = null;   // AMeDAS取得済み climate（再オープン用キャッシュ）
let _adpSelectedCropId   = null; // 分析側で選択中の作物ID
// 実務側：複数作物 [{ cropId, ratio }] 形式。ratioは占有率(%)
let _adpPracticecrops    = [];   // 実務側で選択中の作物リスト
let _adpAnalysisCultMode = null; // 分析側で一時的に切り替え中の栽培方式（マスターはarea.cultivationMode・実務側のインライン編集で変更）
let _crOpenFieldScores   = null;  // 露地スコアキャッシュ（補正比較用）  // 気温グラフで強調表示中の作物ID
let _adpClimateMode   = false;  // true=気候推定モード / false=DBモード
let _adpClimateRanking = null;  // computeClimateRanking キャッシュ
let _adpClimateLoaded  = false; // true=AMeDAS取得試行済み（成功/失敗問わず）
let _adpWeatherCache   = null;  // 天気予報キャッシュ { areaId, fetchedAt, daily: {...} }

// ─── エリア選択時プリフェッチ（AMeDAS + 天気予報を並列取得） ───
// openAreaDetailPanel より先に呼ぶことでパネル表示時にキャッシュ済み状態にする
function _adpPrefetch(area) {
  const lat    = area.landProfile?.lat ?? area.meta?.lat ?? null;
  const lng    = area.landProfile?.lng ?? area.meta?.lng ?? null;
  if (lat === null || lng === null) return;

  const areaKey = area.id || area.name;

  // AMeDAS：未キャッシュ or 別エリアの場合のみ取得
  if (typeof AmedasLoader !== 'undefined' &&
      (!_adpClimateCache || _adpClimateCache._areaKey !== areaKey)) {
    AmedasLoader.getClimateAt(lat, lng).then(climateData => {
      // 別エリアに切り替わっていたら捨てる
      if ((_adpArea?.id || _adpArea?.name) !== areaKey &&
          (_adpWeatherCache?.areaId)        !== area.id) {
        const merged = { ...climateData, _areaKey: areaKey };
        _adpClimateCache = merged;
      } else {
        const merged = { ...climateData, _areaKey: areaKey };
        _adpClimateCache = merged;
      }
    }).catch(() => {/* 取得失敗は無視 */});
  }

  // 天気予報：未キャッシュ or 1時間超 or 別エリアの場合のみ取得
  const wxAge = _adpWeatherCache
    ? Date.now() - _adpWeatherCache.fetchedAt
    : Infinity;
  if (!_adpWeatherCache || _adpWeatherCache.areaId !== area.id || wxAge > 3600_000) {
    _adpFetchWeather(lat, lng, area.id).catch(() => {/* 取得失敗は無視 */});
  }
}

async function openAreaDetailPanel(area) {
  _adpArea    = area;
  _awArea     = area;   // 条件設定フォームのエリア参照を更新
  const now   = new Date();

  // ── 保存済み条件設定を復元 ──
  if (area.farmingConditions && typeof area.farmingConditions === 'object') {
    _awFarmCond = { ..._awDefaultFarmCond(), ...area.farmingConditions };
  } else {
    _awFarmCond = _awDefaultFarmCond();
  }
  // 栽培方式の復元：マスター値（area.cultivationMode）はここでは控えるだけ。
  // 実際にどちらを使うか（分析一時値 vs マスター）の解決は areaId 確定後、
  // currentAreaDataへの適用は openAreaDetailPanel 末尾で行う。
  const _adpMasterCultMode = area.cultivationMode || 'openField';
  // 評価モードの復元
  if (area.savedEvalMode) {
    _adpClimateMode = (area.savedEvalMode === 'climate');
  } else {
    _adpClimateMode = false;
  }
  _adpYear    = now.getFullYear();
  _adpMonth   = now.getMonth();
  _adpSelDate = null;
  _adpEditId  = null;
  _adpClimateMode    = false;
  _adpClimateRanking = null;
  _adpClimateLoaded  = false;
  // カレンダー表示モードをリセット（エリア切替時にリスト表示が残らないよう）
  _adpCalView    = 'grid';
  _adpCalSegment = 'visit';

  // 作物選択状態をリセット（エリア再オープン時に前回選択が残らないよう）
  _adpSelectedCropId = null;
  _adpPracticecrops  = [];
  _simSelectedCropId = null;
  _simDirty          = false;
  _simMemory         = {};

  // localStorage から作物選択を復元
  const areaId = area.id || area.name || '';
  const savedAnalysisCrop = localStorage.getItem(`adpCropAnalysis_${areaId}`);
  const savedWorkCropRaw  = localStorage.getItem(`adpCropWork_${areaId}`);
  if (savedAnalysisCrop) _adpSelectedCropId = savedAnalysisCrop;
  if (savedWorkCropRaw) {
    try {
      const parsed = JSON.parse(savedWorkCropRaw);
      if (Array.isArray(parsed)) {
        _adpPracticecrops = parsed;
      } else if (typeof parsed === 'string') {
        _adpPracticecrops = [{ cropId: parsed, ratio: 100 }];
      }
    } catch {
      _adpPracticecrops = [{ cropId: savedWorkCropRaw, ratio: 100 }];
    }
  }

  // 分析側の栽培方式一時値を復元（保存があれば優先、無ければマスター値にフォールバック）
  const savedAnalysisCult = localStorage.getItem(`adpCultAnalysis_${areaId}`);
  _adpAnalysisCultMode = savedAnalysisCult || _adpMasterCultMode;

  _adpEnsureView();

  // ── ヘッダー更新 ──
  const ha       = area.meta?.areaSqm ? (area.meta.areaSqm / 10000).toFixed(3) : '—';
  const climate  = area.meta?.climateName || '—';
  const soil     = area.meta?.soilType ? soilLabel(area.meta.soilType) : '土壌未設定';
  const elev     = area.meta?.elev != null ? `${Math.round(area.meta.elev)}m` : '—';
  document.getElementById('adp-title').textContent = area.name || '無名エリア';
  document.getElementById('adp-meta').textContent  = `${ha} ha　${climate}　${soil}　標高${elev}`;

  // ── fs-page を閉じてフルビューを表示 ──
  const fsPage = document.getElementById('fs-page');
  if (fsPage) {
    fsPage.classList.remove('open');
    fsPage.setAttribute('aria-hidden', 'true');
  }
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.add('hidden');
  const view = document.getElementById('adp-view');
  view.classList.add('open');

  // ── 最初のセグメント・サブタブ（実務＞カレンダー）を表示 ──
  _adpSwitchSeg('practice');
  _adpSwitchSubTab('calendar');

  // 実務側：複数作物リストを描画（復元後に呼ぶ）
  _adpRenderPracticecrops();
  if (savedAnalysisCrop) _adpUpdateCropBar('analysis', _adpCropIdToName(savedAnalysisCrop));

  // ── 復元した栽培方式（分析一時値を優先・なければマスター）を適用（currentAreaDataはこの時点で確定済み） ──
  if (currentAreaData) {
    currentAreaData.cultivationMode = _adpAnalysisCultMode;
    document.querySelectorAll('.adp-cult-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === _adpAnalysisCultMode);
    });
  }
  // ── 保存済み評価モードをUIに反映 ──
  if (area.savedEvalMode) {
    _adpSetClimateMode(_adpClimateMode);
  }

  // 🌿 土地環境系（landProfile依存・AMeDAS不要・常時表示）
  _adpRenderEnvDonut(area);
  _adpRenderLandRiskGauges(area);
  // 🌤️ 気候サマリー（AMeDAS取得前はローディング表示）
  _adpRenderClimateSummary(area);

  _adpRenderCalendar();
  _adpRenderDayRecords();
  _adpRenderSavedCalendarsList();

  // 同一エリアのキャッシュがあれば即スコア計算
  const areaKey = area.id || area.name;
  if (_adpClimateCache && _adpClimateCache._areaKey === areaKey) {
    currentAreaData.climate = { ..._adpClimateCache };
    _adpClimateLoaded = true;
    _adpRenderRanking(area);
    _adpRenderTempChart();
    _adpRenderSunshineChart();
    _adpRenderClimateSummary(area);
    return;
  }

  // AMeDAS旬別データを取得してcurrentAreaDataにマージ
  const lat = area.landProfile?.lat ?? area.meta?.lat ?? null;
  const lng = area.landProfile?.lng ?? area.meta?.lng ?? null;
  if (lat !== null && lng !== null && typeof AmedasLoader !== 'undefined') {
    try {
      const climateData = await AmedasLoader.getClimateAt(lat, lng);
      // getClimateAt() が返す decadeArr は Phenology.buildDecadeArray() 済み
      const merged = {
        ...(currentAreaData.climate || {}),
        ...climateData,
        _areaKey: areaKey,
      };
      currentAreaData.climate = merged;
      _adpClimateCache = merged;
      // AMeDAS取得完了 → 気候推定キャッシュをリセット＆モードがオンなら即再描画
      _adpClimateRanking = null;
      if (_adpClimateMode) _adpSetClimateMode(true);
    } catch(e) {
      console.warn('[ADP] AMeDAS取得失敗（ランキングは年均気温で評価）:', e);
    }
  }

  _adpClimateLoaded = true;
  _adpRenderRanking(area);
  _adpRenderTempChart();
  _adpRenderSunshineChart();
  _adpRenderClimateSummary(area);

  // 🌤️ 天気予報取得（Open-Meteo・16日）
  if (lat !== null && lng !== null) {
    _adpFetchWeather(lat, lng, area.id).then(() => _adpRenderWeatherBar());
  }
}



// ─── フルスクリーンビューを初回だけ生成 ───
function _adpEnsureView() {
  if (document.getElementById('adp-view')) return;

  const view = document.createElement('div');
  view.id        = 'adp-view';
  view.className = 'adp-view';
  view.innerHTML = `
    <!-- ヘッダー -->
    <div class="adp-view-header">
      <button class="adp-back-btn" onclick="closeAreaDetailPanel()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        <span>戻る</span>
      </button>
      <div class="adp-view-title-wrap">
        <div class="adp-title" id="adp-title"></div>
        <div class="adp-meta"  id="adp-meta"></div>
      </div>
    </div>

    <!-- セグメントコントロール（実務 / 分析） -->
    <div class="adp-nav-segment" id="adp-nav-segment">
      <button class="adp-seg-btn active" data-seg="practice"  onclick="_adpSwitchSeg('practice')">実務</button>
      <button class="adp-seg-btn"        data-seg="analysis"  onclick="_adpSwitchSeg('analysis')">分析</button>
    </div>

    <!-- 実務側：複数作物リスト＋追加ボタン -->
    <div class="adp-crop-bar adp-practice-crops-bar" id="adp-crop-bar-practice">
      <div id="adp-practice-crops-list"></div>
      <button class="adp-crop-bar-btn" onclick="_adpOpenCropSelectSheet('practice')" id="adp-crop-bar-btn-practice">
        <span class="adp-crop-bar-icon">🌱</span>
        <span class="adp-crop-bar-name" id="adp-crop-bar-name-practice">作物を追加</span>
        <span class="adp-crop-bar-arrow">＋</span>
      </button>
      <!-- 合計占有率バー（2作物以上のとき表示） -->
      <div id="adp-practice-ratio-bar" style="display:none;padding:4px 12px 6px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:3px;">
          <span>占有率合計</span><span id="adp-practice-ratio-total">0%</span>
        </div>
        <div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden;">
          <div id="adp-practice-ratio-fill" style="height:100%;border-radius:3px;background:var(--green2);transition:width .2s;width:0%;"></div>
        </div>
      </div>
    </div>

    <!-- 作物選択バー：分析用（適合度・信頼度バー付き） -->
    <div class="adp-crop-bar adp-crop-bar-analysis" id="adp-crop-bar-analysis" style="display:none;">
      <div class="adp-crop-bar-row">
        <button class="adp-crop-bar-btn" onclick="_adpOpenCropSelectSheet('analysis')" id="adp-crop-bar-btn-analysis">
          <span class="adp-crop-bar-icon">🌱</span>
          <span class="adp-crop-bar-name" id="adp-crop-bar-name-analysis">作物を選ぶ</span>
          <span class="adp-crop-bar-arrow">▼</span>
        </button>
        <button class="adp-sum-badge adp-sum-badge-btn adp-sum-badge-mode" id="adp-summary-mode"
          onclick="_adpOpenCultPopup(event)" title="栽培方式を切り替え"></button>
        <button class="adp-sum-badge adp-sum-badge-btn adp-sum-badge-eval" id="adp-summary-evalmode"
          onclick="_adpToggleEvalMode()" title="評価基準を切り替え"></button>
      </div>
      <!-- 適合度バー（選択済み時のみ表示） -->
      <div class="adp-crop-bar-bars" id="adp-crop-bar-bars" style="display:none;">
        <div class="adp-sum-row adp-sum-row-bar">
          <span class="adp-sum-bar-label">適合度</span>
          <div class="adp-sum-bar-track">
            <div class="adp-sum-bar-fill adp-sum-bar-score" id="adp-sum-score-bar" style="width:0%"></div>
          </div>
          <span class="adp-sum-bar-pct" id="adp-summary-score">—</span>
          <span class="adp-sum-bar-grade" id="adp-sum-score-grade"></span>
        </div>
        <div class="adp-sum-row adp-sum-row-bar">
          <span class="adp-sum-bar-label">信頼度</span>
          <div class="adp-sum-bar-track">
            <div class="adp-sum-bar-fill adp-sum-bar-conf" id="adp-conf-bar" style="width:0%"></div>
          </div>
          <span class="adp-sum-bar-pct" id="adp-conf-pct">—</span>
          <span class="adp-sum-bar-grade" id="adp-conf-label"></span>
        </div>
      </div>
    </div>

    <!-- サブタブバー：実務グループ -->
    <div class="adp-subtabs" id="adp-subtabs-practice">
      <button class="adp-subtab active" data-subtab="calendar"  onclick="_adpSwitchSubTab('calendar')">📅 カレンダー</button>
      <button class="adp-subtab"        data-subtab="fert"      onclick="_adpSwitchSubTab('fert')">🧪 施肥</button>
      <button class="adp-subtab"        data-subtab="risk"      onclick="_adpSwitchSubTab('risk')">⚠️ リスク</button>
    </div>

    <!-- サブタブバー：分析グループ（初期非表示） -->
    <div class="adp-subtabs" id="adp-subtabs-analysis" style="display:none;">
      <button class="adp-subtab" data-subtab="ranking"   onclick="_adpSwitchSubTab('ranking')">🏆 ランキング</button>
      <button class="adp-subtab" data-subtab="growth"    onclick="_adpSwitchSubTab('growth')">📈 生育期間</button>
      <button class="adp-subtab" data-subtab="tempchart" onclick="_adpSwitchSubTab('tempchart')">🌡️ 適温グラフ</button>
      <button class="adp-subtab" data-subtab="match"     onclick="_adpSwitchSubTab('match')">📊 適合度</button>
    </div>

    <!-- コンテンツ領域 -->
    <div class="adp-view-body">

      <!-- ① 🏆 ランキング（条件設定／適合度ランキング／収益ランキング／収益シミュレーターの4サブタブ） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-ranking">

        <!-- ランキングタブ内ネストサブタブバー -->
        <div class="adp-rk-subtabs" id="adp-rk-subtabs">
          <button class="adp-rk-subtab active" data-rk-pane="cond"   onclick="_adpRkSwitchPane('cond')">条件設定</button>
          <button class="adp-rk-subtab"        data-rk-pane="match"  onclick="_adpRkSwitchPane('match')">適合度ランキング</button>
          <button class="adp-rk-subtab"        data-rk-pane="profit" onclick="_adpRkSwitchPane('profit')">収益ランキング</button>
          <button class="adp-rk-subtab"        data-rk-pane="sim"    onclick="_adpRkSwitchPane('sim')">収益シミュレーター</button>
        </div>

        <!-- 1) 条件設定（枠組みのみ・Step4で常設フォームを実装） -->
        <div class="adp-rk-pane" id="adp-rk-pane-cond">
          <div id="adp-rk-cond-wrap"></div>
        </div>

        <!-- 2) 適合度ランキング（旧adp-ranking-dialogの中身をそのまま移植） -->
        <div class="adp-rk-pane" id="adp-rk-pane-match" style="display:none;">
          <div class="adp-rk-match-controls">
            <div class="cr-tabs-major" id="cr-tabs-major">
              <button class="cr-tab-major active" data-major="all"       onclick="crSwitchMajor('all')">すべて</button>
              <button class="cr-tab-major"        data-major="grain"     onclick="crSwitchMajor('grain')">穀物・豆類</button>
              <button class="cr-tab-major"        data-major="vegetable" onclick="crSwitchMajor('vegetable')">野菜</button>
              <button class="cr-tab-major"        data-major="fruit"     onclick="crSwitchMajor('fruit')">果物</button>
              <button class="cr-tab-major"        data-major="wild"      onclick="crSwitchMajor('wild')">山菜・草</button>
              <button class="cr-tab-major"        data-major="forest"    onclick="crSwitchMajor('forest')">林産</button>
              <button class="cr-tab-major"        data-major="oil"       onclick="crSwitchMajor('oil')">油脂</button>
              <button class="cr-tab-major"        data-major="fiber"     onclick="crSwitchMajor('fiber')">繊維</button>
            </div>
            <div class="cr-tabs-minor" id="cr-tabs-minor" style="display:none;"></div>
            <button class="adp-rk-cond-shortcut" onclick="_adpRkSwitchPane('cond')">⚙️ 条件設定</button>
          </div>
          <div id="crop-ranking"><div class="empty-mini">計算中...</div></div>
        </div>

        <!-- 3) 収益ランキング -->
        <div class="adp-rk-pane" id="adp-rk-pane-profit" style="display:none;">
          <div class="adp-rk-match-controls">
            <div class="cr-tabs-major" id="cr-tabs-major-profit">
              <button class="cr-tab-major active" data-major="all"       onclick="crSwitchMajor('all')">すべて</button>
              <button class="cr-tab-major"        data-major="grain"     onclick="crSwitchMajor('grain')">穀物・豆類</button>
              <button class="cr-tab-major"        data-major="vegetable" onclick="crSwitchMajor('vegetable')">野菜</button>
              <button class="cr-tab-major"        data-major="fruit"     onclick="crSwitchMajor('fruit')">果物</button>
              <button class="cr-tab-major"        data-major="wild"      onclick="crSwitchMajor('wild')">山菜・草</button>
              <button class="cr-tab-major"        data-major="forest"    onclick="crSwitchMajor('forest')">林産</button>
              <button class="cr-tab-major"        data-major="oil"       onclick="crSwitchMajor('oil')">油脂</button>
              <button class="cr-tab-major"        data-major="fiber"     onclick="crSwitchMajor('fiber')">繊維</button>
            </div>
            <div class="cr-tabs-minor" id="cr-tabs-minor-profit" style="display:none;"></div>
            <button class="adp-rk-cond-shortcut" onclick="_adpRkSwitchPane('cond')">⚙️ 条件設定</button>
          </div>
          <div id="crop-ranking-profit"><div class="empty-mini">計算中...</div></div>
        </div>

        <!-- 4) 収益シミュレーター（枠組みのみ・Step5で実装） -->
        <div class="adp-rk-pane" id="adp-rk-pane-sim" style="display:none;">
          <div id="adp-rk-sim-wrap" class="empty-mini">収益シミュレーターは準備中です（Step5で実装）。</div>
        </div>

      </div>


      <!-- ② 生育期間（ネストサブタブ：暦グラフ／ガント／GDD／適期マップ／方式比較） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-growth" style="display:none;">

        <!-- 生育期間タブ内ネストサブタブバー -->
        <div class="adp-growth-subtabs" id="adp-growth-subtabs">
          <button class="adp-growth-subtab active" data-growth-pane="calendar" onclick="_adpGrowthSwitchSubTab('calendar')">📅 暦グラフ</button>
          <button class="adp-growth-subtab"        data-growth-pane="gantt"    onclick="_adpGrowthSwitchSubTab('gantt')">📊 ガント</button>
          <button class="adp-growth-subtab"        data-growth-pane="gdd"      onclick="_adpGrowthSwitchSubTab('gdd')">🌡️ GDD</button>
          <button class="adp-growth-subtab"        data-growth-pane="heatmap"  onclick="_adpGrowthSwitchSubTab('heatmap')">🗺️ 適期マップ</button>
          <button class="adp-growth-subtab"        data-growth-pane="compare"  onclick="_adpGrowthSwitchSubTab('compare')">⚖️ 方式比較</button>
        </div>

        <!-- 1) 暦グラフ（DBカレンダー上段 ＋ 気候推定下段・既存仕様のまま） -->
        <div class="adp-growth-pane" id="adp-growth-pane-calendar">
          <div class="adp-chart-sticky">

            <!-- 上段: DB登録カレンダー -->
            <div class="adp-temp-chart-header">
              <span class="adp-temp-chart-sub" id="adp-growth-db-sub">作物を選択するとDB登録の播種・育苗・定植・収穫を表示</span>
            </div>
            <div class="adp-temp-chart-wrap adp-growth-chart-wrap">
              <canvas id="adp-growth-db-canvas"></canvas>
            </div>
            <div class="adp-temp-legend" id="adp-growth-db-legend"></div>

            <!-- 下段: 気候推定（Phenology/GDD） -->
            <div class="adp-temp-chart-header">
              <span class="adp-temp-chart-sub" id="adp-growth-est-sub">作物を選択すると気候推定（GDD）による播種/定植適期・収穫予測を表示</span>
            </div>
            <div class="adp-temp-chart-wrap adp-growth-chart-wrap">
              <canvas id="adp-growth-est-canvas"></canvas>
            </div>
            <div class="adp-temp-legend" id="adp-growth-est-legend"></div>

          </div>
        </div>

        <!-- 2) 生育ステージ・ガントチャート -->
        <div class="adp-growth-pane" id="adp-growth-pane-gantt" style="display:none;">
          <!-- DB暦 / 気候推定 切替トグル -->
          <div class="adp-gantt-toggle-wrap">
            <button class="adp-gantt-toggle-btn" id="adp-gantt-mode-est"
                    onclick="_adpGanttSetMode('est')" data-gantt-mode="est">🌡️ 気候推定</button>
            <button class="adp-gantt-toggle-btn" id="adp-gantt-mode-db"
                    onclick="_adpGanttSetMode('db')"  data-gantt-mode="db">📋 DB暦</button>
          </div>
          <!-- ガントチャート本体 -->
          <div class="adp-gantt-chart-wrap">
            <canvas id="adp-gantt-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-gantt-legend"></div>
        </div>

        <!-- 3) GDD積算専用グラフ -->
        <div class="adp-growth-pane" id="adp-growth-pane-gdd" style="display:none;">
          <div class="adp-gdd-chart-wrap">
            <canvas id="adp-gdd-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-gdd-legend"></div>
        </div>

        <!-- 4) 旬別適期ヒートマップ -->
        <div class="adp-growth-pane" id="adp-growth-pane-heatmap" style="display:none;">
          <div class="adp-heatmap-wrap">
            <canvas id="adp-heatmap-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-heatmap-legend"></div>
        </div>

        <!-- 5) 栽培方式別 収穫予測比較バー -->
        <div class="adp-growth-pane" id="adp-growth-pane-compare" style="display:none;">
          <div class="adp-compare-chart-wrap">
            <canvas id="adp-compare-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-compare-legend"></div>
        </div>

      </div>

      <!-- ③ 適温グラフ（気候サマリー＋気温チャート＋旬別日照チャート。旧ランキング内ネストタブ「グラフ」から最上位タブへ復帰） -->
      <div class="adp-pane adp-pane-combined" id="adp-pane-tempchart" style="display:none;">
        <div class="adp-chart-sticky">
          <!-- 🌤️ 気候サマリー（年均気温・年降水量・年間日照・標高+pH／気候帯） -->
          <div id="adpc-climate-summary" class="adpc-climate-summary-wrap"></div>

          <div class="adp-temp-chart-header">
            <span class="adp-temp-chart-sub" id="adp-temp-chart-sub">作物を選択すると適正温度を重畳表示</span>
          </div>
          <div class="adp-temp-chart-wrap">
            <canvas id="adp-temp-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-temp-legend"></div>

          <!-- ☀️ 旬別日照チャート -->
          <div class="adp-temp-chart-header">
            <span class="adp-temp-chart-sub" id="adp-sun-chart-sub">旬別日照時間</span>
          </div>
          <div class="adp-temp-chart-wrap adp-sun-chart-wrap">
            <canvas id="adp-sun-canvas"></canvas>
          </div>
          <div class="adp-temp-legend" id="adp-sun-legend"></div>
        </div>
      </div>

      <!-- ④ 施肥（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-fert" style="display:none;">
        <div id="fert-result" class="empty-mini">作物を選択すると施肥概算が表示されます。</div>
      </div>

      <!-- ⑤ リスク（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-risk" style="display:none;">
        <!-- ⚠️ 土地環境リスク（浸水・干ばつ・積雪／作物選択なしでも常時表示） -->
        <div id="adpc-risk-gauges-fixed" class="adpc-fixed-section"></div>
        <div id="risk-result" class="empty-mini">作物を選択するとリスク・注意点が表示されます。</div>
      </div>

      <!-- ⑥ カレンダー（記録カレンダー ↔ 栽培ごよみ セグメント切替） -->
      <div class="adp-pane" id="adp-pane-calendar" style="display:none;">
        <!-- セグメント切替 -->
        <div class="adp-cal-segment-bar">
          <button class="adp-cal-seg-btn active" id="adp-cal-seg-visit"
                  onclick="_adpSwitchCalSegment('visit')">📅 記録カレンダー</button>
          <button class="adp-cal-seg-btn" id="adp-cal-seg-growth"
                  onclick="_adpSwitchCalSegment('growth')">🌱 栽培ごよみ</button>
        </div>

        <!-- 記録カレンダーセクション -->
        <div class="adp-cal-visit-wrap" id="adp-cal-visit-wrap">
          <!-- まもなくの予定バナー -->
          <div id="adp-cal-upcoming-banner"></div>
          <!-- 上部操作バー：音声入力 ＋ グリッド／リスト切替 -->
          <div class="adp-cal-top-bar">
            <div class="vm-cal-header" id="vm-cal-header-wrap"></div>
            <div class="adp-cal-view-toggle">
              <button class="adp-cal-view-btn active" id="adp-cal-view-grid"
                      onclick="_adpSetCalView('grid')">📅 カレンダー</button>
              <button class="adp-cal-view-btn" id="adp-cal-view-list"
                      onclick="_adpSetCalView('list')">📋 リスト</button>
            </div>
          </div>
          <!-- まとめカード（リスト表示時のみJS側で描画） -->
          <div id="adp-cal-summary-card"></div>
          <div id="adp-calendar-wrap"></div>
          <div id="adp-day-records-wrap"></div>
        </div>

        <!-- 栽培ごよみセクション -->
        <div class="adp-cal-growth-wrap" id="adp-cal-growth-wrap" style="display:none;">
          <div id="calendar-result" class="empty-mini">作物を選択すると生育カレンダーが表示されます。</div>
          <div id="adp-saved-calendars-wrap"></div>
        </div>
      </div>

      <!-- ⑦ 適合度（Phase3で実装） -->
      <div class="adp-pane" id="adp-pane-match" style="display:none;">
        <!-- 🌿 土地環境適合度ドーナツ（作物選択なしでも常時表示） -->
        <div id="adpc-env-donut-fixed" class="adpc-fixed-section"></div>
        <div id="conf-detail" class="empty-mini" style="font-size:11px;color:var(--text2);line-height:1.8;">作物を選択するとエリア適合度の詳細が表示されます。</div>

        <!-- 分析対象作物のプレビュー（実務タブの選択とは独立。分析で選択中の作物／未選択時はランキング1位を表示） -->
        <div class="adp-temp-chart-header">
          <span class="adp-temp-chart-sub">🧪 施肥概算（分析対象作物）</span>
        </div>
        <div id="fert-result-analysis" class="empty-mini">作物を選択すると施肥概算が表示されます。</div>

        <div class="adp-temp-chart-header">
          <span class="adp-temp-chart-sub">⚠️ リスク・注意点（分析対象作物）</span>
        </div>
        <div id="risk-result-analysis" class="empty-mini">作物を選択するとリスク・注意点が表示されます。</div>

        <div class="adp-temp-chart-header">
          <span class="adp-temp-chart-sub">📅 栽培ごよみ（分析対象作物）</span>
        </div>
        <div id="calendar-result-analysis" class="empty-mini">作物を選択すると栽培ごよみが表示されます。</div>
      </div>

    </div>

    <!-- 栽培方式切替ポップアップ（サマリーバッジタップ用） -->
    <div id="adp-cult-popup" class="adp-cult-popup" style="display:none;" onclick="_adpCloseCultPopup()">
      <div class="adp-cult-popup-inner" onclick="event.stopPropagation()">
        <div class="adp-cult-popup-title">🌡️ 栽培方式を選ぶ</div>
        <button class="adp-cult-popup-btn" data-mode="openField"        onclick="_adpCultPopupSelect('openField')">🌾 露地</button>
        <button class="adp-cult-popup-btn" data-mode="greenhouse"       onclick="_adpCultPopupSelect('greenhouse')">🏠 ハウス</button>
        <button class="adp-cult-popup-btn" data-mode="heatedGreenhouse" onclick="_adpCultPopupSelect('heatedGreenhouse')">🔥 加温ハウス</button>
      </div>
    </div>

  `;
  document.body.appendChild(view);
}

function _adpCloseRankingDialog() {
  const dlg = document.getElementById('adp-ranking-dialog');
  if (!dlg) return;
  dlg.classList.remove('open');
  dlg.setAttribute('aria-hidden', 'true');
  _adpRankingDlgPane = null;
}

// ─── サマリーバッジ：栽培方式ポップアップ ───
function _adpOpenCultPopup(event) {
  const popup = document.getElementById('adp-cult-popup');
  if (!popup) return;
  // 現在の方式を active 反映（分析一時値を表示。マスターではない）
  const cur = _adpAnalysisCultMode || 'openField';
  popup.querySelectorAll('.adp-cult-popup-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === cur);
  });
  popup.style.display = 'flex';
}
function _adpCloseCultPopup() {
  const popup = document.getElementById('adp-cult-popup');
  if (popup) popup.style.display = 'none';
}
function _adpCultPopupSelect(mode) {
  _adpCloseCultPopup();
  _adpSwitchCultivation(mode);
}

// ─── サマリーバッジ：評価基準トグル（DB ↔ 気候）───
function _adpToggleEvalMode() {
  _adpSetClimateMode(!_adpClimateMode);
}

// ─── 評価モード切替（DB ↔ 気候推定） ───
function _adpSetClimateMode(isClimate) {
  _adpClimateMode = isClimate;
  _awSaveFarmCond();              // 評価モードをエリアごとに永続化

  // トグルボタン active 同期（サマリーバー／条件設定タブの両方を含む全インスタンス）
  document.querySelectorAll('.adp-eval-mode-btn').forEach(btn => {
    const isDb = btn.dataset.eval === 'db';
    btn.classList.toggle('active', isDb ? !isClimate : isClimate);
  });

  // 気候ボタンのラベルをエリア名に更新（サマリーバー／条件設定タブの両方に反映）
  const areaName = currentAreaData?.name;
  document.querySelectorAll('.adp-eval-climate-label').forEach(clLabel => {
    clLabel.textContent = areaName ? `${areaName}の気候` : 'エリア気候';
  });

  // 気候推定モード時はランキングキャッシュを生成
  if (isClimate && !_adpClimateRanking) {
    const decadeArr = currentAreaData?.climate?.decadeArr
                   ?? _adpClimateCache?.decadeArr
                   ?? null;
    if (decadeArr && typeof CROP_DB !== 'undefined' && typeof computeClimateRanking === 'function') {
      const _crCultMode = currentAreaData?.cultivationMode || 'openField';
      _adpClimateRanking = computeClimateRanking(decadeArr, CROP_DB, _crCultMode);
    } else if (!decadeArr) {
      console.warn('[ClimateMode] decadeArr未取得 — AMeDASデータ待ち');
    }
  }

  // グラフを独立して再描画（モードに応じたデータで）
  setTimeout(() => {
    _adpRenderTempChart(_adpSelectedCropId);
    _adpRenderGrowthChart(_adpSelectedCropId);
  }, 20);

  // 常時再描画（サマリーバー操作なので常にアクティブ）
  _adpRenderRankingList();
  _adpRenderGrowthRankingList();
  // 選択作物が存在する場合は全タブも更新
  if (_adpSelectedCropId) {
    _adpSelectCropForAnalysis(_adpSelectedCropId);
  }
}

// ─── 条件編集ショートカット（サマリーバー行1 → ランキング>条件設定タブへジャンプ） ───
function _adpJumpToCondTab() {
  _adpSwitchSubTab('ranking');
  _adpRkSwitchPane('cond');
}

// ─── サブタブ切替（8タブ構成） ───
const ADP_SUBTAB_KEYS = ['ranking', 'growth', 'tempchart', 'fert', 'risk', 'calendar', 'match'];

// セグメント → 所属タブのマッピング
const ADP_SEG_TABS = {
  practice: ['calendar', 'fert', 'risk'],
  analysis: ['ranking', 'growth', 'tempchart', 'match'],
};

let _adpCurrentSeg = 'practice'; // 現在のセグメント（デフォルト実務）

/**
 * _adpSwitchSeg(seg)
 * セグメント（分析/実務）を切り替える。
 * そのセグメントの先頭タブを自動選択する。
 */
function _adpSwitchSeg(seg) {
  _adpCurrentSeg = seg;

  // セグメントボタン active 切り替え
  document.querySelectorAll('.adp-seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.seg === seg);
  });

  // タブバー表示切り替え
  const analysisBar = document.getElementById('adp-subtabs-analysis');
  const practiceBar = document.getElementById('adp-subtabs-practice');
  if (analysisBar) analysisBar.style.display = (seg === 'analysis') ? '' : 'none';
  if (practiceBar) practiceBar.style.display = (seg === 'practice') ? '' : 'none';

  // 作物バー切り替え
  const cropBarPractice = document.getElementById('adp-crop-bar-practice');
  const cropBarAnalysis = document.getElementById('adp-crop-bar-analysis');
  if (cropBarPractice) cropBarPractice.style.display = (seg === 'practice') ? '' : 'none';
  if (cropBarAnalysis) cropBarAnalysis.style.display = (seg === 'analysis') ? '' : 'none';

  // そのセグメントの先頭タブへ切り替え
  const firstTab = (ADP_SEG_TABS[seg] || [])[0];
  if (firstTab) _adpSwitchSubTab(firstTab);
}

let _adpCurrentSubTab = 'ranking'; // 現在のサブタブ

function _adpSwitchSubTab(name) {
  _adpCurrentSubTab = name;

  // セグメント自動同期：外部から直接タブ名で呼ばれた場合に正しいバーを表示する
  const _seg = Object.keys(ADP_SEG_TABS).find(s => ADP_SEG_TABS[s].includes(name));
  if (_seg && _seg !== _adpCurrentSeg) {
    _adpCurrentSeg = _seg;
    document.querySelectorAll('.adp-seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.seg === _seg);
    });
    const analysisBar = document.getElementById('adp-subtabs-analysis');
    const practiceBar = document.getElementById('adp-subtabs-practice');
    if (analysisBar) analysisBar.style.display = (_seg === 'analysis') ? '' : 'none';
    if (practiceBar) practiceBar.style.display = (_seg === 'practice') ? '' : 'none';
    // 作物バー切り替え
    const cropBarPractice = document.getElementById('adp-crop-bar-practice');
    const cropBarAnalysis = document.getElementById('adp-crop-bar-analysis');
    if (cropBarPractice) cropBarPractice.style.display = (_seg === 'practice') ? '' : 'none';
    if (cropBarAnalysis) cropBarAnalysis.style.display = (_seg === 'analysis') ? '' : 'none';
  }

  // タブボタン
  document.querySelectorAll('.adp-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  // ペイン
  ADP_SUBTAB_KEYS.forEach(p => {
    const el = document.getElementById('adp-pane-' + p);
    if (!el) return;
    const visible = (p === name);
    if (el.classList.contains('adp-pane-combined')) {
      el.style.display = visible ? 'flex' : 'none';
    } else {
      el.style.display = visible ? '' : 'none';
    }
  });
  // グラフペインを表示したときに再描画（offsetWidth が 0→正常になるため）
  if (name === 'growth') {
    // 栽培方式トグルは条件設定タブが単一管理元のため、active状態のみ同期
    const currentMode = currentAreaData?.cultivationMode || 'openField';
    document.querySelectorAll('.adp-cult-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });
    setTimeout(() => _adpRenderGrowthChart(_adpSelectedCropId), 30);
  }
  // 適温グラフペインを表示したときに再描画（offsetWidth が 0→正常になるため）
  if (name === 'tempchart') {
    setTimeout(() => {
      _adpRenderTempChart(_adpSelectedCropId);
      _adpRenderSunshineChart();
    }, 30);
  }
  if (name === 'calendar') {
    // マイクボタン注入（voiceMemo.js）
    const hdr = document.getElementById('vm-cal-header-wrap');
    if (hdr && typeof vmMicButtonHTML === 'function' && !document.getElementById('vm-mic-btn')) {
      hdr.innerHTML = vmMicButtonHTML();
    }
    // セグメント・ビューモードをリセット（記録カレンダーをデフォルト表示）
    _adpSwitchCalSegment('visit');
    _adpCalView = 'grid';
    document.getElementById('adp-cal-view-grid')?.classList.add('active');
    document.getElementById('adp-cal-view-list')?.classList.remove('active');
    _adpRenderCalendar();
    _adpRenderDayRecords();
    _adpRenderSavedCalendarsList();
    // 実務作物リストで栽培ごよみを事前描画（growthセグメントへ切替時に即表示できるよう）
    if (typeof _renderCalendarMulti === 'function') {
      _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
    }
  }
  // ── 作物選択済み時の各ペイン再描画 ──
  if (_adpPracticecrops.length > 0) {
    if (name === 'fert') {
      if (typeof _renderFertResultMulti === 'function') _renderFertResultMulti(_adpPracticecrops);
    }
    if (name === 'risk') {
      if (typeof _renderRiskResultMulti === 'function') _renderRiskResultMulti(_adpPracticecrops);
    }
  }
}

// ─── 🏆ランキングタブ内サブタブ切替（4分割：条件設定/適合度ランキング/収益ランキング/シミュレーター） ───
const ADP_RK_PANE_KEYS = ['cond', 'match', 'profit', 'sim'];
let _adpRkCurrentPane  = 'cond'; // 現在のランキング内サブタブ

// ─── 収益シミュレーター用モジュール変数 ───
let _simSelectedCropId = null;   // シミュレーターで選択中の作物ID
let _simDirty          = false;  // 未保存変更フラグ
let _simMemory         = {};     // 作物ごとの入力キャッシュ（同一セッション内保持）

function _adpRkSwitchPane(paneKey) {
  // 未保存変更がある場合の離脱確認（simペインから離れる際）
  if (_adpRkCurrentPane === 'sim' && paneKey !== 'sim' && _simDirty) {
    showConfirmDialog('未保存の変更があります。破棄してよろしいですか？', '破棄する', 'キャンセル', false).then(ok => {
      if (!ok) return;
      _simDirty = false;
      delete _simMemory[_simSelectedCropId];
      _adpRkCurrentPane = paneKey;
      _adpRkRenderPane(paneKey);
    });
    return;
  }

  _adpRkCurrentPane = paneKey;

  // タブボタン
  document.querySelectorAll('.adp-rk-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.rkPane === paneKey);
  });
  // ペイン
  ADP_RK_PANE_KEYS.forEach(p => {
    const el = document.getElementById('adp-rk-pane-' + p);
    if (!el) return;
    el.style.display = (p === paneKey) ? '' : 'none';
  });

  // 適合度ランキングペイン表示時にリスト再描画
  if (paneKey === 'match') {
    _adpRenderRankingList();
  }
  // 条件設定ペイン表示時に描画
  if (paneKey === 'cond') {
    _awRenderConditions();
  }
  // 収益ランキング描画
  if (paneKey === 'profit') {
    _adpRenderProfitRankingList();
  }
  // 収益シミュレーター描画
  if (paneKey === 'sim') {
    _adpRenderProfitSimulator();
  }

}
// ─── 収益ランキングリスト描画（サブタブ4） ───
/**
 * _adpRenderProfitRankingList()
 *
 * データソース：_crScores（_adpRenderRankingList()で常時更新済み）
 * viable=true の作物を averageProfit 降順で上位20件表示。
 * farmCond.sales === 'self'（自家消費）の除外はStep4で有効化。
 */
function _adpRenderProfitRankingList() {
  const el = document.getElementById('crop-ranking-profit');
  if (!el) return;

  // カテゴリーフィルター適用済みスコアを取得
  const allScores = (typeof _crScores !== 'undefined') ? _crScores : [];
  if (!allScores.length) {
    el.innerHTML = '<div class="empty-mini">エリアを選択するとランキングが表示されます。</div>';
    return;
  }

  // viable のみ・自家消費除外・カテゴリーフィルター適用・averageProfit 降順・上位20件
  const isSelf = (_awFarmCond && _awFarmCond.sales === 'self');
  const filtered = (typeof _crFilteredScores === 'function') ? _crFilteredScores() : allScores;
  const sorted = [...filtered]
    .filter(s => s.viable && s.profitability && !isSelf)
    .sort((a, b) => b.profitability.averageProfit - a.profitability.averageProfit)
    .slice(0, 20);

  if (!sorted.length) {
    el.innerHTML = isSelf
      ? '<div class="empty-mini">販売先が「自家消費」のため収益ランキングは表示されません。<br>条件設定から販売先を変更してください。</div>'
      : '<div class="empty-mini">適合する作物がありません。</div>';
    return;
  }

  const fmt = n => Math.round(n).toLocaleString('ja-JP');
  const fmtKg = n => Math.round(n).toLocaleString('ja-JP');

  // 適合度ランキング順位テーブルを事前生成（全スコア対象）
  const matchRankMap = new Map(
    allScores.filter(x => x.viable)
      .sort((a, b) => b.score - a.score)
      .map((x, i) => [x.crop.id, i + 1])
  );

  el.innerHTML = sorted.map((s, idx) => {
    const p          = s.profitability;
    const profit     = p.averageProfit;
    const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
    const profitSign  = profit >= 0 ? '+' : '';
    const isSelected  = s.crop.id === _adpSelectedCropId;

    const matchRank  = matchRankMap.get(s.crop.id) ?? '–';
    const profitRank = idx + 1;
    const diff       = (typeof matchRank === 'number') ? matchRank - profitRank : null;
    const diffLabel  = diff === null ? '–' : diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : '–';
    const diffClass  = diff === null ? 'rank-same' : diff > 0 ? 'rank-up' : diff < 0 ? 'rank-down' : 'rank-same';

    const detailId = `adp-profit-detail-${idx}`;
    return `
      <div class="adp-rk-profit-card${isSelected ? ' selected' : ''}"
           onclick="adpCropTap(this, '${s.crop.id}')">
        <div class="adp-rk-profit-card-header">
          <span class="adp-rk-profit-rank">#${profitRank}</span>
          <span class="adp-rk-profit-name">${s.crop.name}</span>
          <span class="adp-rk-profit-amount ${profitClass}">${profitSign}${fmt(profit)} 円</span>
          <span class="adp-rk-profit-diff ${diffClass}" title="適合度順位との差">適合#${matchRank} ${diffLabel}</span>
          <span class="adp-rk-toggle" onclick="
            event.stopPropagation();
            const d=document.getElementById('${detailId}');
            d.style.display = d.style.display==='none' ? '' : 'none';
            this.textContent = d.style.display==='' ? '▲' : '▼';
          ">▼</span>
        </div>
        <div class="adp-rk-profit-detail" id="${detailId}" style="display:none;">
          <table class="adp-rk-profit-table">
            <tr class="adp-rk-profit-yield-row"><th>基準収量</th><td>${Math.round(p.baseYield ?? 0).toLocaleString('ja-JP')} kg</td>
                <td class="adp-rk-sub">DB標準値 × ${p.area10a?.toFixed(2)} 10a</td></tr>
            <tr class="adp-rk-profit-yield-row"><th>補正係数</th><td class="${(p.yieldCorrectionFactor ?? 1) >= 1 ? 'profit-positive' : (p.yieldCorrectionFactor ?? 1) >= 0.75 ? '' : 'profit-negative'}">${Math.round((p.yieldCorrectionFactor ?? 1) * 100)}%</td>
                <td class="adp-rk-sub">適合率 × 栽培方式 × 気温乖離</td></tr>
            <tr class="adp-rk-profit-yield-row"><th>予測収量</th><td>${Math.round(p.predictedYield ?? 0).toLocaleString('ja-JP')} kg</td>
                <td class="adp-rk-sub">基準 × 補正係数</td></tr>
            <tr class="adp-rk-profit-yield-row"><th>出荷率</th><td>${Math.round((p.marketableYieldRate ?? 0) * 100)}%</td>
                <td class="adp-rk-sub">→ 出荷量 ${Math.round(p.marketableYield ?? 0).toLocaleString('ja-JP')} kg</td></tr>
            <tr><th>収入</th><td class="profit-positive">+${fmt(p.revenue)} 円</td>
                <td class="adp-rk-sub">出荷量 ${fmtKg(p.marketableYield)} kg × ${fmt(p.averagePrice)} 円/kg</td></tr>
            <tr><th>種苗費</th><td>−${fmt(p.seedCost)} 円</td><td></td></tr>
            <tr><th>資材費</th><td>−${fmt(p.materialCost)} 円</td><td></td></tr>
            <tr><th>機械費</th><td>−${fmt(p.machineCost)} 円</td><td></td></tr>
            <tr><th>労働費</th><td>−${fmt(p.laborCost)} 円</td><td></td></tr>
            <tr><th>初期償却費</th><td>−${fmt(p.amortizedInitialCost)} 円</td>
                <td class="adp-rk-sub">${p.amortYears}年償却</td></tr>
            <tr><th>リスク控除</th><td>−${fmt(p.riskDeduction)} 円</td>
                <td class="adp-rk-sub">${Math.round(p.riskDeductionRate * 100)}%</td></tr>
            <tr class="adp-rk-profit-total">
              <th>純利益</th>
              <td class="${profitClass}">${profitSign}${fmt(profit)} 円</td>
              <td class="adp-rk-sub">${p.area10a.toFixed(2)} 反換算</td>
            </tr>
          </table>
        </div>
      </div>`;
  }).join('');
}

// ─── サマリーバー更新（条件設定タブ先頭の作物名表示も同期） ───
function _adpEvalModeLabel() {
  return _adpClimateMode ? '🌿 気候' : '📊 DB';
}
function _awSelectedCropName() {
  if (!_adpSelectedCropId) return null;
  const scoreEntry = (typeof _crScores !== 'undefined')
    ? _crScores.find(s => s.crop.id === _adpSelectedCropId) : null;
  const crop = scoreEntry?.crop
    ?? (typeof CROP_DB !== 'undefined'
        ? (CROP_DB.find ? CROP_DB.find(c => c.id === _adpSelectedCropId)
          : Object.values(CROP_DB).flat().find(c => c.id === _adpSelectedCropId))
        : null);
  return crop?.name ?? null;
}
function _adpUpdateSummaryBar({ cropName, areaName, score, mode, evalMode, confPct, confLabel } = {}) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.textContent = val; };

  const hasCrop = cropName != null && cropName !== '—' && cropName !== '';

  // 分析用作物バー更新
  _adpUpdateCropBar('analysis', hasCrop ? cropName : null);

  // 適合度・信頼度バーの表示切り替え（分析セグメントのみ）
  const barsEl = document.getElementById('adp-crop-bar-bars');
  if (barsEl) barsEl.style.display = hasCrop ? '' : 'none';

  if (!hasCrop) {
    // 条件設定タブ先頭の作物選択ボタン表示を同期
    set('adp-rk-cond-crop-name', '🌱 作物を選ぶ');
    // バッジボタンは作物未選択でも現在の設定を常時表示する
    const _cultLabels = { openField:'露地', greenhouse:'ハウス', heatedGreenhouse:'加温' };
    const _curMode = currentAreaData?.cultivationMode || 'openField';
    const _mEl = document.getElementById('adp-summary-mode');
    const _eEl = document.getElementById('adp-summary-evalmode');
    if (_mEl) _mEl.textContent = (_cultLabels[_curMode] ?? '露地') + ' ▸';
    if (_eEl) _eEl.textContent = (_adpClimateMode ? '🌿 気候' : '📊 DB') + ' ▸';
    return;
  }

  // バッジボタン：テキスト＋操作可能を示す ▸ 付きで更新
  const setBadge = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null) el.textContent = val + ' ▸';
  };
  setBadge('adp-summary-mode',     mode);
  setBadge('adp-summary-evalmode', evalMode);

  // 適合度バー
  const scoreNum = score != null ? Number(score) : null;
  const scoreBar = document.getElementById('adp-sum-score-bar');
  const scoreEl  = document.getElementById('adp-summary-score');
  const gradeEl  = document.getElementById('adp-sum-score-grade');
  if (scoreNum != null) {
    if (scoreBar) scoreBar.style.width = scoreNum + '%';
    if (scoreEl)  scoreEl.textContent  = scoreNum + '%';
    const gradeColor = scoreNum >= 70 ? 'var(--green)' : scoreNum >= 40 ? 'var(--amber)' : 'var(--red)';
    if (scoreBar) scoreBar.style.background = gradeColor;
    if (scoreEl)  scoreEl.style.color       = gradeColor;
    if (gradeEl) {
      gradeEl.textContent = scoreNum >= 70 ? '適合' : scoreNum >= 40 ? '要検討' : '不適';
      gradeEl.style.color = gradeColor;
    }
  }

  // 信頼度バー
  const confNum = confPct != null ? parseInt(confPct) : null;
  const confBar  = document.getElementById('adp-conf-bar');
  const confPctEl = document.getElementById('adp-conf-pct');
  const confLblEl = document.getElementById('adp-conf-label');
  if (confNum != null) {
    if (confBar)   confBar.style.width    = confNum + '%';
    if (confPctEl) confPctEl.textContent  = confNum + '%';
  }
  const confJa = confNum == null ? '—'
    : confNum >= 75 ? '高い'
    : confNum >= 50 ? '普通'
    : confNum >= 25 ? '低い'
    : 'とても低い';
  if (confLblEl) confLblEl.textContent = confJa;

  // 条件設定タブ先頭の作物選択ボタン表示を同期
  set('adp-rk-cond-crop-name', cropName ?? '🌱 作物を選ぶ');
}

/**
 * 作物選択バーの表示を更新する
 * @param {'analysis'|'practice'} seg
 * @param {string|null} cropName  null = 未選択状態に戻す
 */
function _adpUpdateCropBar(seg, cropName) {
  const nameEl = document.getElementById(`adp-crop-bar-name-${seg}`);
  const iconEl = nameEl?.closest('.adp-crop-bar-btn')?.querySelector('.adp-crop-bar-icon');
  const btnEl  = document.getElementById(`adp-crop-bar-btn-${seg}`);
  if (!nameEl) return;
  if (cropName) {
    nameEl.textContent = cropName;
    if (iconEl) iconEl.textContent = '🌿';
    if (btnEl)  btnEl.classList.add('selected');
  } else {
    nameEl.textContent = '作物を選ぶ';
    if (iconEl) iconEl.textContent = '🌱';
    if (btnEl)  btnEl.classList.remove('selected');
  }
}

// ─── カレンダー表示モード ───
let _adpCalView = 'grid'; // 'grid' | 'list'

// ─── カレンダーセグメント ───
let _adpCalSegment = 'visit'; // 'visit' | 'growth'

function _adpSwitchCalSegment(seg) {
  _adpCalSegment = seg;
  document.getElementById('adp-cal-seg-visit')?.classList.toggle('active', seg === 'visit');
  document.getElementById('adp-cal-seg-growth')?.classList.toggle('active', seg === 'growth');
  const visitWrap  = document.getElementById('adp-cal-visit-wrap');
  const growthWrap = document.getElementById('adp-cal-growth-wrap');
  if (visitWrap)  visitWrap.style.display  = seg === 'visit'  ? '' : 'none';
  if (growthWrap) growthWrap.style.display = seg === 'growth' ? '' : 'none';
  // 栽培ごよみ切替時：実務作物リストで描画トリガー
  if (seg === 'growth' && typeof _renderCalendarMulti === 'function') {
    _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
  }
}

function _adpSetCalView(mode) {
  _adpCalView = mode;
  document.getElementById('adp-cal-view-grid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('adp-cal-view-list')?.classList.toggle('active', mode === 'list');
  _adpRenderCalendar();
}

// ─── カレンダー描画 ───
function _adpRenderCalendar() {
  const wrap = document.getElementById('adp-calendar-wrap');
  if (!wrap) return;

  const areaId  = _adpArea?.id;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  // このエリアの記録を日付ごとにまとめる
  const byDate  = {};
  records.forEach(r => {
    if (r.areaId !== areaId) return;
    const d = r.shipDate || r.harvestDate || r.createdAt?.slice(0, 10);
    if (!d) return;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push({ _type: 'record', ...r });
  });
  // 音声メモを統合
  if (typeof vmLoadByArea === 'function') {
    vmLoadByArea(areaId).forEach(m => {
      const d = m.workDate;
      if (!d) return;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push({ _type: 'voiceMemo', ...m });
    });
  }

  const y = _adpYear, mo = _adpMonth;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const isCurrentMonth = (y === today.getFullYear() && mo === today.getMonth());

  // ─── まとめカード ───
  _adpRenderSummaryCard(byDate, y, mo, todayStr);
  // ─── 予定バナー ───
  _adpRenderUpcomingBanner(byDate, todayStr);

  if (_adpCalView === 'list') {
    _adpRenderCalendarList(byDate, y, mo, todayStr);
    return;
  }

  // ─── グリッド表示 ───
  const monthLabel  = `${y}年 ${mo + 1}月`;
  const firstDay    = new Date(y, mo, 1).getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const dows = ['日','月','火','水','木','金','土'];
  const dowHTML = dows.map(d => `<div class="adp-cal-dow">${d}</div>`).join('');

  let cellsHTML = '';
  for (let i = 0; i < firstDay; i++) cellsHTML += `<div class="adp-cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const recs    = byDate[dateStr] || [];
    const isToday = dateStr === todayStr;
    const isSel   = dateStr === _adpSelDate;
    let cls = 'adp-cal-day';
    if (isToday) cls += ' today';
    if (isSel)   cls += ' selected';
    if (recs.length) cls += ' has-record';

    // ドット（種別で形・色を変える。最大3個 + 残数）
    const shown = recs.slice(0, 3);
    const extra = recs.length > 3 ? recs.length - 3 : 0;
    const dots = shown.map(r => {
      if (r._type === 'record')    return `<div class="adp-cal-dot dot-record"></div>`;
      if (r.isSchedule)            return `<div class="adp-cal-dot dot-schedule"></div>`;
      return                              `<div class="adp-cal-dot dot-memo"></div>`;
    }).join('');
    const extraHTML = extra > 0 ? `<span class="adp-cal-dot-extra">+${extra}</span>` : '';
    const dotsHTML = `<div class="adp-cal-dots">${dots}${extraHTML}</div>`;

    cellsHTML += `
      <div class="${cls}" onclick="_adpSelectDate('${dateStr}')">
        <div class="adp-cal-day-num">${d}</div>
        ${dotsHTML}
      </div>`;
  }

  const weatherBarHTML = isCurrentMonth ? _adpBuildWeatherBarHTML() : '';
  wrap.innerHTML = `
    <div class="adp-cal-nav">
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(-1)">‹ 前の月</button>
      <span class="adp-cal-month-label">${monthLabel}</span>
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(1)">次の月 ›</button>
    </div>
    ${weatherBarHTML}
    ${!isCurrentMonth ? `<button class="adp-cal-today-btn" onclick="_adpGoToday()">今日に戻る</button>` : ''}
    <div class="adp-cal-grid">
      ${dowHTML}
      ${cellsHTML}
    </div>
  `;
}

// ─── まとめカード（リスト表示時のみ描画） ───
function _adpRenderSummaryCard(byDate, y, mo, todayStr) {
  const el = document.getElementById('adp-cal-summary-card');
  if (!el) return;
  // グリッド表示時は非表示
  if (_adpCalView !== 'list') {
    el.innerHTML = '';
    return;
  }
  const monthStr = `${y}-${String(mo+1).padStart(2,'0')}`;
  let totalRec = 0, totalSchedule = 0;
  Object.entries(byDate).forEach(([date, recs]) => {
    if (!date.startsWith(monthStr)) return;
    recs.forEach(r => {
      if (r._type === 'record') totalRec++;
      else if (r.isSchedule)   totalSchedule++;
    });
  });
  const today = new Date();
  const isCurrentMonth = (y === today.getFullYear() && mo === today.getMonth());
  const isFutureMonth  = y > today.getFullYear() || (y === today.getFullYear() && mo > today.getMonth());
  const scheduleLabel  = isFutureMonth ? '予定' : isCurrentMonth ? '今後の予定' : '予定（記録済）';
  const label = `${y}年${mo+1}月`;
  el.innerHTML = `
    <div class="adp-cal-summary-card">
      <span class="adp-cal-summary-item">📋 ${label}の記録：<strong>${totalRec}</strong>件</span>
      <span class="adp-cal-summary-item">📌 ${scheduleLabel}：<strong>${totalSchedule}</strong>件</span>
    </div>`;
}

// ─── 予定バナー ───
function _adpRenderUpcomingBanner(byDate, todayStr) {
  const el = document.getElementById('adp-cal-upcoming-banner');
  if (!el) return;
  const upcoming = [];
  Object.entries(byDate).forEach(([date, recs]) => {
    if (date <= todayStr) return;
    recs.forEach(r => {
      if (r.isSchedule) upcoming.push({ date, label: r.text || r.note || '予定' });
    });
  });
  if (!upcoming.length) { el.innerHTML = ''; return; }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];
  const d = new Date(next.date);
  const dateLabel = `${d.getMonth()+1}月${d.getDate()}日`;
  el.innerHTML = `
    <div class="adp-cal-upcoming-banner">
      📌 もうすぐの予定：<strong>${dateLabel}</strong> — ${next.label}
    </div>`;
}

// ─── リスト表示 ───
function _adpRenderCalendarList(byDate, y, mo, todayStr) {
  const wrap = document.getElementById('adp-calendar-wrap');
  if (!wrap) return;
  const monthStr = `${y}-${String(mo+1).padStart(2,'0')}`;
  const today = new Date();
  const isCurrentMonth = (y === today.getFullYear() && mo === today.getMonth());
  const entries = Object.entries(byDate)
    .filter(([d]) => d.startsWith(monthStr))
    .sort(([a], [b]) => a.localeCompare(b));

  const monthLabel = `${y}年 ${mo + 1}月`;
  let listHTML = '';
  if (!entries.length) {
    listHTML = `<div class="empty-mini">この月の記録はありません。</div>`;
  } else {
    listHTML = entries.map(([date, recs]) => {
      const d = new Date(date);
      const dateLabel = `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
      const isToday = date === todayStr;
      const items = recs.map(r => {
        const icon = r._type === 'record' ? '📦' : r.isSchedule ? '📌' : '🎤';
        const txt  = r._type === 'record' ? (r.cropName || '出荷記録') : (r.text || r.note || 'メモ');
        return `<div class="adp-cal-list-item">${icon} ${txt}</div>`;
      }).join('');
      return `
        <div class="adp-cal-list-row${isToday ? ' today' : ''}" onclick="_adpSelectDate('${date}')">
          <div class="adp-cal-list-date">${dateLabel}${isToday ? ' <span class="cal-today-badge">今日</span>' : ''}</div>
          ${items}
        </div>`;
    }).join('');
  }

  const weatherBarHTMLList = isCurrentMonth ? _adpBuildWeatherBarHTML() : '';
  wrap.innerHTML = `
    <div class="adp-cal-nav">
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(-1)">‹ 前の月</button>
      <span class="adp-cal-month-label">${monthLabel}</span>
      <button class="adp-cal-nav-btn" onclick="_adpChangeMonth(1)">次の月 ›</button>
    </div>
    ${weatherBarHTMLList}
    ${!isCurrentMonth ? `<button class="adp-cal-today-btn" onclick="_adpGoToday()">今日に戻る</button>` : ''}
    <div class="adp-cal-list">${listHTML}</div>
  `;
}

// ─────────────────────────────────────────
//  天気予報（Open-Meteo 16日）
// ─────────────────────────────────────────

// WMOコード → 絵文字
const _WMO_ICON = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'🌨️', 75:'❄️',
  77:'❄️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  85:'🌨️', 86:'❄️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
};

function _adpWmoIcon(code) {
  if (code == null) return '—';
  return _WMO_ICON[code] || '🌡️';
}

// Open-Meteo 取得＋キャッシュ
async function _adpFetchWeather(lat, lng, areaId) {
  // 同エリアかつ1時間以内ならキャッシュを使用
  if (_adpWeatherCache && _adpWeatherCache.areaId === areaId) {
    const age = Date.now() - _adpWeatherCache.fetchedAt;
    if (age < 3600 * 1000) return;
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${lat}&longitude=${lng}`
      + `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
      + `&timezone=Asia%2FTokyo&forecast_days=16`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    _adpWeatherCache = {
      areaId,
      fetchedAt: Date.now(),
      daily: json.daily,  // { time[], weathercode[], temperature_2m_max[], temperature_2m_min[], precipitation_probability_max[] }
    };
  } catch(e) {
    console.warn('[ADP] 天気予報取得失敗:', e);
  }
}

// 天気予報帯HTML生成
function _adpBuildWeatherBarHTML() {
  const d = _adpWeatherCache?.daily;
  if (!d || !d.time?.length) return '';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // 今日以降16日分
  const items = d.time.map((t, i) => {
    if (t < todayStr) return '';
    const dt   = new Date(t);
    const mo   = dt.getMonth() + 1;
    const day  = dt.getDate();
    const dow  = '日月火水木金土'[dt.getDay()];
    const icon = _adpWmoIcon(d.weathercode?.[i]);
    const hi   = d.temperature_2m_max?.[i] != null ? Math.round(d.temperature_2m_max[i]) : '—';
    const lo   = d.temperature_2m_min?.[i] != null ? Math.round(d.temperature_2m_min[i]) : '—';
    const pop  = d.precipitation_probability_max?.[i] != null ? d.precipitation_probability_max[i] : null;
    const isToday = t === todayStr;
    const popColor = pop != null && pop >= 60 ? 'var(--blue, #60a5fa)' : 'var(--text3)';
    const popHTML  = pop != null ? `<span class="adp-wx-pop" style="color:${popColor}">${pop}%</span>` : '';
    return `
      <div class="adp-wx-card${isToday ? ' adp-wx-today' : ''}">
        <span class="adp-wx-date">${mo}/${day}<span class="adp-wx-dow">${dow}</span></span>
        <span class="adp-wx-icon">${icon}</span>
        <span class="adp-wx-hi">${hi}°</span>
        <span class="adp-wx-lo">${lo}°</span>
        ${popHTML}
      </div>`;
  }).join('');

  if (!items.trim()) return '';
  return `<div class="adp-wx-bar"><div class="adp-wx-scroll">${items}</div></div>`;
}

// 天気予報帯のみ再描画（AMeDAS取得後など）
function _adpRenderWeatherBar() {
  // グリッド・リスト両方で再描画するため _adpRenderCalendar を呼ぶ
  _adpRenderCalendar();
}

function _adpGoToday() {
  const now = new Date();
  _adpYear  = now.getFullYear();
  _adpMonth = now.getMonth();
  _adpSelDate = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

function _adpChangeMonth(delta) {
  _adpMonth += delta;
  if (_adpMonth < 0)  { _adpYear--;  _adpMonth = 11; }
  if (_adpMonth > 11) { _adpYear++;  _adpMonth = 0;  }
  _adpSelDate = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

function _adpSelectDate(dateStr) {
  _adpSelDate = (_adpSelDate === dateStr) ? null : dateStr;
  _adpEditId  = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
  // リスト表示時は記録カードが画面外になりやすいのでスクロール
  if (_adpSelDate && _adpCalView === 'list') {
    requestAnimationFrame(() => {
      const el = document.getElementById('adp-day-records-wrap');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

// ─── 選択日記録リスト ───
function _adpRenderDayRecords() {
  const wrap = document.getElementById('adp-day-records-wrap');
  if (!wrap) return;

  if (!_adpSelDate) {
    wrap.innerHTML = '';
    return;
  }

  const areaId  = _adpArea?.id;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  const dayRecs = records.filter(r => {
    if (r.areaId !== areaId) return false;
    const d = r.shipDate || r.harvestDate || r.createdAt?.slice(0, 10);
    return d === _adpSelDate;
  });

  // 音声メモ取得
  const voiceMemos = (typeof vmLoadByDate === 'function')
    ? vmLoadByDate(areaId, _adpSelDate) : [];

  const label = `${parseInt(_adpSelDate.slice(5,7))}月${parseInt(_adpSelDate.slice(8,10))}日の記録`;

  if (!dayRecs.length && !voiceMemos.length) {
    wrap.innerHTML = `
      <div class="adp-day-records">
        <div class="adp-day-records-title">${label}</div>
        <div class="empty" style="padding:16px 0;font-size:12px;">この日の記録はありません</div>
      </div>`;
    return;
  }

  // 通常記録カード
  const recCardsHTML = dayRecs.map(r => {
    const item = r.productName || r.item || '—';
    const dest = r.shippingTypeLabel || r.shippingType || '—';
    const isEditing = r.id === _adpEditId;
    return `
      <div class="adp-rec-card" id="adp-rec-${r.id}">
        <div class="adp-rec-card-top">
          <span class="adp-rec-dest">${escHtml(dest)}</span>
        </div>
        <div class="adp-rec-item">${escHtml(item)}</div>
        <div class="adp-rec-actions">
          <button class="btn btn-ghost adp-rec-btn"
            onclick="_adpToggleEdit('${r.id}')">
            ${isEditing ? '閉じる' : '編集'}
          </button>
          <button class="btn btn-danger adp-rec-btn"
            onclick="_adpDeleteRecord('${r.id}')">削除</button>
        </div>
        ${isEditing ? _adpEditPanelHTML(r) : ''}
      </div>
    `;
  }).join('');

  // 音声メモカード
  const vmCardsHTML = voiceMemos.map(m => {
    const details = [
      m.crop     ? `🌱 ${escHtml(m.crop)}`     : '',
      m.material ? `📦 ${escHtml(m.material)}` : '',
      m.quantity ? `⚖️ ${escHtml(m.quantity)}` : '',
      m.note     ? `📝 ${escHtml(m.note)}`     : '',
    ].filter(Boolean).join('　');
    return `
      <div class="adp-rec-card vm-memo-card" id="adp-rec-${m.id}">
        <div class="adp-rec-card-top">
          <span class="vm-tag-badge">${escHtml(m.tag)}</span>
          <span class="vm-memo-time">${m.createdAt ? m.createdAt.slice(11,16) : ''}</span>
        </div>
        <div class="adp-rec-item">${escHtml(m.rawText || '')}</div>
        ${details ? `<div class="vm-memo-details">${details}</div>` : ''}
        <div class="adp-rec-actions">
          <button class="btn btn-danger adp-rec-btn"
            onclick="vmDeleteAndRefresh('${m.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="adp-day-records">
      <div class="adp-day-records-title">${label}</div>
      ${recCardsHTML}
      ${vmCardsHTML}
    </div>`;
}

// 音声メモ削除→カレンダー再描画
async function vmDeleteAndRefresh(id) {
  const ok = await showConfirmDialog('この音声メモを削除しますか？', '削除する', 'キャンセル', true);
  if (!ok) return;
  if (typeof vmDelete === 'function') vmDelete(id);
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 生育カレンダーの保存（📌保存した作物）───
/**
 * _adpToggleCalendarCrop(cropId)
 * 作業カレンダーの保存トグル。保存済みなら解除、未保存なら追加。
 * currentAreaData.savedCalendarCrops = { [cropId]: { savedAt } } をFirestore/localStorageへ永続化。
 * （_simSaveProfitOverrides/_simResetCropと同じ永続化パターンを踏襲）
 */
async function _adpToggleCalendarCrop(cropId) {
  if (!cropId || !currentAreaData) return;
  const id = currentAreaData.id || _adpArea?.id;
  if (!id) return;

  currentAreaData.savedCalendarCrops = currentAreaData.savedCalendarCrops || {};
  const alreadySaved = !!currentAreaData.savedCalendarCrops[cropId];

  try {
    if (alreadySaved) {
      // 解除
      delete currentAreaData.savedCalendarCrops[cropId];
      if (typeof db !== 'undefined' && db && !String(id).startsWith('local_')) {
        const del = {};
        del[`savedCalendarCrops.${cropId}`] = firebase.firestore.FieldValue.delete();
        await db.collection('areas').doc(id).update(del);
      } else {
        const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
        const idx = stored.findIndex(a => a.id === id);
        if (idx !== -1 && stored[idx].savedCalendarCrops) {
          delete stored[idx].savedCalendarCrops[cropId];
          localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
        }
      }
      showToast('保存を解除しました', 'green');
    } else {
      // 追加
      const payload = { savedAt: new Date().toISOString() };
      currentAreaData.savedCalendarCrops[cropId] = payload;
      if (typeof db !== 'undefined' && db && !String(id).startsWith('local_')) {
        await db.collection('areas').doc(id).update({ [`savedCalendarCrops.${cropId}`]: payload });
      } else {
        const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
        const idx = stored.findIndex(a => a.id === id);
        if (idx !== -1) {
          stored[idx].savedCalendarCrops = stored[idx].savedCalendarCrops || {};
          stored[idx].savedCalendarCrops[cropId] = payload;
          localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
        }
      }
      showToast('カレンダーを保存しました ✓', 'green');
    }
  } catch (e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
    return;
  }

  // 現在表示中の作物カレンダー（ヘッダーのボタン状態）を再描画
  // 実務側(calendar-result)・分析側(calendar-result-analysis)どちらに表示中でも、
  // 対象cropIdと一致していればそれぞれ再描画する（両方に表示されている場合は両方更新）
  if (typeof renderWorkCalendar === 'function') {
    const crop = _adpGrowthFindCrop(cropId);
    const isPractice = _adpPracticecrops.some(c => c.cropId === cropId);
    if (isPractice && typeof _renderCalendarMulti === 'function') _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
    if (cropId === _adpSelectedCropId) renderWorkCalendar(crop, 'calendar-result-analysis');
  }
  _adpRenderSavedCalendarsList();
}

/**
 * _adpRenderSavedCalendarsList()
 * 「📌 保存した作物」一覧をカレンダータブ内に描画する。
 * 各カードは buildWorkCalendarHTML()（analysis.js）で組み立て、✕削除ボタン付き。
 */
function _adpRenderSavedCalendarsList(showAll = false) {
  const wrap = document.getElementById('adp-saved-calendars-wrap');
  if (!wrap) return;

  const saved = currentAreaData?.savedCalendarCrops || {};
  const cropIds = Object.keys(saved).sort((a, b) => (saved[a]?.savedAt || '').localeCompare(saved[b]?.savedAt || ''));

  if (!cropIds.length) {
    wrap.innerHTML = '';
    return;
  }

  const LIMIT = 3;
  const displayIds = showAll ? cropIds : cropIds.slice(0, LIMIT);
  const hidden = cropIds.length - displayIds.length;

  const cardsHtml = displayIds.map(cropId => {
    const crop = _adpGrowthFindCrop(cropId);
    if (!crop) return '';
    const titleButtonHtml = `
      <button class="wc-save-btn wc-remove-btn" onclick="_adpToggleCalendarCrop('${cropId}')">✕ 削除</button>
    `;
    const bodyHtml = (typeof buildWorkCalendarHTML === 'function')
      ? buildWorkCalendarHTML(crop, { titleButtonHtml })
      : '';
    return `<div class="wc-saved-card">${bodyHtml}</div>`;
  }).join('');

  const toggleBtn = cropIds.length > LIMIT
    ? showAll
      ? `<button class="adp-saved-cal-more-btn" onclick="_adpRenderSavedCalendarsList(false)">折りたたむ ▲</button>`
      : `<button class="adp-saved-cal-more-btn" onclick="_adpRenderSavedCalendarsList(true)">もっと見る（+${hidden}件） ▼</button>`
    : '';

  wrap.innerHTML = `
    <div class="adp-saved-cal-header">📌 保存した作物（${cropIds.length}）</div>
    ${cardsHtml}
    ${toggleBtn}
  `;
}

// ─── 編集パネル HTML ───
function _adpEditPanelHTML(record) {
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};
  const typeGrid = Object.entries(SHIPPING_TYPES_REF).map(([key, def]) => {
    const isSel = key === record.shippingType;
    return `<div class="adp-type-btn${isSel ? ' selected' : ''}"
      data-type="${key}"
      onclick="_adpSelectEditType(this, '${record.id}')">
      ${def.icon} ${def.label}
    </div>`;
  }).join('');

  return `
    <div class="adp-edit-panel" id="adp-edit-panel-${record.id}">
      <div class="adp-edit-title">出荷先タイプを変更</div>
      <div class="adp-type-grid">${typeGrid}</div>
      <div class="adp-edit-form-wrap" id="adp-edit-form-wrap-${record.id}">
        ${_adpBuildEditForm(record, record.shippingType)}
      </div>
      <div class="adp-edit-actions">
        <button class="btn btn-ghost" onclick="_adpToggleEdit('${record.id}')">キャンセル</button>
        <button class="btn btn-primary" onclick="_adpSaveEdit('${record.id}')">保存する</button>
      </div>
    </div>`;
}

// ─── 編集フォーム HTML（既存値埋め込み）───
function _adpBuildEditForm(record, type) {
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};
  const def = SHIPPING_TYPES_REF[type];
  if (!def) return '';

  const fieldsHTML = def.sections.flatMap(s => s.fields).map(f => {
    const val = record[f.id] || '';
    let input = '';
    if (f.type === 'select') {
      const opts = (f.options || []).map(o =>
        `<option value="${o}"${val === o ? ' selected' : ''}>${o}</option>`).join('');
      input = `<select class="rec-input" name="${f.id}"><option value="">—</option>${opts}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="rec-input rec-textarea" name="${f.id}" placeholder="${f.placeholder || ''}">${escHtml(val)}</textarea>`;
    } else {
      const unit = f.unit ? `<span class="rec-unit">${f.unit}</span>` : '';
      const wrap = f.unit ? `<div class="rec-input-with-unit">` : '';
      const wEnd = f.unit ? `</div>` : '';
      input = `${wrap}<input class="rec-input" type="${f.type}" name="${f.id}" placeholder="${f.placeholder || ''}" value="${escHtml(val)}">${unit}${wEnd}`;
    }
    return `<div class="rec-field"><label class="rec-label">${f.label}</label>${input}</div>`;
  }).join('');

  return `<div class="rec-section"><div class="rec-section-title-plain">${def.label}</div>${fieldsHTML}</div>`;
}

// ─── タイプ選択時フォーム更新 ───
function _adpSelectEditType(btn, recordId) {
  const panel = document.getElementById(`adp-edit-panel-${recordId}`);
  if (!panel) return;
  panel.querySelectorAll('.adp-type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const type = btn.dataset.type;
  const records = (typeof recordsLoad === 'function') ? recordsLoad() : [];
  const record  = records.find(r => r.id === recordId);
  if (!record) return;

  const formWrap = document.getElementById(`adp-edit-form-wrap-${recordId}`);
  if (formWrap) formWrap.innerHTML = _adpBuildEditForm(record, type);
}

// ─── 編集パネル開閉 ───
function _adpToggleEdit(id) {
  _adpEditId = (_adpEditId === id) ? null : id;
  _adpRenderDayRecords();
  // 編集パネルが開いたらスクロール
  if (_adpEditId) {
    setTimeout(() => {
      const el = document.getElementById(`adp-rec-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// ─── 保存 ───
function _adpSaveEdit(id) {
  const panel = document.getElementById(`adp-edit-panel-${id}`);
  if (!panel) return;

  const typeBtn  = panel.querySelector('.adp-type-btn.selected');
  const newType  = typeBtn ? typeBtn.dataset.type : null;
  const SHIPPING_TYPES_REF = (typeof SHIPPING_TYPES !== 'undefined') ? SHIPPING_TYPES : {};

  const inputs = panel.querySelectorAll('[name]');
  const newData = {};
  inputs.forEach(el => { if (el.value.trim()) newData[el.name] = el.value.trim(); });

  if (newType) {
    newData.shippingType      = newType;
    newData.shippingTypeLabel = SHIPPING_TYPES_REF[newType]?.label || newType;
  }

  if (typeof recordsUpdate === 'function') {
    recordsUpdate(id, newData);
    showToast('記録を更新しました ✓', 'green');
  }

  _adpEditId = null;
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 削除 ───
async function _adpDeleteRecord(id) {
  const ok = await showConfirmDialog('この記録を削除しますか？', '削除する', 'キャンセル', true);
  if (!ok) return;
  if (typeof recordsDelete === 'function') recordsDelete(id);
  showToast('記録を削除しました', 'green');
  _adpRenderCalendar();
  _adpRenderDayRecords();
}

// ─── 土壌ラベル変換 ───
function soilLabel(key) {
  const map = { sandy:'砂質土', loam:'壌土', clay:'粘土質', peat:'泥炭土', volcanic:'火山灰土', unknown:'不明' };
  return map[key] || key;
}

// ═══════════════════════════════════════════
//  ADP RANKING — エリア詳細パネル内ランキング
// ═══════════════════════════════════════════

// ─── ランキング描画（エリア詳細パネルを開いた時に呼ぶ）───
function _adpRenderRanking(area) {
  if (typeof buildAnalysisResult !== 'function' || !currentAreaData) return;

  // 表示に使う栽培方式：openAreaDetailPanelで復元済みの値（分析一時値 優先 / なければマスター）を使う。
  // ここで無条件に'openField'へ固定すると、復元処理の結果がエリアを開くたびに消えてしまうため変更。
  const mode = currentAreaData.cultivationMode || 'openField';

  // 露地スコアのキャッシュ（補正比較用）は、表示モードに関わらず必ず露地基準で計算し直す
  let openFieldResult;
  if (mode === 'openField') {
    openFieldResult = buildAnalysisResult(currentAreaData);
  } else {
    const savedMode = currentAreaData.cultivationMode;
    currentAreaData.cultivationMode = 'openField';
    openFieldResult = buildAnalysisResult(currentAreaData);
    currentAreaData.cultivationMode = savedMode; // 表示モードに戻す
  }
  _crOpenFieldScores = openFieldResult.cropScores.map(s => ({ id: s.crop.id, score: s.score }));

  // 栽培方式ボタンを復元済みモードに同期（サマリーバー／条件設定タブの両方を含む全インスタンス）
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  // DB/気候トグルを初期化（一般データベース側をactive）
  document.querySelectorAll('.adp-eval-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.eval === 'db');
  });
  // 気候ボタンのエリア名ラベルを更新（サマリーバー／条件設定タブの両方に反映）
  if (currentAreaData?.name) {
    document.querySelectorAll('.adp-eval-climate-label').forEach(el => {
      el.textContent = `${currentAreaData.name}の気候`;
    });
  }

  // 表示用スコア：露地モードならキャッシュ済みのopenFieldResultを再利用、それ以外は復元モードで計算
  const result = (mode === 'openField') ? openFieldResult : buildAnalysisResult(currentAreaData);

  // analysis.js のランキング状態を更新
  _crScores = result.cropScores;
  _crMajor  = 'all';
  _crMinor  = null;
}


// ─── 栽培方式切替（気温適性・生育期間ペイン共通）※分析側の一時値のみ変更。マスター(area.cultivationMode)はインライン編集経由でのみ変更 ───
function _adpSwitchCultivation(mode) {
  if (!currentAreaData) return;
  currentAreaData.cultivationMode = mode;
  _adpAnalysisCultMode = mode;

  // 分析一時値としてlocalStorageに保存（マスターへの永続化は行わない）
  const areaId = _adpArea?.id || _adpArea?.name || '';
  if (areaId) {
    try { localStorage.setItem(`adpCultAnalysis_${areaId}`, mode); }
    catch(e) { console.warn('_adpSwitchCultivation localStorage:', e); }
  }

  // 両ペインのトグルUI連動更新（.adp-cult-btn すべて対象）
  document.querySelectorAll('.adp-cult-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // スコア再計算 → 両リスト再描画 → 両グラフ再描画
  const result = buildAnalysisResult(currentAreaData);
  _crScores = result.cropScores;
  // 露地に戻ったらキャッシュも更新
  if (mode === 'openField') {
    _crOpenFieldScores = result.cropScores.map(s => ({ id: s.crop.id, score: s.score }));
  }
  _adpRenderRankingList();
  _adpRenderGrowthRankingList();
  _adpRenderTempChart(_adpSelectedCropId);
  _adpRenderGrowthChart(_adpSelectedCropId);
  // 選択作物が存在する場合は全タブも更新
  if (_adpSelectedCropId) {
    _adpSelectCropForAnalysis(_adpSelectedCropId);
  }
}


// ─── 補正比較ヘルパー ───

// 補正サマリーHTML（露地以外のモード時だけ中身あり）
function _adpBuildCorrectionSummary(mode, filteredScores) {
  if (mode === 'openField' || !_crOpenFieldScores || !_crOpenFieldScores.length) return '';

  const modeLabel = mode === 'greenhouse' ? '🏠 ハウス補正中' : '🔥 加温ハウス補正中';

  // filteredScoresに対して露地スコアとの差を計算
  const diffs = filteredScores.map(s => {
    const base = _crOpenFieldScores.find(b => b.id === s.crop.id);
    return base != null ? s.score - base.score : 0;
  });

  const upCount   = diffs.filter(d => d > 0).length;
  const downCount = diffs.filter(d => d < 0).length;
  const avgDiff   = diffs.length
    ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    : 0;
  const avgSign   = avgDiff >= 0 ? '+' : '';

  return `
    <div class="adp-corr-summary">
      <span class="adp-corr-mode">${modeLabel}</span>
      <span class="adp-corr-stats">
        ${upCount > 0 ? `<span class="adp-corr-up">▲${upCount}件上昇</span>` : ''}
        ${downCount > 0 ? `<span class="adp-corr-down">▼${downCount}件低下</span>` : ''}
        <span class="adp-corr-avg">平均${avgSign}${avgDiff}pt</span>
      </span>
    </div>`;
}

// 各アイテムの補正比較HTML
function _adpBuildScoreCompare(cropId, currentScore, mode) {
  if (mode === 'openField' || !_crOpenFieldScores) return { compareHtml: '', rankDiff: null };

  const base = _crOpenFieldScores.find(b => b.id === cropId);
  if (base == null) return { compareHtml: '', rankDiff: null };

  const diff    = Math.round(currentScore - base.score);
  const diffSign = diff >= 0 ? '+' : '';
  const diffCls  = diff > 0 ? 'adp-diff-up' : diff < 0 ? 'adp-diff-down' : 'adp-diff-zero';

  const compareHtml = `
    <span class="adp-score-base">${Math.round(base.score)}%</span>
    <span class="adp-score-arrow">→</span>
    <span class="adp-diff-badge ${diffCls}">${diffSign}${diff}pt</span>`;

  return { compareHtml };
}

// 順位変動計算（filteredOpenFieldScores: 露地側の同フィルタ済み配列が必要）
function _adpCalcRankDiff(cropId, currentRank, openFieldScores) {
  if (!openFieldScores) return null;
  const baseRank = openFieldScores.findIndex(s => s.crop.id === cropId);
  if (baseRank < 0) return null;
  return baseRank - currentRank; // 正=上昇, 負=低下
}

// ─── 播種・収穫時期ラベル生成（DB値 月→旬変換）───
// months: 数値月の配列（1〜12）
// side: 'start'=月上旬基点, 'end'=月下旬基点
function _buildSeasonLabel(months, side = 'start') {
  if (!Array.isArray(months) || !months.length) return null;
  const MONTH_JP = ['1月','2月','3月','4月','5月','6月',
                    '7月','8月','9月','10月','11月','12月'];
  const sorted = [...months].sort((a, b) => a - b);
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];
  const from = MONTH_JP[first - 1] + '上旬';
  const to   = MONTH_JP[last  - 1] + '下旬';
  return first === last ? MONTH_JP[first - 1] + '上旬〜下旬' : `${from}〜${to}`;
}

// ─── 作物の播種・収穫ラベルをまとめて返す ───
function _buildCropSeasonInfo(crop) {
  const cal = crop.calendar || {};
  const result = {};

  // 播種系（sowing → seedling → transplant の優先順）
  if (cal.sowing?.length)     result.sowingLabel     = _buildSeasonLabel(cal.sowing);
  if (cal.seedling?.length)   result.seedlingLabel   = _buildSeasonLabel(cal.seedling);
  if (cal.transplant?.length) result.transplantLabel = _buildSeasonLabel(cal.transplant);
  if (cal.harvest?.length)    result.harvestLabel    = _buildSeasonLabel(cal.harvest);

  return result;
}

// ─── 気候推定モード：播種・収穫旬ラベル ───
function _buildEstimatedSeasonLabel(r) {
  if (r.startDecade === null || r.startDecade === undefined) return null;
  const sowLabel     = Phenology.decadeLabel(r.startDecade);
  const harvestLabel = (r.harvestDecade != null)
    ? Phenology.decadeLabel(r.harvestDecade)
    : Phenology.decadeLabel(r.endDecade);
  return { sowLabel, harvestLabel };
}

// ─── 播種・収穫ブロックHTML生成（ランキングリスト / matchタブ共通） ───
function _buildSeasonBlockHtml(crop, estimatedSeason) {
  const db  = _buildCropSeasonInfo(crop);
  const est = estimatedSeason; // { sowLabel, harvestLabel } | null

  const dbRows = [];
  if (db.sowingLabel)     dbRows.push(`<span class="season-key">播種</span><span class="season-val">${db.sowingLabel}</span>`);
  if (db.seedlingLabel)   dbRows.push(`<span class="season-key">育苗</span><span class="season-val">${db.seedlingLabel}</span>`);
  if (db.transplantLabel) dbRows.push(`<span class="season-key">定植</span><span class="season-val">${db.transplantLabel}</span>`);
  if (db.harvestLabel)    dbRows.push(`<span class="season-key">収穫</span><span class="season-val">${db.harvestLabel}</span>`);

  const dbHtml = dbRows.length
    ? dbRows.map(r => `<div class="season-row">${r}</div>`).join('')
    : '<div class="season-row season-nodata">データなし</div>';

  const estHtml = est
    ? `<div class="season-row"><span class="season-key">播種/定植</span><span class="season-val season-est">${est.sowLabel}</span></div>
       <div class="season-row"><span class="season-key">収穫</span><span class="season-val season-est">${est.harvestLabel}</span></div>`
    : '<div class="season-row season-nodata">AMeDASデータ取得後に表示</div>';

  return `
    <div class="season-block">
      <div class="season-section">
        <div class="season-section-title">📋 一般的な時期</div>
        ${dbHtml}
      </div>
      <div class="season-section">
        <div class="season-section-title">🌤️ このエリアの推定</div>
        ${estHtml}
      </div>
    </div>`;
}

// ─── 気候推定ランキングリスト描画（chart / growth 共通） ───
// ─── 個別リスク行HTML生成（霜・冷害・日照不足リスク共通） ───
//  label     : 表示ラベル（例：'霜リスク'）
//  riskObj   : calcFrostRisk/calcChillRisk/calcSunDeficitRisk の返却値（null可）
//  countText : 補足テキスト（例：'約20日 (0℃未満)'）。空文字なら非表示。
function _crRiskRowHtml(label, riskObj, countText) {
  if (!riskObj) return '';
  const lvCls = 'risk-' + riskObj.riskLevel; // risk-none / risk-low / risk-mid / risk-high
  return `<div class="cr-risk-row ${lvCls}">
    <span class="risk-label">${label}</span>
    <span class="risk-stars">${riskObj.riskStars}</span>
    ${countText ? `<span class="risk-count">${countText}</span>` : ''}
  </div>`;
}

// ─── 寒暖差「品質ボーナス」行HTML生成（diurnal専用） ───
//  diurnal.riskLevel は「寒暖差のなさ」へのリスクとして定義されているため、
//  ボーナス表示ではスター・配色を反転させる（大きいほど良い指標として見せる）。
function _crBonusRowHtml(diurnal) {
  if (!diurnal) return '';
  const bonusCls = {
    none: 'bonus-best',  // 日較差大 → ボーナス最大
    low:  'bonus-good',
    mid:  'bonus-mid',
    high: 'bonus-low',   // 日較差極小 → ボーナスほぼなし
  }[diurnal.riskLevel] || 'bonus-mid';
  const bonusStars = {
    none: '★★★★', low: '★★★☆', mid: '★★☆☆', high: '★☆☆☆',
  }[diurnal.riskLevel] || '★★☆☆';
  return `<div class="cr-bonus-row ${bonusCls}">
    <span class="bonus-label">寒暖差ボーナス</span>
    <span class="bonus-stars">${bonusStars}</span>
    <span class="bonus-count">平均日較差 ${diurnal.avgRange}℃</span>
  </div>`;
}

function _adpRenderClimateRankingList(el, pane) {
  if (!_adpClimateRanking) {
    el.innerHTML = '<div class="empty-mini">気候データ取得中です。しばらくしてから再度タップしてください。</div>';
    return;
  }

  // カテゴリフィルタ（大タブ × 小タブの掛け合わせ）
  const major = (typeof _crMajor !== 'undefined' && _crMajor) ? _crMajor : 'all';
  const minor = (typeof _crMinor !== 'undefined') ? _crMinor : null;

  // 大タブ → 気候推定モードのcategoryキーへのマッピング
  const MAJOR_MAP = {
    grain:     ['grain'],
    vegetable: ['leafy','fruit_veg','root','vegetable'],
    fruit:     ['fruit'],
    wild:      ['wildveg','herb'],
    forest:    ['forest'],
  };

  // 小タブ（DBモードのcategoryキー）→ 気候推定フィルタ用のcategoryキーへの変換
  const MINOR_TO_CLIMATE_CAT = {
    grain:     'grain',
    legume:    'legume',
    leafy:     'leafy',
    vegetable: 'vegetable',
    fruit_veg: 'fruit_veg',
    root:      'root',
    fruit:     'fruit',
    wildveg:   'wildveg',
    herb:      'herb',
    forest:    'forest',
  };

  let allowedCats = major !== 'all' ? (MAJOR_MAP[major] || []) : null;

  // 小タブが選択されていれば、大タブの範囲内でさらに絞り込む
  if (minor) {
    const climateCat = MINOR_TO_CLIMATE_CAT[minor];
    if (climateCat) {
      // 大タブ範囲との交差（大タブが 'all' なら小タブだけで絞る）
      if (!allowedCats || allowedCats.includes(climateCat)) {
        allowedCats = [climateCat];
      } else {
        // 大タブ範囲に含まれないサブカテゴリ → 結果ゼロ
        allowedCats = [];
      }
    }
  }

  let list = _adpClimateRanking;
  if (allowedCats) {
    list = list.filter(r => allowedCats.includes(r.crop.category));
  }

  if (!list.length) {
    el.innerHTML = '<div class="empty-mini">該当作物なし</div>';
    return;
  }

  const itemsHtml = list.slice(0, 60).map((r, i) => {
    const scoreCls = r.score >= 70 ? 'score-high' : r.score >= 40 ? 'score-mid' : 'score-low';
    const isSelected = r.crop.id === _adpSelectedCropId;

    const gpMin = r.crop.conditions?.growthPeriodMin;
    const gpMax = r.crop.conditions?.growthPeriodMax;
    const gpStr = (gpMin != null || gpMax != null)
      ? `<span class="cr-gp-badge">${gpMin ?? '?'}〜${gpMax ?? '?'}日</span>`
      : '';

    const est = _buildEstimatedSeasonLabel(r);
    const seasonHtml = _buildSeasonBlockHtml(r.crop, est);

    // ── 高温リスク行・詳細リスク行（霜・冷害・日照不足・寒暖差ボーナス） ──
    //  「適合度ランキング」(pane==='ranking')では⚠️リスクタブへ表示を集約するため非表示。
    //  「生育期間」(pane==='growth')のリストでは従来通り表示する。
    let heatHtml = '';
    let detailRisksHtml = '';
    if (pane !== 'ranking') {
      const hr = r.heatRisk;
      heatHtml = hr
        ? (() => {
            const lvCls = hr.riskLevel === 'none' ? 'heat-none'
                        : hr.riskLevel === 'low'  ? 'heat-low'
                        : hr.riskLevel === 'mid'  ? 'heat-mid'
                        : 'heat-high';
            const countTxt = hr.hotDecadeCount > 0
              ? `<span class="heat-count">約${hr.hotDayApprox ?? hr.hotDecadeCount * 10}日以上 (${hr.threshold}℃超)</span>`
              : '';
            return `<div class="cr-heat-row ${lvCls}">
              <span class="heat-label">高温リスク</span>
              <span class="heat-stars">${hr.riskStars}</span>
              ${countTxt}
            </div>`;
          })()
        : '';

      const ar = r.allRisks;
      detailRisksHtml = ar
        ? `<div class="cr-risk-detail-wrap">
            ${_crRiskRowHtml('霜リスク',   ar.frost,
                (ar.frost && ar.frost.frostDecadeCount > 0) ? `約${ar.frost.frostDayApprox}日 (0℃未満)` : '')}
            ${_crRiskRowHtml('冷害リスク', ar.chill,
                (ar.chill && ar.chill.chillDecadeCount > 0) ? `約${ar.chill.chillDecadeCount * 10}日 (${ar.chill.chillThreshold}℃未満)` : '')}
            ${_crRiskRowHtml('日照不足',   ar.sunDeficit,
                ar.sunDeficit ? `充足率${ar.sunDeficit.sufficiencyPct}%` : '')}
            ${_crBonusRowHtml(ar.diurnal)}
          </div>`
        : '';
    }

    const idAttr = pane === 'growth' ? `adp-cr-item` : `cr-item`;
    return `
      <div class="${idAttr}${isSelected ? ' selected' : ''}" onclick="adpCropTap(this, '${r.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}</span>
          <span class="cr-name">${escHtml(r.crop.name)}${gpStr}</span>
          <span class="cr-score ${scoreCls}">${r.score}%</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${scoreCls}" style="width:${r.score}%"></div>
        </div>
        ${heatHtml}
        ${detailRisksHtml}
        <div class="season-block-wrap">${seasonHtml}</div>
      </div>`;
  }).join('');

  el.innerHTML =
    `<div class="adp-climate-mode-note">🌿 ${currentAreaData?.name ?? 'エリア'}の気候：旬別気温・日照から播種適期を算出</div>` +
    itemsHtml;
}

// ─── ADP専用ランキングリスト描画 ───
function _adpRenderRankingList() {
  const el = document.getElementById('crop-ranking');
  if (!el) return;

  // ── 気候推定モード ──
  if (_adpClimateMode) {
    _adpRenderClimateRankingList(el, 'ranking');
    return;
  }

  // ── DBモード（従来） ──
  const scores = _crFilteredScores();
  const mode   = currentAreaData?.cultivationMode || 'openField';

  if (!scores.length) {
    el.innerHTML = '<div class="empty-mini">該当作物なし</div>';
    return;
  }

  // 露地側の同フィルタ済みスコア（順位変動用）
  const ofScores = (mode !== 'openField' && _crOpenFieldScores)
    ? scores.map(s => {
        const base = _crOpenFieldScores.find(b => b.id === s.crop.id);
        return base ? { crop: s.crop, score: base.score } : null;
      }).filter(Boolean).sort((a, b) => b.score - a.score)
    : null;

  const summaryHtml = _adpBuildCorrectionSummary(mode, scores);

  const itemsHtml = scores.slice(0, 20).map((s, i) => {
    const scoreCls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
    const isSelected = s.crop.id === _adpSelectedCropId;
    const gpMin = s.crop.conditions?.growthPeriodMin;
    const gpMax = s.crop.conditions?.growthPeriodMax;
    const gpStr = (gpMin != null || gpMax != null)
      ? `<span class="cr-gp-badge">${gpMin ?? '?'}〜${gpMax ?? '?'}日</span>`
      : '';

    // 順位変動バッジ（栽培方式間のランク変化のみ。詳細な補正比較・気候リスクはStep上、
    // それぞれ「条件設定」「⚠️リスクタブ」へ集約済みのためここでは表示しない）
    const rankDiff = ofScores ? _adpCalcRankDiff(s.crop.id, i, ofScores) : null;
    const rankDiffHtml = rankDiff != null && rankDiff !== 0
      ? `<span class="adp-rank-diff ${rankDiff > 0 ? 'adp-diff-up' : 'adp-diff-down'}">`
        + (rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`) + `</span>`
      : '';

    // 播種収穫ブロック（DBモードでは気候推定なし）／アコーディオンで開閉する唯一の表示内容
    const seasonHtml = _buildSeasonBlockHtml(s.crop, null);

    return `
      <div class="cr-item${isSelected ? ' cr-item-open' : ''}"
        onclick="adpCropTap(this, '${s.crop.id}')">
        <div class="cr-item-header">
          <span class="cr-rank">#${i + 1}${rankDiffHtml}</span>
          <span class="cr-name">${escHtml(s.crop.name)}${gpStr}</span>
          <span class="cr-score ${scoreCls}">${s.score}%</span>
          <svg class="cr-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="cr-bar-track">
          <div class="cr-bar-fill ${scoreCls}" style="width:${s.score}%"></div>
        </div>
        <div class="season-block-wrap">${seasonHtml}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = '<div class="adp-db-mode-note">📊 一般データベース：DB平年値ベースの適正スコア</div>' + summaryHtml + itemsHtml;
}

// ═══════════════════════════════════════════
//  Phase6: 固定セクション描画
//  （旧 areaCharts.js のロジックを移植・常時表示化）
// ═══════════════════════════════════════════

// ─── 🌤️ 気候サマリー（ランキング上部固定・4枚カード＋気候帯） ───
// AMeDAS取得前は「データ取得中」、取得後は観測局/推定値バッジを表示
function _adpRenderClimateSummary(area) {
  const el = document.getElementById('adpc-climate-summary');
  if (!el) return;

  if (!_adpClimateLoaded) {
    el.innerHTML = `<div class="adpc-loading"><span class="adpc-spinner"></span><span>気候データ取得中...</span></div>`;
    return;
  }

  const climate = currentAreaData?.climate || {};
  const lp       = area.landProfile || {};
  const elev     = lp.elevation ?? area.meta?.elev ?? null;
  const ph       = lp.ph ?? null;
  const sunshine = climate.sunshineHours ?? lp.sunshineHours ?? null;
  const isStation = climate.stationName != null;

  const cards = [
    {
      icon:  '🌡️',
      label: '年均気温',
      value: climate.tempMean != null ? climate.tempMean.toFixed(1) : '—',
      unit:  '℃',
      color: _adpTempColor(climate.tempMean),
      hint:  climate.tempMean == null ? null
           : climate.tempMean >= 18 ? '温暖'
           : climate.tempMean >= 13 ? '標準的'
           : climate.tempMean >= 8  ? 'やや寒冷'
           : '寒冷',
    },
    {
      icon:  '🌧️',
      label: '年降水量',
      value: climate.rain != null ? Math.round(climate.rain).toLocaleString() : '—',
      unit:  'mm',
      color: '#60a5fa',
      hint:  climate.rain == null ? null
           : climate.rain >= 2000 ? '多雨'
           : climate.rain >= 1200 ? '標準的'
           : climate.rain >= 700  ? '降水少なめ'
           : '乾燥気味',
    },
    {
      icon:  '☀️',
      label: '年間日照',
      value: sunshine != null ? Math.round(sunshine).toLocaleString() : '—',
      unit:  'h',
      color: '#fbbf24',
      hint:  sunshine == null ? null
           : sunshine >= 2000 ? '日照豊富'
           : sunshine >= 1500 ? '標準的'
           : '日照少なめ',
    },
    {
      icon:  '🏔️',
      label: '標高',
      value: elev != null ? Math.round(elev).toLocaleString() : '—',
      unit:  'm',
      color: 'var(--text2)',
      hint:  elev == null ? null
           : elev >= 600 ? '高冷地'
           : elev >= 200 ? '中標高'
           : '平地',
    },
    {
      icon:  '🧪',
      label: '土壌pH',
      value: ph != null ? ph.toFixed(1) : '—',
      unit:  '',
      color: ph == null ? 'var(--text2)' : ph >= 7.5 ? '#f87171' : ph >= 6.0 ? '#4ade80' : '#fbbf24',
      hint:  ph == null ? null
           : ph >= 7.5 ? 'アルカリ性'
           : ph >= 6.0 ? '弱酸性（適正）'
           : '酸性',
    },
  ];

  const badge = isStation
    ? `<span class="adpc-badge-ok">${climate.stationName}${climate.distKm != null ? '&nbsp;' + climate.distKm + 'km' : ''}</span>`
    : `<span class="adpc-badge-warn">📍 推定値（観測局なし）</span>`;

  el.innerHTML = `
    <div class="adpc-mini-summary adpc-mini-summary-5">
      ${cards.map(c => `
        <div class="adpc-mini-stat">
          <span class="adpc-mini-stat-icon">${c.icon}</span>
          <div class="adpc-mini-stat-body">
            <span class="adpc-mini-stat-label">${c.label}</span>
            <span class="adpc-mini-stat-value" style="color:${c.color}">${c.value}<span class="adpc-mini-stat-unit">${c.unit}</span></span>
            ${c.hint ? `<span class="adpc-mini-stat-hint">${c.hint}</span>` : ''}
            ${c.sub  ? `<span class="adpc-mini-stat-sub">${c.sub}</span>`  : ''}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="adpc-mini-zone">
      <span class="adpc-mini-zone-name">${climate.name || lp.climateName || '—'}</span>
      ${badge}
    </div>
  `;
}

function _adpTempColor(t) {
  if (t == null) return 'var(--text2)';
  if (t >= 20) return '#f87171';
  if (t >= 15) return '#fbbf24';
  if (t >= 10) return '#4ade80';
  return '#2dd4bf';
}

// ─── ☀️ 旬別日照チャート（気温グラフの下・Canvas2D） ───
function _adpRenderSunshineChart() {
  const canvas  = document.getElementById('adp-sun-canvas');
  const subEl   = document.getElementById('adp-sun-chart-sub');
  const legendEl = document.getElementById('adp-sun-legend');
  if (!canvas) return;

  const decadeArr = currentAreaData?.climate?.decadeArr; // {..., sun?[36]}

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 70;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 6, right: 6, bottom: 16, left: 28 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;
  const N   = 36;

  if (!decadeArr || !Array.isArray(decadeArr.sun) || decadeArr.sun.length !== N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別日照データなし（AMeDAS未取得）', W / 2, H / 2);
    if (subEl)    subEl.textContent = '日照データ未取得';
    if (legendEl) legendEl.innerHTML = '';
    return;
  }

  const sunArr = decadeArr.sun;
  const maxRaw = Math.max(...sunArr.filter(v => v !== null), 1);
  const yMax   = Math.ceil(maxRaw / 10) * 10 || 10;

  const cellW = gW / N;
  const barW  = cellW * 0.7;
  const toX   = i => PAD.left + i * cellW;
  const toY   = v  => PAD.top + (1 - v / yMax) * gH;

  // ── 横グリッド線（0 / 最大）──
  ctx.strokeStyle = 'rgba(42,61,44,0.10)';
  ctx.lineWidth   = 1;
  [0, yMax].forEach(val => {
    const y = toY(val);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(90,122,92,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${val}h`, PAD.left - 4, y + 3);
  });

  // ── 縦グリッド線（月境界：3旬ごと）──
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(42,61,44,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // ── 棒グラフ ──
  sunArr.forEach((v, i) => {
    if (v === null) return;
    const x = toX(i) + (cellW - barW) / 2;
    const y = toY(v);
    const h = (PAD.top + gH) - y;
    const intensity = v / yMax;
    ctx.fillStyle = intensity >= 0.7 ? 'rgba(251,191,36,0.75)'
                  : intensity >= 0.4 ? 'rgba(251,191,36,0.45)'
                  :                    'rgba(251,191,36,0.2)';
    ctx.fillRect(x, y, barW, h);
  });

  // ── 月ラベル（各月中旬 = 旬インデックス m*3+1）──
  const MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  ctx.fillStyle = 'rgba(90,122,92,0.8)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  MONTH_LABELS.forEach((label, m) => {
    ctx.fillText(label, toX(m * 3 + 1) + cellW / 2, H - 4);
  });

  if (subEl) subEl.textContent = '旬別日照時間';
  if (legendEl) legendEl.innerHTML = `
    <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.6)"></span>日照時間（h/旬）</span>
  `;
}

// ─── 🌿 土地環境適合度ドーナツ（適合度ペイン固定・作物選択なしでも表示） ───
function _adpRenderEnvDonut(area) {
  const wrap = document.getElementById('adpc-env-donut-fixed');
  if (!wrap) return;

  const lp      = area.landProfile || {};
  const climate = currentAreaData?.climate || {};
  const temp = climate.tempMean ?? lp.avgTemp        ?? null;
  const rain = climate.rain     ?? lp.annualRainfall ?? null;
  const elev = lp.elevation     ?? area.meta?.elev   ?? null;
  const ph   = lp.ph                                  ?? null;

  const C_GREEN = '#4ade80', C_AMBER = '#fbbf24', C_RED = '#f87171';

  const rings = [
    _adpCalcEnvRing('年均気温', temp,  '℃',  -5,  40,  12,  22, C_GREEN, C_AMBER, C_RED),
    _adpCalcEnvRing('土壌pH',   ph,    '',   3.5,   9, 5.5,   7, C_GREEN, C_AMBER, C_RED),
    _adpCalcEnvRing('標高',     elev,  'm',    0, 2000,   0, 600, C_GREEN, C_AMBER, C_RED),
    _adpCalcEnvRing('年降水量', rain,  'mm',   0, 3500, 900, 2200, C_GREEN, C_AMBER, C_RED),
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
            dur="0.7s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1"/>
        </path>`;
    }
  });

  const legendHTML = rings.map(ring => `
    <div class="adpc-legend-row">
      <span class="adpc-legend-dot" style="background:${ring.score !== null ? ring.color : '#2a3d2c'}"></span>
      <div class="adpc-legend-info">
        <div class="adpc-legend-top">
          <span class="adpc-legend-label">${ring.name}</span>
          <span class="adpc-legend-val" style="color:${ring.score !== null ? ring.color : 'var(--text3)'}">${ring.displayVal}</span>
        </div>
        <span class="adpc-legend-status" style="color:${ring.score !== null ? ring.color : 'var(--text3)'}">${ring.score !== null ? ring.statusLabel : 'データなし'}</span>
      </div>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="adpc-section-title"><span>🌿 土地環境適合度</span></div>
    <div class="adpc-donut-layout">
      <svg class="adpc-donut-svg" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
        ${ringsSvg}
        <text x="${CX}" y="${CY-5}" text-anchor="middle" fill="#5a7a5c" font-size="8" font-family="'DM Mono',monospace" letter-spacing="0.08em">LAND</text>
        <text x="${CX}" y="${CY+7}" text-anchor="middle" fill="#5a7a5c" font-size="8" font-family="'DM Mono',monospace" letter-spacing="0.08em">ENV</text>
      </svg>
      <div class="adpc-donut-legend">${legendHTML}</div>
    </div>`;
}

function _adpCalcEnvRing(name, value, unit, displayMin, displayMax, optMin, optMax, cGood, cWarn, cBad) {
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

// ─── ⚠️ 環境リスクゲージ（リスクペイン固定・作物選択なしでも表示） ───
function _adpRenderLandRiskGauges(area) {
  const wrap = document.getElementById('adpc-risk-gauges-fixed');
  if (!wrap) return;

  const lp = area.landProfile || {};
  const C_GREEN = '#4ade80', C_AMBER = '#fbbf24', C_RED = '#f87171';

  const gauges = [
    { label: '浸水リスク',   icon: '🌊', value: lp.floodRisk   ?? null, level: lp.floodRiskLevel   ?? null },
    { label: '干ばつリスク', icon: '☀️', value: lp.droughtRisk ?? null, level: lp.droughtRiskLevel ?? null },
    { label: '積雪リスク',   icon: '❄️', value: lp.snowRisk    ?? null, level: lp.snowRiskLevel    ?? null },
  ];

  if (gauges.every(g => g.value === null)) {
    wrap.innerHTML = `
      <div class="adpc-section-title"><span>⚠️ 土地環境リスク</span></div>
      <div class="adpc-nodata">分析実行後にリスクが表示されます</div>`;
    return;
  }

  const rows = gauges.map(g => {
    const pct        = g.value !== null ? Math.min(100, Math.max(0, g.value)) : 0;
    const color      = g.level === 'high' ? C_RED : g.level === 'medium' ? C_AMBER : C_GREEN;
    const levelLabel = g.level === 'high' ? '高' : g.level === 'medium' ? '中' : g.value !== null ? '低' : '—';
    return `
      <div class="adpc-gauge-row">
        <span class="adpc-gauge-label">${g.icon} ${g.label}</span>
        <div class="adpc-gauge-track">
          <div class="adpc-gauge-bar" style="width:${pct}%;background:${color};box-shadow:0 0 6px ${color}55;transition:width 0.6s ease;"></div>
        </div>
        <span class="adpc-gauge-pct" style="color:${g.value !== null ? color : 'var(--text3)'}">${g.value !== null ? pct + '%' : '—'}</span>
        <span class="adpc-gauge-val" style="color:${g.value !== null ? color : 'var(--text3)'}">${g.value !== null ? levelLabel : '—'}</span>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="adpc-section-title"><span>⚠️ 土地環境リスク</span></div>
    <div class="adpc-risk-gauges">${rows}</div>`;
}

// ─── 気温折れ線グラフ描画 ───
// ランキング上部に常時表示。cropId指定時は適正温度帯を重畳。
function _adpRenderTempChart(cropId) {
  const canvas = document.getElementById('adp-temp-canvas');
  if (!canvas) return;

  const decadeArr = currentAreaData?.climate?.decadeArr; // {tMax[36], tMin[36], tMean[36]}

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 160;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 14, right: 40, bottom: 34, left: 32 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;
  const N   = 36; // 旬数

  // ── データがない場合はメッセージだけ ──
  if (!decadeArr || !Array.isArray(decadeArr.tMax) || decadeArr.tMax.length !== N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    document.getElementById('adp-temp-legend').innerHTML = '';
    document.getElementById('adp-temp-chart-sub').textContent = '気候データ未取得';
    return;
  }

  const tMaxArr = decadeArr.tMax; // 36要素
  const tMinArr = decadeArr.tMin; // 36要素

  // ── 作物データ取得 ──
  let crop = null;
  if (cropId && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
         : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  }
  if (!crop && cropId && typeof _crScores !== 'undefined') {
    const hit = _crScores.find(s => s.crop.id === cropId);
    if (hit) crop = hit.crop;
  }

  // ── Y軸範囲決定 ──
  const allTemps = [...tMaxArr, ...tMinArr].filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const rawMin = Math.min(...allTemps);
  const rawMax = Math.max(...allTemps);
  const yMin   = Math.floor((rawMin - 2) / 5) * 5;
  const yMax   = Math.ceil ((rawMax + 2) / 5) * 5;
  const yRange = yMax - yMin || 1;

  const toX = i  => PAD.left + (i / (N - 1)) * gW;
  const toY = v  => PAD.top  + (1 - (v - yMin) / yRange) * gH;

  // ── 月境界ラベル用: 各月の最初の旬インデックス ──
  // 12ヶ月 × 3旬 = 36。月ラベルは各月中旬（旬1）の位置に表示
  const MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

  // ── 横グリッド線 & Y軸ラベル ──
  const ySteps = Math.round(yRange / 5);
  for (let s = 0; s <= ySteps; s++) {
    const val = yMin + s * 5;
    const y   = toY(val);
    ctx.strokeStyle = 'rgba(42,61,44,0.10)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(90,122,92,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val + '°', PAD.left - 4, y + 3);
  }

  // ── 縦グリッド線（月境界：3旬ごと）──
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(42,61,44,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // ── 0℃ライン強調 ──
  if (yMin < 0 && yMax > 0) {
    const y0 = toY(0);
    ctx.strokeStyle = 'rgba(248,113,113,0.35)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y0); ctx.lineTo(PAD.left + gW, y0); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 栽培方式・適正温度帯の計算 ──
  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  const isHouse    = cultivationMode === 'greenhouse' || cultivationMode === 'heatedGreenhouse';
  const isHeated   = cultivationMode === 'heatedGreenhouse';
  // engine.jsと合わせる: greenhouse=4反映、heatedGreenhouse=engineが旬別個別計算のため定数補正線は描画しない
  const tMinCorrected = (isHouse && !isHeated)
    ? tMinArr.map(v => v !== null ? v - 4 : null)
    : null;

  // ── 作物適正温度帯：旬別 decadeMatch カラーバー ──
  if (crop) {
    // engine.js scoreCrop() の decadeMatch を _crScores から取得
    let decadeMatch = null;
    if (typeof _crScores !== 'undefined') {
      const hit = _crScores.find(s => s.crop.id === crop.id);
      if (hit?.details) {
        const tempDetail = hit.details.find(d => d.decadeMatch);
        if (tempDetail) decadeMatch = tempDetail.decadeMatch;
      }
    }

    // 旬幅（ピクセル）
    const decadeW = gW / (N - 1);

    if (decadeMatch && decadeMatch.length === N) {
      // ─ 旬別カラーバー（グラフ底部に帯として描画）─
      // 適合: 緑 / 境界: 黄 / 不適合: 赤 / 加温補填: 紫 / 非生育旬: 透明
      const BAR_H  = 6;  // 底部帯の高さ（px）
      const barY   = PAD.top + gH + 2;

      for (let i = 0; i < N; i++) {
        const m = decadeMatch[i];
        if (m === null) continue; // 非生育旬: 塗らない
        let color;
        if (m === true)         color = 'rgba(74,222,128,0.75)';
        else if (m === 'border') color = 'rgba(251,191,36,0.75)';
        else if (m === false)    color = 'rgba(239,68,68,0.65)';
        else if (m?.heated)      color = 'rgba(167,139,250,0.75)';
        else                     continue;

        const x0   = toX(i) - decadeW / 2;
        const xL   = Math.max(x0, PAD.left);              // 左端クリップ
        const xR   = Math.min(x0 + decadeW, PAD.left + gW); // 右端クリップ
        const bW   = xR - xL;
        if (bW <= 0) continue;
        ctx.fillStyle = color;
        ctx.fillRect(xL, barY, bW, BAR_H);
      }

      // 適正温度帯（tempMeanMin〜Max）を横破線で表示
      if (crop.conditions.tempMeanMin != null && crop.conditions.tempMeanMax != null) {
        ctx.strokeStyle = 'rgba(74,222,128,0.60)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 3]);
        [crop.conditions.tempMeanMin, crop.conditions.tempMeanMax].forEach(v => {
          const y = toY(v);
          ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    } else {
      // decadeMatch が取得できない場合は均一帯フォールバック
      if (crop.conditions.tempMeanMin != null && crop.conditions.tempMeanMax != null) {
        const tCropMin = crop.conditions.tempMeanMin;
        const tCropMax = crop.conditions.tempMeanMax;
        const yTop = toY(tCropMax);
        const yBot = toY(tCropMin);
        ctx.fillStyle = 'rgba(74,222,128,0.22)';
        ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
        ctx.strokeStyle = 'rgba(74,222,128,0.60)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        [tCropMin, tCropMax].forEach(v => {
          const y = toY(v);
          ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    }

    // 絶対最低限界気温（absTempMin）ライン
    const absMin = crop.conditions.absTempMin;
    if (absMin != null) {
      // greenhouse: engineと合わせ-4補正、heatedGreenhouse: engine旬別個別計算のため表示および補正なし
      const absMinEffective = (isHouse && !isHeated) ? absMin - 4 : absMin;
      const yAbsMin = toY(absMinEffective);
      ctx.strokeStyle = 'rgba(239,68,68,0.85)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(PAD.left, yAbsMin); ctx.lineTo(PAD.left + gW, yAbsMin); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(239,68,68,0.9)';
      ctx.font      = '8px DM Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`限界${absMinEffective}°`, PAD.left + gW + 2, yAbsMin + 3);
    }
  }

  // ── 最高・最低の面塗り（fill between） ──
  const validIdx = tMaxArr.map((v, i) => (v !== null && tMinArr[i] !== null ? i : -1)).filter(i => i >= 0);
  if (validIdx.length > 1) {
    ctx.beginPath();
    validIdx.forEach((i, k) => {
      const x = toX(i), y = toY(tMaxArr[i]);
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    [...validIdx].reverse().forEach(i => { ctx.lineTo(toX(i), toY(tMinArr[i])); });
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + gH);
    fillGrad.addColorStop(0, 'rgba(251,191,36,0.12)');
    fillGrad.addColorStop(1, 'rgba(56,189,248,0.12)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  // ── 折れ線描画ヘルパー ──
  const drawLine = (arr, color, dash = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.setLineDash(dash);
    ctx.beginPath();
    let moved = false;
    arr.forEach((v, i) => {
      if (v === null) { moved = false; return; }
      if (!moved) { ctx.moveTo(toX(i), toY(v)); moved = true; }
      else        { ctx.lineTo(toX(i), toY(v)); }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawLine(tMaxArr, '#fbbf24');
  drawLine(tMinArr, '#38bdf8');
  if (isHouse && !isHeated) drawLine(tMinCorrected, '#34d399', [4, 3]);

  // ── 旬ドット（3旬ごとに小さめ）──
  for (let i = 0; i < N; i++) {
    const r = (i % 3 === 1) ? 2.5 : 1.5; // 中旬は少し大きく
    if (tMaxArr[i] !== null) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(toX(i), toY(tMaxArr[i]), r, 0, Math.PI * 2); ctx.fill();
    }
    if (tMinArr[i] !== null) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(toX(i), toY(tMinArr[i]), r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── 月ラベル（各月中旬 = 旬インデックス m*3+1 の位置）──
  ctx.fillStyle = 'rgba(90,122,92,0.8)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  MONTH_LABELS.forEach((label, m) => {
    ctx.fillText(label, toX(m * 3 + 1), H - PAD.bottom + 11);
  });

  // ── 凡例更新 ──
  const subEl    = document.getElementById('adp-temp-chart-sub');
  const legendEl = document.getElementById('adp-temp-legend');
  if (crop) {
    // decadeMatch から旬別集計
    let matchCount = 0, borderCount = 0, missCount = 0, heatedCount = 0, totalGrowth = 0;
    if (typeof _crScores !== 'undefined') {
      const hit = _crScores.find(s => s.crop.id === crop.id);
      if (hit?.details) {
        const td = hit.details.find(d => d.decadeMatch);
        if (td?.decadeMatch) {
          td.decadeMatch.forEach(m => {
            if (m === null) return;
            totalGrowth++;
            if (m === true)          matchCount++;
            else if (m === 'border') borderCount++;
            else if (m === false)    missCount++;
            else if (m?.heated)      heatedCount++;
          });
        }
      }
    }

    if (subEl) subEl.textContent = `${crop.name} の適正温度帯を表示中`;
    const tCMin = crop.conditions.tempMeanMin ?? '—';
    const tCMax = crop.conditions.tempMeanMax ?? '—';
    const _mode    = currentAreaData?.cultivationMode || 'openField';
    const _isHeated = _mode === 'heatedGreenhouse';
    // greenhouse: -4補正を表示、heatedGreenhouse: engineが旬別個別計算のため表示なし
    const houseNote = (_mode === 'greenhouse')
      ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399;border:1px dashed #34d399"></span>最低気温(ハウス-4℃補正)</span>`
      : '';
    const _absMin    = crop.conditions.absTempMin;
    const _absMinEff = (_absMin != null && _mode === 'greenhouse')
      ? _absMin - 4 : _absMin;

    const matchStr  = totalGrowth > 0 ? `適合${matchCount}` + (borderCount ? `・境界${borderCount}` : '') + (missCount ? `・不適${missCount}` : '') + (heatedCount ? `・加温${heatedCount}` : '') + `旬 / ${totalGrowth}旬` : '';

    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬最高気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#38bdf8"></span>旬最低気温</span>
      ${houseNote}
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.75)"></span>適合旬</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.75)"></span>境界旬</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(239,68,68,0.65)"></span>不適旬</span>
      ${heatedCount > 0 ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.75)"></span>加温補填旬</span>` : ''}
      ${_absMinEff != null ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(239,68,68,0.8);border:1px dashed rgba(239,68,68,0.9)"></span>限界最低気温 ${_absMinEff}℃</span>` : ''}
      <span class="adp-tl-item" style="color:var(--text3);font-size:10px;">${crop.name} 適正温度 ${tCMin}–${tCMax}℃</span>
      ${matchStr ? `<span class="adp-tl-item adp-tl-period">${matchStr}</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択すると適正温度を重畳表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬別最高気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#38bdf8"></span>旬別最低気温</span>
    `;
  }
} // ─── end _adpRenderTempChart ───

// ═══════════════════════════════════════════
//  生育期間グラフ — 共通ヘルパー
// ═══════════════════════════════════════════

const _ADP_GROWTH_MONTH_KEYS   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const _ADP_GROWTH_MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const _ADP_GROWTH_N = 36; // 旬数

// canvas初期化＋旬データ取得。データなしの場合は「データなし」表示してnullを返す
const _ADP_MODE_LABELS = { openField:'露地栽培', greenhouse:'ハウス栽培', heatedGreenhouse:'加温ハウス' };
function _adpGrowthSetup(canvasId, legendId, noDataMsg) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 190;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(noDataMsg, W / 2, H / 2);
    const legendEl = document.getElementById(legendId);
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  // tMeanCorrected は廃止（データ側補正をやめて閾値側で-4する方針に統一）
  // グラフ描画・判定ともに生データ tMean を使用し、閾値を緩める形で対応
  return { ctx, W, H, decadeArr, rainMonthly, tMeanArr: decadeArr.tMean, cultivationMode };
}

// cropId → CROP_DBエントリ取得（_crScoresフォールバック付き）
function _adpGrowthFindCrop(cropId) {
  let crop = null;
  if (cropId && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
         : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  }
  if (!crop && cropId && typeof _crScores !== 'undefined') {
    const hit = _crScores.find(s => s.crop.id === cropId);
    if (hit) crop = hit.crop;
  }
  return crop;
}

// レイアウト・軸スケール・座標変換関数を生成
function _adpGrowthAxes(g, crop) {
  const PAD = { top: 14, right: 40, bottom: 34, left: 32 };
  const gW  = g.W - PAD.left - PAD.right;
  const gH  = g.H - PAD.top  - PAD.bottom;

  const allTemps = [...g.tMeanArr].filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const tRawMin = Math.min(...allTemps);
  const tRawMax = Math.max(...allTemps);
  const tYMin   = Math.floor((tRawMin - 2) / 5) * 5;
  const tYMax   = Math.ceil ((tRawMax + 2) / 5) * 5;
  const tRange  = tYMax - tYMin || 1;

  const rainVals = _ADP_GROWTH_MONTH_KEYS.map(m => g.rainMonthly?.[m] ?? 0);
  let rYMax = Math.max(...rainVals, 50);
  if (crop?.conditions.absRainMax) rYMax = Math.max(rYMax, crop.conditions.absRainMax * 0.15);
  rYMax = Math.ceil(rYMax / 50) * 50;
  const rRange = rYMax;

  const toX      = i => PAD.left + (i / (_ADP_GROWTH_N - 1)) * gW;
  const toTY     = v => PAD.top  + (1 - (v - tYMin) / tRange) * gH;
  const toRY     = v => PAD.top  + (1 - v / rRange) * gH;
  const toMonthX = m => toX(m * 3); // 縦グリッドと月境界が一致するよう、上旬位置に統一
  const barW_m   = gW / 12;

  return { PAD, gW, gH, tYMin, tYMax, tRange, rYMax, rRange, toX, toTY, toRY, toMonthX, barW_m };
}

// カレンダーキー配列（月数値 or 月キー文字列）→ 月indexの配列（0-11）に変換
function _adpGrowthCalToIdx(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(v => {
    if (typeof v === 'number') return v - 1;
    const i = _ADP_GROWTH_MONTH_KEYS.indexOf(v);
    return i >= 0 ? i : -1;
  }).filter(i => i >= 0);
}

// ── 降水量適正帯シェード（DB/推定 共通・最背面）──
function _adpGrowthDrawRainShade(g, ax, crop) {
  const { ctx } = g;
  const { PAD, gW, toRY, rYMax } = ax;
  if (!crop || !g.rainMonthly) return;

  const rMin = crop.conditions.rainfallMin;
  const rMax = crop.conditions.rainfallMax;
  const aMin = crop.conditions.absRainMin;
  const aMax = crop.conditions.absRainMax;

  if (aMin != null && rMin != null && aMin < rMin) {
    const yTop = toRY(Math.min(rMin, rYMax));
    const yBot = toRY(Math.max(aMin, 0));
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, 'rgba(251,146,60,0.12)');
    grad.addColorStop(1, 'rgba(251,146,60,0.00)');
    ctx.fillStyle = grad;
    ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
  }
  if (rMin != null && rMax != null) {
    const yTop = toRY(Math.min(rMax, rYMax));
    const yBot = toRY(Math.max(rMin, 0));
    ctx.fillStyle = 'rgba(74,222,128,0.13)';
    ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
  }
  if (rMax != null && aMax != null && aMax > rMax) {
    const yTop = toRY(Math.min(aMax, rYMax));
    const yBot = toRY(Math.min(rMax, rYMax));
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, 'rgba(239,68,68,0.00)');
    grad.addColorStop(1, 'rgba(239,68,68,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
  }
}

// ── グリッド・降水量棒・降水適正破線・気温折れ線（DB/推定 共通の基礎背景）──
function _adpGrowthDrawSeries(g, ax, crop) {
  const { ctx } = g;
  const { PAD, gW, gH, tYMin, tRange, rYMax, toX, toTY, toRY, toMonthX, barW_m } = ax;

  // グリッド線（横：気温5度刻み）
  const tSteps = Math.round(tRange / 5);
  for (let s = 0; s <= tSteps; s++) {
    const tv = tYMin + s * 5;
    const y  = toTY(tv);
    ctx.strokeStyle = 'rgba(42,61,44,0.10)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(tv + '°', PAD.left - 4, y + 3);
  }
  // 縦グリッド（月境界：3旬ごと）
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(42,61,44,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // 右Y軸ラベル（降水量）
  for (let s = 0; s <= 4; s++) {
    const rv = Math.round(rYMax * s / 4);
    const y  = toRY(rv);
    ctx.fillStyle = 'rgba(96,165,250,0.85)';
    ctx.font      = '9px DM Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(rv + 'mm', PAD.left + gW + 3, y + 3);
  }

  // 降水量棒グラフ（月単位）
  if (g.rainMonthly) {
    const bw = barW_m * 0.7;
    _ADP_GROWTH_MONTH_KEYS.forEach((mk, m) => {
      const rv = g.rainMonthly[mk] ?? 0;
      const x  = toMonthX(m) - bw / 2;
      const y  = toRY(rv);
      const bH = (PAD.top + gH) - y;
      if (bH > 0) {
        const grad = ctx.createLinearGradient(0, y, 0, PAD.top + gH);
        grad.addColorStop(0, 'rgba(96,165,250,0.70)');
        grad.addColorStop(1, 'rgba(96,165,250,0.30)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, bw, bH);
      }
    });
  }

  // 降水量適正ライン（破線）
  if (crop && g.rainMonthly) {
    const drawRainLine = (v, color) => {
      if (v == null || v > rYMax) return;
      const y = toRY(v);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
      ctx.setLineDash([]);
    };
    drawRainLine(crop.conditions.rainfallMin, 'rgba(74,222,128,0.7)');
    drawRainLine(crop.conditions.rainfallMax, 'rgba(74,222,128,0.7)');
    drawRainLine(crop.conditions.absRainMin,  'rgba(251,146,60,0.6)');
    drawRainLine(crop.conditions.absRainMax,  'rgba(239,68,68,0.6)');
  }

  // 気温折れ線（旬平均気温）
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  let moved = false;
  g.tMeanArr.forEach((v, i) => {
    if (v === null) { moved = false; return; }
    if (!moved) { ctx.moveTo(toX(i), toTY(v)); moved = true; }
    else        { ctx.lineTo(toX(i), toTY(v)); }
  });
  ctx.stroke();

  // 気温ドット（中旬のみ少し大きく）
  g.tMeanArr.forEach((v, i) => {
    if (v === null) return;
    const r = (i % 3 === 1) ? 2.5 : 1.5;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(toX(i), toTY(v), r, 0, Math.PI * 2); ctx.fill();
  });

  // ハウス補正気温折れ線: tMeanCorrected 廃止のため削除
  // （グラフは生データを表示、判定は閾値側で-4して緩める方式に統一）
}

// 月ラベル（DB/推定 共通・最前面）
function _adpGrowthDrawMonthLabels(g, ax) {
  const { ctx } = g;
  const { PAD, toMonthX } = ax;
  ctx.fillStyle = 'rgba(90,122,92,0.8)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  _ADP_GROWTH_MONTH_LABELS.forEach((label, m) => {
    ctx.fillText(label, toMonthX(m), g.H - PAD.bottom + 11);
  });
}

// 三角マーカー（▼下向き）
function _adpGrowthDrawTriangleMarker(ctx, x, yTop, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 5, yTop);
  ctx.lineTo(x + 5, yTop);
  ctx.lineTo(x,     yTop + 7);
  ctx.closePath();
  ctx.fill();
}

// ダイヤモンドマーカー（◆）
function _adpGrowthDrawDiamondMarker(ctx, x, yCenter, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x,     yCenter - 5);
  ctx.lineTo(x + 4, yCenter);
  ctx.lineTo(x,     yCenter + 5);
  ctx.lineTo(x - 4, yCenter);
  ctx.closePath();
  ctx.fill();
}

// 丸マーカー（●）
function _adpGrowthDrawCircleMarker(ctx, x, yCenter, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, yCenter, 4, 0, Math.PI * 2);
  ctx.fill();
}

// 四角マーカー（■）
function _adpGrowthDrawSquareMarker(ctx, x, yCenter, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, yCenter - 4, 8, 8);
}

// ═══════════════════════════════════════════
//  ① 生育期間グラフ：DB登録カレンダー（上段）
// ═══════════════════════════════════════════
function _adpRenderGrowthChartDB(cropId) {
  const g = _adpGrowthSetup('adp-growth-db-canvas', 'adp-growth-db-legend', '旬別気温データなし（AMeDAS未取得）');
  if (!g) return;
  const { ctx } = g;

  const crop = _adpGrowthFindCrop(cropId);
  const ax   = _adpGrowthAxes(g, crop);
  const { PAD, gW, gH, toMonthX, barW_m } = ax;

  // DB登録カレンダーの4段階（播種・育苗・定植・収穫）を月indexへ変換
  const STAGES = [
    { key: 'sowing',     label: '播種', shade: 'rgba(56,189,248,0.16)',  mark: 'rgba(56,189,248,0.9)',  draw: 'triangle' },
    { key: 'seedling',   label: '育苗', shade: 'rgba(45,212,191,0.16)',  mark: 'rgba(45,212,191,0.9)',  draw: 'circle'   },
    { key: 'transplant', label: '定植', shade: 'rgba(236,72,153,0.14)', mark: 'rgba(236,72,153,0.9)', draw: 'square'   },
    { key: 'harvest',    label: '収穫', shade: 'rgba(74,222,128,0.20)',  mark: 'rgba(74,222,128,0.9)',  draw: 'diamond'  },
  ];
  const stageIdxs = STAGES.map(s => ({
    ...s,
    idxs: crop ? _adpGrowthCalToIdx(crop.calendar?.[s.key]) : [],
  }));

  // 生育期間全体の起点（4段階のうち最も早い月）・終点（収穫の最も遅い月）
  const allStartIdxs = stageIdxs.filter(s => s.key !== 'harvest').flatMap(s => s.idxs);
  const startIdx     = allStartIdxs.length ? Math.min(...allStartIdxs) : null;
  const harvestIdxs  = stageIdxs.find(s => s.key === 'harvest').idxs;

  // ① 降水量適正帯シェード（最背面）
  _adpGrowthDrawRainShade(g, ax, crop);

  // ② 各段階の縦帯シェード
  stageIdxs.forEach(s => {
    s.idxs.forEach(m => {
      const x0 = toMonthX(m) - barW_m / 2;
      ctx.fillStyle = s.shade;
      ctx.fillRect(x0, PAD.top, barW_m, gH);
    });
  });

  // ③ 生育期間帯（起点→収穫）横グラデーション
  if (startIdx !== null && harvestIdxs.length > 0) {
    const endM = Math.max(...harvestIdxs);
    const x0   = toMonthX(startIdx) - barW_m / 2;
    const x1   = toMonthX(endM)     + barW_m / 2;
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0,   'rgba(56,189,248,0.08)');
    grad.addColorStop(0.5, 'rgba(56,189,248,0.14)');
    grad.addColorStop(1,   'rgba(56,189,248,0.06)');
    ctx.fillStyle = grad;
    if (x1 > x0) ctx.fillRect(x0, PAD.top, x1 - x0, gH);
  }

  // ④ グリッド・降水量棒・気温折れ線
  _adpGrowthDrawSeries(g, ax, crop);

  // ⑤ 各段階マーカー（最前面）
  stageIdxs.forEach(s => {
    s.idxs.forEach(m => {
      const x = toMonthX(m);
      const y = PAD.top + 4;
      if (s.draw === 'triangle') _adpGrowthDrawTriangleMarker(ctx, x, PAD.top + 1, s.mark);
      else if (s.draw === 'circle')  _adpGrowthDrawCircleMarker(ctx, x, y, s.mark);
      else if (s.draw === 'square')  _adpGrowthDrawSquareMarker(ctx, x, y, s.mark);
      else if (s.draw === 'diamond') _adpGrowthDrawDiamondMarker(ctx, x, y, s.mark);
    });
  });

  // ⑥ 月ラベル
  _adpGrowthDrawMonthLabels(g, ax);

  // ⑦ 凡例
  const subEl    = document.getElementById('adp-growth-db-sub');
  const legendEl = document.getElementById('adp-growth-db-legend');

  if (crop) {
    if (subEl) subEl.textContent = `${crop.name} のDB登録暦・降水量を表示中`;

    const gpMin = crop.conditions.growthPeriodMin;
    const gpMax = crop.conditions.growthPeriodMax;
    const gpText = (gpMin != null && gpMax != null)
      ? `播種〜収穫：約${gpMin}〜${gpMax}日`
      : gpMin != null ? `播種〜収穫：約${gpMin}日〜`
      : gpMax != null ? `播種〜収穫：〜約${gpMax}日`
      : null;

    const rMin = crop.conditions.rainfallMin;
    const rMax = crop.conditions.rainfallMax;
    const rText = (rMin != null && rMax != null) ? `${rMin}〜${rMax}mm` : null;

    const stageLabels = stageIdxs
      .filter(s => s.idxs.length > 0)
      .map(s => `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:${s.mark}"></span>${s.label} ${s.idxs.map(i => (i + 1) + '月').join('/')}</span>`)
      .join('');

    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
      ${stageLabels}
      ${rText ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.5)"></span>適正降水 ${rText}</span>` : ''}
      ${gpText ? `<span class="adp-tl-item adp-tl-period">${gpText}</span>` : ''}
      ${g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}（+4℃補正）</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択するとDB登録の播種・育苗・定植・収穫を表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
    `;
  }
}

// ═══════════════════════════════════════════
//  ② 生育期間グラフ：気候推定（Phenology/GDD・下段）
// ═══════════════════════════════════════════
function _adpRenderGrowthChartEst(cropId) {
  const g = _adpGrowthSetup('adp-growth-est-canvas', 'adp-growth-est-legend', '旬別気温データなし（AMeDAS未取得）');
  if (!g) return;
  const { ctx } = g;

  const crop = _adpGrowthFindCrop(cropId);
  const ax   = _adpGrowthAxes(g, crop);
  const { PAD, gW, gH, toX, toTY } = ax;

  // Phenology播種ウィンドウ＋GDD積算（crop+decadeArr両方ある時のみ）
  let sowingWindows = [];
  let gddCurve      = null;
  let gddMax        = 0;
  if (crop && typeof Phenology !== 'undefined') {
    // 生データ(decadeArr)をそのまま渡し、cultivationMode を phenology 側に伝播
    // 閾値の緩和(下限-4)は phenology.sowingWindows 内で処理される
    sowingWindows = Phenology.sowingWindows(g.decadeArr, crop, g.cultivationMode);
    if (sowingWindows.length > 0) {
      const base = crop.conditions?.tempMeanMin ?? 10;
      gddCurve = Phenology.accumulateGDD(g.tMeanArr, base, sowingWindows[0].startDecade);
      gddMax   = Math.max(...gddCurve.filter(v => v !== null), 1);
    }
  }

  // ① 降水量適正帯シェード（最背面）
  _adpGrowthDrawRainShade(g, ax, crop);

  // ② Phenology播種ウィンドウ帯（スコア順上位3件を緑帯でシェード）
  if (sowingWindows.length > 0) {
    const decW = gW / (_ADP_GROWTH_N - 1);
    sowingWindows.slice(0, 3).forEach((win, rank) => {
      const alpha = 0.22 - rank * 0.06;
      const s  = win.startDecade;
      const e  = win.endDecade;
      const x0 = ax.toX(s) - decW / 2;
      const x1 = e >= s ? ax.toX(e) + decW / 2 : ax.toX(e + 36) + decW / 2;
      const rw = Math.min(x1 - x0, gW - (x0 - PAD.left));
      if (rw > 0) {
        ctx.fillStyle = `rgba(34,197,94,${alpha})`;
        ctx.fillRect(Math.max(x0, PAD.left), PAD.top, Math.min(rw, gW), gH);
      }
    });
  }

  // ③ グリッド・降水量棒・気温折れ線
  _adpGrowthDrawSeries(g, ax, crop);

  // ④ GDD積算カーブ（紫破線）
  if (gddCurve && gddMax > 0) {
    const toGY = v => PAD.top + (1 - v / gddMax) * gH;
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.8)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    let gMoved = false;
    gddCurve.forEach((v, i) => {
      if (v === null) { gMoved = false; return; }
      const x = toX(i), y = toGY(v);
      if (!gMoved) { ctx.moveTo(x, y); gMoved = true; }
      else         { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(167,139,250,0.85)';
    ctx.font      = '8px DM Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(gddMax)}GDD`, PAD.left + gW + 3, PAD.top + 16);
    ctx.fillText('0GDD', PAD.left + gW + 3, PAD.top + gH - 4);
    ctx.restore();
  }

  // ⑤ 最適ウィンドウの播種/定植適期マーカー（▼緑）＋収穫予測マーカー（◆紫）
  let bestWin = null;
  if (sowingWindows.length > 0) {
    bestWin = sowingWindows[0];
    const bx = toX(bestWin.startDecade);
    _adpGrowthDrawTriangleMarker(ctx, bx, PAD.top + 1, 'rgba(34,197,94,0.95)');

    if (bestWin.harvestDecade != null) {
      const hx = toX(bestWin.harvestDecade);
      _adpGrowthDrawDiamondMarker(ctx, hx, PAD.top + 4, 'rgba(167,139,250,0.95)');
    }
  }

  // ⑥ 月ラベル
  _adpGrowthDrawMonthLabels(g, ax);

  // ⑦ 凡例
  const subEl    = document.getElementById('adp-growth-est-sub');
  const legendEl = document.getElementById('adp-growth-est-legend');

  if (crop) {
    if (subEl) subEl.textContent = `${crop.name} の気候推定暦（GDD）を表示中`;

    const rMin = crop.conditions.rainfallMin;
    const rMax = crop.conditions.rainfallMax;
    const rText = (rMin != null && rMax != null) ? `${rMin}〜${rMax}mm` : null;

    const sowWinLabel    = bestWin ? Phenology.decadeLabel(bestWin.startDecade) : null;
    const sowWinEndLabel = bestWin ? Phenology.decadeLabel(bestWin.endDecade)   : null;
    const harvestLabel   = (bestWin && bestWin.harvestDecade != null) ? Phenology.decadeLabel(bestWin.harvestDecade) : null;

    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
      ${sowWinLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.6)"></span>播種/定植適期 ${sowWinLabel}〜${sowWinEndLabel}</span>` : ''}
      ${harvestLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.85)"></span>収穫予測 ${harvestLabel}</span>` : ''}
      ${rText ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.5)"></span>適正降水 ${rText}</span>` : ''}
      ${gddCurve ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.8)"></span>GDD積算</span>` : ''}
      ${!bestWin ? `<span class="adp-tl-item adp-tl-period">この気候では適期が見つかりませんでした</span>` : ''}
      ${g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}（+4℃補正）</span>` : ''}
    `;
  } else {
    if (subEl) subEl.textContent = '作物を選択すると気候推定（GDD）による播種/定植適期・収穫予測を表示';
    if (legendEl) legendEl.innerHTML = `
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:#fbbf24"></span>旬平均気温</span>
      <span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(96,165,250,0.7)"></span>月別降水量</span>
    `;
  }
}

// ─── 生育期間グラフ：呼び出し元互換ラッパー（現在のネストサブタブに応じて描画を振り分け） ───
// 既存の呼び出し元（_adpRenderGrowthChart(cropId)）はすべてそのまま動作する。
// どのペインを描くかは _adpGrowthCurrentSubTab（暦グラフ/ガント/GDD/適期マップ/方式比較）で決まる。
function _adpRenderGrowthChart(cropId) {
  const pane = (typeof _adpGrowthCurrentSubTab !== 'undefined') ? _adpGrowthCurrentSubTab : 'calendar';

  if (pane === 'calendar') {
    _adpRenderGrowthChartDB(cropId);
    _adpRenderGrowthChartEst(cropId);
  } else if (pane === 'gantt') {
    if (typeof _adpRenderGrowthGantt === 'function') _adpRenderGrowthGantt(cropId);
  } else if (pane === 'gdd') {
    if (typeof _adpRenderGrowthGDD === 'function') _adpRenderGrowthGDD(cropId);
  } else if (pane === 'heatmap') {
    if (typeof _adpRenderGrowthHeatmap === 'function') _adpRenderGrowthHeatmap(cropId);
  } else if (pane === 'compare') {
    if (typeof _adpRenderGrowthCompare === 'function') _adpRenderGrowthCompare(cropId);
  }
}

// ─── 生育期間タブ内ネストサブタブ切替（📅暦グラフ/📊ガント/🌡️GDD/🗺️適期マップ/⚖️方式比較） ───
const ADP_GROWTH_PANE_KEYS    = ['calendar', 'gantt', 'gdd', 'heatmap', 'compare'];
let   _adpGrowthCurrentSubTab = 'calendar'; // 現在の生育期間内サブタブ（初期値＝暦グラフ）

function _adpGrowthSwitchSubTab(paneKey) {
  _adpGrowthCurrentSubTab = paneKey;

  // タブボタンのactive切替
  document.querySelectorAll('.adp-growth-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.growthPane === paneKey);
  });
  // ペインの表示切替
  ADP_GROWTH_PANE_KEYS.forEach(p => {
    const el = document.getElementById('adp-growth-pane-' + p);
    if (!el) return;
    el.style.display = (p === paneKey) ? '' : 'none';
  });

  // 表示時に再描画（offsetWidthが0→正常値になるタイミングを待つ）
  setTimeout(() => _adpRenderGrowthChart(_adpSelectedCropId), 30);
}

// ─── 生育期間ペイン用ランキングリスト描画 ───
function _adpRenderGrowthRankingList() {
  const el = document.getElementById('crop-ranking-growth');
  if (!el) return;

  // ── 気候推定モード ──
  if (_adpClimateMode) {
    _adpRenderClimateRankingList(el, 'growth');
    return;
  }

  // ── DBモード（従来） ──
  const scores = _crFilteredScores ? _crFilteredScores() : (_crScores || []);
  const mode   = currentAreaData?.cultivationMode || 'openField';
  if (!scores.length) {
    el.innerHTML = '<div class="empty-mini">データなし</div>';
    return;
  }

  // Phenology用: decadeArrをこのスコープで取得
  const decadeArr = currentAreaData?.climate?.decadeArr;

  // 露地側の同フィルタ済みスコア（順位変動用）
  const ofScores = (mode !== 'openField' && _crOpenFieldScores)
    ? scores.map(s => {
        const base = _crOpenFieldScores.find(b => b.id === s.crop.id);
        return base ? { crop: s.crop, score: base.score } : null;
      }).filter(Boolean).sort((a, b) => b.score - a.score)
    : null;

  const summaryHtml = _adpBuildCorrectionSummary(mode, scores);

  const itemsHtml = scores.slice(0, 60).map((s, i) => {
    const isSelected = s.crop.id === _adpSelectedCropId;
    const bar = Math.round((s.score / 100) * 100);
    const gpMin = s.crop.conditions?.growthPeriodMin;
    const gpMax = s.crop.conditions?.growthPeriodMax;
    const gpStr = (gpMin != null || gpMax != null)
      ? `<span class="adp-cr-gp">${gpMin ?? '?'}〜${gpMax ?? '?'}日</span>`
      : '';

    // Phenologyで播種〜収穫旬ラベルを計算
    let phenoStr = '';
    if (typeof Phenology !== 'undefined' && decadeArr) {
      const _cultMode3006 = currentAreaData?.cultivationMode || 'openField';
      const wins = Phenology.sowingWindows(decadeArr, s.crop, _cultMode3006);
      if (wins.length > 0) {
        const sLabel = Phenology.decadeLabel(wins[0].startDecade);
        const eLabel = Phenology.decadeLabel(wins[0].endDecade);
        phenoStr = `<span class="adp-cr-pheno">▼${sLabel} → ◆${eLabel}</span>`;
      }
    }

    // 補正比較
    const { compareHtml } = _adpBuildScoreCompare(s.crop.id, s.score, mode);
    const rankDiff = ofScores ? _adpCalcRankDiff(s.crop.id, i, ofScores) : null;
    const rankDiffHtml = rankDiff != null && rankDiff !== 0
      ? `<span class="adp-rank-diff ${rankDiff > 0 ? 'adp-diff-up' : 'adp-diff-down'}">`
        + (rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`) + `</span>`
      : '';

    return `
      <div class="adp-cr-item${isSelected ? ' selected' : ''}" onclick="adpCropTap(this, '${s.crop.id}')">
        <div class="adp-cr-name">${s.crop.name}${gpStr}${rankDiffHtml}</div>
        ${phenoStr ? `<div class="adp-cr-pheno-wrap">${phenoStr}</div>` : ''}
        <div class="adp-cr-bar-wrap">
          <div class="adp-cr-bar" style="width:${bar}%"></div>
          <span class="adp-cr-score">${Math.round(s.score)}</span>
          ${compareHtml ? `<span class="adp-score-compare-g">${compareHtml}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = summaryHtml + itemsHtml;
}

// ─── crSwitchMajor / crSwitchMinor のADPビュー連携 ───
// Phase3: analysis.js側のcrSwitchMajor/Minorが_adpRenderRankingListを直接呼ぶため
// オーバーライドは不要になった。adp-view開中はarea.jsのDOM（cr-tab-major等）が
// 同じonclick="crSwitchMajor(...)"を持ち、analysis.js側関数が処理する。

// ─── フルビューを閉じてsheetに戻る ───
function closeAreaDetailPanel() {
  // 収益シミュレーターに未保存変更がある場合は確認
  if (_adpRkCurrentPane === 'sim' && _simDirty) {
    showConfirmDialog('未保存の変更があります。破棄してよろしいですか？', '破棄する', 'キャンセル', false).then(ok => {
      if (!ok) return;
      _simDirty = false;
      delete _simMemory[_simSelectedCropId];
      _doCloseAreaDetailPanel();
    });
    return;
  }
  _doCloseAreaDetailPanel();
}

function _doCloseAreaDetailPanel() {
  const view = document.getElementById('adp-view');
  if (view) view.classList.remove('open');

  // bottom-nav を復帰
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.remove('hidden');

  // fs-pageを復帰・エリアタブを表示
  if (typeof openPage === 'function') openPage('areas');

  // 栽培方式トグルを削除（次回オープン時に再生成）
  const toggle = document.getElementById('adp-cultivation-toggle');
  if (toggle) toggle.remove();
  const toggleG = document.getElementById('adp-cultivation-toggle-growth');
  if (toggleG) toggleG.remove();

  // 作物選択状態・canvasをリセット
  _adpSelectedCropId = null;
  
  const canvas = document.getElementById('adp-temp-canvas');
  if (canvas) { canvas.width = 0; canvas.height = 0; }
  const gCanvasDB = document.getElementById('adp-growth-db-canvas');
  if (gCanvasDB) { gCanvasDB.width = 0; gCanvasDB.height = 0; }
  const gCanvasEst = document.getElementById('adp-growth-est-canvas');
  if (gCanvasEst) { gCanvasEst.width = 0; gCanvasEst.height = 0; }

  // 作物未選択時の各結果パネルをデフォルト表示に戻す（前回選択作物の残留表示を防止）
  const fertResult = document.getElementById('fert-result');
  if (fertResult) fertResult.innerHTML = '<div class="empty-mini">作物を選択すると施肥概算が表示されます。</div>';
  const riskResult = document.getElementById('risk-result');
  if (riskResult) riskResult.innerHTML = '<div class="empty-mini">作物を選択するとリスク・注意点が表示されます。</div>';
  const calendarResult = document.getElementById('calendar-result');
  if (calendarResult) calendarResult.innerHTML = '<div class="empty-mini">作物を選択すると生育カレンダーが表示されます。</div>';
}

// ─── 作物タップ → 選択して各タブへ反映 ───
function adpCropTap(el, cropId) {
  if (!el) return;

  // アコーディオン開閉（適合度・生育期間ランキングリスト対象）
  const isOpen = el.classList.contains('cr-item-open') || el.classList.contains('adp-cr-item-open');
  const list = el.closest('#crop-ranking, #crop-ranking-growth');
  if (list) {
    list.querySelectorAll('.cr-item-open, .adp-cr-item-open').forEach(other => {
      other.classList.remove('cr-item-open', 'adp-cr-item-open');
    });
  }
  if (!isOpen) {
    el.classList.add(el.classList.contains('adp-cr-item') ? 'adp-cr-item-open' : 'cr-item-open');
  }

  // 作物選択・各タブ反映（adp-view開中のみ）
  if (document.getElementById('adp-view')?.classList.contains('open')) {
    if (_adpSelectedCropId !== cropId) {
      _adpSelectedCropId = cropId;
      // グラフ・各タブ更新
      _adpRenderTempChart(_adpSelectedCropId);
      _adpRenderGrowthChart(_adpSelectedCropId);
      _adpRenderRankingList();
      _adpRenderGrowthRankingList();
      _adpRenderProfitRankingList();
      // 収益・施肥・リスク・作業カレンダー更新
      const ad = currentAreaData;
      const scoreEntry = (typeof _crScores !== 'undefined')
        ? _crScores.find(s => s.crop.id === cropId) : null;
      let crop = scoreEntry?.crop ?? null;
      if (!crop && typeof CROP_DB !== 'undefined') {
        crop = CROP_DB.find ? CROP_DB.find(c => c.id === cropId)
             : Object.values(CROP_DB).flat().find(c => c.id === cropId);
      }
      const single = (crop && typeof buildSingleCropAnalysis === 'function')
        ? buildSingleCropAnalysis(cropId, ad) : null;
      if (crop) {
        // ランキングタップは分析側の操作なので、matchタブの分析専用枠に描画する
        if (typeof _renderFertResult  === 'function') _renderFertResult(crop, 'fert-result-analysis');
        if (typeof _renderRiskResult  === 'function') _renderRiskResult(crop, 'risk-result-analysis');
        if (typeof renderWorkCalendar === 'function') renderWorkCalendar(crop, 'calendar-result-analysis');
      }
      // 適合度ペイン更新
      const confDetailEl = document.getElementById('conf-detail');
      if (confDetailEl && single) {
        const decadeArr = ad?.climate?.decadeArr;
        let estSeason = null;
        if (decadeArr && typeof Phenology !== 'undefined') {
          const _cultMode3126 = currentAreaData?.cultivationMode || 'openField';
          const wins = Phenology.sowingWindows(decadeArr, single.crop, _cultMode3126);
          if (wins?.length) estSeason = _buildEstimatedSeasonLabel(wins[0]);
        }
        const seasonHtml = _buildSeasonBlockHtml(single.crop, estSeason);
        const confItems  = single.confidence.items.map(i => `- ${i}`).join('<br>');
        confDetailEl.innerHTML = seasonHtml + (confItems ? `<div class="conf-items">${confItems}</div>` : '');
      }
      // サマリーバー・作物バー更新
      const _scoreVal = scoreEntry?.score ?? (single?.scoreResult?.score ?? null);
      const modeLabels = { openField:'露地', greenhouse:'ハウス', heatedGreenhouse:'加温' };
      _adpUpdateSummaryBar({
        cropName: crop?.name ?? null,
        areaName: _adpArea?.name ?? null,
        score:    _scoreVal,
        mode:     modeLabels[ad?.cultivationMode] || '露地栽培',
        evalMode: _adpEvalModeLabel(),
      });
      
    }
  }
}


function _fmtMoney(val) {
  if (val == null) return '—';
  return val >= 10000
    ? `${Math.round(val / 1000)}千円`
    : `${val}円`;
}

// ─── 「この作物で各タブを更新」→ 各ペインに反映 ───
function _adpSelectCropForAnalysis(cropId) {
  _adpCloseRankingDialog();

  const ad = currentAreaData;
  if (!_adpArea || !ad) return;

  _adpSelectedCropId = cropId;

  // localStorage に分析用作物を保存
  const areaId = _adpArea?.id || _adpArea?.name || '';
  if (areaId) localStorage.setItem(`adpCropAnalysis_${areaId}`, cropId);

  const scoreEntry = (typeof _crScores !== 'undefined')
    ? _crScores.find(s => s.crop.id === _adpSelectedCropId)
    : null;

  let crop = scoreEntry?.crop ?? null;
  if (!crop && typeof CROP_DB !== 'undefined') {
    crop = CROP_DB.find ? CROP_DB.find(c => c.id === _adpSelectedCropId)
         : Object.values(CROP_DB).flat().find(c => c.id === _adpSelectedCropId);
  }

  // _crScoresが未充填でもscoreEntryの代わりに使う。適合度ペインでも共用
  const single = (crop && typeof buildSingleCropAnalysis === 'function')
    ? buildSingleCropAnalysis(_adpSelectedCropId, ad)
    : null;

  // ── グラフ再描画 ──
  _adpRenderTempChart(_adpSelectedCropId);
  _adpRenderGrowthChart(_adpSelectedCropId);

  // 施肥・リスク・作業カレンダー（分析側の選択なので、matchタブの分析専用枠に描画する）
  if (crop) {
    if (typeof _renderFertResult  === 'function') _renderFertResult(crop, 'fert-result-analysis');
    if (typeof _renderRiskResult  === 'function') _renderRiskResult(crop, 'risk-result-analysis');
    if (typeof renderWorkCalendar === 'function') renderWorkCalendar(crop, 'calendar-result-analysis');
  }

  // 適合度ペイン
  {
    const confDetailEl = document.getElementById('conf-detail');
    if (confDetailEl && single) {
      const decadeArr = ad.climate?.decadeArr;
      let estSeason = null;
      if (decadeArr && typeof Phenology !== 'undefined') {
        const _cultMode3337 = ad.cultivationMode || currentAreaData?.cultivationMode || 'openField';
        const wins = Phenology.sowingWindows(decadeArr, single.crop, _cultMode3337);
        if (wins?.length) estSeason = _buildEstimatedSeasonLabel(wins[0]);
      }
      const seasonHtml = _buildSeasonBlockHtml(single.crop, estSeason);
      const confItems  = single.confidence.items.map(i => `- ${i}`).join('<br>');
      confDetailEl.innerHTML = seasonHtml + (confItems ? `<div class="conf-items">${confItems}</div>` : '');
    }
  }

  // スコア値確定
  const _scoreVal = scoreEntry
    ? scoreEntry.score
    : (single?.scoreResult?.score ?? null);

  // サマリーバー・作物バー更新
  const modeLabels = { openField:'露地', greenhouse:'ハウス', heatedGreenhouse:'加温' };
  _adpUpdateSummaryBar({
    cropName: crop?.name ?? null,
    areaName: _adpArea?.name ?? null,
    score:    _scoreVal,
    mode:     modeLabels[ad.cultivationMode] || '露地栽培',
    evalMode: _adpEvalModeLabel(),
  });
  

  // ランキングリストの選択ハイライトを更新（ダイアログが開いている場合のみ）
  _adpRenderRankingList();
  _adpRenderGrowthRankingList();

  // 現在表示中のタブを強制再描画（ranking/growth は canvas 再描画済みのためスキップ）
  const cur = _adpCurrentSubTab;
  if (cur === 'ranking') {
    setTimeout(() => _adpRenderTempChart(_adpSelectedCropId), 30);
  } else if (cur === 'growth') {
    setTimeout(() => _adpRenderGrowthChart(_adpSelectedCropId), 30);
  }
}


// 作物の播種/育苗「始まり月」を返す（calendar.sowing優先、なければseedling。
// 両配列とも昇順ソート済み実データのためarr[0]で開始月として安全に使える）
function _adpCropStartMonth(crop) {
  const arr = crop?.calendar?.sowing || crop?.calendar?.seedling;
  return (Array.isArray(arr) && arr.length) ? arr[0] : null;
}

// 月と月の「循環距離」を返す（1〜12月を環状とみなし、12⇄1月のような年跨ぎも正しく1とする）
// 例: _adpMonthCircularDiff(12, 1) === 1 / _adpMonthCircularDiff(6, 9) === 3
function _adpMonthCircularDiff(a, b) {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

/**
 * _openCropPickerSheet(config)
 * 共通作物選択シート。条件設定・収益シミュレーターの両方から利用する。
 *
 * @param {Object} config
 * @param {function(cropId: string): void} config.onSelect  - 作物確定時コールバック
 * @param {string} [config.title]  - ヘッダータイトル（省略時 '🌱 作物を選ぶ'）
 */
function _openCropPickerSheet(config) {
  const _onSelect = config.onSelect;
  const _title    = config.title || '🌱 作物を選ぶ';

  // CROP_DB取得
  let allCrops = [];
  if (typeof CROP_DB !== 'undefined') {
    allCrops = CROP_DB.find
      ? CROP_DB
      : Object.values(CROP_DB).flat();
  }
  if (!allCrops.length) {
    showToast('作物データを読み込み中です', 'amber');
    return;
  }

  // 大カテゴリ定義
  const CATEGORIES = [
    { key: 'all',       label: 'すべて' },
    { key: 'grain',     label: '穀物・豆類' },
    { key: 'vegetable', label: '野菜' },
    { key: 'fruit',     label: '果物' },
    { key: 'wild',      label: '山菜・草' },
    { key: 'forest',    label: '林産' },
    { key: 'oil',       label: '油脂' },
    { key: 'fiber',     label: '繊維' },
  ];

  // 月絞り込み定義（播種/育苗の「始まり月」。1〜12月の12タブ）
  const MONTHS_FILTER = ['1','2','3','4','5','6','7','8','9','10','11','12'];

  // 大カテゴリ → DB category キーのマッピング
  const CAT_MAP = {
    grain:     ['grain', 'legume'],
    vegetable: ['leafy', 'fruit_veg', 'root', 'vegetable'],
    fruit:     ['fruit'],
    wild:      ['wildveg', 'herb'],
    forest:    ['forest'],
    oil:       ['oil'],
    fiber:     ['fiber'],
  };

  // 大カテゴリ → サブカテゴリ定義（サブなしの場合は空配列）
  const SUBCAT_MAP = {
    grain:     [
      { key: 'grain',  label: '穀物' },
      { key: 'legume', label: '豆類' },
    ],
    vegetable: [
      { key: 'leafy',     label: '葉菜類' },
      { key: 'fruit_veg', label: '果菜類' },
      { key: 'root',      label: '根菜類' },
      { key: 'vegetable', label: 'その他' },
    ],
    wild: [
      { key: 'wildveg', label: '山菜・きのこ' },
      { key: 'herb',    label: 'ハーブ・薬草' },
    ],
    fruit:  [],
    forest: [],
    oil:    [],
    fiber:  [],
  };

  // シート状態
  let _selectedCat    = 'all';
  let _selectedSubcat = null; // null = サブカテゴリ未選択（大カテゴリ全体）
  let _selectedMonth  = null; // null = 月絞り込みなし。1〜12（数値）
  let _searchText     = '';   // テキスト検索文字列

  // 作物リスト HTML 生成（カテゴリ AND 月 AND テキスト のAND結合）
  function buildList(cat, subcat, month, searchText) {
    let catList;
    if (cat === 'all') {
      catList = allCrops;
    } else if (subcat) {
      catList = allCrops.filter(c => c.category === subcat);
    } else {
      catList = allCrops.filter(c => (CAT_MAP[cat] || [cat]).includes(c.category));
    }

    let list;
    if (month != null) {
      // AND結合：カテゴリ絞り込み済みリストの中で、さらに開始月が「選択月の前後1ヶ月以内」
      // （前月・当月・翌月の3ヶ月、12⇄1月の年跨ぎも_adpMonthCircularDiffで正しく扱う）のもののみ
      list = catList.filter(c => {
        const sm = _adpCropStartMonth(c);
        return sm != null && _adpMonthCircularDiff(sm, month) <= 1;
      });
    } else {
      list = catList;
    }

    // テキスト検索（作物名の部分一致、大文字小文字無視）
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    if (!list.length) return '<div class="css-empty">該当作物なし</div>';
    return list.map(c => `
      <div class="css-crop-item" onclick="_adpCropPickerSelect('${c.id}')">
        <span class="css-crop-name">${escHtml(c.name)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`).join('');
  }

  // サブカテゴリタブ HTML 生成（サブカテゴリなしでも月トリガーのため常に行を返す）
  function buildSubcatTabs(cat, currentSubcat, currentMonth) {
    const subs = SUBCAT_MAP[cat] || [];
    const tabsHtml = subs.map(s =>
      `<button class="css-subcat-btn${currentSubcat === s.key ? ' active' : ''}"
        data-subcat="${s.key}"
        onclick="_adpCropSelectSwitchSubcat('${s.key}')">${s.label}</button>`
    ).join('');
    return `<div class="css-subcat-tabs" id="css-subcat-tabs">${tabsHtml}${buildMonthTrigger(currentMonth)}</div>`;
  }

  // 月アコーディオントリガーボタン HTML 生成
  function buildMonthTrigger(currentMonth) {
    const label = currentMonth != null
      ? `${currentMonth}月 <span class="css-month-clear" onclick="event.stopPropagation();_adpCropSelectSwitchMonth(${currentMonth})">✕</span>`
      : '栽培開始月で選ぶ';
    return `<button class="css-month-trigger${currentMonth != null ? ' has-month' : ''}" id="css-month-trigger"
      onclick="_adpCropSelectToggleMonthPanel()">${label} <span class="css-month-arrow">▾</span></button>`;
  }

  // 月グリッドパネル HTML 生成（4列×3行）
  function buildMonthPanel(currentMonth) {
    const btns = MONTHS_FILTER.map(mStr => {
      const m = Number(mStr);
      return `<button class="css-month-btn${currentMonth === m ? ' active' : ''}"
        data-month="${m}"
        onclick="_adpCropSelectSwitchMonth(${m})">${mStr}月</button>`;
    }).join('');
    return `<div class="css-month-panel" id="css-month-panel">${btns}</div>`;
  }

  // シート生成（初回のみDOM追加）
  let sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'adp-crop-select-sheet';
    sheet.className = 'adp-crop-detail-sheet';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => {
      if (e.target === sheet) _adpCloseCropSelectSheet();
    });
  }

  // 大カテゴリタブ HTML 生成
  const catTabsHtml = CATEGORIES.map(c =>
    `<button class="css-cat-btn${c.key === _selectedCat ? ' active' : ''}"
      data-cat="${c.key}"
      onclick="_adpCropSelectSwitchCat('${c.key}')">${c.label}</button>`
  ).join('');

  sheet.innerHTML = `
    <div class="cdp-inner">
      <div class="cdp-handle"></div>
      <div class="cdp-header">
        <div class="cdp-crop-name">${_title}</div>
        <button class="cdp-close" onclick="_adpCloseCropSelectSheet()">✕</button>
      </div>
      <input type="search" class="css-search-input" id="css-search-input"
        placeholder="作物名で検索…" value=""
        oninput="_adpCropSelectSearch(this.value)">
      <div class="css-cat-tabs" id="css-cat-tabs">${catTabsHtml}</div>
      ${buildMonthPanel(null)}
      <div id="css-subcat-wrap">${buildSubcatTabs('all', null, null)}</div>
      <div class="css-list" id="css-list">${buildList('all', null, null, '')}</div>
    </div>`;

  sheet.classList.add('open');

  // タブ切り替え用の関数・状態をシートに保持
  sheet._buildList         = buildList;
  sheet._buildSubcatTabs   = buildSubcatTabs;
  sheet._buildMonthTrigger = buildMonthTrigger;
  sheet._buildMonthPanel   = buildMonthPanel;
  sheet._getState          = () => ({ cat: _selectedCat, subcat: _selectedSubcat, month: _selectedMonth, search: _searchText });
  sheet._setState          = (cat, subcat, month, search) => {
    _selectedCat    = cat;
    _selectedSubcat = subcat;
    _selectedMonth  = month;
    if (search !== undefined) _searchText = search;
  };
  // コールバックをシートに保持（_adpCropPickerSelectから参照）
  sheet._onSelect = _onSelect;
}

/** 後方互換ラッパー：条件設定タブからの既存呼び出しを維持 */
// 現在どのセグメントから作物シートを開いたか
let _adpCropSelectSeg = 'analysis';

function _adpOpenCropSelectSheet(seg) {
  _adpCropSelectSeg = seg || _adpCurrentSeg || 'analysis';
  _openCropPickerSheet({
    onSelect: (cropId) => {
      const areaId = _adpArea?.id || _adpArea?.name || '';
      if (_adpCropSelectSeg === 'practice') {
        if (_adpPracticecrops.some(c => c.cropId === cropId)) {
          showToast('既に追加済みの作物です', 'amber');
          return;
        }
        const newCount = _adpPracticecrops.length + 1;
        const baseRatio = Math.floor(100 / newCount);
        const rem = 100 - baseRatio * newCount;
        _adpPracticecrops = _adpPracticecrops.map((c, i) => ({
          ...c,
          ratio: baseRatio + (i === 0 ? rem : 0),
        }));
        _adpPracticecrops.push({ cropId, ratio: baseRatio });
        _adpSavePracticecrops(areaId);
        _adpRenderPracticecrops();
        _adpRefreshPracticeTabs();
      } else {
        localStorage.setItem(`adpCropAnalysis_${areaId}`, cropId);
        _adpSelectCropForAnalysis(cropId);
      }
    },
  });
}

/** cropId → crop名を返すユーティリティ */
function _adpCropIdToName(cropId) {
  if (!cropId || typeof CROP_DB === 'undefined') return cropId;
  const crop = CROP_DB.find
    ? CROP_DB.find(c => c.id === cropId)
    : Object.values(CROP_DB).flat().find(c => c.id === cropId);
  return crop?.name ?? cropId;
}

/** cropId → crop オブジェクトを返すユーティリティ */
function _adpGetCropById(cropId) {
  if (!cropId || typeof CROP_DB === 'undefined') return null;
  return CROP_DB.find
    ? CROP_DB.find(c => c.id === cropId)
    : Object.values(CROP_DB).flat().find(c => c.id === cropId);
}

// ─── 実務側複数作物ヘルパー ───

function _adpSavePracticecrops(areaId) {
  if (!areaId) return;
  localStorage.setItem(`adpCropWork_${areaId}`, JSON.stringify(_adpPracticecrops));
}

function _adpUpdatePracticeRatio(cropId, newRatio) {
  const areaId = _adpArea?.id || _adpArea?.name || '';
  const idx = _adpPracticecrops.findIndex(c => c.cropId === cropId);
  if (idx < 0) return;
  // 最後の作物は操作不可（自動計算）
  const lastIdx = _adpPracticecrops.length - 1;
  if (idx === lastIdx) return;
  _adpPracticecrops[idx].ratio = newRatio;
  // 最後の作物に残りを全て割り当て
  const sumOthers = _adpPracticecrops
    .slice(0, lastIdx)
    .reduce((s, c) => s + (c.ratio || 0), 0);
  _adpPracticecrops[lastIdx].ratio = Math.max(0, 100 - sumOthers);
  _adpSavePracticecrops(areaId);
  _adpRenderPracticecrops();
  _adpRefreshPracticeTabs();
}

function _adpRemovePracticeCrop(cropId) {
  const areaId = _adpArea?.id || _adpArea?.name || '';
  _adpPracticecrops = _adpPracticecrops.filter(c => c.cropId !== cropId);
  _adpSavePracticecrops(areaId);
  _adpRenderPracticecrops();
  _adpRefreshPracticeTabs();
}

function _adpPracticeTotalRatio() {
  return _adpPracticecrops.reduce((s, c) => s + (c.ratio || 0), 0);
}

function _adpPracticeAreaSqm(ratio) {
  const total = currentAreaData?.areaSqm || 0;
  return Math.round(total * ratio / 100);
}

function _adpRefreshPracticeTabs() {
  if (typeof _renderFertResultMulti === 'function')  _renderFertResultMulti(_adpPracticecrops);
  if (typeof _renderRiskResultMulti === 'function')  _renderRiskResultMulti(_adpPracticecrops);
  if (typeof _renderCalendarMulti   === 'function')  _renderCalendarMulti(_adpPracticecrops, 'calendar-result');
}

function _adpRenderPracticecrops() {
  const listEl    = document.getElementById('adp-practice-crops-list');
  const barWrap   = document.getElementById('adp-practice-ratio-bar');
  const totalEl   = document.getElementById('adp-practice-ratio-total');
  const fillEl    = document.getElementById('adp-practice-ratio-fill');
  const addBtnEl  = document.getElementById('adp-crop-bar-btn-practice');
  const addNameEl = document.getElementById('adp-crop-bar-name-practice');
  if (!listEl) return;

  const total = _adpPracticeTotalRatio();
  const over  = total > 100;

  if (barWrap) barWrap.style.display = _adpPracticecrops.length >= 2 ? '' : 'none';
  if (totalEl) {
    totalEl.textContent = `${total}%`;
    totalEl.style.color = over ? 'var(--red)' : 'var(--text2)';
  }
  if (fillEl) {
    fillEl.style.width      = `${Math.min(total, 100)}%`;
    fillEl.style.background = over ? 'var(--red)' : total === 100 ? 'var(--green)' : 'var(--green2)';
  }
  if (addBtnEl)  addBtnEl.classList.toggle('selected', _adpPracticecrops.length > 0);
  if (addNameEl) addNameEl.textContent = '作物を追加';

  if (!_adpPracticecrops.length) {
    listEl.innerHTML = '';
    return;
  }

  const _lastCropIdx = _adpPracticecrops.length - 1;
  listEl.innerHTML = _adpPracticecrops.map(({ cropId, ratio }, _ci) => {
    const isLast = _ci === _lastCropIdx;
    const name   = _adpCropIdToName(cropId);
    const sqm    = _adpPracticeAreaSqm(ratio);
    const haDisp = sqm >= 10000 ? `${(sqm / 10000).toFixed(2)} ha` : `${sqm} ㎡`;
    return `
      <div class="adp-practice-crop-card" data-crop-id="${cropId}">
        <div class="adp-pcc-header">
          <span class="adp-pcc-name">🌿 ${escHtml(name)}</span>
          <button class="adp-pcc-remove" onclick="_adpRemovePracticeCrop('${cropId}')" title="削除">✕</button>
        </div>
        <div class="adp-pcc-slider-row">
          <input type="range" min="0" max="100" value="${ratio}"
            class="adp-pcc-slider${isLast ? ' adp-pcc-slider-auto' : ''}"
            ${isLast ? 'disabled' : "oninput=\"this.nextElementSibling.textContent=this.value+'%'; _adpUpdatePracticeRatio('" + cropId + "', Number(this.value))\""}
          >
          <span class="adp-pcc-ratio-label">${ratio}%${isLast ? ' <span class=\'adp-pcc-auto-badge\'>自動</span>' : ''}</span>
        </div>
        <div class="adp-pcc-area-label">占有面積：約 ${haDisp}</div>
      </div>
    `;
  }).join('');
}

function _adpCropSelectSwitchCat(cat) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;

  // 状態更新（サブカテゴリはリセット、月・テキスト検索は維持）
  const { month, search } = sheet._getState();
  sheet._setState(cat, null, month, search);

  // 大タブ active 切り替え
  sheet.querySelectorAll('.css-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  // サブカテゴリタブ 再描画
  const subcatWrap = document.getElementById('css-subcat-wrap');
  if (subcatWrap) {
    subcatWrap.innerHTML = sheet._buildSubcatTabs(cat, null, month);
  }

  // 作物リスト 再描画
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, null, month, search);
}

function _adpCropSelectSwitchSubcat(subcat) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;

  const { cat, subcat: prevSubcat, month, search } = sheet._getState();

  // 同じサブカテゴリをタップ → 解除（トグル）
  const nextSubcat = (prevSubcat === subcat) ? null : subcat;
  sheet._setState(cat, nextSubcat, month, search);

  // サブタブ active 切り替え
  sheet.querySelectorAll('.css-subcat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subcat === nextSubcat);
  });

  // 作物リスト 再描画
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, nextSubcat, month, search);
}

function _adpCropSelectToggleMonthPanel() {
  const panel = document.getElementById('css-month-panel');
  if (!panel) return;
  panel.classList.toggle('open');
  const trigger = document.getElementById('css-month-trigger');
  if (trigger) trigger.classList.toggle('panel-open', panel.classList.contains('open'));
}

function _adpCropSelectSwitchMonth(month) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;

  const { cat, subcat, month: prevMonth, search } = sheet._getState();

  // 同じ月をタップ → 解除（トグル）
  const nextMonth = (prevMonth === month) ? null : month;
  sheet._setState(cat, subcat, nextMonth, search);

  // 月グリッドボタン active 切り替え
  sheet.querySelectorAll('.css-month-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.month) === nextMonth);
  });

  // トリガーボタン表示更新（サブカテゴリ行内のトリガーを差し替え）
  const subcatTabsEl = document.getElementById('css-subcat-tabs');
  if (subcatTabsEl && sheet._buildMonthTrigger) {
    const oldTrigger = subcatTabsEl.querySelector('#css-month-trigger');
    if (oldTrigger) oldTrigger.outerHTML = sheet._buildMonthTrigger(nextMonth);
  }

  // パネルを閉じる（月選択後は自動クローズ）
  const panel = document.getElementById('css-month-panel');
  if (panel) panel.classList.remove('open');

  // 作物リスト 再描画（カテゴリ AND 月 AND テキスト のAND結合）
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, subcat, nextMonth, search);
}

function _adpCloseCropSelectSheet() {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (sheet) sheet.classList.remove('open');
}

/** 作物アイテムタップ → コールバック呼び出し（旧 _adpSelectCropFromSheet を廃止・統合） */
function _adpCropPickerSelect(cropId) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (sheet && typeof sheet._onSelect === 'function') {
    _adpCloseCropSelectSheet();
    sheet._onSelect(cropId);
  }
}

/** テキスト検索 oninput ハンドラ */
function _adpCropSelectSearch(text) {
  const sheet = document.getElementById('adp-crop-select-sheet');
  if (!sheet) return;
  const { cat, subcat, month } = sheet._getState();
  sheet._setState(cat, subcat, month, text);
  const listEl = document.getElementById('css-list');
  if (listEl) listEl.innerHTML = sheet._buildList(cat, subcat, month, text);
}

// ═══════════════════════════════════════════
//  ANALYSIS WIZARD（analysisWizard.js統合・Phase2）
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
//  ANALYSIS WIZARD — 分析ウィザードダイアログ
//  フロー（1ステップ）:
//    Step1: 営農条件入力（優先軸/設備/栽培期間/販売先/規模/経験）→ 分析実行
// ═══════════════════════════════════════════

// ─── カテゴリラベル（作物検索用） ───
const CATEGORY_LABELS = {
  grain:     { label: '穀物',         icon: '🌾' },
  legume:    { label: '豆類',         icon: '🫘' },
  leafy:     { label: '葉菜類',       icon: '🥬' },
  fruit_veg: { label: '果菜類',       icon: '🍅' },
  root:      { label: '根菜類',       icon: '🥕' },
  vegetable: { label: '野菜（その他）', icon: '🥦' },
  fruit:     { label: '果物',         icon: '🍎' },
  wildveg:   { label: '山菜・きのこ', icon: '🍄' },
  forest:    { label: '林産きのこ',   icon: '🌲' },
  herb:      { label: 'ハーブ・薬草', icon: '🌿' },
  oil:       { label: '油脂作物',     icon: '🫙' },
  fiber:     { label: '繊維作物',     icon: '🧵' },
};

// ─── Step1: 営農条件の選択肢定義（engine.js calcFarmingConditionScoreと対応） ───
const FARM_COND_GROUPS = [
  { key: 'priority', label: '優先軸', icon: '🎯', options: [
      { value: 'profit',   label: '収益重視', icon: '💰' },
      { value: 'easywork', label: '手間最小', icon: '🪶' },
      { value: 'lowrisk',  label: '低リスク', icon: '🛡️' },
  ]},
  { key: 'equipment', label: '設備（好みスコア用）', icon: '🏗️', options: [
      { value: 'openField',  label: '露地のみ',   icon: '☀️' },
      { value: 'greenhouse', label: 'ハウスあり', icon: '🏠' },
      { value: 'paddy',      label: '水田利用可', icon: '💧' },
  ]},
  { key: 'period', label: '栽培期間', icon: '⏳', options: [
      { value: 'short', label: '短期（〜3ヶ月）', icon: '⚡' },
      { value: 'mid',   label: '中期（〜8ヶ月）', icon: '🌱' },
      { value: 'long',  label: '長期・樹木可',     icon: '🌳' },
  ]},
  { key: 'sales', label: '販売先', icon: '🛒', options: [
      { value: 'direct',     label: '直売所',   icon: '🏪' },
      { value: 'roadside',   label: '道の駅',   icon: '🛣️' },
      { value: 'ja',         label: 'JA出荷',   icon: '🚜' },
      { value: 'processing', label: '加工業者', icon: '🏭' },
      { value: 'self',       label: '自家消費', icon: '🍽️' },
  ]},
  { key: 'scale', label: '規模', icon: '👥', options: [
      { value: 'solo',   label: '一人',     icon: '🧑' },
      { value: 'family', label: '家族経営', icon: '👨\u200d👩\u200d👧' },
      { value: 'hired',  label: '雇用あり', icon: '👷' },
  ]},
  { key: 'experience', label: '経験', icon: '🎓', options: [
      { value: 'beginner', label: '初心者', icon: '🌱' },
      { value: 'mid',      label: '中級',   icon: '🌿' },
      { value: 'expert',   label: '上級',   icon: '🌲' },
  ]},
];

// ─── 分析項目定義（an-itab / an-pane のキーと対応） ───
const AW_ITEM_DEFS = [
  { key: 'ranking',  label: 'ランキング',     icon: '🏆' },
  { key: 'growth',   label: '生育期間',       icon: '📈' },
  { key: 'profit',   label: '収益概算',       icon: '💴' },
  { key: 'fert',     label: '施肥概算',       icon: '🧪' },
  { key: 'risk',     label: 'リスク・注意点', icon: '⚠️' },
  { key: 'calendar', label: '生育カレンダー', icon: '📅' },
  { key: 'match',    label: 'エリア適合度',   icon: '📊' },
];

const AW_STEP_TITLES = ['営農条件入力']; // 旧ウィザード互換・参照箇所が残る間は温存

// ─── 条件設定状態 ───
let _awArea           = null;     // 選択中エリアデータ（openAreaDetailPanelで更新）
let _awFarmCond       = null;     // 営農条件（6項目）：アプリ起動時に初期化、デフォルトボタンでリセット
let _awAllScores      = [];       // buildAnalysisResult().cropScores のキャッシュ

/**
 * _awSaveFarmCond()
 * 現在の _awFarmCond・_adpClimateMode を
 * エリアオブジェクト（_adpArea）に書き戻し localStorage / Firestore に永続化する。
 * ※ cultivationMode はここでは扱わない（マスターはインライン編集 saveInlineEdit() 経由のみで変更・保存する）。
 */
function _awSaveFarmCond() {
  const area = _adpArea;
  if (!area || !area.id) return;

  area.farmingConditions = { ..._awFarmCond };
  area.savedEvalMode     = _adpClimateMode ? 'climate' : 'db';

  try {
    const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
    const idx = stored.findIndex(a => a.id === area.id);
    if (idx !== -1) {
      stored[idx].farmingConditions = area.farmingConditions;
      stored[idx].savedEvalMode     = area.savedEvalMode;
      localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
    }
  } catch(e) { console.warn('_awSaveFarmCond localStorage:', e); }

  if (typeof db !== 'undefined' && db && area.id && !String(area.id).startsWith('local_')) {
    db.collection('areas').doc(area.id).update({
      farmingConditions: area.farmingConditions,
      savedEvalMode:     area.savedEvalMode,
    }).catch(e => console.warn('_awSaveFarmCond Firestore:', e));
  }
}

function _awDefaultFarmCond() {
  return {
    priority:   'profit',
    equipment:  'openField',
    period:     'mid',
    sales:      'self',
    scale:      'solo',
    experience: 'beginner',
  };
}

// アプリ起動時に一度だけ初期化（以降はデフォルトボタンでのみリセット）
_awFarmCond = _awDefaultFarmCond();

// ═══════════════════════════════════════════
//  Step 1: 営農条件入力
// ═══════════════════════════════════════════
function _awRenderConditions() {
  const wrap = document.getElementById('adp-rk-cond-wrap');
  if (!wrap) return;

  const isClimate = _adpClimateMode;
  const areaName  = currentAreaData?.name || _awArea?.name || null;
  const climateLabel = areaName ? `${areaName}の気候` : 'エリア気候';
  const selectedCropName = _awSelectedCropName();

  wrap.innerHTML = `
    <div class="adp-rk-cond-group adp-rk-cond-crop-group">
      <div class="adp-rk-cond-label">🌱 対象作物</div>
      <div class="adp-rk-cond-row">
        <button class="adp-select-crop-btn" onclick="_adpOpenCropSelectSheet()" id="adp-rk-cond-crop-btn">
          <span id="adp-rk-cond-crop-name">${selectedCropName ? escHtml(selectedCropName) : '🌱 作物を選ぶ'}</span>
        </button>
      </div>
    </div>
    <div class="adp-rk-cond-divider"></div>
    <div class="adp-rk-cond-group">
      <div class="adp-rk-cond-label">🧭 評価基準</div>
      <div class="adp-rk-cond-row">
        <button class="adp-eval-mode-btn ${!isClimate ? 'active' : ''}" data-eval="db"
          onclick="_adpSetClimateMode(false)">📊 一般データベース</button>
        <button class="adp-eval-mode-btn ${isClimate ? 'active' : ''}" data-eval="climate"
          onclick="_adpSetClimateMode(true)">🌿 <span class="adp-eval-climate-label">${escHtml(climateLabel)}</span></button>
      </div>
    </div>
    <div class="adp-rk-cond-divider"></div>
    <div class="adp-rk-cond-groups">
      ${FARM_COND_GROUPS.map(g => `
        <div class="adp-rk-cond-group">
          <div class="adp-rk-cond-label">${g.icon} ${g.label}</div>
          <div class="adp-rk-cond-row">
            ${g.options.map(o => `
              <button class="adp-rk-cond-chip ${_awFarmCond[g.key] === o.value ? 'selected' : ''}"
                onclick="_awSetCondition('${g.key}','${o.value}')">
                <span class="adp-rk-cond-chip-icon">${o.icon}</span>
                <span class="adp-rk-cond-chip-label">${o.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="adp-rk-cond-footer">
      <button class="adp-rk-cond-btn-reset" onclick="_awResetConditions()">↩ デフォルトに戻す</button>
      <div class="adp-rk-cond-nav">
        <button class="adp-rk-cond-btn-nav" onclick="_adpRkSwitchPane('match')">📊 適合度ランキングへ</button>
        <button class="adp-rk-cond-btn-nav" onclick="_adpRkSwitchPane('profit')">💴 収益ランキングへ</button>
      </div>
    </div>
  `;
}

function _awSetCondition(key, value) {
  if (_awFarmCond[key] === value) return;
  _awFarmCond[key] = value;
  _awRunAnalysis();               // currentAreaData.farmingConditions更新＋各タブ再計算
  _awRenderConditions();          // チップの選択状態を再描画
  _awSaveFarmCond();              // エリアごとに永続化
  // 2026-06修正: 適合度ランキングペインが表示中の再描画呼び出しが抜けており、
  // 作物選択中（_adpSelectedCropIdあり）に条件を変更すると#crop-rankingが
  // runSingleCropAnalysis()で上書きした単一作物カードのままになり、
  // 一覧の順位変化が画面に反映されないバグがあったため追加。
  if (_adpRkCurrentPane === 'match') {
    _adpRenderRankingList();
  }
  // 収益ランキングペインが表示中なら即時再描画
  if (_adpRkCurrentPane === 'profit') {
    _adpRenderProfitRankingList();
  }
}

// ═══════════════════════════════════════════
//  リアルタイム分析エンジン連携
// ═══════════════════════════════════════════

// ウィザードの選択状態から currentAreaData を再構築
function _awBuildAreaData() {
  const area = _awArea;
  const lp   = area.landProfile || {};
  const meta = area.meta        || {};

  function _pick(...vals) {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  // 実際の栽培方式は「栽培方式」トグル（_adpSwitchCultivation／条件設定タブのミラー）が単一の管理元。
  // _awFarmCond.equipment は営農条件スコア専用の好み軸（水田利用可を含む）であり、ここでは参照しない
  // （以前はここで equipment から再計算しており、条件チップを1つ変更するだけで「加温」設定が
  // 　無条件に消えるバグがあったため修正）。
  const cultivationMode = currentAreaData?.cultivationMode || 'openField';

  let ad;
  if (typeof normalizeAreaData === 'function') {
    ad = normalizeAreaData(area, {
      selectedCropId:    _adpSelectedCropId || null,
      cultivationMode,
      analysisItems:     ['ranking','growth','profit','fert','risk','calendar','match'],
      farmingConditions: { ..._awFarmCond },
    });
  } else {
    // フォールバック（areaEnv.js 未読込時）
    const lat = _pick(lp.lat, meta.lat, area.lat);
    ad = {
      lat,
      lng:             _pick(lp.lng,       meta.lng,      area.lng),
      elev:            _pick(lp.elevation, meta.elev,     area.elev),
      climate:         (typeof getClimate === 'function' && lat != null)
                         ? getClimate(lat) : null,
      soilType:        _pick(lp.soilType,  meta.soilType, area.soilType) || 'unknown',
      ph:              _pick(lp.ph,        meta.ph,       area.ph),
      slope:           _pick(lp.slope,     meta.slope,    area.slope)    ?? 0,
      areaSqm:         _pick(meta.areaSqm, area.areaSqm)                 || 0,
      areaHa:          _pick(meta.areaHa,  area.areaHa)                  || 0,
      selectedCropId:  _adpSelectedCropId || null,
      cultivationMode,
      analysisItems:   ['ranking','growth','profit','fert','risk','calendar','match'],
      landProfile:     Object.keys(lp).length ? lp : null,
      env:             {},
    };
  }

  // 営農条件・栽培方式を確実に反映
  ad.farmingConditions = { ..._awFarmCond };
  ad.cultivationMode   = cultivationMode;

  // profitOverrides を引き継ぐ（シミュレーター上書き値をengine.jsに渡すために必要）
  ad.profitOverrides = _adpArea?.profitOverrides || area.profitOverrides || {};

  // AMeDASキャッシュ（decadeArr等）を復元してから上書き
  // normalizeAreaData() は素のareaから組み立てるため decadeArr が消えてしまう
  if (_adpClimateCache) {
    ad.climate = { ...(ad.climate || {}), ..._adpClimateCache };
  }

  currentAreaData = ad;
  return ad;
}

// 現在の選択状態で分析タブを再計算・再描画する
function _awRunAnalysis() {
  if (!_awArea) return;

  const ad   = _awBuildAreaData();
  const name = _awArea.name || 'エリア';

  // 全作物スコア（営農条件込み）を再計算 → おすすめリスト・ライブプレビューの元データ
  if (typeof buildAnalysisResult === 'function') {
    _awAllScores = buildAnalysisResult(ad).cropScores;
  }

  if (_adpSelectedCropId) {
    // 作物選択中：単一作物詳細
    ad.selectedCropId = _adpSelectedCropId;
    runSingleCropAnalysis(name);
  } else {
    // 未選択：全体ランキング表示
    runAnalysis(name);
  }

  // ── 📈生育期間タブを選択作物に同期 ──
  if (_adpSelectedCropId) {
    _crScores = _awAllScores;
  }
  if (typeof _adpRenderTempChart        === 'function') _adpRenderTempChart(_adpSelectedCropId);
  if (typeof _adpRenderGrowthChart      === 'function') _adpRenderGrowthChart(_adpSelectedCropId);
  if (typeof _adpRenderGrowthRankingList === 'function') _adpRenderGrowthRankingList();

  _awUpdateLivePreview();
}

// モーダル内のライブプレビューバーを更新
function _awUpdateLivePreview() {
  const bar = document.getElementById('aw-live-preview');

  const ad = currentAreaData || {};
  const modeLabels = { openField: '露地', greenhouse: 'ハウス', heatedGreenhouse: '加温' };
  const modeLabel  = modeLabels[ad.cultivationMode] || '露地栽培';

  let cropName = '—';
  let scoreHtml = '<span class="aw-live-score score-mid">—</span>';
  let scoreVal = null;

  if (_adpSelectedCropId) {
    const s = _awAllScores.find(x => x.crop.id === _adpSelectedCropId);
    if (s) {
      cropName  = s.crop.name;
      const cls = s.score >= 70 ? 'score-high' : s.score >= 40 ? 'score-mid' : 'score-low';
      scoreHtml = `<span class="aw-live-score ${s.viable ? cls : 'score-low'}">${s.viable ? s.score + '%' : 'NG'}</span>`;
      if (s.viable) scoreVal = s.score;
    }
  } else if (_awAllScores.length) {
    const top = _awAllScores[0];
    cropName  = top.crop.name + '（おすすめ）';
    const cls = top.score >= 70 ? 'score-high' : top.score >= 40 ? 'score-mid' : 'score-low';
    scoreHtml = `<span class="aw-live-score ${top.viable ? cls : 'score-low'}">${top.viable ? top.score + '%' : 'NG'}</span>`;
    if (top.viable) scoreVal = top.score;
  }

  if (bar) {
    bar.innerHTML = `
      <span class="aw-live-icon">📡</span>
      <span class="aw-live-crop">${escHtml(cropName)}</span>
      ${scoreHtml}
      <span class="aw-live-mode">${escHtml(modeLabel)}</span>
    `;
  }

  // adp-view サマリーバーも更新
  if (typeof _adpUpdateSummaryBar === 'function') {
    _adpUpdateSummaryBar({
      cropName: cropName === '—' ? null : cropName.replace('（おすすめ）',''),
      areaName: _awArea?.name || null,
      score: scoreVal,
      mode: modeLabel,
      evalMode: _adpEvalModeLabel(),
    });
  }
}

// ─── デフォルト条件にリセット ───
function _awResetConditions() {
  _awFarmCond = _awDefaultFarmCond();
  // エリアオブジェクト・localStorage・Firestoreから条件設定を削除
  const area = _adpArea;
  if (area) {
    delete area.farmingConditions;
    delete area.savedEvalMode;
    // 栽培方式は分析一時値のみデフォルト(openField)に戻す。マスター(area.cultivationMode)はここでは変更しない
    _adpAnalysisCultMode = 'openField';
    if (currentAreaData) currentAreaData.cultivationMode = 'openField';
    document.querySelectorAll('.adp-cult-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === 'openField');
    });
    const areaId = area.id || area.name || '';
    if (areaId) {
      try { localStorage.setItem(`adpCultAnalysis_${areaId}`, 'openField'); }
      catch(e) { console.warn('_awResetConditions analysis cult localStorage:', e); }
    }
    _adpClimateMode = false;
    _adpSetClimateMode(false);
    // 永続化層から削除（farmingConditions・savedEvalModeのみ。cultivationModeはマスターのため触らない）
    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === area.id);
      if (idx !== -1) {
        delete stored[idx].farmingConditions;
        delete stored[idx].savedEvalMode;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    } catch(e) { console.warn('_awResetConditions localStorage:', e); }
    if (typeof db !== 'undefined' && db && area.id && !String(area.id).startsWith('local_')) {
      const { FieldValue } = firebase.firestore;
      db.collection('areas').doc(area.id).update({
        farmingConditions: FieldValue.delete(),
        savedEvalMode:     FieldValue.delete(),
      }).catch(e => console.warn('_awResetConditions Firestore:', e));
    }
  }
  _awRunAnalysis();
  _awRenderConditions();
  // 2026-06修正: _awSetCondition()と同様、matchペイン表示中の再描画漏れを修正
  if (_adpRkCurrentPane === 'match') {
    _adpRenderRankingList();
  }
  if (_adpRkCurrentPane === 'profit') {
    _adpRenderProfitRankingList();
  }
}

// ═══════════════════════════════════════════
//  収益シミュレーター（サブタブ5）
// ═══════════════════════════════════════════

/**
 * _simEnsureOverridesStore()
 * currentAreaData.profitOverrides を返す。未初期化なら {} で初期化してから返す。
 */
function _simEnsureOverridesStore() {
  if (!currentAreaData) return {};
  if (!currentAreaData.profitOverrides) currentAreaData.profitOverrides = {};
  return currentAreaData.profitOverrides;
}

/**
 * _simResolveDefaultCropId()
 * シミュレーターの初期作物IDを決定する。
 * 優先順位:
 *   1. _adpSelectedCropId（適合度タブで選択済み）
 *   2. _crScores の averageProfit 最高作物
 *   3. _crScores の先頭
 *   4. null（登録作物0件）
 */
function _simResolveDefaultCropId() {
  if (_adpSelectedCropId) return _adpSelectedCropId;
  const scores = (typeof _crScores !== 'undefined' && _crScores.length) ? _crScores : [];
  if (!scores.length) return null;
  // averageProfit最高を1位とする
  const top = [...scores]
    .filter(s => s.profitability)
    .sort((a, b) => b.profitability.averageProfit - a.profitability.averageProfit)[0];
  return top ? top.crop.id : scores[0].crop.id;
}

/**
 * _simGetDefaultValues(cropId)
 * COST_TABLE + farmCond補正を反映したデフォルト値を返す。
 * engine.js の COST_TABLE / cropPricePerKg はグローバル参照可能。
 */
function _simGetDefaultValues(cropId) {
  const scores = (typeof _crScores !== 'undefined') ? _crScores : [];
  const entry  = scores.find(s => s.crop.id === cropId);
  const crop   = entry ? entry.crop : null;
  if (!crop) return null;

  const cat     = crop.category || '_default';
  const costRow = (typeof COST_TABLE !== 'undefined')
    ? (COST_TABLE[cat] || COST_TABLE._default)
    : { seed: 10000, material: 22000, machine: 22000, labor: 60000, initial: 40000, amortYears: 3 };

  // farmCond補正
  const fc = (typeof _awFarmCond !== 'undefined' && _awFarmCond) ? _awFarmCond : {};
  const laborMult = fc.scale === 'family' ? 0.85 : fc.scale === 'hired' ? 1.30 : 1.0;
  const priceMult = fc.sales === 'direct' || fc.sales === 'roadside' ? 1.15
    : fc.sales === 'ja' ? 0.90
    : fc.sales === 'processing' ? 0.85 : 1.0;

  const basePrice = (typeof cropPricePerKg === 'function') ? cropPricePerKg(crop) : 0;

  return {
    seedCost10a:     Math.round(costRow.seed),
    materialCost10a: Math.round(costRow.material),
    machineCost10a:  Math.round(costRow.machine),
    laborCost10a:    Math.round(costRow.labor * laborMult),
    initialCost:     Math.round(costRow.initial),
    pricePerKg:      Math.round(basePrice * priceMult),
    amortYears:      costRow.amortYears || 3,
    hasNoPrice:      !crop.price,  // priceがnullなら参考データなし
  };
}

/**
 * _simCalcPreview(cropId, inputs)
 * inputs: { seedCost10a, materialCost10a, machineCost10a, laborCost10a, initialCost, pricePerKg }
 * すべてnullの項目はデフォルト値を使用。
 * 純利益（エリア全体換算）を返す。
 */
function _simCalcPreview(cropId, inputs) {
  const defs = _simGetDefaultValues(cropId);
  if (!defs) return null;

  const areaSqm = (currentAreaData && currentAreaData.areaSqm) ? currentAreaData.areaSqm : 0;
  const area10a = areaSqm / 1000; // 10a=1000㎡

  const seed     = (inputs.seedCost10a     !== null ? inputs.seedCost10a     : defs.seedCost10a)     * area10a;
  const material = (inputs.materialCost10a !== null ? inputs.materialCost10a : defs.materialCost10a) * area10a;
  const machine  = (inputs.machineCost10a  !== null ? inputs.machineCost10a  : defs.machineCost10a)  * area10a;
  const labor    = (inputs.laborCost10a    !== null ? inputs.laborCost10a    : defs.laborCost10a)    * area10a;
  const initial  = (inputs.initialCost     !== null ? inputs.initialCost     : defs.initialCost);
  const amort    = defs.amortYears;
  const price    = (inputs.pricePerKg      !== null ? inputs.pricePerKg      : defs.pricePerKg);

  // _crScoresから収量・収益計算に必要な情報を取得
  const scores  = (typeof _crScores !== 'undefined') ? _crScores : [];
  const entry   = scores.find(s => s.crop.id === cropId);
  const profit  = entry ? entry.profitability : null;

  // 簡易収量推定（profitabilityから逆算 or デフォルト）
  let revenue = 0;
  if (profit && profit.revenue) {
    // 既存収益計算の収入をベースに、単価だけ差し替え
    const origPrice = profit.averagePrice || (price || 1);
    revenue = origPrice > 0 ? profit.revenue / origPrice * price : 0;
  }

  const totalCost   = seed + material + machine + labor + (initial / amort) * area10a;
  const riskRate    = profit ? (profit.riskDeductionRate || 0) : 0;
  const netProfit   = Math.round((revenue - totalCost) * (1 - riskRate));

  return {
    revenue:      Math.round(revenue),
    seedCost:     Math.round(seed),
    materialCost: Math.round(material),
    machineCost:  Math.round(machine),
    laborCost:    Math.round(labor),
    amortCost:    Math.round((initial / amort) * area10a),
    riskRate:     Math.round(riskRate * 100),
    netProfit,
    area10a,
  };
}

/**
 * _simUpdatePreview()
 * フォームの現在値を読み取り、プレビューエリアを更新する。
 */
function _simUpdatePreview() {
  const cropId = _simSelectedCropId;
  if (!cropId) return;

  function readVal(id) {
    const el = document.getElementById(id);
    if (!el || el.value === '') return null;
    return Number(el.value) || null;
  }

  const inputs = {
    seedCost10a:     readVal('sim-seed'),
    materialCost10a: readVal('sim-material'),
    machineCost10a:  readVal('sim-machine'),
    laborCost10a:    readVal('sim-labor'),
    initialCost:     readVal('sim-initial'),
    pricePerKg:      readVal('sim-price'),
  };

  // _simMemoryに保存
  _simMemory[cropId] = inputs;

  const r = _simCalcPreview(cropId, inputs);
  const el = document.getElementById('adp-rk-sim-preview');
  if (!el || !r) return;

  const fmt = v => v == null ? '—' : v.toLocaleString('ja-JP') + '円';
  const profitClass = r.netProfit >= 0 ? 'profit-positive' : 'profit-negative';

  el.innerHTML = `
    <div class="adp-rk-sim-preview-row"><span>収入（推定）</span><span>${fmt(r.revenue)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　種苗費</span><span>−${fmt(r.seedCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　資材費</span><span>−${fmt(r.materialCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　機械費</span><span>−${fmt(r.machineCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　労働費</span><span>−${fmt(r.laborCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　初期費用（年間償却）</span><span>−${fmt(r.amortCost)}</span></div>
    <div class="adp-rk-sim-preview-row"><span>　リスク控除</span><span>−${r.riskRate}%</span></div>
    <div class="adp-rk-sim-total ${profitClass}"><span>推定純利益</span><span>${fmt(r.netProfit)}</span></div>
    <div class="adp-rk-sim-area-note">※ エリア面積 ${r.area10a.toFixed(2)} 10a 換算</div>
  `;
}

/**
 * _simSaveProfitOverrides()
 * 現在のフォーム値を profitOverrides に保存し、Firestore/localStorage に永続化する。
 */
async function _simSaveProfitOverrides() {
  const cropId = _simSelectedCropId;
  if (!cropId || !_adpArea) return;

  function readVal(id) {
    const el = document.getElementById(id);
    if (!el || el.value === '') return null;
    return Number(el.value) || null;
  }

  const payload = {
    seedCost10a:     readVal('sim-seed'),
    materialCost10a: readVal('sim-material'),
    machineCost10a:  readVal('sim-machine'),
    laborCost10a:    readVal('sim-labor'),
    initialCost:     readVal('sim-initial'),
    pricePerKg:      readVal('sim-price'),
    updatedAt:       new Date().toISOString(),
  };

  // メモリ上更新
  const store = _simEnsureOverridesStore();
  store[cropId] = payload;
  _adpArea.profitOverrides = store;

  // Firestore / localStorage 永続化（saveInlineEditパターン踏襲）
  const id = _adpArea.id;
  const update = { [`profitOverrides.${cropId}`]: payload };

  try {
    if (typeof db !== 'undefined' && db && id && !String(id).startsWith('local_')) {
      await db.collection('areas').doc(id).update(update);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        stored[idx].profitOverrides = stored[idx].profitOverrides || {};
        stored[idx].profitOverrides[cropId] = payload;
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
    _simDirty = false;
    showToast('保存しました ✓', 'green');
    // 分析を再計算して収益ランキングに反映
    if (typeof _awRunAnalysis === 'function') _awRunAnalysis();
  } catch(e) {
    showToast('保存に失敗しました', 'amber');
    console.error(e);
  }
}

/**
 * _simResetCrop(cropId)
 * 指定作物の上書き値をクリアし、フォームをデフォルトに戻す。
 */
async function _simResetCrop(cropId) {
  if (!cropId || !_adpArea) return;

  const store = _simEnsureOverridesStore();
  delete store[cropId];
  _adpArea.profitOverrides = store;

  // localStorage更新
  const id = _adpArea.id;
  try {
    if (typeof db !== 'undefined' && db && id && !String(id).startsWith('local_')) {
      // Firestoreはフィールド削除のためFieldValue.deleteを使う
      const del = {};
      del[`profitOverrides.${cropId}`] = firebase.firestore.FieldValue.delete();
      await db.collection('areas').doc(id).update(del);
    } else {
      const stored = JSON.parse(localStorage.getItem(CONFIG.AREAS_KEY) || '[]');
      const idx = stored.findIndex(a => a.id === id);
      if (idx !== -1) {
        if (stored[idx].profitOverrides) delete stored[idx].profitOverrides[cropId];
        localStorage.setItem(CONFIG.AREAS_KEY, JSON.stringify(stored));
      }
    }
  } catch(e) {
    console.warn('profitOverrides削除:', e);
  }

  delete _simMemory[cropId];
  _simDirty = false;
  // フォームを再描画（デフォルト値で）
  _adpRenderProfitSimulator();
  showToast('リセットしました', 'green');
}

/**
 * _adpRenderProfitSimulator()
 * 収益シミュレーターUI（サブタブ5）を描画する。
 */
function _adpRenderProfitSimulator() {
  const wrap = document.getElementById('adp-rk-sim-wrap');
  if (!wrap) return;

  const scores = (typeof _crScores !== 'undefined') ? _crScores : [];

  // 登録作物が0件の場合
  if (!scores.length) {
    wrap.innerHTML = `<div class="adp-rk-sim-no-data">作物未登録です。エリアに作物を追加してください。</div>`;
    return;
  }

  // 初期作物IDを決定
  if (!_simSelectedCropId) {
    _simSelectedCropId = _simResolveDefaultCropId();
  }
  const cropId = _simSelectedCropId;

  // 選択中作物の表示名を取得
  const selectedScore = scores.find(s => s.crop.id === cropId);
  const selectedCropName = selectedScore ? selectedScore.crop.name : '—';

  // 選択作物のデフォルト値
  const defs = _simGetDefaultValues(cropId);
  if (!defs) {
    wrap.innerHTML = `<div class="adp-rk-sim-no-data">作物データが見つかりません。</div>`;
    return;
  }

  // 保存済みoverrides or セッションキャッシュを優先
  const store   = _simEnsureOverridesStore();
  const saved   = store[cropId] || null;
  const cached  = _simMemory[cropId] || null;
  const vals    = cached || saved || {};

  function fmtVal(key) {
    const v = vals[key];
    return (v !== undefined && v !== null) ? v : '';
  }

  const noPriceNote = defs.hasNoPrice
    ? `<div class="adp-rk-sim-no-data" style="margin-bottom:8px;">⚠️ この作物には参考価格データがありません。実勢価格を入力してください。</div>`
    : '';

  wrap.innerHTML = `
    <div class="adp-rk-sim-form">
      <div class="adp-rk-sim-select-wrap">
        <label>作物</label>
        <div class="sim-crop-picker-row">
          <span class="sim-crop-selected-name" id="sim-crop-selected-name">${escHtml(selectedCropName)}</span>
          <button class="sim-crop-pick-btn" onclick="_simOpenCropPicker()">変更</button>
        </div>
      </div>
      ${noPriceNote}
      <div class="adp-rk-sim-field">
        <label>種苗費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-seed" type="number" min="0" placeholder="${defs.seedCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('seedCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>資材費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-material" type="number" min="0" placeholder="${defs.materialCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('materialCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>機械費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-machine" type="number" min="0" placeholder="${defs.machineCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('machineCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>労働費 <span class="sim-unit">円/10a</span></label>
        <input id="sim-labor" type="number" min="0" placeholder="${defs.laborCost10a.toLocaleString('ja-JP')}"
          value="${fmtVal('laborCost10a')}" oninput="_simOnInput()">
      </div>
      <div class="adp-rk-sim-field">
        <label>初期費用 <span class="sim-unit">円/10a</span></label>
        <input id="sim-initial" type="number" min="0" placeholder="${defs.initialCost.toLocaleString('ja-JP')}"
          value="${fmtVal('initialCost')}" oninput="_simOnInput()">
        <div class="sim-note">償却年数 ${defs.amortYears}年（変更不可）</div>
      </div>
      <div class="adp-rk-sim-field">
        <label>販売単価 <span class="sim-unit">円/kg</span></label>
        <input id="sim-price" type="number" min="0" placeholder="${defs.pricePerKg.toLocaleString('ja-JP')}"
          value="${fmtVal('pricePerKg')}" oninput="_simOnInput()">
      </div>
      <div id="adp-rk-sim-preview" class="adp-rk-sim-preview"></div>
      <div class="adp-rk-sim-actions">
        <button class="btn btn-ghost" onclick="_simResetCrop('${escHtml(cropId)}')">↩ リセット</button>
        <button class="btn btn-primary" onclick="_simSaveProfitOverrides()">保存</button>
      </div>
    </div>
  `;

  // 初期プレビューを表示
  _simUpdatePreview();
}

/** シミュレーター：作物ピッカーシートを開く */
function _simOpenCropPicker() {
  _openCropPickerSheet({
    title: '🌱 シミュレーター作物を選ぶ',
    onSelect: (cropId) => _simOnCropChange(cropId),
  });
}

/** 作物変更時（ピッカー選択コールバック） */
function _simOnCropChange(newCropId) {
  if (_simDirty) {
    showConfirmDialog('未保存の変更があります。破棄してよろしいですか？', '破棄する', 'キャンセル', false).then(ok => {
      if (!ok) return;
      // 2026-06修正: _simDirtyだけクリアし_simMemoryを消していなかったため、
      // 「破棄」を選んでも同じ作物に戻ると入力値が復元されてしまうバグを修正。
      _simDirty = false;
      delete _simMemory[_simSelectedCropId];
      _simSelectedCropId = newCropId;
      _adpRenderProfitSimulator();
    });
    return;
  }
  _simSelectedCropId = newCropId;
  _adpRenderProfitSimulator();
}

/** 入力変更時 */
function _simOnInput() {
  _simDirty = true;
  _simUpdatePreview();
}

// ═══════════════════════════════════════════
//  📊 ガントチャート（Phase 2）
// ═══════════════════════════════════════════

// ─── モード管理 ───
let _adpGanttMode = 'est'; // 'est' | 'db'

function _adpGanttSetMode(mode) {
  _adpGanttMode = mode;
  // トグルボタンのactive切替
  document.querySelectorAll('.adp-gantt-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ganttMode === mode);
  });
  _adpRenderGrowthGantt(_adpSelectedCropId);
}

// ─── ガントチャート用Canvas初期化 ───
// _adpGrowthSetup は既存Canvasに特化しているため、ガント専用に類似ロジックを展開
function _adpGanttSetup() {
  const canvas = document.getElementById('adp-gantt-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 200;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-gantt-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  return { ctx, W, H, decadeArr, rainMonthly, tMeanArr: decadeArr.tMean, cultivationMode };
}

// ─── 今日の旬index算出（0-35）───
function _adpGanttTodayDecade() {
  const now = new Date();
  const m   = now.getMonth();     // 0-11
  const d   = now.getDate();
  const jun = d <= 10 ? 0 : d <= 20 ? 1 : 2; // 上旬0・中旬1・下旬2
  return m * 3 + jun;
}

// ─── ガントチャート描画ヘルパー ───
// X軸：月12分割（各月幅 = gW/12）。
// Y軸：行ごとに均等分割（行数に応じて自動計算）。
function _adpGanttDrawAxes(ctx, W, H, PAD) {
  const gW = W - PAD.left - PAD.right;
  const gH = H - PAD.top  - PAD.bottom;

  // 月グリッド縦線
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 0.5;
  for (let m = 0; m <= 12; m++) {
    const x = PAD.left + (m / 12) * gW;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + gH);
    ctx.stroke();
  }

  // 月ラベル
  ctx.fillStyle = 'rgba(143,170,145,0.7)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const cx = PAD.left + (m + 0.5) / 12 * gW;
    ctx.fillText(`${m + 1}月`, cx, PAD.top + gH + 10);
  }

  return { gW, gH };
}

// 横バー1本描画（月単位・角丸）
function _adpGanttDrawBar(ctx, PAD, gW, gH, rowCount, rowIdx, monthIdx, color, alpha) {
  const barH  = Math.max(8, Math.floor((gH / rowCount) * 0.55));
  const rowH  = gH / rowCount;
  const y     = PAD.top + rowH * rowIdx + (rowH - barH) / 2;
  const barW  = gW / 12;
  const x     = PAD.left + (monthIdx / 12) * gW + 1;
  const r     = 3;
  const w     = barW - 2;

  ctx.fillStyle = color.replace(')', `,${alpha})`).replace('rgb(', 'rgba(');
  // 角丸矩形（roundRect がない環境対応）
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, barH, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + barH - r);
    ctx.arcTo(x + w, y + barH, x + w - r, y + barH, r);
    ctx.lineTo(x + r, y + barH);
    ctx.arcTo(x, y + barH, x, y + barH - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  ctx.fill();
}

// 収穫予測マーカー（◆点）
function _adpGanttDrawHarvestDot(ctx, PAD, gW, gH, rowCount, rowIdx, decadeIdx, color) {
  const rowH = gH / rowCount;
  const cy   = PAD.top + rowH * rowIdx + rowH / 2;
  const cx   = PAD.left + (decadeIdx / _ADP_GROWTH_N) * gW;
  const size = 5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx,        cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx,        cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
}

// 行ラベル描画
function _adpGanttDrawRowLabels(ctx, PAD, gH, rows) {
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(143,170,145,0.85)';
  ctx.font      = '9px Noto Sans JP, sans-serif';
  const rowH    = gH / rows.length;
  rows.forEach((label, i) => {
    const cy = PAD.top + rowH * i + rowH / 2 + 3;
    ctx.fillText(label, PAD.left - 4, cy);
  });
}

// 本日縦線
function _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade) {
  const x = PAD.left + (todayDecade / _ADP_GROWTH_N) * gW;
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.75)'; // amber
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(x, PAD.top - 2);
  ctx.lineTo(x, PAD.top + gH);
  ctx.stroke();
  // 「今」ラベル
  ctx.setLineDash([]);
  ctx.fillStyle  = 'rgba(251,191,36,0.85)';
  ctx.font       = '8px DM Mono, monospace';
  ctx.textAlign  = 'center';
  ctx.fillText('今', x, PAD.top - 4);
  ctx.restore();
}

// ─── メイン描画関数 ───
function _adpRenderGrowthGantt(cropId) {
  // 初回呼び出し時にトグルボタンのactive状態を初期化
  document.querySelectorAll('.adp-gantt-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ganttMode === _adpGanttMode);
  });

  const g = _adpGanttSetup();
  if (!g) return;

  const { ctx, W, H } = g;
  const crop          = _adpGrowthFindCrop(cropId);
  const todayDecade   = _adpGanttTodayDecade();
  const legendEl      = document.getElementById('adp-gantt-legend');

  // ─── DB暦モード ───
  if (_adpGanttMode === 'db') {
    const STAGES = [
      { key: 'sowing',     label: '播種', color: 'rgba(56,189,248,1)'  },
      { key: 'seedling',   label: '育苗', color: 'rgba(45,212,191,1)'  },
      { key: 'transplant', label: '定植', color: 'rgba(236,72,153,1)'  },
      { key: 'harvest',    label: '収穫', color: 'rgba(74,222,128,1)'  },
    ];
    const rows = STAGES.map(s => s.label);
    const PAD  = { top: 18, right: 8, bottom: 22, left: 34 };
    const { gW, gH } = _adpGanttDrawAxes(ctx, W, H, PAD);

    _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade);
    _adpGanttDrawRowLabels(ctx, PAD, gH, rows);

    if (crop) {
      STAGES.forEach((s, rowIdx) => {
        const idxs = _adpGrowthCalToIdx(crop.calendar?.[s.key] || []);
        idxs.forEach(monthIdx => {
          _adpGanttDrawBar(ctx, PAD, gW, gH, STAGES.length, rowIdx, monthIdx, s.color, 0.80);
        });
      });
    }

    // 凡例
    if (legendEl) {
      if (crop) {
        const items = STAGES
          .map(s => {
            const idxs = _adpGrowthCalToIdx(crop.calendar?.[s.key] || []);
            if (!idxs.length) return '';
            return `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:${s.color}"></span>${s.label} ${idxs.map(i => (i + 1) + '月').join('/')}</span>`;
          }).join('');
        legendEl.innerHTML = items
          + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>`;
      } else {
        legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
      }
    }
    return;
  }

  // ─── 気候推定モード ───
  const rows = ['播種/定植適期', '収穫予測'];
  const PAD  = { top: 18, right: 8, bottom: 22, left: 50 };
  const { gW, gH } = _adpGanttDrawAxes(ctx, W, H, PAD);

  _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade);
  _adpGanttDrawRowLabels(ctx, PAD, gH, rows);

  let sowingWindows = [];
  if (crop && typeof Phenology !== 'undefined') {
    sowingWindows = Phenology.sowingWindows(g.decadeArr, crop, g.cultivationMode);
  }

  if (sowingWindows.length > 0) {
    // 播種/定植適期バー（旬index→月index近似：Math.floor(decade/3)）
    sowingWindows.slice(0, 3).forEach((win, rank) => {
      const alpha = rank === 0 ? 0.82 : 0.35 - rank * 0.05;
      const mStart = Math.floor(win.startDecade / 3);
      const mEnd   = Math.floor(win.endDecade   / 3);
      for (let m = mStart; m <= Math.min(mEnd, 11); m++) {
        _adpGanttDrawBar(ctx, PAD, gW, gH, rows.length, 0, m, 'rgba(34,197,94,1)', alpha);
      }
      // 収穫予測マーカー（1位のみ）
      if (rank === 0 && win.harvestDecade != null) {
        _adpGanttDrawHarvestDot(ctx, PAD, gW, gH, rows.length, 1, win.harvestDecade, 'rgba(167,139,250,0.9)');
      }
    });
  }

  // 凡例
  if (legendEl) {
    if (!crop) {
      legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
      return;
    }
    if (sowingWindows.length === 0) {
      legendEl.innerHTML = '<span class="adp-tl-item adp-tl-period">この気候では播種適期が見つかりませんでした</span>';
      return;
    }
    const bestWin      = sowingWindows[0];
    const sowLabel     = Phenology.decadeLabel(bestWin.startDecade);
    const sowEndLabel  = Phenology.decadeLabel(bestWin.endDecade);
    const harvestLabel = bestWin.harvestDecade != null ? Phenology.decadeLabel(bestWin.harvestDecade) : null;
    const rankCount    = Math.min(sowingWindows.length, 3);
    legendEl.innerHTML =
      `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.85)"></span>播種/定植適期 ${sowLabel}〜${sowEndLabel}（1位）</span>`
      + (rankCount >= 2 ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.35)"></span>適期候補 2〜${rankCount}位</span>` : '')
      + (harvestLabel   ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.9)"></span>収穫予測 ${harvestLabel}</span>` : '')
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>`
      + (g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}</span>` : '');
  }
}
// ═══════════════════════════════════════════
//  🌡️ GDD積算専用グラフ（Phase 3）
//  気候推定専用。GDD積算カーブを主役に、
//  気温折れ線を薄い背景として残す。
//  降水量バーは非表示。
// ═══════════════════════════════════════════

function _adpGDDSetup() {
  const canvas = document.getElementById('adp-gdd-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 240;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-gdd-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  const cultivationMode = currentAreaData?.cultivationMode || 'openField';
  return { ctx, W, H, decadeArr, rainMonthly, tMeanArr: decadeArr.tMean, cultivationMode };
}

function _adpRenderGrowthGDD(cropId) {
  const g = _adpGDDSetup();
  if (!g) return;

  const { ctx, W, H } = g;
  const legendEl = document.getElementById('adp-gdd-legend');
  const crop     = _adpGrowthFindCrop(cropId);

  // ── 軸レイアウト（GDD専用。右Y軸=GDD / 左Y軸=気温） ──
  // 気温の範囲を計算（_adpGrowthAxes と同ロジック）
  const PAD = { top: 18, right: 52, bottom: 28, left: 36 };
  const gW  = W - PAD.left - PAD.right;
  const gH  = H - PAD.top  - PAD.bottom;

  const allTemps = [...g.tMeanArr].filter(v => v !== null);
  if (crop) {
    if (crop.conditions.tempMeanMin != null) allTemps.push(crop.conditions.tempMeanMin - 2);
    if (crop.conditions.tempMeanMax != null) allTemps.push(crop.conditions.tempMeanMax + 2);
  }
  const tRawMin = Math.min(...allTemps);
  const tRawMax = Math.max(...allTemps);
  const tYMin   = Math.floor((tRawMin - 2) / 5) * 5;
  const tYMax   = Math.ceil ((tRawMax + 2) / 5) * 5;
  const tRange  = tYMax - tYMin || 1;

  const toX  = i => PAD.left + (i / (_ADP_GROWTH_N - 1)) * gW;
  const toTY = v => PAD.top  + (1 - (v - tYMin) / tRange) * gH;

  // ── GDD積算データ取得 ──
  let sowingWindows = [];
  let gddCurve      = null;
  let gddBase       = 10;
  let gddMax        = 0;
  let bestWin       = null;

  if (crop && typeof Phenology !== 'undefined') {
    sowingWindows = Phenology.sowingWindows(g.decadeArr, crop, g.cultivationMode);
    if (sowingWindows.length > 0) {
      bestWin  = sowingWindows[0];
      gddBase  = crop.conditions?.tempMeanMin ?? 10;
      gddCurve = Phenology.accumulateGDD(g.tMeanArr, gddBase, bestWin.startDecade);
      gddMax   = Math.max(...gddCurve.filter(v => v !== null), 1);
    }
  }

  // GDD Y軸スケール（0〜gddMax を右軸）
  const gddYMax  = Math.ceil(gddMax / 100) * 100 || 1000;
  const toGY     = v => PAD.top + (1 - v / gddYMax) * gH;

  // ── ① 背景グリッド（横：気温5℃刻み） ──
  const tSteps = Math.round(tRange / 5);
  for (let s = 0; s <= tSteps; s++) {
    const tv = tYMin + s * 5;
    const y  = toTY(tv);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
  }
  // 縦グリッド（月境界）
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + gH); ctx.stroke();
  }

  // ── ② 左Y軸ラベル（気温） ──
  ctx.fillStyle = 'rgba(251,191,36,0.55)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'right';
  for (let s = 0; s <= tSteps; s++) {
    const tv = tYMin + s * 5;
    ctx.fillText(tv + '°', PAD.left - 4, toTY(tv) + 3);
  }

  // ── ③ 右Y軸ラベル（GDD） ──
  ctx.fillStyle = 'rgba(167,139,250,0.85)';
  ctx.textAlign = 'left';
  for (let s = 0; s <= 4; s++) {
    const gv = Math.round(gddYMax * s / 4);
    ctx.fillText(gv + '', PAD.left + gW + 4, toGY(gv) + 3);
  }
  // 右軸の「GDD」単位ラベル
  ctx.font = '8px DM Mono, monospace';
  ctx.fillText('GDD', PAD.left + gW + 4, PAD.top - 4);

  // ── ④ 適正気温帯シェード（薄いアンバー帯） ──
  if (crop) {
    const tMin = crop.conditions.tempMeanMin;
    const tMax = crop.conditions.tempMeanMax;
    if (tMin != null && tMax != null) {
      const yTop = toTY(Math.min(tMax, tYMax));
      const yBot = toTY(Math.max(tMin, tYMin));
      const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
      grad.addColorStop(0, 'rgba(251,191,36,0.08)');
      grad.addColorStop(1, 'rgba(251,191,36,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(PAD.left, yTop, gW, yBot - yTop);
      // 適正帯の上下ライン
      [tMin, tMax].forEach(tv => {
        if (tv < tYMin || tv > tYMax) return;
        const y = toTY(tv);
        ctx.strokeStyle = 'rgba(251,191,36,0.25)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + gW, y); ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }

  // ── ⑤ 播種ウィンドウ帯シェード（薄緑） ──
  if (sowingWindows.length > 0) {
    const decW = gW / (_ADP_GROWTH_N - 1);
    sowingWindows.slice(0, 3).forEach((win, rank) => {
      const alpha = 0.18 - rank * 0.05;
      const s  = win.startDecade;
      const e  = win.endDecade;
      const x0 = toX(s) - decW / 2;
      const x1 = e >= s ? toX(e) + decW / 2 : toX(e + 36) + decW / 2;
      const rw = Math.min(x1 - x0, gW - (x0 - PAD.left));
      if (rw > 0) {
        ctx.fillStyle = `rgba(34,197,94,${alpha})`;
        ctx.fillRect(Math.max(x0, PAD.left), PAD.top, Math.min(rw, gW), gH);
      }
    });
  }

  // ── ⑥ 気温折れ線（薄い背景として参考表示）──
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  let tMoved = false;
  g.tMeanArr.forEach((v, i) => {
    if (v === null) { tMoved = false; return; }
    if (!tMoved) { ctx.moveTo(toX(i), toTY(v)); tMoved = true; }
    else         { ctx.lineTo(toX(i), toTY(v)); }
  });
  ctx.stroke();
  // 気温ドット（薄く）
  g.tMeanArr.forEach((v, i) => {
    if (v === null) return;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(toX(i), toTY(v), 1.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();

  // ── ⑦ GDD積算カーブ（紫・実線・太め）──
  if (gddCurve && gddMax > 0) {
    // カーブ塗りつぶし（グラデーション）
    ctx.save();
    const fillGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + gH);
    fillGrad.addColorStop(0, 'rgba(167,139,250,0.25)');
    fillGrad.addColorStop(1, 'rgba(167,139,250,0.02)');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    let startX = null;
    gddCurve.forEach((v, i) => {
      if (v === null) return;
      const x = toX(i), y = toGY(v);
      if (startX === null) { ctx.moveTo(x, PAD.top + gH); ctx.lineTo(x, y); startX = x; }
      else ctx.lineTo(x, y);
    });
    // 最後の点から底辺へ閉じる
    const lastValid = [...gddCurve].reverse().findIndex(v => v !== null);
    if (lastValid >= 0) {
      const lastIdx = gddCurve.length - 1 - lastValid;
      ctx.lineTo(toX(lastIdx), PAD.top + gH);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // カーブ線
    ctx.save();
    ctx.strokeStyle = 'rgba(167,139,250,0.90)';
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    let gMoved = false;
    gddCurve.forEach((v, i) => {
      if (v === null) { gMoved = false; return; }
      const x = toX(i), y = toGY(v);
      if (!gMoved) { ctx.moveTo(x, y); gMoved = true; }
      else         { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.restore();

    // ── ⑧ 収穫予測点（◆ 紫・到達GDD値付き）──
    if (bestWin && bestWin.harvestDecade != null) {
      const hi = bestWin.harvestDecade;
      const hv = gddCurve[hi];
      if (hv != null) {
        const hx = toX(hi);
        const hy = toGY(hv);
        const sz = 6;
        ctx.save();
        ctx.fillStyle = 'rgba(167,139,250,0.95)';
        ctx.beginPath();
        ctx.moveTo(hx,      hy - sz);
        ctx.lineTo(hx + sz, hy);
        ctx.lineTo(hx,      hy + sz);
        ctx.lineTo(hx - sz, hy);
        ctx.closePath();
        ctx.fill();
        // GDD到達値ラベル
        ctx.fillStyle = 'rgba(167,139,250,0.85)';
        ctx.font      = '8px DM Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(hv)}GDD`, hx + 8, hy + 3);
        ctx.restore();
      }
    }

    // ── ⑨ 播種適期マーカー（▼ 緑）──
    if (bestWin) {
      const sx = toX(bestWin.startDecade);
      _adpGrowthDrawTriangleMarker(ctx, sx, PAD.top + 1, 'rgba(34,197,94,0.95)');
    }
  }

  // ── ⑩ 月ラベル ──
  ctx.fillStyle = 'rgba(143,170,145,0.7)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const x = toX(m * 3);
    ctx.fillText(`${m + 1}`, x, PAD.top + gH + 10);
  }
  ctx.fillStyle = 'rgba(143,170,145,0.4)';
  ctx.font      = '8px DM Mono, monospace';
  ctx.fillText('月', PAD.left + gW + 8, PAD.top + gH + 10);

  // ── 凡例 ──
  if (legendEl) {
    if (!crop) {
      legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
      return;
    }
    const sowLabel     = bestWin ? Phenology.decadeLabel(bestWin.startDecade) : null;
    const harvestLabel = (bestWin && bestWin.harvestDecade != null)
      ? Phenology.decadeLabel(bestWin.harvestDecade) : null;
    const tMin = crop.conditions.tempMeanMin;
    const tMax = crop.conditions.tempMeanMax;

    legendEl.innerHTML =
      `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.85)"></span>GDD積算（基準 ${gddBase}℃）</span>`
      + (sowLabel    ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(34,197,94,0.7)"></span>播種/定植適期 ${sowLabel}</span>` : '')
      + (harvestLabel ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.9)"></span>収穫予測 ${harvestLabel}（${Math.round(gddMax)}GDD）</span>` : '')
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.35)"></span>旬平均気温（参考）</span>`
      + ((tMin != null && tMax != null) ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.2);border:1px solid rgba(251,191,36,0.4)"></span>適正気温帯 ${tMin}〜${tMax}℃</span>` : '')
      + (!bestWin ? '<span class="adp-tl-item adp-tl-period">この気候では播種適期が見つかりませんでした</span>' : '')
      + (g.cultivationMode !== 'openField' ? `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:#34d399"></span>${_ADP_MODE_LABELS[g.cultivationMode]}</span>` : '');
  }
}

// ═══════════════════════════════════════════
//  🗺️ 旬別適期ヒートマップ（Phase 4）
//  36旬 × 4行（気温／降水／日照／総合）の
//  マトリクスを色分け表示。気候推定専用。
// ═══════════════════════════════════════════

// ── 3段階スコア定数 ──
const _HM_GREEN  = 2; // 適正（緑）
const _HM_YELLOW = 1; // 要注意・最低限生育可（黄）
const _HM_RED    = 0; // 危険・困難（赤）

// ── セル色定義 ──
const _HM_COLORS = {
  [_HM_GREEN]:  { fill: 'rgba(74,222,128,0.75)',  stroke: 'rgba(74,222,128,0.3)'  },
  [_HM_YELLOW]: { fill: 'rgba(251,191,36,0.70)',  stroke: 'rgba(251,191,36,0.3)'  },
  [_HM_RED]:    { fill: 'rgba(248,113,113,0.75)', stroke: 'rgba(248,113,113,0.3)' },
};
const _HM_NULL_COLOR = { fill: 'rgba(42,61,44,0.35)', stroke: 'rgba(42,61,44,0.2)' };

// ── 気温スコア（旬ごと）: 仕様書 §6.1 ──
function _hmTempScore(i, decadeArr, crop) {
  const tMean = decadeArr.tMean?.[i];
  const tMin  = decadeArr.tMin?.[i];
  const tMax  = decadeArr.tMax?.[i];
  if (tMean == null) return null;

  const cMin     = crop.conditions.tempMeanMin;
  const cMax     = crop.conditions.tempMeanMax;
  const heatType = crop.heatType === 'warm' ? 'warm' : 'cool';
  const heatThre = heatType === 'warm' ? 35 : 33;

  // 赤条件（いずれか1つでも赤）
  if (tMin != null && tMin < 0)           return _HM_RED; // 霜
  if (tMax != null && tMax >= heatThre)   return _HM_RED; // 熱害
  if (cMin != null && tMean < cMin + 3)   return _HM_RED; // 冷害域（chillThreshold未満）

  // 適正（緑）
  if (cMin != null && cMax != null && tMean >= cMin && tMean <= cMax) return _HM_GREEN;
  if (cMin == null && cMax == null) return _HM_GREEN; // 基準なし＝評価不能→緑扱い

  // 要注意（黄）：上記のどちらにも該当しない
  return _HM_YELLOW;
}

// ── 降水スコア（旬ごと）: 仕様書 §6.2 ──
// 月別降水量を旬に均等分配して評価
function _hmRainScore(monthIdx, crop, rainMonthly) {
  if (!rainMonthly) return null;
  const mk  = _ADP_GROWTH_MONTH_KEYS[monthIdx];
  const rv  = rainMonthly[mk];
  if (rv == null) return null;
  const rPerDecade = rv / 3; // 月降水量→旬降水量（均等分配）

  const aMin = crop.conditions.absRainMin;
  const rMin = crop.conditions.rainfallMin;
  const rMax = crop.conditions.rainfallMax;
  const aMax = crop.conditions.absRainMax;

  // 赤：絶対限界を超えている
  if (aMin != null && rPerDecade < aMin / 3) return _HM_RED;
  if (aMax != null && rPerDecade > aMax / 3) return _HM_RED;

  // 緑：適正範囲内
  const inMin = (rMin == null || rPerDecade >= rMin / 3);
  const inMax = (rMax == null || rPerDecade <= rMax / 3);
  if (inMin && inMax) return _HM_GREEN;

  // 黄：それ以外
  return _HM_YELLOW;
}

// ── 日照スコア（旬ごと）: 仕様書 §6.3 ──
// calcSunScoreAllDecades の結果（0〜1）を3段階に変換
function _hmSunScore(continuousScore) {
  if (continuousScore == null) return null;
  if (continuousScore >= 1.0)  return _HM_GREEN;
  if (continuousScore >= 0.5)  return _HM_YELLOW;
  return _HM_RED;
}

// ── 総合スコア（3指標の最悪値）: 仕様書 §6.4 ──
function _hmOverallScore(t, r, s) {
  const valid = [t, r, s].filter(v => v !== null);
  if (valid.length === 0) return null;
  return Math.min(...valid);
}

// ── Canvas初期化 ──
function _adpHeatmapSetup() {
  const canvas = document.getElementById('adp-heatmap-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth || 320;

  // 行数×セル高さから高さを決定（後で確定するためここは仮置き）
  const H = canvas.offsetHeight || 160;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-heatmap-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  return { ctx, W, H, decadeArr, rainMonthly };
}

// ── セル描画 ──
function _hmDrawCell(ctx, x, y, w, h, score) {
  const col = score !== null ? _HM_COLORS[score] : _HM_NULL_COLOR;
  ctx.fillStyle   = col.fill;
  ctx.strokeStyle = col.stroke;
  ctx.lineWidth   = 0.5;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// ── メイン描画 ──
function _adpRenderGrowthHeatmap(cropId) {
  const g = _adpHeatmapSetup();
  if (!g) return;

  const { ctx, W, H, decadeArr, rainMonthly } = g;
  const legendEl = document.getElementById('adp-heatmap-legend');
  const crop     = _adpGrowthFindCrop(cropId);

  const ROWS     = ['気温', '降水', '日照', '総合'];
  const N        = _ADP_GROWTH_N; // 36旬
  const PAD      = { top: 14, right: 6, bottom: 22, left: 30 };
  const gW       = W - PAD.left - PAD.right;
  const gH       = H - PAD.top  - PAD.bottom;
  const cellW    = gW / N;
  const rowH     = gH / ROWS.length;

  // 「今日」旬index（ガントと同じ関数を流用）
  const todayDecade = typeof _adpGanttTodayDecade === 'function'
    ? _adpGanttTodayDecade() : 0;

  // 作物未選択時
  if (!crop) {
    ctx.fillStyle = 'rgba(90,122,92,0.7)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('作物を選択してください', W / 2, H / 2);
    if (legendEl) legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
    return;
  }

  // 日照スコア全旬配列（engine.js の新関数を使用）
  const sunScores = (typeof calcSunScoreAllDecades === 'function')
    ? calcSunScoreAllDecades(crop, decadeArr)
    : null;

  // ── ① 月区切り縦線（背景）──
  for (let m = 0; m <= 12; m++) {
    const x = PAD.left + (m * 3 / N) * gW;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = m % 3 === 0 ? 1.2 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + gH);
    ctx.stroke();
  }

  // ── ② 全セル描画 ──
  for (let i = 0; i < N; i++) {
    const monthIdx = Math.floor(i / 3);
    const x = PAD.left + i * cellW;

    const tScore = _hmTempScore(i, decadeArr, crop);
    const rScore = _hmRainScore(monthIdx, crop, rainMonthly);
    const sScore = sunScores != null ? _hmSunScore(sunScores[i]) : null;
    const oScore = _hmOverallScore(tScore, rScore, sScore);

    const scores = [tScore, rScore, sScore, oScore];
    scores.forEach((sc, rowIdx) => {
      const y = PAD.top + rowIdx * rowH;
      _hmDrawCell(ctx, x, y, cellW, rowH, sc);
    });
  }

  // ── ③ 総合行の区切り線（行ラベルの前に強調線）──
  const totalRowY = PAD.top + 3 * rowH;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD.left, totalRowY);
  ctx.lineTo(PAD.left + gW, totalRowY);
  ctx.stroke();

  // ── ④ 行ラベル ──
  ctx.textAlign = 'right';
  ctx.font      = '9px Noto Sans JP, sans-serif';
  ROWS.forEach((label, rowIdx) => {
    const cy = PAD.top + rowH * rowIdx + rowH / 2 + 3;
    ctx.fillStyle = rowIdx === 3 ? 'rgba(226,237,227,0.9)' : 'rgba(143,170,145,0.8)';
    ctx.fillText(label, PAD.left - 4, cy);
  });

  // ── ⑤ 月ラベル（上部）──
  ctx.fillStyle = 'rgba(143,170,145,0.7)';
  ctx.font      = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const cx = PAD.left + (m * 3 + 1.5) / N * gW;
    ctx.fillText(`${m + 1}`, cx, PAD.top - 3);
  }
  // 「月」単位テキスト
  ctx.fillStyle = 'rgba(143,170,145,0.4)';
  ctx.font      = '8px DM Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('月', PAD.left + gW + 2, PAD.top - 3);

  // ── ⑥ 本日縦線 ──
  const todayX = PAD.left + (todayDecade + 0.5) / N * gW;
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.80)';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(todayX, PAD.top);
  ctx.lineTo(todayX, PAD.top + gH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── ⑦ 月ラベル（下部）──
  ctx.fillStyle = 'rgba(143,170,145,0.6)';
  ctx.font      = '8px DM Mono, monospace';
  ctx.textAlign = 'center';
  for (let m = 0; m < 12; m++) {
    const cx = PAD.left + (m * 3 + 1.5) / N * gW;
    ctx.fillText(`${m + 1}月`, cx, PAD.top + gH + 10);
  }

  // ── 凡例 ──
  const hasSun  = sunScores !== null;
  const noSunMsg = hasSun ? '' : '<span class="adp-tl-item adp-tl-period" style="color:var(--text3)">日照データなし（日照行はグレー）</span>';
  if (legendEl) {
    legendEl.innerHTML =
      '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(74,222,128,0.75)"></span>適正（緑）</span>'
      + '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.70)"></span>要注意（黄）</span>'
      + '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(248,113,113,0.75)"></span>困難（赤）</span>'
      + '<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>'
      + noSunMsg;
  }
}

// ═══════════════════════════════════════════
//  ⚖️ 栽培方式別 収穫予測比較バー（Phase 5）
//  露地 / ハウス / 加温ハウス の3方式を
//  横並びガントで比較。気候推定専用。
// ═══════════════════════════════════════════

// ── 方式定義（順序・色・ラベル固定） ──
const _CMP_MODES = [
  { key: 'openField',       label: '🌾 露地',     color: 'rgba(56,189,248,1)'  }, // 水色
  { key: 'greenhouse',      label: '🏠 ハウス',   color: 'rgba(74,222,128,1)'  }, // 緑
  { key: 'heatedGreenhouse',label: '🔥 加温',     color: 'rgba(251,146,60,1)'  }, // オレンジ
];

// ── Canvas初期化（compare専用） ──
function _adpCompareSetup() {
  const canvas = document.getElementById('adp-compare-canvas');
  if (!canvas) return null;

  const decadeArr   = currentAreaData?.climate?.decadeArr;
  const rainMonthly = currentAreaData?.climate?.rainMonthly;

  const ctx = canvas.getContext('2d');
  const W   = canvas.offsetWidth  || 320;
  const H   = canvas.offsetHeight || 200;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, H);

  if (!decadeArr || !Array.isArray(decadeArr.tMean) || decadeArr.tMean.length !== _ADP_GROWTH_N) {
    ctx.fillStyle = 'rgba(90,122,92,0.8)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('旬別気温データなし（AMeDAS未取得）', W / 2, H / 2);
    const legendEl = document.getElementById('adp-compare-legend');
    if (legendEl) legendEl.innerHTML = '';
    return null;
  }

  return { ctx, W, H, decadeArr, rainMonthly };
}

// ── メイン描画 ──
function _adpRenderGrowthCompare(cropId) {
  const g = _adpCompareSetup();
  if (!g) return;

  const { ctx, W, H, decadeArr } = g;
  const legendEl    = document.getElementById('adp-compare-legend');
  const crop        = _adpGrowthFindCrop(cropId);
  const currentMode = currentAreaData?.cultivationMode || 'openField';
  const todayDecade = _adpGanttTodayDecade();

  // 作物未選択
  if (!crop) {
    ctx.fillStyle = 'rgba(90,122,92,0.7)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('作物を選択してください', W / 2, H / 2);
    if (legendEl) legendEl.innerHTML = '<span class="adp-tl-item" style="color:var(--text3)">作物を選択してください</span>';
    return;
  }

  // ── 各方式のPhenology結果を取得 ──
  const modeResults = _CMP_MODES.map(m => {
    if (typeof Phenology === 'undefined') return { ...m, wins: [] };
    const wins = Phenology.sowingWindows(decadeArr, crop, m.key);
    return { ...m, wins };
  });

  // ── レイアウト ──
  // 行数：3方式（播種/定植適期 + 収穫予測で各方式1行 = 計3行）
  const rows = _CMP_MODES.map(m => m.label);
  const PAD  = { top: 18, right: 8, bottom: 22, left: 46 };
  const { gW, gH } = _adpGanttDrawAxes(ctx, W, H, PAD);

  _adpGanttDrawTodayLine(ctx, PAD, gW, gH, todayDecade);
  _adpGanttDrawRowLabels(ctx, PAD, gH, rows);

  // ── 各方式を描画 ──
  modeResults.forEach((m, rowIdx) => {
    const isActive = (m.key === currentMode);

    if (m.wins.length === 0) {
      // 適期なし → 「—」テキストを行中央に表示
      const rowH = gH / _CMP_MODES.length;
      const cy   = PAD.top + rowH * rowIdx + rowH / 2 + 3;
      ctx.save();
      ctx.fillStyle = 'rgba(143,170,145,0.4)';
      ctx.font      = '9px Noto Sans JP, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('この方式では適期なし', PAD.left + gW / 2, cy);
      ctx.restore();
      return;
    }

    // 播種/定植適期バー（上位3件：濃→薄）
    m.wins.slice(0, 3).forEach((win, rank) => {
      const alpha  = isActive
        ? (rank === 0 ? 0.88 : 0.38 - rank * 0.05)
        : (rank === 0 ? 0.60 : 0.22 - rank * 0.05);
      const mStart = Math.floor(win.startDecade / 3);
      const mEnd   = Math.floor(win.endDecade   / 3);
      for (let mo = mStart; mo <= Math.min(mEnd, 11); mo++) {
        _adpGanttDrawBar(ctx, PAD, gW, gH, _CMP_MODES.length, rowIdx, mo, m.color, alpha);
      }
    });

    // 収穫予測マーカー（1位のみ）
    const best = m.wins[0];
    if (best.harvestDecade != null) {
      _adpGanttDrawHarvestDot(
        ctx, PAD, gW, gH, _CMP_MODES.length, rowIdx,
        best.harvestDecade,
        isActive ? 'rgba(167,139,250,0.95)' : 'rgba(167,139,250,0.55)'
      );
    }

    // 現在選択中の方式は行全体に強調枠を追加
    if (isActive) {
      const rowH = gH / _CMP_MODES.length;
      const y    = PAD.top + rowH * rowIdx;
      ctx.save();
      ctx.strokeStyle = m.color.replace('1)', '0.6)');
      ctx.lineWidth   = 2;
      ctx.strokeRect(PAD.left + 1, y + 1, gW - 2, rowH - 2);
      ctx.restore();
    }
  });

  // ── 凡例 ──
  if (legendEl) {
    const modeItems = modeResults.map(m => {
      const best = m.wins[0];
      const isActive = m.key === currentMode;
      const sowLabel     = best ? Phenology.decadeLabel(best.startDecade) : null;
      const sowEndLabel  = best ? Phenology.decadeLabel(best.endDecade)   : null;
      const harvestLabel = (best && best.harvestDecade != null)
        ? Phenology.decadeLabel(best.harvestDecade) : null;
      const detail = sowLabel
        ? `${sowLabel}〜${sowEndLabel}` + (harvestLabel ? ` → 収穫 ${harvestLabel}` : '')
        : '適期なし';
      const activeStyle = isActive ? 'font-weight:600;color:var(--text)' : '';
      return `<span class="adp-tl-item" style="${activeStyle}"><span class="adp-tl-dot" style="background:${m.color}"></span>${m.label} ${detail}${isActive ? '（選択中）' : ''}</span>`;
    }).join('');

    legendEl.innerHTML =
      modeItems
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(251,191,36,0.8)"></span>本日</span>`
      + `<span class="adp-tl-item"><span class="adp-tl-dot" style="background:rgba(167,139,250,0.8)"></span>収穫予測</span>`;
  }
}