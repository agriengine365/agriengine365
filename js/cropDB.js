// ═══════════════════════════════════════════
//  CROP DATABASE — 雛形 (コメ 1品目、拡張可能)
// ═══════════════════════════════════════════

const CROP_DB = [
  {
    id: 'rice',
    name: 'コメ（水稲）',
    category: 'grain',      // grain / vegetable / fruit / specialty / wildveg
    variety: '一般品種',
    // 適性条件
    conditions: {
      latMin: 30, latMax: 45,
      elevMax: 600,
      tempMeanMin: 13, tempMeanMax: 27,
      soilTypes: ['loam', 'clay', 'unknown'],
      waterNeed: 'high',
      continuousCropYears: 1,
    },
    // 作付けカレンダー（月: 1-12）
    calendar: {
      seedling:  [4],
      transplant:[5],
      manage:    [6,7,8],
      harvest:   [9,10],
      prep:      [11,12,1,2,3],
    },
    // 施肥標準値 (kg/10a)
    fertilizer: {
      N: 8, P: 4, K: 5,
      baseDressing: 0.6,
      topDressing:  0.4,
      notes: '基肥はNPK一発肥料が便利。出穂前穂肥を忘れずに。',
    },
    yield: { min: 420, max: 540, unit: 'kg' },
    price: { min: 14000, max: 22000, unit: '円/60kg' },
    risks: [
      { type: 'pest',    name: 'いもち病', level: 'high',   note: '高温多湿で多発。薬剤防除必須。' },
      { type: 'pest',    name: 'カメムシ', level: 'medium', note: '穂が汚損米になる。出穂後防除。' },
      { type: 'weather', name: '冷害',     level: 'medium', note: '東北・北海道は特に注意。' },
      { type: 'rotation',name: '連作障害', level: 'low',    note: '水田は連作可能だが地力管理が必要。' },
    ],
  },
  // ─── 追加作物はここに追加 ───
  // { id: 'soybean', name: '大豆', ... },
  // { id: 'wheat',   name: '小麦', ... },
];
