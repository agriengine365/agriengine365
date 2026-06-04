// ═══════════════════════════════════════════
//  RECORDS — 出荷記録管理
//  保存先: localStorage（キー: agri_records）
//  エリア紐付け: area.js の loadAreas() 参照
// ═══════════════════════════════════════════

const RECORDS_KEY = 'agri_records';

// 出荷先定義
const SHIPPING_TYPES = {
  ja: {
    label: 'JA（農協）',
    icon: '🌾',
    sections: [
      {
        title: '出荷伝票',
        fields: [
          { id: 'producerNo',   label: '生産者番号',     type: 'text',   placeholder: '例：P-001234' },
          { id: 'producerName', label: '氏名',           type: 'text',   placeholder: '例：山田 太郎' },
          { id: 'shipDate',     label: '出荷日',          type: 'date'   },
          { id: 'item',         label: '品目',            type: 'text',   placeholder: '例：トマト' },
          { id: 'variety',      label: '品種',            type: 'text',   placeholder: '例：桃太郎' },
          { id: 'grade',        label: '等級',            type: 'select', options: ['秀', '優', '良', '規格外'] },
          { id: 'size',         label: '規格（サイズ）',  type: 'text',   placeholder: '例：2L' },
          { id: 'quantity',     label: '数量',            type: 'number', placeholder: '例：100', unit: '個' },
          { id: 'weight',       label: '重量',            type: 'number', placeholder: '例：20.5', unit: 'kg' },
        ]
      },
      {
        title: '栽培履歴',
        fields: [
          { id: 'sowDate',      label: '播種日',   type: 'date' },
          { id: 'plantDate',    label: '定植日',   type: 'date' },
          { id: 'harvestDate',  label: '収穫日',   type: 'date' },
          { id: 'fertilizer',   label: '使用肥料', type: 'text', placeholder: '例：有機888' },
          { id: 'pesticide',    label: '使用農薬', type: 'text', placeholder: '例：○○乳剤' },
          { id: 'sprayDate',    label: '散布日',   type: 'date' },
          { id: 'sprayAmount',  label: '使用量',   type: 'text', placeholder: '例：200ml' },
          { id: 'dilutionRate', label: '希釈倍率', type: 'text', placeholder: '例：1000倍' },
        ]
      },
      {
        title: 'GAP関連',
        collapsed: true,
        fields: [
          { id: 'worker',       label: '作業者',       type: 'text', placeholder: '氏名' },
          { id: 'workDateTime', label: '作業日時',     type: 'datetime-local' },
          { id: 'sanitation',   label: '衛生管理記録', type: 'textarea', placeholder: '手洗い・消毒・服装確認など' },
          { id: 'machinery',    label: '機械点検記録', type: 'textarea', placeholder: '点検項目・結果など' },
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
          { id: 'producerName', label: '生産者名',   type: 'text',   placeholder: '例：山田農園' },
          { id: 'producerAddr', label: '産地',       type: 'text',   placeholder: '例：長野県松本市' },
          { id: 'shipDate',     label: '出荷日',      type: 'date' },
          { id: 'item',         label: '品目',        type: 'text',   placeholder: '例：レタス' },
          { id: 'variety',      label: '品種',        type: 'text',   placeholder: '例：グリーンウェーブ' },
          { id: 'shipQty',      label: '出荷量',      type: 'number', placeholder: '例：50', unit: 'ケース' },
          { id: 'weight',       label: '重量',        type: 'number', placeholder: '例：300', unit: 'kg' },
        ]
      },
      {
        title: '品質情報',
        fields: [
          { id: 'grade',        label: '等級',    type: 'select', options: ['秀', '優', '良', '規格外'] },
          { id: 'size',         label: 'サイズ',  type: 'text',   placeholder: '例：M' },
          { id: 'harvestDate',  label: '収穫日',  type: 'date' },
        ]
      },
      {
        title: 'トレーサビリティ',
        collapsed: true,
        fields: [
          { id: 'producerCode', label: '生産者コード', type: 'text',     placeholder: '例：JA-0012' },
          { id: 'fieldNo',      label: '圃場番号',     type: 'text',     placeholder: '例：F-003' },
          { id: 'cultivHist',   label: '栽培履歴',     type: 'textarea', placeholder: '農薬・肥料履歴など' },
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
          { id: 'productName',  label: '商品名',     type: 'text',   placeholder: '例：有機トマト 200g袋' },
          { id: 'variety',      label: '品種',       type: 'text',   placeholder: '例：桃太郎' },
          { id: 'contentAmt',   label: '内容量',     type: 'text',   placeholder: '例：200g' },
          { id: 'pcsPerCase',   label: '入数',       type: 'number', placeholder: '例：12', unit: '個/ケース' },
          { id: 'storage',      label: '保存方法',   type: 'text',   placeholder: '例：常温保存' },
          { id: 'shelfLife',    label: '賞味期限設定', type: 'text', placeholder: '例：収穫後3日' },
          { id: 'origin',       label: '原産地',     type: 'text',   placeholder: '例：長野県' },
        ]
      },
      {
        title: '栽培管理記録',
        fields: [
          { id: 'pesticideHist', label: '農薬使用履歴', type: 'textarea', placeholder: '農薬名・散布日・使用量' },
          { id: 'fertHist',      label: '肥料使用履歴', type: 'textarea', placeholder: '肥料名・施用日・使用量' },
          { id: 'harvestDate',   label: '収穫日',       type: 'date' },
        ]
      },
      {
        title: '生産者情報',
        fields: [
          { id: 'producerName', label: '氏名',     type: 'text', placeholder: '山田 太郎' },
          { id: 'producerAddr', label: '住所',     type: 'text', placeholder: '長野県松本市...' },
          { id: 'producerTel',  label: '電話番号', type: 'tel',  placeholder: '0263-XX-XXXX' },
        ]
      },
      {
        title: '食品安全関連',
        collapsed: true,
        fields: [
          { id: 'gapCert',      label: 'GAP認証',       type: 'text',   placeholder: 'JGAP / GlobalG.A.P など' },
          { id: 'organicCert',  label: '有機JAS認証',   type: 'text',   placeholder: '認証番号（該当時）' },
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
          { id: 'producerNo',   label: '生産者番号', type: 'text',   placeholder: '例：A-042' },
          { id: 'productName',  label: '商品名',     type: 'text',   placeholder: '例：きゅうり' },
          { id: 'quantity',     label: '数量',       type: 'number', placeholder: '例：10', unit: '個' },
          { id: 'price',        label: '価格',       type: 'number', placeholder: '例：250', unit: '円' },
          { id: 'shipDate',     label: '出荷日',     type: 'date' },
        ]
      }
    ]
  }
};

