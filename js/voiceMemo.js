// ═══════════════════════════════════════════
//  VOICE MEMO — 音声メモ（Web Speech API）
//  ルールベース解析 → localStorage保存
//  保存キー: agrisim_voice_memos
// ═══════════════════════════════════════════

const VM_KEY = 'agrisim_voice_memos';

// ─────────────────────────────────────────
//  辞書定義
// ─────────────────────────────────────────

// 作業タグ辞書（先に長いキーワードを並べること）
const VM_TAG_DICT = [
  { tag: '防除',   keywords: ['防除','消毒','農薬散布','スプレー','噴霧'] },
  { tag: '施肥',   keywords: ['施肥','追肥','元肥','肥料','液肥','堆肥','撒いた','まいた'] },
  { tag: '収穫',   keywords: ['収穫','採った','もいだ','刈った','刈り取り'] },
  { tag: '播種',   keywords: ['播種','種まき','種をまい','タネ','たね'] },
  { tag: '定植',   keywords: ['定植','植え付け','植えた','苗を植'] },
  { tag: '灌水',   keywords: ['灌水','水やり','潅水','散水','水を'] },
  { tag: '除草',   keywords: ['除草','草取り','草刈り','雑草'] },
  { tag: '剪定',   keywords: ['剪定','枝切り','芽かき','誘引'] },
  { tag: '耕耘',   keywords: ['耕耘','耕うん','耕した','トラクター'] },
  { tag: '出荷',   keywords: ['出荷','荷造り','梱包','箱詰め','JA','農協','市場'] },
  { tag: 'その他', keywords: [] },
];

// 資材辞書
const VM_MATERIAL_DICT = [
  '液肥','有機肥料','化成肥料','堆肥','苦土石灰','石灰','農薬','殺虫剤','殺菌剤',
  '除草剤','展着剤','マルチ','防虫ネット','支柱','誘引テープ','ビニール',
];

// 出荷先辞書（SHIPPING_TYPESから補完）
const VM_SHIPPING_DICT = {
  'JA': 'ja', '農協': 'ja',
  '卸': 'wholesale', '市場': 'wholesale', '卸売': 'wholesale',
  'スーパー': 'supermarket', '直売': 'farmstand', '直売所': 'farmstand',
  '道の駅': 'farmstand',
};

// 数量・単位パターン
const VM_UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(kg|ｋｇ|キロ|g|グラム|L|ℓ|リットル|ml|cc|袋|本|個|箱|ケース|倍|平米|アール|ha|ヘクタール)/;

// ─────────────────────────────────────────
//  日付解析
// ─────────────────────────────────────────

function vmParseDate(text) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  // 今日・本日
  if (/今日|本日|きょう/.test(text)) return fmt(now);
  // 昨日
  if (/昨日|きのう/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return fmt(d);
  }
  // 明後日（明日より先に判定）
  if (/明後日|あさって/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 2); return fmt(d);
  }
  // 明日
  if (/明日|あした|あす/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); return fmt(d);
  }
  // 来週〇曜
  const weekMatch = text.match(/来週\s*(月|火|水|木|金|土|日)/);
  if (weekMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const target = dowMap[weekMatch[1]];
    const d = new Date(now);
    const diff = ((target - d.getDay() + 7) % 7) || 7; // 同じ曜日なら来週
    d.setDate(d.getDate() + diff + 7);
    return fmt(d);
  }
  // 今週〇曜 / 〇曜日
  const thiswMatch = text.match(/(今週\s*)?(月|火|水|木|金|土|日)曜/);
  if (thiswMatch) {
    const dowMap = { '月':1,'火':2,'水':3,'木':4,'金':5,'土':6,'日':0 };
    const target = dowMap[thiswMatch[2]];
    const d = new Date(now);
    let diff = (target - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // 当日同曜日は来週扱い
    d.setDate(d.getDate() + diff);
    return fmt(d);
  }
  // 〇月〇日
  const mdMatch = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (mdMatch) {
    const d = new Date(now.getFullYear(), parseInt(mdMatch[1])-1, parseInt(mdMatch[2]));
    // 過去日付なら翌年
    if (d < now && (now - d) > 86400000) d.setFullYear(d.getFullYear() + 1);
    return fmt(d);
  }
  // 〇日
  const dayMatch = text.match(/(\d{1,2})日/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    if (d < now && now.getDate() > day) d.setMonth(d.getMonth() + 1);
    return fmt(d);
  }
  // 日付なし → 当日
  return fmt(now);
}

// ─────────────────────────────────────────
//  テキスト解析
// ─────────────────────────────────────────

