// ═══════════════════════════════════════════
//  RECORDS — 出荷記録管理
//  保存先: localStorage（キー: agri_records）
//  呼び出し元: area.js _adpRenderShippingPane()
// ═══════════════════════════════════════════

const RECORDS_KEY        = 'agri_records';
const RECORDS_PROFILE_KEY = 'agri_producer_profile';

// ─── 出荷先定義 ───
const SHIPPING_TYPES = {
  ja: {
    label: 'JA（農協）',
    icon: '🌾',
    sections: [
      {
        title: '出荷伝票',
        fields: [
          { id: 'producerNo',   label: '生産者番号',     type: 'text',   placeholder: '例：P-001234',   autoFill: 'producerNo' },
          { id: 'producerName', label: '氏名',           type: 'text',   placeholder: '例：山田 太郎',  autoFill: 'producerName' },
          { id: 'shipDate',     label: '出荷日',          type: 'date'   },
          { id: 'item',         label: '品目',            type: 'text',   placeholder: '例：トマト',     autoFill: 'cropName' },
          { id: 'variety',      label: '品種',            type: 'text',   placeholder: '例：桃太郎',     autoFill: 'variety' },
          { id: 'grade',        label: '等級',            type: 'select', options: ['秀', '優', '良', '規格外'] },
          { id: 'size',         label: '規格（サイズ）',  type: 'text',   placeholder: '例：2L' },
          { id: 'quantity',     label: '数量',            type: 'number', placeholder: '例：100',        unit: '個' },
          { id: 'weight',       label: '重量',            type: 'number', placeholder: '例：20.5',       unit: 'kg' },
        ]
      },
      {
        title: '栽培履歴',
        fields: [
          { id: 'sowDate',      label: '播種日',   type: 'date',  autoFill: 'sowDate' },
          { id: 'plantDate',    label: '定植日',   type: 'date',  autoFill: 'transplantDate' },
          { id: 'harvestDate',  label: '収穫日',   type: 'date',  autoFill: 'harvestStart' },
          { id: 'fertilizer',   label: '使用肥料', type: 'text',  placeholder: '例：有機888', autoFill: 'fertHistory' },
          { id: 'pesticide',    label: '使用農薬', type: 'text',  placeholder: '例：○○乳剤', autoFill: 'pesticideHistory' },
          { id: 'sprayDate',    label: '散布日',   type: 'date',  autoFill: 'lastSprayDate' },
          { id: 'sprayAmount',  label: '使用量',   type: 'text',  placeholder: '例：200ml',  autoFill: 'lastSprayAmount' },
          { id: 'dilutionRate', label: '希釈倍率', type: 'text',  placeholder: '例：1000倍' },
        ]
      },
      {
        title: 'GAP関連',
        collapsed: true,
        fields: [
          { id: 'worker',           label: '作業者',       type: 'text',     placeholder: '氏名' },
          { id: 'workDateTime',     label: '作業日時',     type: 'datetime-local' },
          { id: 'sanitation',       label: '衛生管理記録', type: 'textarea', placeholder: '手洗い・消毒・服装確認など' },
          { id: 'machinery',        label: '機械点検記録', type: 'textarea', placeholder: '点検項目・結果など' },
          { id: 'pesticideStorage', label: '農薬保管記録', type: 'textarea', placeholder: '保管場所・残量など' },
        ]
      }
    ]
  },
  market: {
    label: '卸売市場',
    icon: '🏪',
    sections: [
      {
        title: '出荷申込書',
        fields: [
          { id: 'producerName', label: '生産者名', type: 'text',   placeholder: '例：山田農園', autoFill: 'producerName' },
          { id: 'producerAddr', label: '産地',     type: 'text',   placeholder: '例：長野県松本市', autoFill: 'producerAddr' },
          { id: 'shipDate',     label: '出荷日',    type: 'date' },
          { id: 'item',         label: '品目',      type: 'text',   placeholder: '例：レタス',    autoFill: 'cropName' },
          { id: 'variety',      label: '品種',      type: 'text',   placeholder: '例：グリーンウェーブ', autoFill: 'variety' },
          { id: 'shipQty',      label: '出荷量',    type: 'number', placeholder: '例：50',        unit: 'ケース' },
          { id: 'weight',       label: '重量',      type: 'number', placeholder: '例：300',       unit: 'kg' },
        ]
      },
      {
        title: '品質情報',
        fields: [
          { id: 'grade',       label: '等級',   type: 'select', options: ['秀', '優', '良', '規格外'] },
          { id: 'size',        label: 'サイズ', type: 'text',   placeholder: '例：M' },
          { id: 'harvestDate', label: '収穫日', type: 'date',   autoFill: 'harvestStart' },
        ]
      },
      {
        title: 'トレーサビリティ',
        collapsed: true,
        fields: [
          { id: 'producerCode', label: '生産者コード', type: 'text',     placeholder: '例：JA-0012' },
          { id: 'fieldNo',      label: '圃場番号',     type: 'text',     placeholder: '例：F-003',  autoFill: 'areaId' },
          { id: 'cultivHist',   label: '栽培履歴',     type: 'textarea', placeholder: '農薬・肥料履歴など', autoFill: 'fullHistory' },
        ]
      }
    ]
  },
  supermarket: {
    label: 'スーパー（直接取引）',
    icon: '🛒',
    sections: [
      {
        title: '商品規格書',
        fields: [
          { id: 'productName', label: '商品名',       type: 'text',   placeholder: '例：有機トマト 200g袋', autoFill: 'cropName' },
          { id: 'variety',     label: '品種',         type: 'text',   placeholder: '例：桃太郎',            autoFill: 'variety' },
          { id: 'contentAmt',  label: '内容量',       type: 'text',   placeholder: '例：200g' },
          { id: 'pcsPerCase',  label: '入数',         type: 'number', placeholder: '例：12', unit: '個/ケース' },
          { id: 'storage',     label: '保存方法',     type: 'text',   placeholder: '例：常温保存' },
          { id: 'shelfLife',   label: '賞味期限設定', type: 'text',   placeholder: '例：収穫後3日' },
          { id: 'origin',      label: '原産地',       type: 'text',   placeholder: '例：長野県', autoFill: 'producerAddr' },
        ]
      },
      {
        title: '栽培管理記録',
        fields: [
          { id: 'pesticideHist', label: '農薬使用履歴', type: 'textarea', placeholder: '農薬名・散布日・使用量', autoFill: 'pesticideHistory' },
          { id: 'fertHist',      label: '肥料使用履歴', type: 'textarea', placeholder: '肥料名・施用日・使用量', autoFill: 'fertHistory' },
          { id: 'harvestDate',   label: '収穫日',       type: 'date',     autoFill: 'harvestStart' },
        ]
      },
      {
        title: '生産者情報',
        fields: [
          { id: 'producerName', label: '氏名',     type: 'text', placeholder: '山田 太郎',      autoFill: 'producerName' },
          { id: 'producerAddr', label: '住所',     type: 'text', placeholder: '長野県松本市...', autoFill: 'producerAddr' },
          { id: 'producerTel',  label: '電話番号', type: 'tel',  placeholder: '0263-XX-XXXX',   autoFill: 'producerTel' },
        ]
      },
      {
        title: '食品安全関連',
        collapsed: true,
        fields: [
          { id: 'gapCert',       label: 'GAP認証',         type: 'text',     placeholder: 'JGAP / GlobalG.A.P など' },
          { id: 'organicCert',   label: '有機JAS認証',     type: 'text',     placeholder: '認証番号（該当時）' },
          { id: 'pesticideTest', label: '残留農薬検査結果', type: 'textarea', placeholder: '検査機関・結果など' },
        ]
      }
    ]
  },
  direct: {
    label: '直売所',
    icon: '🏡',
    sections: [
      {
        title: '出荷情報',
        fields: [
          { id: 'producerNo',  label: '生産者番号', type: 'text',   placeholder: '例：A-042', autoFill: 'producerNo' },
          { id: 'productName', label: '商品名',     type: 'text',   placeholder: '例：きゅうり', autoFill: 'cropName' },
          { id: 'quantity',    label: '数量',       type: 'number', placeholder: '例：10', unit: '個' },
          { id: 'price',       label: '価格',       type: 'number', placeholder: '例：250', unit: '円' },
          { id: 'shipDate',    label: '出荷日',     type: 'date' },
        ]
      }
    ]
  },
  roadside: {
    label: '道の駅',
    icon: '🚗',
    sections: [
      {
        title: '出荷情報',
        fields: [
          { id: 'producerNo',  label: '生産者番号', type: 'text',   placeholder: '例：A-042', autoFill: 'producerNo' },
          { id: 'stationName', label: '道の駅名',   type: 'text',   placeholder: '例：道の駅○○' },
          { id: 'productName', label: '商品名',     type: 'text',   placeholder: '例：トマト', autoFill: 'cropName' },
          { id: 'quantity',    label: '数量',       type: 'number', placeholder: '例：20', unit: '個' },
          { id: 'weight',      label: '重量',       type: 'number', placeholder: '例：5',  unit: 'kg' },
          { id: 'price',       label: '価格',       type: 'number', placeholder: '例：300', unit: '円' },
          { id: 'shipDate',    label: '出荷日',     type: 'date' },
        ]
      }
    ]
  },
};