// ─── ストレージ操作 ───
function recordsLoad() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
  } catch {
    return [];
  }
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
  const records = recordsLoad().filter(r => r.id !== id);
  recordsSave(records);
}

// ─── エリア選択肢の取得 ───
function getAreaOptions() {
  // area.js が管理する savedAreas グローバル変数を参照
  const areas = (typeof savedAreas !== 'undefined' && Array.isArray(savedAreas))
    ? savedAreas
    : [];
  return areas;
}

// ─── フォームフィールド HTML 生成 ───
function buildFieldHTML(f) {
  if (f.type === 'select') {
    const opts = f.options.map(o => `<option value="${o}">${o}</option>`).join('');
    return `<select class="rec-input" name="${f.id}"><option value="">—</option>${opts}</select>`;
  }
  if (f.type === 'textarea') {
    return `<textarea class="rec-input rec-textarea" name="${f.id}" placeholder="${f.placeholder || ''}"></textarea>`;
  }
  const unit = f.unit ? `<span class="rec-unit">${f.unit}</span>` : '';
  const wrap = f.unit ? `<div class="rec-input-with-unit">` : '';
  const wrapEnd = f.unit ? `</div>` : '';
  return `${wrap}<input class="rec-input" type="${f.type}" name="${f.id}" placeholder="${f.placeholder || ''}">${unit}${wrapEnd}`;
}

// ─── セクション HTML 生成 ───
function buildSectionHTML(section) {
  const fieldsHTML = section.fields.map(f => `
    <div class="rec-field">
      <label class="rec-label">${f.label}</label>
      ${buildFieldHTML(f)}
    </div>
  `).join('');

  if (section.collapsed) {
    return `
      <div class="rec-section rec-section-collapsed">
        <div class="rec-section-header" onclick="toggleRecSection(this)">
          <span class="rec-section-title">${section.title}</span>
          <svg class="rec-acc-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="rec-section-body" style="display:none;">
          ${fieldsHTML}
        </div>
      </div>
    `;
  }
  return `
    <div class="rec-section">
      <div class="rec-section-title-plain">${section.title}</div>
      ${fieldsHTML}
    </div>
  `;
}