function vmParseText(rawText) {
  const text = rawText;

  // 日付
  const workDate = vmParseDate(text);

  // 作業タグ
  let tag = 'その他';
  for (const entry of VM_TAG_DICT) {
    if (entry.keywords.some(kw => text.includes(kw))) {
      tag = entry.tag;
      break;
    }
  }

  // 作物（cropDBから動的取得 → なければ辞書）
  let crop = null;
  if (typeof cropDB !== 'undefined' && Array.isArray(cropDB)) {
    for (const c of cropDB) {
      const names = [c.name, c.nameEn, ...(c.aliases || [])].filter(Boolean);
      if (names.some(n => text.includes(n))) { crop = c.name; break; }
    }
  }

  // 圃場名（savedAreasから動的取得）
  let areaId = null;
  if (typeof savedAreas !== 'undefined' && Array.isArray(savedAreas)) {
    for (const a of savedAreas) {
      if (a.name && text.includes(a.name)) { areaId = a.id; break; }
    }
  }

  // 資材
  let material = null;
  for (const m of VM_MATERIAL_DICT) {
    if (text.includes(m)) { material = m; break; }
  }

  // 数量・単位
  let quantity = null;
  const unitMatch = text.match(VM_UNIT_PATTERN);
  if (unitMatch) quantity = unitMatch[0];

  // 出荷先
  let shipping = null;
  for (const [kw, type] of Object.entries(VM_SHIPPING_DICT)) {
    if (text.includes(kw)) { shipping = type; break; }
  }

  return { workDate, tag, crop, material, quantity, shipping };
}

// ─────────────────────────────────────────
//  localStorage 操作
// ─────────────────────────────────────────

function vmLoad() {
  try { return JSON.parse(localStorage.getItem(VM_KEY) || '[]'); }
  catch { return []; }
}

function vmSave(memos) {
  localStorage.setItem(VM_KEY, JSON.stringify(memos));
}

function vmAdd(memo) {
  const memos = vmLoad();
  memos.push(memo);
  vmSave(memos);
}

function vmDelete(id) {
  vmSave(vmLoad().filter(m => m.id !== id));
}

// ─────────────────────────────────────────
//  Web Speech API
// ─────────────────────────────────────────

let _vmRecognition = null;
let _vmListening   = false;

function vmStartListening(areaId) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('このブラウザは音声認識に対応していません', 'amber');
    return;
  }
  if (_vmListening) { vmStopListening(); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _vmRecognition = new SR();
  _vmRecognition.lang           = 'ja-JP';
  _vmRecognition.interimResults = true;
  _vmRecognition.maxAlternatives = 1;
  _vmRecognition.continuous     = false;

  // 録音中UI
  _vmSetRecordingUI(true);
  _vmListening = true;

  _vmRecognition.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (final += t) : (interim += t);
    }
    // 途中結果をオーバーレイに表示
    const el = document.getElementById('vm-interim-text');
    if (el) el.textContent = interim || final;

    if (final) {
      _vmListening = false;
      _vmSetRecordingUI(false);
      vmShowConfirmDialog(final, areaId);
    }
  };

  _vmRecognition.onerror = (e) => {
    _vmListening = false;
    _vmSetRecordingUI(false);
    const msgs = {
      'no-speech':        '音声を検出できませんでした',
      'not-allowed':      'マイクの使用を許可してください',
      'network':          'ネットワークエラーが発生しました',
      'audio-capture':    'マイクが使用できません',
    };
    showToast(msgs[e.error] || `音声認識エラー: ${e.error}`, 'amber');
  };

  _vmRecognition.onend = () => {
    if (_vmListening) {
      _vmListening = false;
      _vmSetRecordingUI(false);
    }
  };

  _vmRecognition.start();
}

function vmStopListening() {
  if (_vmRecognition) { _vmRecognition.stop(); }
  _vmListening = false;
  _vmSetRecordingUI(false);
}

// ─────────────────────────────────────────
//  録音中UI切替
// ─────────────────────────────────────────

function _vmSetRecordingUI(on) {
  const btn     = document.getElementById('vm-mic-btn');
  const overlay = document.getElementById('vm-recording-overlay');
  if (btn) {
    btn.classList.toggle('recording', on);
    btn.title = on ? '停止' : '音声メモを録音';
  }
  if (overlay) overlay.style.display = on ? 'flex' : 'none';
  const el = document.getElementById('vm-interim-text');
  if (el) el.textContent = '';
}

// ─────────────────────────────────────────
//  確認ダイアログ
// ─────────────────────────────────────────