// ─── ストレージ操作 ───
function recordsLoad() {
  try { return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]'); }
  catch { return []; }
}
function recordsSave(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
function recordsAdd(record) {
  const records = recordsLoad();
  record.id        = Date.now().toString();
  record.createdAt = new Date().toISOString();
  records.unshift(record);
  recordsSave(records);
  return record;
}
function recordsDelete(id) {
  recordsSave(recordsLoad().filter(r => r.id !== id));
}

// ─── プロフィール保存・読込 ───
function recordsLoadProfile() {
  try { return JSON.parse(localStorage.getItem(RECORDS_PROFILE_KEY) || '{}'); }
  catch { return {}; }
}
function recordsSaveProfile() {
  const profile = {
    producerName: document.getElementById('sh-prof-name')?.value.trim()  || '',
    producerNo:   document.getElementById('sh-prof-no')?.value.trim()    || '',
    producerAddr: document.getElementById('sh-prof-addr')?.value.trim()  || '',
    producerTel:  document.getElementById('sh-prof-tel')?.value.trim()   || '',
  };
  localStorage.setItem(RECORDS_PROFILE_KEY, JSON.stringify(profile));
  if (typeof showToast === 'function') showToast('生産者情報を保存しました');
  // 保存後フォームを再注入
  _shInjectAutoFill();
}

// ─── 自動注入データ収集 ───
function _shBuildAutoData(opts) {
  const { area, practicecrops } = opts;
  const profile = recordsLoadProfile();

  // 選択中作物
  const cropId = document.getElementById('sh-crop-select')?.value || '';
  const pc     = (practicecrops || []).find(p => p.cropId === cropId);

  // 肥料履歴（直近5件）
  const fertHistory = (pc?.fertRecords || [])
    .slice(0, 5)
    .map(r => `${r.name} ${r.date} ${r.amount}${r.unit}`)
    .join(' / ') || '';

  // 農薬履歴（直近5件・最新1件の日付・量も抽出）
  const pestRecs = pc?.pesticideRecords || [];
  const pesticideHistory = pestRecs
    .slice(0, 5)
    .map(r => `${r.name} ${r.date} ${r.amount}${r.unit}`)
    .join(' / ') || '';
  const lastSpray = pestRecs[0] || null;

  // 作物名（cropDB参照）
  let cropName = '';
  if (cropId && typeof CROP_DB !== 'undefined') {
    const entry = CROP_DB.find(c => c.id === cropId);
    cropName = entry?.name || cropId;
  }

  return {
    producerName:      profile.producerName || '',
    producerNo:        profile.producerNo   || '',
    producerAddr:      profile.producerAddr || '',
    producerTel:       profile.producerTel  || '',
    cropName,
    variety:           pc?.variety           || '',
    sowDate:           pc?.sowDate           || '',
    transplantDate:    pc?.transplantDate    || '',
    harvestStart:      pc?.harvestStart      || '',
    fertHistory,
    pesticideHistory,
    lastSprayDate:     lastSpray?.date       || '',
    lastSprayAmount:   lastSpray ? `${lastSpray.amount}${lastSpray.unit}` : '',
    areaId:            area?.id              || '',
    fullHistory:       [fertHistory && `【肥料】${fertHistory}`, pesticideHistory && `【農薬】${pesticideHistory}`].filter(Boolean).join('\n'),
  };
}

// ─── フォームへ自動注入 ───
function _shInjectAutoFill() {
  const container = document.getElementById('shipping-result');
  if (!container) return;

  const shippingType = container.dataset.shippingType || 'ja';
  const def = SHIPPING_TYPES[shippingType];
  if (!def) return;

  // opts は renderShippingForm 呼び出し時に dataset に保存済み
  let opts = {};
  try { opts = JSON.parse(container.dataset.opts || '{}'); } catch {}

  const data = _shBuildAutoData(opts);

  def.sections.forEach(sec => {
    sec.fields.forEach(f => {
      if (!f.autoFill) return;
      const val = data[f.autoFill];
      if (!val) return;
      const el = document.querySelector(`#sh-form [name="${f.id}"]`);
      if (el && !el.value) el.value = val;
    });
  });
}

// ─── フィールドHTML生成 ───
function _shBuildFieldHTML(f) {
  if (f.type === 'select') {
    const opts = f.options.map(o => `<option value="${o}">${o}</option>`).join('');
    return `<select class="sh-input" name="${f.id}"><option value="">—</option>${opts}</select>`;
  }
  if (f.type === 'textarea') {
    return `<textarea class="sh-input sh-textarea" name="${f.id}" placeholder="${f.placeholder || ''}"></textarea>`;
  }
  const unit    = f.unit ? `<span class="sh-unit">${f.unit}</span>` : '';
  const wrap    = f.unit ? `<div class="sh-input-with-unit">` : '';
  const wrapEnd = f.unit ? `</div>` : '';
  return `${wrap}<input class="sh-input" type="${f.type}" name="${f.id}" placeholder="${f.placeholder || ''}">${unit}${wrapEnd}`;
}

// ─── セクションHTML生成 ───
function _shBuildSectionHTML(section) {
  const fieldsHTML = section.fields.map(f => `
    <div class="sh-field">
      <label class="sh-label">${f.label}</label>
      ${_shBuildFieldHTML(f)}
    </div>`).join('');

  if (section.collapsed) {
    return `
      <div class="sh-section sh-section-collapsed">
        <div class="sh-section-header" onclick="shToggleSection(this)">
          <span class="sh-section-title">${section.title}</span>
          <svg class="sh-acc-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sh-section-body" style="display:none;">${fieldsHTML}</div>
      </div>`;
  }
  return `
    <div class="sh-section">
      <div class="sh-section-title-plain">${section.title}</div>
      ${fieldsHTML}
    </div>`;
}

// ─── プロフィールセクションHTML ───
function _shBuildProfileHTML() {
  const p = recordsLoadProfile();
  const hasProfile = p.producerName || p.producerNo;
  return `
    <div class="sh-profile-wrap ${hasProfile ? '' : 'sh-profile-open'}" id="sh-profile-wrap">
      <div class="sh-section-header sh-profile-header" onclick="shToggleProfile()">
        <span class="sh-section-title">👤 生産者情報</span>
        <span class="sh-profile-hint">${hasProfile ? '保存済み ✓' : '未設定'}</span>
        <svg class="sh-acc-icon ${hasProfile ? '' : 'sh-acc-open'}" id="sh-profile-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="sh-profile-body" id="sh-profile-body" style="display:${hasProfile ? 'none' : 'block'};">
        <div class="sh-field">
          <label class="sh-label">氏名</label>
          <input class="sh-input" type="text" id="sh-prof-name" value="${p.producerName || ''}" placeholder="山田 太郎">
        </div>
        <div class="sh-field">
          <label class="sh-label">生産者番号</label>
          <input class="sh-input" type="text" id="sh-prof-no" value="${p.producerNo || ''}" placeholder="例：P-001234">
        </div>
        <div class="sh-field">
          <label class="sh-label">住所</label>
          <input class="sh-input" type="text" id="sh-prof-addr" value="${p.producerAddr || ''}" placeholder="例：長野県松本市...">
        </div>
        <div class="sh-field">
          <label class="sh-label">電話番号</label>
          <input class="sh-input" type="tel" id="sh-prof-tel" value="${p.producerTel || ''}" placeholder="0263-XX-XXXX">
        </div>
        <div class="sh-profile-footer">
          <button class="sh-save-btn" onclick="recordsSaveProfile()">✓ 保存</button>
        </div>
      </div>
    </div>`;
}

// ─── 作物プルダウンHTML ───
function _shBuildCropSelectHTML(practicecrops) {
  if (!practicecrops || practicecrops.length === 0) {
    return `<div class="sh-no-crops">実務タブで作物を追加してください</div>`;
  }
  let cropName = (cropId) => {
    if (typeof CROP_DB !== 'undefined') {
      const e = CROP_DB.find(c => c.id === cropId);
      if (e) return e.name;
    }
    return cropId;
  };
  const opts = practicecrops.map(pc =>
    `<option value="${pc.cropId}">${cropName(pc.cropId)}${pc.variety ? '（' + pc.variety + '）' : ''}</option>`
  ).join('');
  return `
    <div class="sh-field">
      <label class="sh-label">対象作物</label>
      <select class="sh-input" id="sh-crop-select" onchange="_shInjectAutoFill()">
        <option value="">— 選択 —</option>
        ${opts}
      </select>
    </div>`;
}

// ─── 出荷先タブHTML ───
function _shBuildTypeTabsHTML(currentType) {
  return `<div class="sh-type-tabs">
    ${Object.entries(SHIPPING_TYPES).map(([key, def]) =>
      `<button class="sh-type-tab ${key === currentType ? 'active' : ''}"
        onclick="shSwitchType('${key}')">${def.icon} ${def.label}</button>`
    ).join('')}
  </div>`;
}

// ─── 記録一覧HTML ───
function _shBuildRecordListHTML(records) {
  if (!records.length) {
    return `<div class="sh-empty-list"><div class="sh-empty-icon">📋</div>保存された記録はありません</div>`;
  }
  return records.map(r => {
    const dateStr = r.shipDate || r.createdAt?.slice(0, 10) || '—';
    const item    = r.productName || r.item || '—';
    const dest    = r.shippingTypeLabel || r.shippingType || '—';
    const area    = r.areaName ? `<span class="sh-card-area">📍 ${r.areaName}</span>` : '';
    return `
      <div class="sh-card">
        <div class="sh-card-top">
          <span class="sh-card-dest">${dest}</span>
          ${area}
          <span class="sh-card-date">${dateStr}</span>
        </div>
        <div class="sh-card-item">${item}</div>
        <div class="sh-card-actions">
          <button class="sh-del-btn" onclick="shDeleteRecord('${r.id}')">削除</button>
        </div>
      </div>`;
  }).join('');
}

// ─── メイン描画 ───
function renderShippingForm(opts) {
  const currentType   = opts.currentType || 'ja';
  const practicecrops = opts.practicecrops || [];
  const area          = opts.area || null;
  const def           = SHIPPING_TYPES[currentType];
  const records       = recordsLoad();

  // optsをdatasetに保存（自動注入で参照）
  const container = document.getElementById('shipping-result');
  if (container) {
    container.dataset.shippingType = currentType;
    container.dataset.opts = JSON.stringify({ area, practicecrops });
  }

  const sectionsHTML = def.sections.map(_shBuildSectionHTML).join('');

  return `
    ${_shBuildProfileHTML()}
    ${_shBuildTypeTabsHTML(currentType)}
    <div class="sh-form-wrap" id="sh-form-wrap">
      <div id="sh-form">
        ${_shBuildCropSelectHTML(practicecrops)}
        ${sectionsHTML}
        <div class="sh-form-actions">
          <button class="sh-submit-btn" onclick="shSubmitRecord('${currentType}')">✓ 保存する</button>
        </div>
      </div>
    </div>
    <div class="sh-list-header">
      <span class="sh-list-count">${records.length} 件の記録</span>
    </div>
    <div id="sh-list">${_shBuildRecordListHTML(records)}</div>
  `;
}

// ─── 出荷先切替 ───
function shSwitchType(type) {
  const container = document.getElementById('shipping-result');
  if (!container) return;
  let opts = {};
  try { opts = JSON.parse(container.dataset.opts || '{}'); } catch {}
  opts.currentType = type;
  container.dataset.shippingType = type;
  container.dataset.opts = JSON.stringify(opts);

  // タブ強調
  container.querySelectorAll('.sh-type-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(SHIPPING_TYPES[type].label));
  });

  // フォームのみ再描画
  const wrap = document.getElementById('sh-form-wrap');
  if (wrap) {
    const pc = opts.practicecrops || [];
    const def = SHIPPING_TYPES[type];
    wrap.innerHTML = `<div id="sh-form">
      ${_shBuildCropSelectHTML(pc)}
      ${def.sections.map(_shBuildSectionHTML).join('')}
      <div class="sh-form-actions">
        <button class="sh-submit-btn" onclick="shSubmitRecord('${type}')">✓ 保存する</button>
      </div>
    </div>`;
    // 自動注入
    setTimeout(_shInjectAutoFill, 0);
  }
}