// ─── フォーム描画 ───
function renderRecordForm(type) {
  const def = SHIPPING_TYPES[type];
  if (!def) return '';

  const areas = getAreaOptions();
  const areaOpts = areas.length
    ? areas.map(a => `<option value="${a.id}">${a.name || a.id}</option>`).join('')
    : '<option value="">— エリアなし —</option>';

  const sectionsHTML = def.sections.map(buildSectionHTML).join('');

  return `
    <div class="rec-form" id="rec-form">
      <!-- エリア紐付け -->
      <div class="rec-section">
        <div class="rec-section-title-plain">圃場（エリア）</div>
        <div class="rec-field">
          <label class="rec-label">紐付けエリア</label>
          <select class="rec-input" name="areaId" id="rec-area-select">
            <option value="">— 選択 —</option>
            ${areaOpts}
          </select>
        </div>
      </div>
      ${sectionsHTML}
      <div class="rec-form-actions">
        <button type="button" class="btn btn-primary" onclick="submitRecord('${type}')">保存する</button>
      </div>
    </div>
  `;
}

// ─── フォーム送信 ───
function submitRecord(type) {
  const form = document.getElementById('rec-form');
  if (!form) return;

  const inputs = form.querySelectorAll('[name]');
  const data = {};
  inputs.forEach(el => {
    if (el.value.trim()) data[el.name] = el.value.trim();
  });

  // エリア名を追記
  const areaId = data.areaId;
  if (areaId) {
    const areas = getAreaOptions();
    const area  = areas.find(a => a.id === areaId);
    if (area) data.areaName = area.name || areaId;
  }

  data.shippingType      = type;
  data.shippingTypeLabel = SHIPPING_TYPES[type].label;

  recordsAdd(data);
  showToast('記録を保存しました');
  renderRecordTab();
}

// ─── 記録一覧 HTML ───
function buildRecordListHTML(records) {
  if (!records.length) {
    return `<div class="empty"><div class="icon">📋</div>保存された記録はありません。<br>フォームから新しい記録を追加してください。</div>`;
  }

  return records.map(r => {
    const dateStr = r.shipDate || r.createdAt?.slice(0, 10) || '—';
    const item    = r.productName || r.item || '—';
    const dest    = r.shippingTypeLabel || r.shippingType || '—';
    const area    = r.areaName ? `<span class="rec-card-area">📍 ${r.areaName}</span>` : '';
    return `
      <div class="rec-card">
        <div class="rec-card-top">
          <span class="rec-card-dest">${dest}</span>
          ${area}
          <span class="rec-card-date">${dateStr}</span>
        </div>
        <div class="rec-card-item">${item}</div>
        <div class="rec-card-actions">
          <button class="btn btn-danger" onclick="deleteRecord('${r.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

// ─── 記録削除 ───
function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  recordsDelete(id);
  renderRecordTab();
  showToast('記録を削除しました');
}

// ─── タブ全体描画 ───
function renderRecordTab() {
  const container = document.getElementById('tab-records');
  if (!container) return;

  const records = recordsLoad();
  const currentType = container.dataset.type || 'ja';

  const typeTabsHTML = Object.entries(SHIPPING_TYPES).map(([key, def]) =>
    `<button class="rec-type-tab ${key === currentType ? 'active' : ''}"
      onclick="switchRecType('${key}')">${def.icon} ${def.label}</button>`
  ).join('');

  container.innerHTML = `
    <div class="rec-type-tabs">${typeTabsHTML}</div>
    <div id="rec-form-wrap">${renderRecordForm(currentType)}</div>
    <div class="rec-list-header">
      <span class="mono-sm">${records.length} 件の記録</span>
    </div>
    <div id="rec-list">${buildRecordListHTML(records)}</div>
  `;
  container.dataset.type = currentType;
}

// ─── 出荷先切り替え ───
function switchRecType(type) {
  const container = document.getElementById('tab-records');
  if (!container) return;
  container.dataset.type = type;

  // タブ強調
  container.querySelectorAll('.rec-type-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(SHIPPING_TYPES[type].label));
  });

  // フォームのみ再描画
  const wrap = document.getElementById('rec-form-wrap');
  if (wrap) wrap.innerHTML = renderRecordForm(type);
}

// ─── セクションアコーディオン ───
function toggleRecSection(header) {
  const body = header.nextElementSibling;
  const icon = header.querySelector('.rec-acc-icon');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
}