function vmShowConfirmDialog(rawText, areaId) {
  const parsed = vmParseText(rawText);
  // areaIdは呼び出し元から渡す（エリア詳細パネル）
  if (areaId) parsed.areaId = areaId;

  const tagOptions = VM_TAG_DICT.map(e =>
    `<option value="${e.tag}"${e.tag === parsed.tag ? ' selected' : ''}>${e.tag}</option>`
  ).join('');

  // 既存overlay削除
  document.getElementById('vm-confirm-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'vm-confirm-overlay';
  overlay.className = 'vm-confirm-overlay';
  overlay.innerHTML = `
    <div class="vm-confirm-dialog">
      <div class="vm-confirm-header">
        <span class="vm-confirm-title">🎤 音声メモ確認</span>
        <button class="vm-confirm-close" onclick="vmCloseConfirmDialog()">✕</button>
      </div>
      <div class="vm-confirm-body">
        <div class="vm-field">
          <label class="vm-label">認識テキスト</label>
          <textarea class="vm-textarea" id="vm-raw-text" rows="2">${escHtml(rawText)}</textarea>
        </div>
        <div class="vm-field-row">
          <div class="vm-field">
            <label class="vm-label">作業日</label>
            <input class="vm-input" type="date" id="vm-work-date" value="${parsed.workDate}">
          </div>
          <div class="vm-field">
            <label class="vm-label">作業タグ</label>
            <select class="vm-select" id="vm-tag">${tagOptions}</select>
          </div>
        </div>
        <div class="vm-field-row">
          <div class="vm-field">
            <label class="vm-label">作物</label>
            <input class="vm-input" type="text" id="vm-crop" value="${escHtml(parsed.crop || '')}" placeholder="例：トマト">
          </div>
          <div class="vm-field">
            <label class="vm-label">資材</label>
            <input class="vm-input" type="text" id="vm-material" value="${escHtml(parsed.material || '')}" placeholder="例：液肥">
          </div>
        </div>
        <div class="vm-field-row">
          <div class="vm-field">
            <label class="vm-label">数量・単位</label>
            <input class="vm-input" type="text" id="vm-quantity" value="${escHtml(parsed.quantity || '')}" placeholder="例：200倍">
          </div>
          <div class="vm-field">
            <label class="vm-label">メモ（任意）</label>
            <input class="vm-input" type="text" id="vm-note" placeholder="補足など">
          </div>
        </div>
      </div>
      <div class="vm-confirm-footer">
        <button class="btn btn-ghost" onclick="vmCloseConfirmDialog()">キャンセル</button>
        <button class="btn btn-primary" onclick="vmCommit('${areaId || ''}')">保存する</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function vmCloseConfirmDialog() {
  document.getElementById('vm-confirm-overlay')?.remove();
}

function vmCommit(areaId) {
  const rawText  = document.getElementById('vm-raw-text')?.value.trim() || '';
  const workDate = document.getElementById('vm-work-date')?.value || '';
  const tag      = document.getElementById('vm-tag')?.value || 'その他';
  const crop     = document.getElementById('vm-crop')?.value.trim() || null;
  const material = document.getElementById('vm-material')?.value.trim() || null;
  const quantity = document.getElementById('vm-quantity')?.value.trim() || null;
  const note     = document.getElementById('vm-note')?.value.trim() || null;

  const memo = {
    id:        'vm_' + Date.now(),
    areaId:    areaId || null,
    workDate,
    createdAt: new Date().toISOString(),
    tag,
    crop:      crop || null,
    material:  material || null,
    quantity:  quantity || null,
    note:      note || null,
    rawText,
  };

  vmAdd(memo);
  vmCloseConfirmDialog();
  showToast(`📝 音声メモを保存しました（${workDate} / ${tag}）`);

  // カレンダー再描画
  if (typeof _adpRenderCalendar === 'function')    _adpRenderCalendar();
  if (typeof _adpRenderDayRecords === 'function')  _adpRenderDayRecords();
}

// ─────────────────────────────────────────
//  カレンダー用：音声メモ取得
// ─────────────────────────────────────────

/** area.jsのカレンダー描画から呼ぶ */
function vmLoadByArea(areaId) {
  return vmLoad().filter(m => m.areaId === areaId);
}

/** 日付→音声メモ一覧 */
function vmLoadByDate(areaId, dateStr) {
  return vmLoadByArea(areaId).filter(m => m.workDate === dateStr);
}

// ─────────────────────────────────────────
//  マイクボタン HTML生成（area.jsから呼ぶ）
// ─────────────────────────────────────────

function vmMicButtonHTML() {
  return `
    <button id="vm-mic-btn" class="vm-mic-btn"
      onclick="vmStartListening(_adpArea?.id)"
      title="音声メモを録音">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
      </svg>
      <span>音声メモ</span>
    </button>
    <div id="vm-recording-overlay" class="vm-recording-overlay" style="display:none;">
      <span class="vm-rec-dot"></span>
      <span id="vm-interim-text" class="vm-interim-text">録音中...</span>
      <button class="vm-stop-btn" onclick="vmStopListening()">停止</button>
    </div>
  `;
}