// ─── 作物変更時の自動注入（グローバル公開） ───
// _shInjectAutoFill は既にグローバルスコープで定義済み

// ─── フォーム送信 ───
function shSubmitRecord(type) {
  const form = document.getElementById('sh-form');
  if (!form) return;

  const inputs = form.querySelectorAll('[name]');
  const data   = {};
  inputs.forEach(el => { if (el.value.trim()) data[el.name] = el.value.trim(); });

  // エリア情報付与
  let opts = {};
  try { opts = JSON.parse(document.getElementById('shipping-result')?.dataset.opts || '{}'); } catch {}
  const area = opts.area;
  if (area) {
    data.areaId   = area.id   || '';
    data.areaName = area.name || area.id || '';
  }

  data.shippingType      = type;
  data.shippingTypeLabel = SHIPPING_TYPES[type].label;

  recordsAdd(data);
  if (typeof showToast === 'function') showToast('記録を保存しました');

  // 一覧を更新
  const listEl = document.getElementById('sh-list');
  const countEl = document.querySelector('.sh-list-count');
  const records = recordsLoad();
  if (listEl)  listEl.innerHTML  = _shBuildRecordListHTML(records);
  if (countEl) countEl.textContent = `${records.length} 件の記録`;

  // フォームリセット
  form.querySelectorAll('input:not([id^="sh-prof"]), select, textarea').forEach(el => el.value = '');
}

// ─── 記録削除 ───
async function shDeleteRecord(id) {
  const ok = await showConfirmDialog('この記録を削除しますか？', '削除する', 'キャンセル', true);
  if (!ok) return;
  recordsDelete(id);
  const records = recordsLoad();
  const listEl  = document.getElementById('sh-list');
  const countEl = document.querySelector('.sh-list-count');
  if (listEl)  listEl.innerHTML  = _shBuildRecordListHTML(records);
  if (countEl) countEl.textContent = `${records.length} 件の記録`;
  if (typeof showToast === 'function') showToast('記録を削除しました');
}

// ─── プロフィール折りたたみ ───
function shToggleProfile() {
  const body = document.getElementById('sh-profile-body');
  const icon = document.getElementById('sh-profile-icon');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ─── セクション折りたたみ ───
function shToggleSection(header) {
  const body = header.nextElementSibling;
  const icon = header.querySelector('.sh-acc-icon');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ─── 音声メモからの自動マッピング（後方互換） ───
function recordsFillFromVoice(parsed, type) {
  if (!SHIPPING_TYPES[type]) return;
  const container = document.getElementById('sh-crop-select');
  shSwitchType(type);
  const fillField = (name, value) => {
    if (!value) return;
    const el = document.querySelector(`#sh-form [name="${name}"]`);
    if (el) el.value = value;
  };
  fillField('shipDate',    parsed.shipDate   || '');
  fillField('item',        parsed.item       || '');
  fillField('productName', parsed.item       || '');
  fillField('quantity',    parsed.quantity ? parseFloat(parsed.quantity) : '');
  if (typeof showToast === 'function') showToast(`📦 出荷記録フォームに反映しました（${SHIPPING_TYPES[type].label}）`);
}
