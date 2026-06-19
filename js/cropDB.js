// ═══════════════════════════════════════════════════════════
//  CROP_DB — 作物データベース
//  223件 重複統合済み・calendar(sow/harvest)全件更新
//  最終更新: 重複削除(kurumi_forest/ginnan_nut/sansho_mi/takenoko_forest) + calendar埋め
// ═══════════════════════════════════════════════════════════

// eslint-disable-next-line no-unused-vars
const CROP_DB = [
  {
    "id": "rice",
    "heatType": "warm",
    "name": "コメ（水稲）",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 20,
      "tempMeanMax": 30,
      "rainfallMin": 1500,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "scientificName": "Oryza sativa",
      "taxonID": 1574,
      "family": "Poaceae",
      "absTempMin": 10,
      "absTempMax": 36,
      "absRainMin": 1000,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 9,
      "cropCategory": "cereals & pseudocereals",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 180
    },
    "calendar": {
      "seedling": [
        4
      ],
      "transplant": [
        5
      ],
      "manage": [
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 4,
      "K": 5,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "基肥はNPK一発肥料が便利。出穂前穂肥を忘れずに。"
    },
    "yield": {
      "min": 420,
      "max": 540,
      "unit": "kg/10a"
    },
    "price": {
      "min": 14000,
      "max": 22000,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "いもち病",
        "level": "high",
        "note": "高温多湿で多発。薬剤防除必須。"
      },
      {
        "type": "pest",
        "name": "カメムシ",
        "level": "medium",
        "note": "穂が汚損米になる。出穂後防除。"
      },
      {
        "type": "weather",
        "name": "冷害",
        "level": "medium",
        "note": "東北・北海道は特に注意。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "水田は連作可能だが地力管理が必要。"
      }
    ]
  },
  {
    "id": "soybean",
    "heatType": "warm",
    "name": "大豆",
    "category": "legume",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 500,
      "tempMeanMin": 20,
      "tempMeanMax": 33,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.5,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "scientificName": "Glycine max",
      "taxonID": 1150,
      "family": "Fabaceae",
      "absTempMin": 10,
      "absTempMax": 38,
      "absRainMin": 450,
      "absRainMax": 1800,
      "absPhMin": 4.5,
      "absPhMax": 8.4,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 75,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sowing": [
        5,
        6
      ],
      "manage": [
        7,
        8
      ],
      "harvest": [
        10,
        11
      ],
      "prep": [
        12,
        1,
        2,
        3,
        4
      ]
    },
    "fertilizer": {
      "N": 2,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "根粒菌で自己窒素固定。N少なめ。リン酸・カリを重視。"
    },
    "yield": {
      "min": 150,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": {
      "min": 6000,
      "max": 9000,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ダイズアブラムシ",
        "level": "medium",
        "note": "ウイルス媒介。早期防除。"
      },
      {
        "type": "pest",
        "name": "紫斑病",
        "level": "medium",
        "note": "品質低下につながる。"
      },
      {
        "type": "weather",
        "name": "湿害",
        "level": "high",
        "note": "排水不良ほ場で多発。畝立て有効。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "3年以上の輪作を推奨。"
      }
    ]
  },
  {
    "id": "black_soybean",
    "heatType": "warm",
    "name": "黒大豆",
    "category": "legume",
    "variety": "丹波黒等",
    "conditions": {
      "latMin": 33,
      "latMax": 43,
      "elevMax": 400,
      "tempMeanMin": 20,
      "tempMeanMax": 33,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.5,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "scientificName": "Glycine max",
      "taxonID": 1150,
      "family": "Fabaceae",
      "absTempMin": 10,
      "absTempMax": 38,
      "absRainMin": 450,
      "absRainMax": 1800,
      "absPhMin": 4.5,
      "absPhMax": 8.4,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 75,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sowing": [
        6,
        7
      ],
      "manage": [
        8,
        9
      ],
      "harvest": [
        11,
        12
      ],
      "prep": [
        1,
        2,
        3,
        4,
        5
      ]
    },
    "fertilizer": {
      "N": 2,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "大豆と同様に根粒菌活用。N過多は蔓ぼけに注意。"
    },
    "yield": {
      "min": 100,
      "max": 180,
      "unit": "kg/10a"
    },
    "price": {
      "min": 1500,
      "max": 4000,
      "unit": "円/kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "カメムシ",
        "level": "high",
        "note": "実入り期の防除が必須。"
      },
      {
        "type": "weather",
        "name": "湿害",
        "level": "medium",
        "note": "排水管理が重要。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "3年以上の輪作推奨。"
      }
    ]
  },
  {
    "id": "adzuki",
    "heatType": "warm",
    "name": "小豆",
    "category": "legume",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 15,
      "tempMeanMax": 30,
      "rainfallMin": 900,
      "rainfallMax": 1300,
      "phMin": 5.5,
      "phMax": 6.5,
      "soilTypes": [
        "loam",
        "sandy",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "scientificName": "Vigna angularis",
      "taxonID": 2147,
      "family": "Fabaceae",
      "absTempMin": 5,
      "absTempMax": 36,
      "absRainMin": 530,
      "absRainMax": 1800,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "pulses (grain legumes), forage/pasture, medicinals & aromatic, environmental",
      "lifeForm": "herb, vine, sub-shrub",
      "growthHabit": "erect, climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 190
    },
    "calendar": {
      "sowing": [
        6
      ],
      "manage": [
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3,
        4,
        5
      ]
    },
    "fertilizer": {
      "N": 4,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "根粒菌活用でN少なめ。排水良好なほ場を選ぶ。"
    },
    "yield": {
      "min": 150,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": {
      "min": 400,
      "max": 800,
      "unit": "円/kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アズキゾウムシ",
        "level": "high",
        "note": "収穫後の貯蔵に注意。低温保管推奨。"
      },
      {
        "type": "weather",
        "name": "湿害",
        "level": "high",
        "note": "過湿に弱い。畝立て栽培有効。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "3年以上の輪作推奨。"
      }
    ]
  },
  {
    "id": "wheat",
    "heatType": "cool",
    "name": "小麦",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 15,
      "tempMeanMax": 23,
      "rainfallMin": 750,
      "rainfallMax": 900,
      "phMin": 6,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Triticum aestivum",
      "taxonID": 2114,
      "family": "Poaceae",
      "absTempMin": 5,
      "absTempMax": 27,
      "absRainMin": 300,
      "absRainMax": 1600,
      "absPhMin": 5.5,
      "absPhMax": 8.5,
      "cropCategory": "cereals & pseudocereals, forage/pasture, medicinals & aromatic",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 250
    },
    "calendar": {
      "sowing": [
        10,
        11
      ],
      "manage": [
        12,
        1,
        2,
        3,
        4
      ],
      "harvest": [
        6,
        7
      ],
      "prep": [
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 8,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "穂肥（4月）が品質・収量に直結。過剰Nは倒伏リスク。"
    },
    "yield": {
      "min": 300,
      "max": 500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 5000,
      "max": 7500,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "赤かび病",
        "level": "high",
        "note": "出穂期の雨で多発。防除タイミング重要。"
      },
      {
        "type": "pest",
        "name": "うどんこ病",
        "level": "medium",
        "note": "春先の多湿で発生。"
      },
      {
        "type": "weather",
        "name": "倒伏",
        "level": "medium",
        "note": "強風・過剰N。矮性品種の選択も有効。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "barley",
    "heatType": "cool",
    "name": "大麦",
    "category": "grain",
    "variety": "六条・二条",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 15,
      "tempMeanMax": 20,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 6.5,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Hordeum vulgare",
      "taxonID": 1232,
      "family": "Poaceae",
      "absTempMin": 2,
      "absTempMax": 40,
      "absRainMin": 200,
      "absRainMax": 2000,
      "absPhMin": 6,
      "absPhMax": 8,
      "cropCategory": "cereals & pseudocereals, medicinals & aromatic",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 240
    },
    "calendar": {
      "sowing": [
        10,
        11
      ],
      "manage": [
        12,
        1,
        2,
        3
      ],
      "harvest": [
        5,
        6
      ],
      "prep": [
        7,
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "小麦より早熟。N過多は倒伏しやすい。"
    },
    "yield": {
      "min": 300,
      "max": 450,
      "unit": "kg/10a"
    },
    "price": {
      "min": 3000,
      "max": 5000,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "赤かび病",
        "level": "high",
        "note": "出穂期降雨で多発。"
      },
      {
        "type": "weather",
        "name": "倒伏",
        "level": "medium",
        "note": "茎が細く倒れやすい。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "麦類連作は避ける。"
      }
    ]
  },
  {
    "id": "rye",
    "heatType": "cool",
    "name": "ライ麦",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 46,
      "elevMax": 900,
      "tempMeanMin": 15,
      "tempMeanMax": 20,
      "rainfallMin": 600,
      "rainfallMax": 1000,
      "phMin": 5.5,
      "phMax": 6,
      "soilTypes": [
        "sandy",
        "loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Secale cereale",
      "taxonID": 1929,
      "family": "Poaceae",
      "absTempMin": 3,
      "absTempMax": 31,
      "absRainMin": 400,
      "absRainMax": 2000,
      "absPhMin": 4.5,
      "absPhMax": 8.2,
      "cropCategory": "cereals & pseudocereals, forage/pasture, cover crop, environmental",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 110,
      "growthPeriodMax": 270
    },
    "calendar": {
      "sowing": [
        9,
        10
      ],
      "manage": [
        11,
        12,
        1,
        2,
        3
      ],
      "harvest": [
        6,
        7
      ],
      "prep": [
        8
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "痩せ地・寒冷地に強い。緑肥・飼料用途にも。"
    },
    "yield": {
      "min": 250,
      "max": 400,
      "unit": "kg/10a"
    },
    "price": {
      "min": 3000,
      "max": 5000,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "麦角病",
        "level": "medium",
        "note": "有毒。収穫物の選別を徹底。"
      },
      {
        "type": "weather",
        "name": "倒伏",
        "level": "medium",
        "note": "草丈が高く倒れやすい。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "比較的連作耐性あり。"
      }
    ]
  },
  {
    "id": "oat",
    "heatType": "cool",
    "name": "オーツ麦",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 46,
      "elevMax": 800,
      "tempMeanMin": 16,
      "tempMeanMax": 20,
      "rainfallMin": 600,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 6,
      "soilTypes": [
        "loam",
        "sandy",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Avena sativa",
      "taxonID": 481,
      "family": "Poaceae",
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 250,
      "absRainMax": 1500,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "cereals & pseudocereals, cover crop",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 110,
      "growthPeriodMax": 270
    },
    "calendar": {
      "sowing": [
        9,
        10
      ],
      "manage": [
        11,
        12,
        1,
        2,
        3
      ],
      "harvest": [
        5,
        6
      ],
      "prep": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "酸性土壌に耐える。燕麦として食用・飼料両用。"
    },
    "yield": {
      "min": 200,
      "max": 350,
      "unit": "kg/10a"
    },
    "price": {
      "min": 4000,
      "max": 7000,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "冠さび病",
        "level": "medium",
        "note": "春先の多湿で発生。抵抗性品種選択。"
      },
      {
        "type": "weather",
        "name": "倒伏",
        "level": "medium",
        "note": "草丈が高い。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "比較的連作耐性あり。"
      }
    ]
  },
  {
    "id": "buckwheat",
    "heatType": "cool",
    "name": "ソバ",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 46,
      "elevMax": 1200,
      "tempMeanMin": 17,
      "tempMeanMax": 27,
      "rainfallMin": 700,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 6.5,
      "soilTypes": [
        "loam",
        "sandy",
        "volcanic",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Fagopyrum esculentum",
      "taxonID": 2285,
      "family": "Polygonaceae",
      "absTempMin": 7,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 1300,
      "absPhMin": 4.4,
      "absPhMax": 7.5,
      "cropCategory": "cereals & pseudocereals, forage/pasture, vegetables, materials, cover crop",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 55,
      "growthPeriodMax": 85
    },
    "calendar": {
      "sowing": [
        7,
        8
      ],
      "manage": [
        8,
        9
      ],
      "harvest": [
        10,
        11
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3,
        4,
        5,
        6
      ]
    },
    "fertilizer": {
      "N": 4,
      "P": 6,
      "K": 6,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "痩せ地でも育つ。過剰Nは倒伏・品質低下につながる。"
    },
    "yield": {
      "min": 80,
      "max": 150,
      "unit": "kg/10a"
    },
    "price": {
      "min": 400,
      "max": 900,
      "unit": "円/kg"
    },
    "risks": [
      {
        "type": "weather",
        "name": "倒伏",
        "level": "high",
        "note": "台風・強風で全滅リスク。早播きに注意。"
      },
      {
        "type": "weather",
        "name": "高温障害",
        "level": "medium",
        "note": "開花期の高温で結実不良。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "foxtail_millet",
    "heatType": "warm",
    "name": "アワ",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 800,
      "tempMeanMin": 16,
      "tempMeanMax": 26,
      "rainfallMin": 500,
      "rainfallMax": 700,
      "phMin": 6,
      "phMax": 6.8,
      "soilTypes": [
        "loam",
        "sandy",
        "volcanic",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Setaria italica",
      "taxonID": 9732,
      "family": "Poaceae",
      "absTempMin": 5,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 4000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "cereals & pseudocereals, forage/pasture",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sowing": [
        5,
        6
      ],
      "manage": [
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3,
        4
      ]
    },
    "fertilizer": {
      "N": 6,
      "P": 6,
      "K": 6,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "乾燥・痩せ地に強い。小規模・有機栽培向き。"
    },
    "yield": {
      "min": 100,
      "max": 200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 1200,
      "unit": "円/kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "鳥害",
        "level": "high",
        "note": "出穂後に集中。防鳥ネット必須。"
      },
      {
        "type": "weather",
        "name": "倒伏",
        "level": "medium",
        "note": "草丈が高い品種は注意。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "比較的連作耐性あり。"
      }
    ]
  },
  {
    "id": "proso_millet",
    "heatType": "warm",
    "name": "キビ",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 20,
      "tempMeanMax": 32,
      "rainfallMin": 500,
      "rainfallMax": 750,
      "phMin": 6,
      "phMax": 6.5,
      "soilTypes": [
        "loam",
        "sandy",
        "volcanic",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Panicum miliaceum",
      "taxonID": 8280,
      "family": "Poaceae",
      "absTempMin": 15,
      "absTempMax": 45,
      "absRainMin": 200,
      "absRainMax": 1000,
      "absPhMin": 5.2,
      "absPhMax": 8.2,
      "cropCategory": "cereals & pseudocereals",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 55,
      "growthPeriodMax": 280
    },
    "calendar": {
      "sowing": [
        5,
        6
      ],
      "manage": [
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3,
        4
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 5,
      "K": 5,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "短期間で収穫可能（約60日）。乾燥に非常に強い。"
    },
    "yield": {
      "min": 100,
      "max": 180,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 1200,
      "unit": "円/kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "鳥害",
        "level": "high",
        "note": "防鳥対策必須。"
      },
      {
        "type": "weather",
        "name": "湿害",
        "level": "medium",
        "note": "過湿に弱い。排水管理を。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "比較的耐性あり。"
      }
    ]
  },
  {
    "id": "barnyard_millet",
    "heatType": "warm",
    "name": "ヒエ",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 46,
      "elevMax": 1000,
      "tempMeanMin": 22,
      "tempMeanMax": 30,
      "rainfallMin": 500,
      "rainfallMax": 1200,
      "phMin": 5.5,
      "phMax": 6.5,
      "soilTypes": [
        "loam",
        "clay",
        "sandy",
        "volcanic",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Echinochloa esculenta",
      "taxonID": 969,
      "family": "Poaceae",
      "absTempMin": 6,
      "absTempMax": 42,
      "absRainMin": 400,
      "absRainMax": 2000,
      "absPhMin": 5,
      "absPhMax": 7,
      "cropCategory": "forage/pasture, weed",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 45,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sowing": [
        5,
        6
      ],
      "manage": [
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3,
        4
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 5,
      "K": 5,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "最も粗放栽培に強い雑穀。湿地にも適応。"
    },
    "yield": {
      "min": 100,
      "max": 200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 1200,
      "unit": "円/kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "鳥害",
        "level": "high",
        "note": "防鳥対策必須。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "連作耐性が高い。"
      }
    ]
  },
  {
    "id": "corn_grain",
    "heatType": "warm",
    "name": "トウモロコシ（デント）",
    "category": "grain",
    "variety": "デント・飼料用",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 33,
      "rainfallMin": 600,
      "rainfallMax": 1200,
      "phMin": 5,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Zea mays",
      "taxonID": 2175,
      "family": "Poaceae",
      "absTempMin": 10,
      "absTempMax": 47,
      "absRainMin": 400,
      "absRainMax": 1800,
      "absPhMin": 4.5,
      "absPhMax": 8.5,
      "cropCategory": "cereals & pseudocereals",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 65,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sowing": [
        4,
        5
      ],
      "manage": [
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 14,
      "P": 8,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "追肥を2回に分けて。倒伏防止に中耕・土寄せを。"
    },
    "yield": {
      "min": 600,
      "max": 900,
      "unit": "kg/10a"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アワノメイガ",
        "level": "high",
        "note": "茎・穂を加害。早期防除。"
      },
      {
        "type": "weather",
        "name": "倒伏",
        "level": "medium",
        "note": "台風・強風対策。土寄せ有効。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "sugarcane",
    "heatType": "warm",
    "name": "サトウキビ",
    "category": "grain",
    "variety": "一般品種",
    "conditions": {
      "latMin": 24,
      "latMax": 33,
      "elevMax": 300,
      "tempMeanMin": 24,
      "tempMeanMax": 37,
      "rainfallMin": 1500,
      "rainfallMax": 2000,
      "phMin": 5,
      "phMax": 8,
      "soilTypes": [
        "loam",
        "sandy",
        "volcanic",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 3,
      "scientificName": "Saccharum officinarum",
      "taxonID": 1884,
      "family": "Poaceae",
      "absTempMin": 15,
      "absTempMax": 41,
      "absRainMin": 1000,
      "absRainMax": 5000,
      "absPhMin": 4.5,
      "absPhMax": 9,
      "cropCategory": "sugar crops",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 210,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sowing": [
        2,
        3,
        4
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9,
        10,
        11
      ],
      "harvest": [
        12,
        1,
        2
      ],
      "prep": [
        3,
        4
      ]
    },
    "fertilizer": {
      "N": 18,
      "P": 8,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "鹿児島・沖縄主体。カリ要求量が多い。株出し3年が基本。"
    },
    "yield": {
      "min": 5000,
      "max": 8000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 2100,
      "max": 2500,
      "unit": "円/トン"
    },
    "risks": [
      {
        "type": "pest",
        "name": "メイチュウ",
        "level": "high",
        "note": "茎を食害。定期的な防除が必要。"
      },
      {
        "type": "weather",
        "name": "台風",
        "level": "high",
        "note": "南西諸島では毎年のリスク。早刈り対応も。"
      },
      {
        "type": "rotation",
        "name": "連作",
        "level": "medium",
        "note": "株出し管理で3年程度は連作可能。"
      }
    ]
  },
  {
    "id": "rapeseed",
    "heatType": "cool",
    "name": "菜種（ナタネ）",
    "category": "leafy",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 500,
      "tempMeanMin": 15,
      "tempMeanMax": 25,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 6.5,
      "phMax": 7.6,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Brassica napus",
      "taxonID": 549,
      "family": "Brassicaceae",
      "absTempMin": 5,
      "absTempMax": 41,
      "absRainMin": 400,
      "absRainMax": 2800,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "forage/pasture, vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, biennial",
      "growthPeriodMin": 85,
      "growthPeriodMax": 340
    },
    "calendar": {
      "sowing": [
        9,
        10
      ],
      "manage": [
        11,
        12,
        1,
        2,
        3,
        4
      ],
      "harvest": [
        5,
        6
      ],
      "prep": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "越冬作物。春の追肥で収量アップ。菜の花油・飼料利用。"
    },
    "yield": {
      "min": 150,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": {
      "min": 6000,
      "max": 10000,
      "unit": "円/60kg"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "ウイルス病を媒介。早期防除。"
      },
      {
        "type": "pest",
        "name": "キスジノミハムシ",
        "level": "medium",
        "note": "発芽期の食害に注意。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "アブラナ科。根こぶ病に注意。2〜3年輪作。"
      }
    ]
  },
  {
    "id": "cabbage",
    "heatType": "cool",
    "name": "キャベツ",
    "category": "leafy",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 15,
      "tempMeanMax": 24,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica oleracea var. capitata",
      "taxonID": 554,
      "family": "Brassicaceae",
      "absTempMin": 7,
      "absTempMax": 32,
      "absRainMin": 300,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 8.3,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "biennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 200
    },
    "calendar": {
      "seedling": [
        2,
        3,
        7,
        8
      ],
      "transplant": [
        3,
        4,
        9
      ],
      "manage": [
        4,
        5,
        10,
        11
      ],
      "harvest": [
        5,
        6,
        11,
        12
      ],
      "prep": [
        1,
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "結球前の追肥で球重アップ。過湿に注意。"
    },
    "yield": {
      "min": 3000,
      "max": 6000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 25,
      "max": 60,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "コナガ",
        "level": "high",
        "note": "抵抗性系統多発。複数系統で防除。"
      },
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "結球内部に入ると防除困難。"
      },
      {
        "type": "weather",
        "name": "裂球",
        "level": "medium",
        "note": "収穫遅れ・過剰水分で発生。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "根こぶ病。3年以上輪作。"
      }
    ]
  },
  {
    "id": "daikon",
    "heatType": "cool",
    "name": "大根",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "family": "Brassicaceae",
      "latMin": 30,
      "latMax": 45,
      "elevMax": 800,
      "tempMeanMin": 8,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "growthPeriodMin": 50,
      "growthPeriodMax": 70
    },
    "calendar": {
      "sowing": [
        3,
        4,
        8,
        9
      ],
      "manage": [
        4,
        5,
        9,
        10
      ],
      "harvest": [
        5,
        6,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "深耕必須（40cm以上）。石・硬盤があるとまた根になる。"
    },
    "yield": {
      "min": 3500,
      "max": 6000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 30,
      "max": 80,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ヤマノイモコガ",
        "level": "low",
        "note": "近年増加中。"
      },
      {
        "type": "pest",
        "name": "軟腐病",
        "level": "high",
        "note": "高温多湿で多発。傷口から感染。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "キスジノミハムシ・根こぶ病。2年輪作推奨。"
      }
    ]
  },
  {
    "id": "carrot",
    "heatType": "cool",
    "name": "ニンジン",
    "category": "root",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 800,
      "tempMeanMin": 15,
      "tempMeanMax": 24,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 600,
      "rainfallMax": 1200,
      "phMin": 5.8,
      "phMax": 6.8,
      "scientificName": "Daucus carota",
      "taxonID": 871,
      "family": "Apiaceae",
      "absTempMin": 3,
      "absTempMax": 30,
      "absRainMin": 400,
      "absRainMax": 4000,
      "absPhMin": 4.2,
      "absPhMax": 8.7,
      "cropCategory": "roots/tubers, forage/pasture, vegetables, materials, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "biennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sowing": [
        3,
        4,
        7,
        8
      ],
      "manage": [
        4,
        5,
        8,
        9,
        10
      ],
      "harvest": [
        6,
        7,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        6
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 15,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "発芽率が低いので鎮圧と水分管理が重要。分岐根防止に深耕。"
    },
    "yield": {
      "min": 2500,
      "max": 4500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 60,
      "max": 150,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "キアゲハ幼虫",
        "level": "low",
        "note": "葉を食害。量は少ない。"
      },
      {
        "type": "pest",
        "name": "黒葉枯病",
        "level": "medium",
        "note": "高温期に多発。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "セリ科。2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "onion",
    "heatType": "cool",
    "name": "タマネギ",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "family": "Amaryllidaceae",
      "latMin": 33,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 5,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "growthPeriodMin": 150,
      "growthPeriodMax": 240
    },
    "calendar": {
      "seedling": [
        9
      ],
      "transplant": [
        10,
        11
      ],
      "manage": [
        12,
        1,
        2,
        3,
        4
      ],
      "harvest": [
        5,
        6
      ],
      "prep": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 12,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "3月の追肥（球肥大期）が収量を決める。肥料切れ注意。"
    },
    "yield": {
      "min": 4000,
      "max": 7000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 20,
      "max": 60,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "灰色かび病",
        "level": "high",
        "note": "低温多湿で多発。薬剤防除と風通し。"
      },
      {
        "type": "pest",
        "name": "べと病",
        "level": "medium",
        "note": "春先に多発。早期発見が鍵。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "白色疫病・葉枯病。3年輪作推奨。"
      }
    ]
  },
  {
    "id": "potato",
    "heatType": "cool",
    "name": "ジャガイモ",
    "category": "root",
    "variety": "男爵・メークイン等",
    "conditions": {
      "latMin": 35,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 15,
      "tempMeanMax": 25,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 500,
      "rainfallMax": 800,
      "phMin": 5,
      "phMax": 6.2,
      "scientificName": "Solanum tuberosum",
      "taxonID": 1971,
      "family": "Solanaceae",
      "absTempMin": 7,
      "absTempMax": 30,
      "absRainMin": 250,
      "absRainMax": 2000,
      "absPhMin": 4.2,
      "absPhMax": 8.5,
      "cropCategory": "roots/tubers, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 160
    },
    "calendar": {
      "planting": [
        3,
        4
      ],
      "manage": [
        5,
        6
      ],
      "harvest": [
        6,
        7
      ],
      "prep": [
        8,
        9,
        10,
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 12,
      "K": 20,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "カリ要求量が高い。石灰過多でそうか病発生注意。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 30,
      "max": 80,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "疫病",
        "level": "high",
        "note": "冷涼多雨で爆発的多発。早期防除必須。"
      },
      {
        "type": "pest",
        "name": "そうか病",
        "level": "medium",
        "note": "アルカリ土壌で多発。pH管理が鍵。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "3〜4年輪作必須。土壌病害蓄積。"
      }
    ]
  },
  {
    "id": "sweetpotato",
    "heatType": "warm",
    "name": "サツマイモ",
    "category": "root",
    "variety": "一般品種",
    "conditions": {
      "latMin": 28,
      "latMax": 40,
      "elevMax": 500,
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "soilTypes": [
        "sandy_loam",
        "loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "rainfallMin": 750,
      "rainfallMax": 2000,
      "phMin": 5,
      "phMax": 7,
      "scientificName": "Ipomoea batatas",
      "taxonID": 1265,
      "family": "Convolvulaceae",
      "absTempMin": 10,
      "absTempMax": 38,
      "absRainMin": 350,
      "absRainMax": 5000,
      "absPhMin": 4,
      "absPhMax": 8.7,
      "cropCategory": "roots/tubers",
      "lifeForm": "vine",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 170
    },
    "calendar": {
      "seedling": [
        4
      ],
      "transplant": [
        5,
        6
      ],
      "manage": [
        7,
        8
      ],
      "harvest": [
        9,
        10,
        11
      ],
      "prep": [
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 6,
      "P": 8,
      "K": 15,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "N過多でつる暴れ。やせ地でも栽培可。カリを多めに。"
    },
    "yield": {
      "min": 2000,
      "max": 3500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 50,
      "max": 130,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ネコブセンチュウ",
        "level": "high",
        "note": "砂質土で多発。輪作が基本。"
      },
      {
        "type": "pest",
        "name": "黒斑病",
        "level": "medium",
        "note": "貯蔵中に被害拡大。低温管理。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "tomato",
    "heatType": "warm",
    "name": "トマト",
    "category": "fruit_veg",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 20,
      "tempMeanMax": 35,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 500,
      "rainfallMax": 1200,
      "phMin": 6,
      "phMax": 6.8,
      "scientificName": "Solanum lycopersicum",
      "taxonID": 1961,
      "family": "Solanaceae",
      "absTempMin": 15,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 7,
      "cropCategory": "fruits & nuts, vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        10,
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 18,
      "P": 12,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "追肥は段ごと（第1花房着果後から）。カルシウム欠乏で尻腐れ。"
    },
    "yield": {
      "min": 4000,
      "max": 8000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 250,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "灰色かび病",
        "level": "high",
        "note": "低温多湿で多発。換気徹底。"
      },
      {
        "type": "pest",
        "name": "疫病",
        "level": "high",
        "note": "梅雨期に爆発的多発。"
      },
      {
        "type": "pest",
        "name": "コナジラミ",
        "level": "medium",
        "note": "ウイルス媒介。黄色粘着板で管理。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "青枯病・萎凋病。4〜5年輪作必須。"
      }
    ]
  },
  {
    "id": "cucumber",
    "heatType": "warm",
    "name": "キュウリ",
    "category": "fruit_veg",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 18,
      "tempMeanMax": 32,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "rainfallMin": 1000,
      "rainfallMax": 1200,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Cucumis sativus",
      "taxonID": 817,
      "family": "Cucurbitaceae",
      "absTempMin": 6,
      "absTempMax": 38,
      "absRainMin": 400,
      "absRainMax": 4300,
      "absPhMin": 4.5,
      "absPhMax": 8.7,
      "cropCategory": "fruits & nuts, vegetables, materials, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 40,
      "growthPeriodMax": 180
    },
    "calendar": {
      "seedling": [
        3,
        4
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8
      ],
      "harvest": [
        6,
        7,
        8,
        9
      ],
      "prep": [
        10,
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 20,
      "P": 12,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "収穫期は週1〜2回追肥が目安。水管理と肥培管理を連動。"
    },
    "yield": {
      "min": 4000,
      "max": 8000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 80,
      "max": 200,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "うどんこ病",
        "level": "high",
        "note": "乾燥条件で多発。散水と防除を徹底。"
      },
      {
        "type": "pest",
        "name": "ベト病",
        "level": "high",
        "note": "多湿で多発。葉への薬剤散布。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "蔓割病・ネコブ。3〜4年輪作。"
      }
    ]
  },
  {
    "id": "eggplant",
    "heatType": "warm",
    "name": "ナス",
    "category": "fruit_veg",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 43,
      "elevMax": 600,
      "tempMeanMin": 20,
      "tempMeanMax": 35,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "rainfallMin": 1200,
      "rainfallMax": 1600,
      "phMin": 5.5,
      "phMax": 6.8,
      "scientificName": "Solanum melongena",
      "taxonID": 1965,
      "family": "Solanaceae",
      "absTempMin": 9,
      "absTempMax": 40,
      "absRainMin": 800,
      "absRainMax": 4000,
      "absPhMin": 4.3,
      "absPhMax": 8.5,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 70,
      "growthPeriodMax": 120
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        6,
        7,
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 22,
      "P": 12,
      "K": 20,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "多肥多水が基本。8月に切り戻し剪定で秋ナス収量アップ。"
    },
    "yield": {
      "min": 3500,
      "max": 7000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 250,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ニジュウヤホシテントウ",
        "level": "medium",
        "note": "葉・果実を食害。"
      },
      {
        "type": "pest",
        "name": "青枯病",
        "level": "high",
        "note": "高温期に多発。罹病株は即除去。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "半枯病・青枯病。5年輪作推奨。"
      }
    ]
  },
  {
    "id": "pepper",
    "heatType": "warm",
    "name": "ピーマン",
    "category": "fruit_veg",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 43,
      "elevMax": 600,
      "tempMeanMin": 17,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 600,
      "rainfallMax": 1250,
      "phMin": 5.5,
      "phMax": 6.8,
      "scientificName": "Capsicum annuum",
      "taxonID": 618,
      "family": "Solanaceae",
      "absTempMin": 8,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 1700,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 180
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        7,
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 18,
      "P": 12,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "カルシウム欠乏に注意（尻腐れ）。着果後の追肥が重要。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 350,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "ウイルス病を媒介。早期防除。"
      },
      {
        "type": "pest",
        "name": "タバコガ",
        "level": "medium",
        "note": "果実内部に食入。外観被害大。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "ナス科。4〜5年輪作必須。"
      }
    ]
  },
  {
    "id": "spinach",
    "heatType": "cool",
    "name": "ホウレンソウ",
    "category": "leafy",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 13,
      "tempMeanMax": 20,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 800,
      "rainfallMax": 1200,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Spinacia oleracea",
      "taxonID": 1997,
      "family": "Chenopodiaceae",
      "absTempMin": 2,
      "absTempMax": 27,
      "absRainMin": 300,
      "absRainMax": 1700,
      "absPhMin": 5.3,
      "absPhMax": 8.3,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual",
      "growthPeriodMin": 40,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sowing": [
        3,
        4,
        9,
        10
      ],
      "manage": [
        4,
        5,
        10,
        11
      ],
      "harvest": [
        5,
        6,
        11,
        12
      ],
      "prep": [
        1,
        2,
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "酸性土に弱い。pH6.5〜7.0が適正。石灰施用を徹底。"
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 250,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "べと病",
        "level": "high",
        "note": "低温多湿で多発。抵抗性品種を選択。"
      },
      {
        "type": "weather",
        "name": "抽台",
        "level": "medium",
        "note": "高温長日条件で発生。品種選択重要。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "2年輪作推奨。"
      }
    ]
  },
  {
    "id": "lettuce",
    "heatType": "cool",
    "name": "レタス",
    "category": "leafy",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1200,
      "tempMeanMin": 12,
      "tempMeanMax": 21,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 1100,
      "rainfallMax": 1400,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Lactuca sativa",
      "taxonID": 1313,
      "family": "Asteraceae",
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 900,
      "absRainMax": 4100,
      "absPhMin": 4.2,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial",
      "growthPeriodMin": 35,
      "growthPeriodMax": 85
    },
    "calendar": {
      "seedling": [
        2,
        3,
        7,
        8
      ],
      "transplant": [
        3,
        4,
        9
      ],
      "manage": [
        4,
        5,
        9,
        10
      ],
      "harvest": [
        5,
        6,
        10,
        11
      ],
      "prep": [
        1,
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 12,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "高冷地（長野・群馬）が主産地。Tip burn対策にCa葉面散布。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 40,
      "max": 120,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "菌核病",
        "level": "high",
        "note": "低温多湿で多発。被害株は即除去。"
      },
      {
        "type": "weather",
        "name": "Tip burn",
        "level": "medium",
        "note": "カルシウム欠乏による内部褐変。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "welsh_onion",
    "heatType": "cool",
    "name": "ネギ",
    "category": "leafy",
    "variety": "一般品種（長ネギ）",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 12,
      "tempMeanMax": 25,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 850,
      "rainfallMax": 1600,
      "phMin": 6.6,
      "phMax": 7.4,
      "scientificName": "Allium fistulosum",
      "taxonID": 365,
      "family": "Amaryllidaceae",
      "absTempMin": 6,
      "absTempMax": 30,
      "absRainMin": 700,
      "absRainMax": 2500,
      "absPhMin": 5.5,
      "absPhMax": 8.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 160
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        5,
        6
      ],
      "manage": [
        6,
        7,
        8,
        9,
        10
      ],
      "harvest": [
        10,
        11,
        12,
        1,
        2
      ],
      "prep": [
        3,
        4
      ]
    },
    "fertilizer": {
      "N": 20,
      "P": 10,
      "K": 18,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "土寄せごとに追肥。軟白部確保が品質の鍵。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 80,
      "max": 200,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ネギアブラムシ",
        "level": "medium",
        "note": "ウイルス媒介。黄化に注意。"
      },
      {
        "type": "pest",
        "name": "さび病",
        "level": "high",
        "note": "春秋に多発。防除継続が必要。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "白色疫病・フザリウム。3年輪作。"
      }
    ]
  },
  {
    "id": "broccoli",
    "heatType": "cool",
    "name": "ブロッコリー",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "family": "Brassicaceae",
      "latMin": 33,
      "latMax": 45,
      "elevMax": 800,
      "tempMeanMin": 8,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "growthPeriodMin": 95,
      "growthPeriodMax": 120
    },
    "calendar": {
      "seedling": [
        7,
        8
      ],
      "transplant": [
        8,
        9
      ],
      "manage": [
        9,
        10,
        11
      ],
      "harvest": [
        11,
        12,
        1,
        2
      ],
      "prep": [
        3,
        4,
        5,
        6
      ]
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "花蕾形成期のN不足は収量減。ホウ素欠乏に注意（茎中空）。"
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 250,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "コナガ",
        "level": "high",
        "note": "薬剤抵抗性強。ローテーション防除。"
      },
      {
        "type": "pest",
        "name": "アオムシ",
        "level": "medium",
        "note": "花蕾内部に食入。早期防除。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "アブラナ科。根こぶ病。3年輪作。"
      }
    ]
  },
  {
    "id": "burdock",
    "heatType": "cool",
    "name": "ゴボウ",
    "category": "root",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 500,
      "tempMeanMin": 12,
      "tempMeanMax": 25,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 1000,
      "rainfallMax": 2300,
      "phMin": 6.5,
      "phMax": 8,
      "scientificName": "Arctium lappa",
      "taxonID": 3330,
      "family": "Asteraceae",
      "absTempMin": -5,
      "absTempMax": 30,
      "absRainMin": 500,
      "absRainMax": 3000,
      "absPhMin": 6,
      "absPhMax": 8.5,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "biennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sowing": [
        3,
        4
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11,
        12
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 15,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "深耕（60〜80cm）が必須。根が長くまっすぐになる。"
    },
    "yield": {
      "min": 1200,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 250,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "ウイルス病を媒介。"
      },
      {
        "type": "weather",
        "name": "また根",
        "level": "medium",
        "note": "硬盤・石で発生。深耕が基本対策。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "連作で黒条病多発。3〜4年輪作。"
      }
    ]
  },
  {
    "id": "pumpkin",
    "heatType": "warm",
    "name": "カボチャ",
    "category": "fruit_veg",
    "variety": "一般品種（西洋カボチャ）",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 20,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "rainfallMin": 600,
      "rainfallMax": 1000,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Cucurbita maxima",
      "taxonID": 819,
      "family": "Cucurbitaceae",
      "absTempMin": 9,
      "absTempMax": 38,
      "absRainMin": 450,
      "absRainMax": 2700,
      "absPhMin": 5,
      "absPhMax": 8.5,
      "cropCategory": "forage/pasture, fruits & nuts, vegetables, materials, medicinals & aromatic",
      "lifeForm": "vine",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 140
    },
    "calendar": {
      "seedling": [
        4
      ],
      "transplant": [
        5
      ],
      "manage": [
        6,
        7
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        10,
        11,
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 10,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "つる性。整枝・摘心で着果数管理。N過多でつる暴れ。"
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 80,
      "max": 200,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "うどんこ病",
        "level": "high",
        "note": "乾燥時に多発。薬剤防除必須。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "ウリ科。2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "watermelon",
    "heatType": "warm",
    "name": "スイカ",
    "category": "fruit_veg",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 43,
      "elevMax": 500,
      "tempMeanMin": 20,
      "tempMeanMax": 35,
      "soilTypes": [
        "sandy_loam",
        "loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 500,
      "rainfallMax": 700,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Citrullus lanatus",
      "taxonID": 708,
      "family": "Cucurbitaceae",
      "absTempMin": 15,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 1800,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic",
      "lifeForm": "herb, vine",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "seedling": [
        3,
        4
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6
      ],
      "harvest": [
        7,
        8
      ],
      "prep": [
        9,
        10,
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 12,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "着果節位の管理が重要。過剰灌水で糖度低下。"
    },
    "yield": {
      "min": 3000,
      "max": 5000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 80,
      "max": 200,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "蔓割病",
        "level": "high",
        "note": "連作で多発。接ぎ木苗使用推奨。"
      },
      {
        "type": "weather",
        "name": "裂果",
        "level": "medium",
        "note": "収穫直前の大雨で発生。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "5〜6年輪作推奨。接ぎ木も有効。"
      }
    ]
  },
  {
    "id": "corn_veg",
    "heatType": "warm",
    "name": "スイートコーン（青果用）",
    "category": "vegetable",
    "variety": "スイートコーン",
    "conditions": {
      "family": "Poaceae",
      "latMin": 33,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 13,
      "tempMeanMax": 28,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "growthPeriodMin": 75,
      "growthPeriodMax": 95
    },
    "calendar": {
      "sowing": [
        4,
        5,
        6
      ],
      "manage": [
        5,
        6,
        7
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        10,
        11,
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "追肥は草丈50〜60cm頃が目安。雄穂・雌穂の同調開花を管理。"
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 80,
      "max": 200,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アワノメイガ",
        "level": "high",
        "note": "穂・茎に食入。出穂期に薬剤散布。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "比較的連作可能。"
      }
    ]
  },
  {
    "id": "garlic",
    "heatType": "cool",
    "name": "ニンニク",
    "category": "root",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 750,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 6.6,
      "scientificName": "Allium sativum",
      "taxonID": 367,
      "family": "Amaryllidaceae",
      "absTempMin": 7,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5,
      "absPhMax": 8.5,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "biennial",
      "growthPeriodMin": 90,
      "growthPeriodMax": 120
    },
    "calendar": {
      "planting": [
        9,
        10
      ],
      "manage": [
        11,
        12,
        1,
        2,
        3,
        4
      ],
      "harvest": [
        5,
        6
      ],
      "prep": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "りん片（種球）の品質が収量を左右。肥大期（3〜4月）の追肥重要。"
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 600,
      "max": 1500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "さび病",
        "level": "high",
        "note": "春先に多発。早期防除で拡大阻止。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "白腐れ病。3〜4年輪作必須。"
      }
    ]
  },
  {
    "id": "ginger",
    "heatType": "warm",
    "name": "ショウガ",
    "category": "root",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 40,
      "elevMax": 500,
      "tempMeanMin": 19,
      "tempMeanMax": 29,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "rainfallMin": 1400,
      "rainfallMax": 3000,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Zingiber officinale",
      "taxonID": 2177,
      "family": "Zingiberaceae",
      "absTempMin": 13,
      "absTempMax": 35,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4.3,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, perennial",
      "growthPeriodMin": 270,
      "growthPeriodMax": 365
    },
    "calendar": {
      "planting": [
        4,
        5
      ],
      "manage": [
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11
      ],
      "prep": [
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 18,
      "P": 10,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "乾燥に弱い。マルチ＋適度な灌水が必須。種ショウガの品質選別が重要。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 200,
      "max": 500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "根茎腐敗病",
        "level": "high",
        "note": "高温多湿で多発。罹病種は厳禁。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "4〜5年輪作必須。土壌消毒も有効。"
      }
    ]
  },
  {
    "id": "chinese_cabbage",
    "heatType": "cool",
    "name": "ハクサイ",
    "category": "leafy",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 800,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica rapa subsp. pekinensis",
      "taxonID": 547,
      "family": "Brassicaceae",
      "absTempMin": 8,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5.3,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial, perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 90
    },
    "calendar": {
      "seedling": [
        8,
        9
      ],
      "transplant": [
        9
      ],
      "manage": [
        9,
        10,
        11
      ],
      "harvest": [
        11,
        12,
        1,
        2
      ],
      "prep": [
        3,
        4,
        5,
        6,
        7
      ]
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "結球開始期の追肥が球重に直結。カルシウム欠乏（心腐れ）に注意。石灰施用徹底。"
    },
    "yield": {
      "min": 4000,
      "max": 8000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 20,
      "max": 60,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "コナガ・アオムシ",
        "level": "high",
        "note": "結球内部に侵入すると防除困難。"
      },
      {
        "type": "pest",
        "name": "軟腐病",
        "level": "high",
        "note": "高温多湿・傷口から感染。排水管理。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "根こぶ病。3年以上輪作推奨。"
      }
    ]
  },
  {
    "id": "chili",
    "heatType": "warm",
    "name": "トウガラシ",
    "category": "fruit_veg",
    "variety": "鷹の爪・伏見甘長等",
    "conditions": {
      "latMin": 30,
      "latMax": 43,
      "elevMax": 600,
      "tempMeanMin": 17,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 600,
      "rainfallMax": 1250,
      "phMin": 5.5,
      "phMax": 6.8,
      "scientificName": "Capsicum annuum",
      "taxonID": 618,
      "family": "Solanaceae",
      "absTempMin": 8,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 1700,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 180
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        7,
        8,
        9,
        10,
        11
      ],
      "prep": [
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "辛味成分カプサイシンは乾燥ストレスで増加。加工用途の場合は収穫適期管理が重要。"
    },
    "yield": {
      "min": 300,
      "max": 800,
      "unit": "kg/10a（生果換算）"
    },
    "price": {
      "min": 300,
      "max": 800,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "ウイルス媒介。黄色粘着板で管理。"
      },
      {
        "type": "pest",
        "name": "炭疽病",
        "level": "medium",
        "note": "収穫期の高温多湿で多発。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "ナス科。4〜5年輪作推奨。"
      }
    ]
  },
  {
    "id": "edamame",
    "heatType": "warm",
    "name": "エダマメ",
    "category": "fruit_veg",
    "variety": "一般品種・黒枝豆等",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 500,
      "tempMeanMin": 20,
      "tempMeanMax": 33,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Glycine max",
      "taxonID": 1150,
      "family": "Fabaceae",
      "absTempMin": 10,
      "absTempMax": 38,
      "absRainMin": 450,
      "absRainMax": 1800,
      "absPhMin": 4.5,
      "absPhMax": 8.4,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 75,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sowing": [
        4,
        5,
        6
      ],
      "manage": [
        5,
        6,
        7,
        8
      ],
      "harvest": [
        7,
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 3,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "根粒菌でN自己固定。追肥は原則不要。莢肥大期（開花2〜3週後）の水分確保が品質の鍵。"
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a（莢付き）"
    },
    "price": {
      "min": 200,
      "max": 600,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "カメムシ",
        "level": "high",
        "note": "莢を吸汁し品質低下。出穂後の防除重要。"
      },
      {
        "type": "pest",
        "name": "マメシンクイガ",
        "level": "medium",
        "note": "莢内部に食入。早期発見。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "大豆と同じ連作障害。3年以上輪作。"
      }
    ]
  },
  {
    "id": "asparagus",
    "heatType": "cool",
    "name": "アスパラガス",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "family": "Asparagaceae",
      "latMin": 35,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 8,
      "tempMeanMax": 25,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 10,
      "growthPeriodMin": 730,
      "growthPeriodMax": 1095
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11
      ],
      "harvest": [
        4,
        5,
        6,
        7,
        8,
        9
      ],
      "prep": [
        12,
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "定植後2〜3年は収穫せず株を充実させる。追肥は収穫終了後（株充実期）が重要。"
    },
    "yield": {
      "min": 400,
      "max": 800,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 1200,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アスパラガスハムシ",
        "level": "medium",
        "note": "葉・茎を食害。春先に多発。"
      },
      {
        "type": "pest",
        "name": "茎枯病",
        "level": "high",
        "note": "高温多湿で多発。罹病茎は除去。"
      },
      {
        "type": "rotation",
        "name": "株疲弊",
        "level": "medium",
        "note": "10〜15年で株更新推奨。"
      }
    ]
  },
  {
    "id": "chinese_chive",
    "heatType": "cool",
    "name": "ニラ",
    "category": "leafy",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 5,
      "rainfallMin": 850,
      "rainfallMax": 2200,
      "phMin": 6,
      "phMax": 6.8,
      "scientificName": "Allium tuberosum",
      "taxonID": 594,
      "family": "Amaryllidaceae",
      "absTempMin": 2,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 4000,
      "absPhMin": 5.3,
      "absPhMax": 8.3,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, perennial",
      "growthPeriodMin": 70,
      "growthPeriodMax": 100
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11
      ],
      "harvest": [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11
      ],
      "prep": [
        12,
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 18,
      "P": 10,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "収穫後すぐに追肥することで次回芽吹きが促進される。年3〜5回収穫可能。"
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 400,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ネギコガ",
        "level": "medium",
        "note": "葉に食入。多発すると商品価値ゼロ。"
      },
      {
        "type": "pest",
        "name": "黒腐菌核病",
        "level": "high",
        "note": "土壌病害で根が腐敗。連作で悪化。"
      },
      {
        "type": "rotation",
        "name": "株疲弊",
        "level": "medium",
        "note": "5〜6年で株更新推奨。"
      }
    ]
  },
  {
    "id": "celery",
    "heatType": "cool",
    "name": "セロリ",
    "category": "leafy",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 43,
      "elevMax": 1200,
      "tempMeanMin": 15,
      "tempMeanMax": 21,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "rainfallMin": 700,
      "rainfallMax": 1300,
      "phMin": 6,
      "phMax": 6.8,
      "scientificName": "Apium graveolens",
      "taxonID": 431,
      "family": "Apiaceae",
      "absTempMin": 5,
      "absTempMax": 25,
      "absRainMin": 500,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "biennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 150
    },
    "calendar": {
      "seedling": [
        2,
        3,
        7,
        8
      ],
      "transplant": [
        4,
        5,
        9
      ],
      "manage": [
        5,
        6,
        10,
        11
      ],
      "harvest": [
        6,
        7,
        11,
        12
      ],
      "prep": [
        1,
        8
      ]
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "長野県が全国生産量の約70%を占める。高冷地での夏秋栽培が主流。水分要求量が高い。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 300,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "斑点病",
        "level": "medium",
        "note": "多湿で多発。排水・換気管理。"
      },
      {
        "type": "weather",
        "name": "抽台",
        "level": "medium",
        "note": "低温処理後の高温長日で発生。品種選択重要。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "セリ科。2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "taro",
    "heatType": "warm",
    "name": "サトイモ",
    "category": "root",
    "variety": "石川早生・土垂等",
    "conditions": {
      "latMin": 30,
      "latMax": 42,
      "elevMax": 500,
      "tempMeanMin": 21,
      "tempMeanMax": 28,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "rainfallMin": 1800,
      "rainfallMax": 2700,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Colocasia esculenta",
      "taxonID": 758,
      "family": "Araceae",
      "absTempMin": 10,
      "absTempMax": 35,
      "absRainMin": 1000,
      "absRainMax": 4100,
      "absPhMin": 4.3,
      "absPhMax": 8.2,
      "cropCategory": "roots/tubers, vegetables, ornamentals/turf",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 300
    },
    "calendar": {
      "planting": [
        4,
        5
      ],
      "manage": [
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 20,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "土寄せごとに追肥。高温多湿を好む。乾燥が続くと子いもが肥大しない。"
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 300,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "セスジスズメ",
        "level": "medium",
        "note": "葉を食害。大型幼虫は捕殺。"
      },
      {
        "type": "pest",
        "name": "乾腐病",
        "level": "high",
        "note": "種いもの腐敗。健全種いも選別が重要。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "3〜4年輪作推奨。"
      }
    ]
  },
  {
    "id": "yam",
    "heatType": "warm",
    "name": "ヤマノイモ（長芋）",
    "category": "root",
    "variety": "長芋・自然薯等",
    "conditions": {
      "latMin": 35,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 20,
      "tempMeanMax": 32,
      "soilTypes": [
        "sandy_loam",
        "loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 1200,
      "rainfallMax": 4000,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Dioscorea japonica",
      "taxonID": 936,
      "family": "Dioscoreaceae",
      "absTempMin": 14,
      "absTempMax": 40,
      "absRainMin": 700,
      "absRainMax": 8000,
      "absPhMin": 4.8,
      "absPhMax": 8.5,
      "cropCategory": "roots/tubers, environmental",
      "lifeForm": "vine",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "perennial",
      "growthPeriodMin": 220,
      "growthPeriodMax": 300
    },
    "calendar": {
      "planting": [
        4,
        5
      ],
      "manage": [
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 18,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "深耕（60〜80cm）が必須。パイプ法や波板法で形状をそろえる技術が普及。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 400,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "炭疽病",
        "level": "high",
        "note": "葉・茎に発生。梅雨期に多発。"
      },
      {
        "type": "weather",
        "name": "また根",
        "level": "medium",
        "note": "硬盤・石で発生。深耕が基本。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "ネコブセンチュウ。3〜4年輪作必須。"
      }
    ]
  },
  {
    "id": "mitsuba",
    "heatType": "cool",
    "name": "ミツバ",
    "category": "leafy",
    "variety": "根ミツバ・切りミツバ等",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 15,
      "tempMeanMax": 27,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "rainfallMin": 600,
      "rainfallMax": 3000,
      "phMin": 5,
      "phMax": 7.5,
      "scientificName": "Cryptotaenia japonica",
      "taxonID": 4999,
      "family": "Apiaceae",
      "absTempMin": 10,
      "absTempMax": 30,
      "absRainMin": 500,
      "absRainMax": 3500,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "vegetables, medicinals & aromatic, environmental",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sowing": [
        3,
        4,
        9,
        10
      ],
      "manage": [
        4,
        5,
        10,
        11
      ],
      "harvest": [
        5,
        6,
        11,
        12,
        1,
        2
      ],
      "prep": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "半日陰でも栽培可能。軟白化（遮光）で高品質化。施設栽培で周年出荷。"
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 800,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "発生初期に防除。薬剤は収穫前日数に注意。"
      },
      {
        "type": "weather",
        "name": "抽台",
        "level": "medium",
        "note": "高温長日で抽台。品種・遮光で対応。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "medium",
        "note": "セリ科。2〜3年輪作推奨。"
      }
    ]
  },
  {
    "id": "garland_chrysanthemum",
    "heatType": "cool",
    "name": "春菊",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "family": "Asteraceae",
      "latMin": 30,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 8,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "growthPeriodMin": 40,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sowing": [
        3,
        4,
        9,
        10
      ],
      "manage": [
        4,
        5,
        10,
        11
      ],
      "harvest": [
        5,
        6,
        11,
        12,
        1
      ],
      "prep": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "鍋野菜として秋冬需要が高い。摘み取り収穫で長期収穫が可能。施設栽培で品質向上。"
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 400,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "春・秋に多発。早期防除。"
      },
      {
        "type": "weather",
        "name": "抽台",
        "level": "medium",
        "note": "高温長日で開花・品質低下。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "low",
        "note": "比較的連作耐性あり。1〜2年輪作推奨。"
      }
    ]
  },
  {
    "id": "apple",
    "heatType": "cool",
    "name": "リンゴ",
    "category": "fruit",
    "variety": "ふじ・つがる等",
    "conditions": {
      "latMin": 35,
      "latMax": 45,
      "elevMax": 800,
      "tempMeanMin": 14,
      "tempMeanMax": 27,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 20,
      "rainfallMin": 700,
      "rainfallMax": 2500,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Malus domestica",
      "taxonID": 1407,
      "family": "Rosaceae",
      "absTempMin": 8,
      "absTempMax": 33,
      "absRainMin": 500,
      "absRainMax": 3200,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "fruits & nuts, materials, ornamentals/turf, forest/wood",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 320
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        9,
        10,
        11
      ],
      "prep": [
        12
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "摘花・摘果で果実肥大。カルシウム施用でビターピット防止。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 350,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "モニリア病",
        "level": "high",
        "note": "開花期の雨で感染。防除タイミング厳守。"
      },
      {
        "type": "pest",
        "name": "ハダニ",
        "level": "medium",
        "note": "夏場の乾燥で多発。"
      },
      {
        "type": "weather",
        "name": "凍霜害",
        "level": "high",
        "note": "開花期の晩霜に注意。防霜ファン設置。"
      }
    ]
  },
  {
    "id": "mandarin",
    "heatType": "warm",
    "name": "ミカン（温州ミカン）",
    "category": "fruit",
    "variety": "早生・普通温州",
    "conditions": {
      "latMin": 30,
      "latMax": 38,
      "elevMax": 400,
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 25,
      "rainfallMin": 1200,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Citrus unshiu",
      "taxonID": 4646,
      "family": "Rutaceae",
      "absTempMin": 12,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "fruits & nuts",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 210,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11,
        12
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 8,
      "K": 12,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "夏肥（7月）が翌年の花芽分化に影響。傾斜地の水はけが品質を左右。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 60,
      "max": 150,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ミカンハダニ",
        "level": "high",
        "note": "夏〜秋に多発。殺ダニ剤ローテーション。"
      },
      {
        "type": "pest",
        "name": "かいよう病",
        "level": "high",
        "note": "台風・強風後に多発。銅剤散布。"
      },
      {
        "type": "weather",
        "name": "浮皮",
        "level": "medium",
        "note": "低温・多雨で果皮と果肉が分離。"
      }
    ]
  },
  {
    "id": "grape",
    "heatType": "warm",
    "name": "ブドウ",
    "category": "fruit",
    "variety": "巨峰・シャインマスカット等",
    "conditions": {
      "latMin": 33,
      "latMax": 43,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 20,
      "rainfallMin": 700,
      "rainfallMax": 850,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Vitis vinifera",
      "taxonID": 2160,
      "family": "Vitaceae",
      "absTempMin": 10,
      "absTempMax": 38,
      "absRainMin": 400,
      "absRainMax": 1200,
      "absPhMin": 4.5,
      "absPhMax": 8.5,
      "cropCategory": "fruits & nuts, medicinals & aromatic",
      "lifeForm": "vine, shrub",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "perennial",
      "growthPeriodMin": 160,
      "growthPeriodMax": 270
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "房づくり・ジベレリン処理でシャインマスカットなど高品質化。"
    },
    "yield": {
      "min": 1200,
      "max": 2500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 600,
      "max": 2000,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "灰色かび病",
        "level": "high",
        "note": "着色期の雨が致命的。雨除け栽培推奨。"
      },
      {
        "type": "pest",
        "name": "べと病",
        "level": "high",
        "note": "梅雨期に多発。展葉初期から防除開始。"
      },
      {
        "type": "weather",
        "name": "裂果",
        "level": "medium",
        "note": "収穫期の雨で発生。雨除けハウスで防止。"
      }
    ]
  },
  {
    "id": "peach",
    "heatType": "warm",
    "name": "モモ",
    "category": "fruit",
    "variety": "白鳳・白桃等",
    "conditions": {
      "latMin": 33,
      "latMax": 42,
      "elevMax": 600,
      "tempMeanMin": 20,
      "tempMeanMax": 33,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 15,
      "rainfallMin": 900,
      "rainfallMax": 1100,
      "phMin": 5.5,
      "phMax": 6.3,
      "scientificName": "Prunus persica",
      "taxonID": 1796,
      "family": "Rosaceae",
      "absTempMin": 7,
      "absTempMax": 35,
      "absRainMin": 750,
      "absRainMax": 1600,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts, ornamentals/turf, environmental",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 240,
      "growthPeriodMax": 270
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        10,
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 7,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "摘果（仕上げ摘果）が品質の鍵。1果あたり葉30〜40枚が目安。"
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 700,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "せん孔細菌病",
        "level": "high",
        "note": "雨・風で伝播。銅剤による防除が基本。"
      },
      {
        "type": "pest",
        "name": "コスカシバ",
        "level": "medium",
        "note": "幹・枝への食入。フェロモントラップで管理。"
      },
      {
        "type": "weather",
        "name": "晩霜",
        "level": "high",
        "note": "早咲き品種ほどリスク大。防霜対策要。"
      }
    ]
  },
  {
    "id": "pear",
    "heatType": "cool",
    "name": "ナシ（日本ナシ）",
    "category": "fruit",
    "variety": "幸水・豊水等",
    "conditions": {
      "latMin": 33,
      "latMax": 43,
      "elevMax": 600,
      "tempMeanMin": 17,
      "tempMeanMax": 25,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 20,
      "rainfallMin": 600,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Pyrus pyrifolia",
      "taxonID": 9086,
      "family": "Rosaceae",
      "absTempMin": 7,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 2100,
      "absPhMin": 5,
      "absPhMax": 7,
      "cropCategory": "forest/wood",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 180
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "harvest": [
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 7,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "人工授粉が必須（自家不和合性）。棚仕立てで管理作業が楽になる。"
    },
    "yield": {
      "min": 2000,
      "max": 3500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 350,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "黒星病",
        "level": "high",
        "note": "春雨期に感染。薬剤防除が重要。"
      },
      {
        "type": "pest",
        "name": "ナシヒメシンクイ",
        "level": "medium",
        "note": "新梢・果実に食入。"
      },
      {
        "type": "weather",
        "name": "晩霜",
        "level": "medium",
        "note": "開花期の低温で花粉管伸長障害。"
      }
    ]
  },
  {
    "id": "persimmon",
    "heatType": "warm",
    "name": "カキ",
    "category": "fruit",
    "variety": "富有・次郎・渋柿等",
    "conditions": {
      "latMin": 33,
      "latMax": 40,
      "elevMax": 500,
      "tempMeanMin": 20,
      "tempMeanMax": 31,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 25,
      "rainfallMin": 1000,
      "rainfallMax": 1700,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Diospyros kaki",
      "taxonID": 945,
      "family": "Ebenaceae",
      "absTempMin": 8,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 270
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11,
        12
      ],
      "prep": [
        1
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "隔年結果しやすい。摘蕾・摘花・摘果で安定生産。"
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 80,
      "max": 200,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "カキノヘタムシガ",
        "level": "high",
        "note": "果実が早期落果。フェロモン剤で防除。"
      },
      {
        "type": "pest",
        "name": "炭疽病",
        "level": "medium",
        "note": "高温多湿で多発。"
      },
      {
        "type": "weather",
        "name": "落果",
        "level": "medium",
        "note": "8月の高温乾燥で生理落果。"
      }
    ]
  },
  {
    "id": "strawberry",
    "heatType": "cool",
    "name": "イチゴ",
    "category": "fruit",
    "variety": "女峰・とちおとめ・あまおう等",
    "conditions": {
      "family": "Rosaceae",
      "latMin": 33,
      "latMax": 43,
      "elevMax": 600,
      "tempMeanMin": 8,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "growthPeriodMin": 120,
      "growthPeriodMax": 180
    },
    "calendar": {
      "planting": [
        9,
        10
      ],
      "manage": [
        11,
        12,
        1,
        2,
        3,
        4
      ],
      "harvest": [
        12,
        1,
        2,
        3,
        4,
        5
      ],
      "prep": [
        6,
        7,
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 10,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ランナー管理で採苗。花芽分化には低温・短日処理が重要。"
    },
    "yield": {
      "min": 2000,
      "max": 4000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 1500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "うどんこ病",
        "level": "high",
        "note": "施設内で多発。硫黄くん煙が有効。"
      },
      {
        "type": "pest",
        "name": "ハダニ",
        "level": "high",
        "note": "天敵農薬（ミヤコカブリダニ）を活用。"
      },
      {
        "type": "rotation",
        "name": "連作障害",
        "level": "high",
        "note": "萎黄病。太陽熱消毒など土壌消毒必須。"
      }
    ]
  },
  {
    "id": "blueberry",
    "heatType": "cool",
    "name": "ブルーベリー",
    "category": "fruit",
    "variety": "ハイブッシュ・ラビットアイ等",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 20,
      "rainfallMin": 900,
      "rainfallMax": 1100,
      "phMin": 4,
      "phMax": 5,
      "scientificName": "Vaccinium corymbosum",
      "taxonID": 10704,
      "family": "Ericaceae",
      "absTempMin": 7,
      "absTempMax": 42,
      "absRainMin": 700,
      "absRainMax": 1300,
      "absPhMin": 3,
      "absPhMax": 5.5,
      "cropCategory": "fruits & nuts",
      "lifeForm": "shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 160,
      "growthPeriodMax": 200
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "harvest": [
        6,
        7,
        8,
        9
      ],
      "prep": [
        10,
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "強酸性土（pH4.5〜5.5）が適正。ピートモス等で土壌改良必須。"
    },
    "yield": {
      "min": 500,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 600,
      "max": 1500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ミミズク類",
        "level": "low",
        "note": "比較的病害虫は少ない。"
      },
      {
        "type": "weather",
        "name": "鳥害",
        "level": "high",
        "note": "収穫期に鳥が大量飛来。防鳥ネット必須。"
      },
      {
        "type": "weather",
        "name": "乾燥害",
        "level": "medium",
        "note": "根が浅く乾燥に弱い。マルチ有効。"
      }
    ]
  },
  {
    "id": "plum",
    "heatType": "cool",
    "name": "梅",
    "category": "fruit",
    "variety": "南高・白加賀等",
    "conditions": {
      "family": "Rosaceae",
      "latMin": 33,
      "latMax": 40,
      "elevMax": 600,
      "tempMeanMin": 10,
      "tempMeanMax": 24,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 20,
      "growthPeriodMin": 1825,
      "growthPeriodMax": 2190
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "harvest": [
        6,
        7
      ],
      "prep": [
        8,
        9,
        10,
        11,
        12
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "開花が早く晩霜リスクが高い。剪定は収穫後〜落葉期。"
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 100,
      "max": 300,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "かいよう病",
        "level": "medium",
        "note": "雨風の後に多発。銅剤で防除。"
      },
      {
        "type": "weather",
        "name": "晩霜",
        "level": "high",
        "note": "2月下旬開花で霜害リスク大。"
      },
      {
        "type": "weather",
        "name": "落果",
        "level": "medium",
        "note": "6月落果期の管理が品質を左右。"
      }
    ]
  },
  {
    "id": "kiwi",
    "heatType": "warm",
    "name": "キウイフルーツ",
    "category": "fruit",
    "variety": "ヘイワード等",
    "conditions": {
      "latMin": 33,
      "latMax": 40,
      "elevMax": 500,
      "tempMeanMin": 21,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 20,
      "rainfallMin": 900,
      "rainfallMax": 1300,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Actinidia deliciosa",
      "taxonID": 889,
      "family": "Actinidiaceae",
      "absTempMin": 8,
      "absTempMax": 35,
      "absRainMin": 700,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts",
      "lifeForm": "vine, shrub",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "perennial",
      "growthPeriodMin": 210,
      "growthPeriodMax": 330
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "harvest": [
        10,
        11
      ],
      "prep": [
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "雌雄異株。受粉用の雄株が必要。棚仕立てで管理。"
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 400,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "かいよう病（Psa）",
        "level": "high",
        "note": "低温多湿で感染。国際的に問題。銅剤散布。"
      },
      {
        "type": "weather",
        "name": "台風・強風",
        "level": "high",
        "note": "枝折れ・落果。防風林・ネット設置推奨。"
      }
    ]
  },
  {
    "id": "western_pear",
    "heatType": "cool",
    "name": "洋ナシ（ラ・フランス等）",
    "category": "fruit",
    "variety": "ラ・フランス・バートレット等",
    "conditions": {
      "family": "Rosaceae",
      "latMin": 35,
      "latMax": 43,
      "elevMax": 600,
      "tempMeanMin": 8,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 20,
      "growthPeriodMin": 2190,
      "growthPeriodMax": 2555
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 7,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "収穫後2〜3週間の追熟が必須。山形県が国内生産の約70%。人工授粉が必要。"
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 200,
      "max": 500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "黒星病",
        "level": "high",
        "note": "春雨期に感染拡大。展葉初期から防除。"
      },
      {
        "type": "weather",
        "name": "晩霜",
        "level": "medium",
        "note": "開花期の低温で受粉障害。"
      },
      {
        "type": "pest",
        "name": "ナシヒメシンクイ",
        "level": "medium",
        "note": "果実・新梢に食入。フェロモン剤で管理。"
      }
    ]
  },
  {
    "id": "japanese_plum",
    "heatType": "cool",
    "name": "スモモ（プラム）",
    "category": "fruit",
    "variety": "大石早生・ソルダム等",
    "conditions": {
      "latMin": 33,
      "latMax": 42,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 34,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 15,
      "rainfallMin": 750,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Prunus salicina",
      "taxonID": 8992,
      "family": "Rosaceae",
      "absTempMin": 6,
      "absTempMax": 38,
      "absRainMin": 650,
      "absRainMax": 1100,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts, ornamentals/turf",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 240
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6
      ],
      "harvest": [
        6,
        7,
        8
      ],
      "prep": [
        9,
        10,
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "自家不和合性の品種が多く、授粉樹の選定が重要。山梨・長野が主産地。"
    },
    "yield": {
      "min": 1000,
      "max": 2500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 400,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "せん孔細菌病",
        "level": "high",
        "note": "雨・風で伝播。モモと同様の防除を。"
      },
      {
        "type": "weather",
        "name": "晩霜",
        "level": "high",
        "note": "早咲き品種は3月開花で霜害リスク大。"
      },
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "春先の新芽に多発。"
      }
    ]
  },
  {
    "id": "cherry",
    "heatType": "cool",
    "name": "オウトウ（サクランボ）",
    "category": "fruit",
    "variety": "佐藤錦・紅秀峰等",
    "conditions": {
      "latMin": 35,
      "latMax": 43,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 20,
      "rainfallMin": 500,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Prunus avium",
      "taxonID": 8965,
      "family": "Rosaceae",
      "absTempMin": 6,
      "absTempMax": 40,
      "absRainMin": 300,
      "absRainMax": 1500,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "fruits & nuts, medicinals & aromatic, forest/wood",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 240
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5
      ],
      "harvest": [
        6,
        7
      ],
      "prep": [
        8,
        9,
        10,
        11,
        12,
        1
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "山形県が全国生産量の約75%。収穫期の雨が致命的なため雨除けハウスが普及。"
    },
    "yield": {
      "min": 500,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 1500,
      "max": 5000,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "weather",
        "name": "裂果",
        "level": "high",
        "note": "収穫直前の雨で裂果多発。雨除け必須。"
      },
      {
        "type": "weather",
        "name": "晩霜",
        "level": "high",
        "note": "開花期（4月）の霜害に注意。"
      },
      {
        "type": "pest",
        "name": "オウトウショウジョウバエ",
        "level": "high",
        "note": "着色期から収穫期に産卵。防除困難。"
      }
    ]
  },
  {
    "id": "loquat",
    "heatType": "warm",
    "name": "ビワ",
    "category": "fruit",
    "variety": "茂木・長崎早生等",
    "conditions": {
      "latMin": 30,
      "latMax": 38,
      "elevMax": 400,
      "tempMeanMin": 21,
      "tempMeanMax": 27,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 20,
      "rainfallMin": 600,
      "rainfallMax": 1600,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Eriobotrya japonica",
      "taxonID": 1002,
      "family": "Rosaceae",
      "absTempMin": 9,
      "absTempMax": 36,
      "absRainMin": 400,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "fruits & nuts, medicinals & aromatic",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 210
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "harvest": [
        5,
        6,
        7
      ],
      "prep": [
        11,
        12
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "長崎・千葉が主産地。袋かけで品質向上。冬季の開花期の低温が最大リスク。"
    },
    "yield": {
      "min": 800,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 800,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "weather",
        "name": "凍霜害",
        "level": "high",
        "note": "開花期（11〜1月）の低温で受粉・結実障害。"
      },
      {
        "type": "pest",
        "name": "灰色かび病",
        "level": "medium",
        "note": "開花期の多湿で発生。袋かけで軽減。"
      },
      {
        "type": "pest",
        "name": "カイガラムシ",
        "level": "medium",
        "note": "樹勢低下の原因。冬季防除が有効。"
      }
    ]
  },
  {
    "id": "yuzu",
    "heatType": "warm",
    "name": "ユズ",
    "category": "fruit",
    "variety": "一般品種",
    "conditions": {
      "latMin": 30,
      "latMax": 38,
      "elevMax": 600,
      "tempMeanMin": 25,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 25,
      "rainfallMin": 1200,
      "rainfallMax": 1400,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Citrus junos",
      "taxonID": 711,
      "family": "Rutaceae",
      "absTempMin": 12,
      "absTempMax": 42,
      "absRainMin": 350,
      "absRainMax": 2000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 140,
      "growthPeriodMax": 330
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "harvest": [
        10,
        11,
        12
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "高知県馬路村が有名。実生から結実まで約18年かかるため接ぎ木苗が必須。"
    },
    "yield": {
      "min": 1000,
      "max": 2500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 200,
      "max": 600,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "かいよう病",
        "level": "high",
        "note": "台風後に多発。銅剤散布で防除。"
      },
      {
        "type": "weather",
        "name": "凍害",
        "level": "medium",
        "note": "-5℃以下で枝枯れ。防寒対策必要。"
      },
      {
        "type": "pest",
        "name": "アゲハ類",
        "level": "low",
        "note": "幼虫が葉を食害。量は少ない。"
      }
    ]
  },
  {
    "id": "passion_fruit",
    "heatType": "warm",
    "name": "パッションフルーツ",
    "category": "fruit",
    "variety": "一般品種",
    "conditions": {
      "family": "Passifloraceae",
      "latMin": 24,
      "latMax": 34,
      "elevMax": 400,
      "tempMeanMin": 18,
      "tempMeanMax": 30,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 5,
      "growthPeriodMin": 180,
      "growthPeriodMax": 365
    },
    "calendar": {
      "planting": [
        3,
        4
      ],
      "manage": [
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "harvest": [
        7,
        8,
        9,
        10,
        11
      ],
      "prep": [
        12,
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "沖縄・九州南部が主産地。棚仕立てで管理。自然落果したものが完熟の目安。"
    },
    "yield": {
      "min": 800,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 1500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "weather",
        "name": "台風",
        "level": "high",
        "note": "棚・つるが大きな被害を受ける。防風対策必須。"
      },
      {
        "type": "weather",
        "name": "低温障害",
        "level": "high",
        "note": "10℃以下で生育停止。露地では越冬困難。"
      },
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "ウイルス媒介。早期防除。"
      }
    ]
  },
  {
    "id": "aralia",
    "heatType": "cool",
    "name": "タラノメ",
    "category": "wildveg",
    "variety": "タラノキ",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1200,
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 5,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Aralia elata",
      "taxonID": 2891261,
      "family": "Araliaceae",
      "absTempMin": -15,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 3500,
      "absPhMin": 3.5,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        10,
        11,
        12
      ],
      "harvest": [
        3,
        4,
        5
      ],
      "prep": [
        6,
        7,
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "促成栽培（伏せ込み）で2月出荷も可能。株の疲弊防止に収穫は2〜3芽まで。"
    },
    "yield": {
      "min": 200,
      "max": 600,
      "unit": "kg/10a"
    },
    "price": {
      "min": 800,
      "max": 2500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "medium",
        "note": "新芽に多発。薬剤は収穫前日数に注意。"
      },
      {
        "type": "weather",
        "name": "晩霜",
        "level": "medium",
        "note": "萌芽期の遅霜で芽が黒変。"
      }
    ]
  },
  {
    "id": "bracken",
    "heatType": "cool",
    "name": "ワラビ",
    "category": "wildveg",
    "variety": "ワラビ",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1200,
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 10,
      "rainfallMin": 700,
      "rainfallMax": 2000,
      "phMin": 4.5,
      "phMax": 6.5,
      "scientificName": "Pteridium aquilinum",
      "taxonID": 4127484,
      "family": "Dennstaedtiaceae",
      "absTempMin": -20,
      "absTempMax": 30,
      "absRainMin": 400,
      "absRainMax": 3500,
      "absPhMin": 3.5,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "manage": [
        11,
        12,
        1,
        2,
        3
      ],
      "harvest": [
        4,
        5,
        6
      ],
      "prep": [
        7,
        8,
        9,
        10
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "根茎での繁殖。定植後2〜3年は株の充実に専念。除草管理が重要。"
    },
    "yield": {
      "min": 150,
      "max": 500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 1500,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "雑草競合",
        "level": "high",
        "note": "雑草に負ける。定期的な草刈り必須。"
      },
      {
        "type": "weather",
        "name": "干ばつ",
        "level": "medium",
        "note": "乾燥で収穫量が著しく低下。"
      }
    ]
  },
  {
    "id": "butterbur",
    "heatType": "cool",
    "name": "フキ",
    "category": "wildveg",
    "variety": "フキ",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 900,
      "tempMeanMin": 12,
      "tempMeanMax": 17,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 5,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 7,
      "scientificName": "Petasites japonicus",
      "taxonID": 15851,
      "family": "Asteraceae",
      "absTempMin": 5,
      "absTempMax": 24,
      "absRainMin": 400,
      "absRainMax": 1200,
      "absPhMin": 4.5,
      "absPhMax": 8.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 200
    },
    "calendar": {
      "manage": [
        11,
        12,
        1,
        2
      ],
      "harvest": [
        3,
        4,
        5
      ],
      "prep": [
        6,
        7,
        8,
        9,
        10
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "根茎で増殖。半日陰を好む。収穫後の追肥で翌年の株充実を図る。"
    },
    "yield": {
      "min": 1000,
      "max": 2500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 150,
      "max": 400,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "フキノメイガ",
        "level": "medium",
        "note": "葉柄基部に食入。早期防除。"
      },
      {
        "type": "weather",
        "name": "乾燥",
        "level": "medium",
        "note": "水分不足で葉柄が細くなる。"
      }
    ]
  },
  {
    "id": "myoga",
    "heatType": "warm",
    "name": "ミョウガ",
    "category": "wildveg",
    "variety": "ミョウガ",
    "conditions": {
      "family": "Zingiberaceae",
      "latMin": 33,
      "latMax": 42,
      "elevMax": 600,
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 5,
      "growthPeriodMin": 730,
      "growthPeriodMax": 1095
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        10,
        11,
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "半日陰で良く育つ。根茎で繁殖。定植後2年目から本格収穫。"
    },
    "yield": {
      "min": 500,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 800,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ウイルス病",
        "level": "medium",
        "note": "アブラムシ媒介。健全株の管理が大切。"
      },
      {
        "type": "rotation",
        "name": "株疲弊",
        "level": "medium",
        "note": "5〜6年で株更新推奨。"
      }
    ]
  },
  {
    "id": "wasabi",
    "heatType": "cool",
    "name": "ワサビ",
    "category": "root",
    "variety": "沢ワサビ・畑ワサビ",
    "conditions": {
      "latMin": 33,
      "latMax": 42,
      "elevMax": 1500,
      "tempMeanMin": 8,
      "tempMeanMax": 18,
      "soilTypes": [
        "loam",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 3,
      "rainfallMin": 1500,
      "rainfallMax": 3000,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Eutrema japonicum",
      "taxonID": 3065694,
      "family": "Brassicaceae",
      "absTempMin": -3,
      "absTempMax": 27,
      "absRainMin": 1000,
      "absRainMax": 5000,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 1095
    },
    "calendar": {
      "planting": [
        2,
        3,
        9,
        10
      ],
      "manage": [
        4,
        5,
        6,
        7,
        8,
        11,
        12
      ],
      "harvest": [
        9,
        10,
        11,
        12,
        1,
        2,
        3
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "清涼な流水（沢ワサビ）または冷涼地の畑作。水温13〜15℃が適正。"
    },
    "yield": {
      "min": 300,
      "max": 800,
      "unit": "kg/10a"
    },
    "price": {
      "min": 3000,
      "max": 8000,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "根腐病",
        "level": "high",
        "note": "水温上昇・水量減少で多発。夏越し管理が鍵。"
      },
      {
        "type": "weather",
        "name": "高温障害",
        "level": "high",
        "note": "22℃超で成長停止。冷涼環境必須。"
      }
    ]
  },
  {
    "id": "shiitake",
    "heatType": "cool",
    "name": "シイタケ",
    "category": "forest",
    "variety": "原木・菌床",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 20,
      "tempMeanMax": 25,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 5,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5,
      "phMax": 7,
      "scientificName": "Lentinula edodes",
      "taxonID": 5246598,
      "family": "Marasmiaceae",
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4,
      "absPhMax": 8,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 110,
      "growthPeriodMax": 180
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "harvest": [
        3,
        4,
        5,
        9,
        10,
        11
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "原木（クヌギ・ナラ）または菌床栽培。肥料不要。ほだ木の品質が収量を決める。"
    },
    "yield": {
      "min": 200,
      "max": 600,
      "unit": "kg/10a（原木換算）"
    },
    "price": {
      "min": 1000,
      "max": 3000,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ナメクジ・害虫",
        "level": "medium",
        "note": "高湿度環境で多発。排水管理と捕獲。"
      },
      {
        "type": "weather",
        "name": "高温障害",
        "level": "high",
        "note": "夏場の高温でほだ木が劣化。遮光必須。"
      }
    ]
  },
  {
    "id": "enoki",
    "heatType": "cool",
    "name": "エノキタケ",
    "category": "wildveg",
    "variety": "菌床栽培",
    "conditions": {
      "family": "Physalacriaceae",
      "latMin": 30,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 3,
      "tempMeanMax": 18,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "growthPeriodMin": 60,
      "growthPeriodMax": 90
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "harvest": [
        1,
        2,
        3,
        4,
        10,
        11,
        12
      ],
      "prep": [
        5,
        6,
        7,
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "施設内菌床栽培が主流。低温（5〜10℃）・高CO2環境で白い細長い茎に仕上げる。"
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（施設換算）"
    },
    "price": {
      "min": 200,
      "max": 600,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "細菌性腐敗",
        "level": "high",
        "note": "施設衛生管理が最重要。消毒徹底。"
      },
      {
        "type": "weather",
        "name": "高温障害",
        "level": "high",
        "note": "15℃超で生育障害。冷房設備必須。"
      }
    ]
  },
  {
    "id": "maitake",
    "heatType": "cool",
    "name": "マイタケ",
    "category": "forest",
    "variety": "原木・菌床",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 13,
      "tempMeanMax": 16,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 3,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Grifola frondosa",
      "taxonID": 5247267,
      "family": "Meripilaceae",
      "absTempMin": 5,
      "absTempMax": 24,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "harvest": [
        9,
        10,
        11
      ],
      "prep": [
        1,
        2,
        3,
        4
      ]
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "ミズナラ・クヌギが適木。原木接種から3年後に収穫開始。菌床なら1年目から収穫可。"
    },
    "yield": {
      "min": 150,
      "max": 400,
      "unit": "kg/10a（原木換算）"
    },
    "price": {
      "min": 1500,
      "max": 4000,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "ナメクジ",
        "level": "medium",
        "note": "収穫期に集中。誘殺剤で管理。"
      },
      {
        "type": "weather",
        "name": "高温乾燥",
        "level": "high",
        "note": "夏場の管理が翌秋の発生量を左右。"
      }
    ]
  },
  {
    "id": "koshiabura",
    "heatType": "cool",
    "name": "コシアブラ",
    "category": "wildveg",
    "variety": "コシアブラ",
    "conditions": {
      "latMin": 35,
      "latMax": 45,
      "elevMax": 1400,
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 5,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Eleutherococcus sciadophylloides",
      "taxonID": 2891256,
      "family": "Araliaceae",
      "absTempMin": -15,
      "absTempMax": 30,
      "absRainMin": 600,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        10,
        11,
        12
      ],
      "harvest": [
        4,
        5
      ],
      "prep": [
        6,
        7,
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "タラノメと並ぶ春山菜の王者。促成栽培で早出し可能。芽吹き量は株齢に依存。"
    },
    "yield": {
      "min": 150,
      "max": 500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 1000,
      "max": 3000,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "weather",
        "name": "晩霜",
        "level": "medium",
        "note": "萌芽期の遅霜で新芽が黒変する。"
      },
      {
        "type": "pest",
        "name": "アブラムシ",
        "level": "low",
        "note": "新芽に散発。収穫前日数に注意。"
      }
    ]
  },
  {
    "id": "zenmai",
    "heatType": "cool",
    "name": "ゼンマイ",
    "category": "wildveg",
    "variety": "ゼンマイ",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1300,
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 10,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 4.5,
      "phMax": 6.5,
      "scientificName": "Osmunda japonica",
      "taxonID": 8156,
      "family": "Osmundaceae",
      "absTempMin": -15,
      "absTempMax": 28,
      "absRainMin": 600,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "other",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "manage": [
        11,
        12,
        1,
        2,
        3
      ],
      "harvest": [
        4,
        5,
        6
      ],
      "prep": [
        7,
        8,
        9,
        10
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "半日陰・湿潤地を好む。根茎での繁殖。定植後2〜3年は株充実に専念。天日干し加工で単価が上がる。"
    },
    "yield": {
      "min": 100,
      "max": 400,
      "unit": "kg/10a（生重）"
    },
    "price": {
      "min": 600,
      "max": 2000,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "雑草競合",
        "level": "high",
        "note": "定植初期は除草管理が最重要。"
      },
      {
        "type": "weather",
        "name": "干ばつ",
        "level": "medium",
        "note": "乾燥で収量が著しく低下。水分確保が重要。"
      }
    ]
  },
  {
    "id": "nameko",
    "heatType": "cool",
    "name": "ナメコ",
    "category": "forest",
    "variety": "原木・菌床",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 13,
      "tempMeanMax": 18,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 3,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Pholiota microspora",
      "taxonID": 5252779,
      "family": "Strophariaceae",
      "absTempMin": 5,
      "absTempMax": 29,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "harvest": [
        9,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "ブナ・ナラの原木または菌床で栽培。ぬめり成分がきのこの中でも特徴的。湿度管理が重要。"
    },
    "yield": {
      "min": 200,
      "max": 600,
      "unit": "kg/10a（原木換算）"
    },
    "price": {
      "min": 600,
      "max": 1800,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "害虫・ナメクジ",
        "level": "medium",
        "note": "高湿度環境で多発。衛生管理が重要。"
      },
      {
        "type": "weather",
        "name": "高温障害",
        "level": "high",
        "note": "20℃超でほだ木が劣化。夏場の遮光必須。"
      }
    ]
  },
  {
    "id": "buna_shimeji",
    "heatType": "cool",
    "name": "ブナシメジ",
    "category": "forest",
    "variety": "菌床栽培",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 14,
      "tempMeanMax": 18,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 1,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Hypsizygus tessellatus",
      "taxonID": 5558695,
      "family": "Lyophyllaceae",
      "absTempMin": 5,
      "absTempMax": 25,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 90
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "harvest": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "施設内菌床栽培で周年出荷が可能。長野県が全国トップ生産量。温度・湿度・CO2濃度の精密管理が重要。"
    },
    "yield": {
      "min": 1000,
      "max": 2500,
      "unit": "kg/10a（施設換算）"
    },
    "price": {
      "min": 300,
      "max": 800,
      "unit": "円/kg（JA概算）"
    },
    "risks": [
      {
        "type": "pest",
        "name": "細菌性腐敗",
        "level": "high",
        "note": "施設衛生管理が最重要。消毒徹底。"
      },
      {
        "type": "weather",
        "name": "高温障害",
        "level": "high",
        "note": "22℃超で生育障害。空調設備必須。"
      }
    ]
  },
  {
    "id": "sunny_lettuce",
    "heatType": "cool",
    "name": "サニーレタス",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 21,
      "rainfallMin": 1100,
      "rainfallMax": 1400,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Lactuca sativa",
      "taxonID": 1313,
      "family": "Asteraceae",
      "continuousCropYears": 1,
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 900,
      "absRainMax": 4100,
      "absPhMin": 4.2,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial",
      "growthPeriodMin": 35,
      "growthPeriodMax": 85
    },
    "calendar": {
      "sowing": [
        3,
        4,
        9,
        10
      ],
      "manage": [
        4,
        5,
        10,
        11
      ],
      "harvest": [
        5,
        6,
        11,
        12
      ],
      "prep": [
        1,
        2,
        7,
        8
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "komatsuna",
    "heatType": "cool",
    "name": "コマツナ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica rapa var. perviridis",
      "taxonID": 547,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5.3,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial, perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sowing": [
        3,
        4,
        5,
        9,
        10
      ],
      "manage": [
        3,
        4,
        5,
        9,
        10,
        11
      ],
      "harvest": [
        4,
        5,
        6,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        7,
        8
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "chingensai",
    "heatType": "cool",
    "name": "チンゲンサイ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica rapa subsp. chinensis",
      "taxonID": 547,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5.3,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial, perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sowing": [
        4,
        5,
        8,
        9
      ],
      "manage": [
        4,
        5,
        6,
        9,
        10
      ],
      "harvest": [
        5,
        6,
        7,
        10,
        11
      ],
      "prep": [
        1,
        2,
        3,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "shungiku",
    "heatType": "cool",
    "name": "シュンギク",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 21,
      "rainfallMin": 600,
      "rainfallMax": 1200,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Glebionis coronaria",
      "taxonID": 3141115,
      "family": "Asteraceae",
      "continuousCropYears": 1,
      "absTempMin": 5,
      "absTempMax": 28,
      "absRainMin": 300,
      "absRainMax": 2000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 40,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sowing": [
        3,
        4,
        9,
        10
      ],
      "manage": [
        4,
        5,
        10,
        11
      ],
      "harvest": [
        5,
        6,
        11,
        12
      ],
      "prep": [
        1,
        2,
        7,
        8
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "mizuna",
    "heatType": "cool",
    "name": "ミズナ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica rapa var. nipposinica",
      "taxonID": 547,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5.3,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial, perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sowing": [
        3,
        4,
        8,
        9,
        10
      ],
      "manage": [
        4,
        5,
        9,
        10,
        11
      ],
      "harvest": [
        5,
        6,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "takana",
    "heatType": "cool",
    "name": "タカナ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica juncea var. integrifolia",
      "taxonID": 547,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5.3,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial, perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sowing": [
        8,
        9
      ],
      "manage": [
        9,
        10,
        11
      ],
      "harvest": [
        11,
        12,
        1,
        2,
        3
      ],
      "prep": [
        4,
        5,
        6,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "karashina",
    "heatType": "cool",
    "name": "カラシナ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 28,
      "rainfallMin": 700,
      "rainfallMax": 2400,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Brassica juncea",
      "taxonID": 548,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 7,
      "absTempMax": 40,
      "absRainMin": 500,
      "absRainMax": 4200,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 50,
      "growthPeriodMax": 100
    },
    "calendar": {
      "sowing": [
        3,
        4,
        8,
        9
      ],
      "manage": [
        4,
        5,
        9,
        10
      ],
      "harvest": [
        5,
        6,
        10,
        11
      ],
      "prep": [
        1,
        2,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kale",
    "heatType": "cool",
    "name": "ケール",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica oleracea var. sabellica",
      "taxonID": 547,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5.3,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial, perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sowing": [
        5,
        7,
        8
      ],
      "manage": [
        6,
        7,
        8,
        9,
        10
      ],
      "harvest": [
        9,
        10,
        11,
        12,
        1,
        2,
        3
      ],
      "prep": [
        3,
        4,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "moroheiya",
    "heatType": "warm",
    "name": "モロヘイヤ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 37,
      "rainfallMin": 1500,
      "rainfallMax": 3000,
      "phMin": 6.5,
      "phMax": 7,
      "scientificName": "Corchorus olitorius",
      "taxonID": 4849,
      "family": "Tiliaceae",
      "continuousCropYears": 1,
      "absTempMin": 13,
      "absTempMax": 45,
      "absRainMin": 900,
      "absRainMax": 3600,
      "absPhMin": 5,
      "absPhMax": 8.6,
      "cropCategory": "materials",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sowing": [
        5,
        6
      ],
      "manage": [
        6,
        7,
        8
      ],
      "harvest": [
        7,
        8,
        9,
        10
      ],
      "prep": [
        3,
        4
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "wakegi",
    "heatType": "cool",
    "name": "ワケギ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 24,
      "rainfallMin": 750,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 6.5,
      "scientificName": "Allium x wakegi",
      "taxonID": 363,
      "family": "Amaryllidaceae",
      "continuousCropYears": 1,
      "absTempMin": 6,
      "absTempMax": 27,
      "absRainMin": 350,
      "absRainMax": 2800,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, biennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 150
    },
    "calendar": {
      "transplant": [
        8,
        9
      ],
      "manage": [
        9,
        10,
        11
      ],
      "harvest": [
        11,
        12,
        1,
        2,
        3
      ],
      "prep": [
        4,
        5,
        6,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "asatsuki",
    "heatType": "cool",
    "name": "アサツキ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 450,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 6.6,
      "scientificName": "Allium schoenoprasum",
      "taxonID": 810,
      "family": "Amaryllidaceae",
      "continuousCropYears": 1,
      "absTempMin": 2,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 2800,
      "absPhMin": 5,
      "absPhMax": 8.2,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, perennial",
      "growthPeriodMin": 70,
      "growthPeriodMax": 100
    },
    "calendar": {
      "transplant": [
        9,
        10
      ],
      "manage": [
        10,
        11,
        12
      ],
      "harvest": [
        3,
        4,
        5
      ],
      "prep": [
        6,
        7,
        8
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "parsley",
    "heatType": "cool",
    "name": "パセリ",
    "category": "leafy",
    "conditions": {
      "tempMeanMin": 11,
      "tempMeanMax": 20,
      "rainfallMin": 900,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Petroselinum crispum",
      "taxonID": 1661,
      "family": "Apiaceae",
      "continuousCropYears": 1,
      "absTempMin": 7,
      "absTempMax": 28,
      "absRainMin": 300,
      "absRainMax": 2800,
      "absPhMin": 5.3,
      "absPhMax": 8.3,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 70,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sowing": [
        3,
        4,
        8,
        9
      ],
      "manage": [
        4,
        5,
        9,
        10,
        11
      ],
      "harvest": [
        6,
        7,
        8,
        11,
        12,
        1,
        2
      ],
      "prep": [
        1,
        2,
        6,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "mini_tomato",
    "heatType": "warm",
    "name": "ミニトマト",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 35,
      "rainfallMin": 500,
      "rainfallMax": 1200,
      "phMin": 6,
      "phMax": 6.8,
      "scientificName": "Solanum lycopersicum",
      "taxonID": 1961,
      "family": "Solanaceae",
      "continuousCropYears": 1,
      "absTempMin": 15,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 7,
      "cropCategory": "fruits & nuts, vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8
      ],
      "harvest": [
        7,
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "paprika",
    "heatType": "warm",
    "name": "パプリカ",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 17,
      "tempMeanMax": 30,
      "rainfallMin": 600,
      "rainfallMax": 1250,
      "phMin": 5.5,
      "phMax": 6.8,
      "scientificName": "Capsicum annuum",
      "taxonID": 618,
      "family": "Solanaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 1700,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 180
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8
      ],
      "harvest": [
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "shishito",
    "heatType": "warm",
    "name": "シシトウ",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 17,
      "tempMeanMax": 30,
      "rainfallMin": 600,
      "rainfallMax": 1250,
      "phMin": 5.5,
      "phMax": 6.8,
      "scientificName": "Capsicum annuum",
      "taxonID": 618,
      "family": "Solanaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 1700,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 180
    },
    "calendar": {
      "seedling": [
        2,
        3
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7
      ],
      "harvest": [
        7,
        8,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "okra",
    "heatType": "warm",
    "name": "オクラ",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 30,
      "rainfallMin": 600,
      "rainfallMax": 1200,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Abelmoschus esculentus",
      "taxonID": 289,
      "family": "Malvaceae",
      "continuousCropYears": 2,
      "absTempMin": 12,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 2500,
      "absPhMin": 4.5,
      "absPhMax": 8.7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 50,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sowing": [
        5,
        6
      ],
      "manage": [
        6,
        7
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        3,
        4
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "goya",
    "heatType": "warm",
    "name": "ゴーヤ",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 22,
      "tempMeanMax": 30,
      "rainfallMin": 2000,
      "rainfallMax": 2500,
      "phMin": 6,
      "phMax": 6.5,
      "scientificName": "Momordica charantia",
      "taxonID": 7795,
      "family": "Cucurbitaceae",
      "continuousCropYears": 1,
      "absTempMin": 15,
      "absTempMax": 38,
      "absRainMin": 1000,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "fruits & nuts, vegetables, ornamentals/turf, environmental",
      "lifeForm": "herb, vine",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 50,
      "growthPeriodMax": 70
    },
    "calendar": {
      "seedling": [
        3,
        4
      ],
      "transplant": [
        5
      ],
      "manage": [
        5,
        6,
        7
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "zucchini",
    "heatType": "warm",
    "name": "ズッキーニ",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 17,
      "tempMeanMax": 30,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.8,
      "scientificName": "Cucurbita pepo",
      "taxonID": 821,
      "family": "Cucurbitaceae",
      "continuousCropYears": 1,
      "absTempMin": 6,
      "absTempMax": 40,
      "absRainMin": 300,
      "absRainMax": 2800,
      "absPhMin": 4.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, vegetables, materials",
      "lifeForm": "herb, vine",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 40,
      "growthPeriodMax": 100
    },
    "calendar": {
      "sowing": [
        4,
        5
      ],
      "manage": [
        5,
        6
      ],
      "harvest": [
        6,
        7,
        8
      ],
      "prep": [
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "melon",
    "heatType": "warm",
    "name": "メロン",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 30,
      "rainfallMin": 1000,
      "rainfallMax": 1300,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Cucumis melo",
      "taxonID": 815,
      "family": "Cucurbitaceae",
      "continuousCropYears": 2,
      "absTempMin": 9,
      "absTempMax": 35,
      "absRainMin": 900,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 8.7,
      "cropCategory": "vegetables, materials, environmental",
      "lifeForm": "herb, vine",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 50,
      "growthPeriodMax": 120
    },
    "calendar": {
      "seedling": [
        3,
        4
      ],
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6
      ],
      "harvest": [
        7,
        8
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "togan",
    "heatType": "warm",
    "name": "冬瓜",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 24,
      "tempMeanMax": 30,
      "rainfallMin": 400,
      "rainfallMax": 800,
      "phMin": 5.6,
      "phMax": 6.8,
      "scientificName": "Benincasa hispida",
      "taxonID": 513,
      "family": "Cucurbitaceae",
      "continuousCropYears": 2,
      "absTempMin": 12,
      "absTempMax": 37,
      "absRainMin": 300,
      "absRainMax": 2800,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts",
      "lifeForm": "herb",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 160
    },
    "calendar": {
      "sowing": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7
      ],
      "harvest": [
        8,
        9,
        10
      ],
      "prep": [
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ingen",
    "heatType": "warm",
    "name": "インゲン",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 16,
      "tempMeanMax": 25,
      "rainfallMin": 500,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Phaseolus vulgaris",
      "taxonID": 1668,
      "family": "Fabaceae",
      "continuousCropYears": 1,
      "absTempMin": 7,
      "absTempMax": 32,
      "absRainMin": 300,
      "absRainMax": 4300,
      "absPhMin": 4,
      "absPhMax": 9,
      "cropCategory": "pulses (grain legumes), forage/pasture, vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 50,
      "growthPeriodMax": 270
    },
    "calendar": {
      "sowing": [
        4,
        5,
        6
      ],
      "manage": [
        5,
        6,
        7
      ],
      "harvest": [
        6,
        7,
        8,
        9
      ],
      "prep": [
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "soramame",
    "heatType": "cool",
    "name": "ソラマメ",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "rainfallMin": 650,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Vicia faba",
      "taxonID": 2146,
      "family": "Fabaceae",
      "continuousCropYears": 1,
      "absTempMin": 5,
      "absTempMax": 32,
      "absRainMin": 250,
      "absRainMax": 2600,
      "absPhMin": 4.5,
      "absPhMax": 8.6,
      "cropCategory": "pulses (grain legumes), medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 100,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sowing": [
        10,
        11
      ],
      "manage": [
        11,
        12,
        1,
        2,
        3,
        4
      ],
      "harvest": [
        4,
        5,
        6
      ],
      "prep": [
        7,
        8,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "endo",
    "heatType": "cool",
    "name": "エンドウ",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 24,
      "rainfallMin": 800,
      "rainfallMax": 1200,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Pisum sativum",
      "taxonID": 1721,
      "family": "Fabaceae",
      "continuousCropYears": 1,
      "absTempMin": 4,
      "absTempMax": 30,
      "absRainMin": 350,
      "absRainMax": 2500,
      "absPhMin": 4.5,
      "absPhMax": 8.3,
      "cropCategory": "pulses (grain legumes), medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect, climber/scrambler/scadent",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 140
    },
    "calendar": {
      "sowing": [
        10,
        11
      ],
      "manage": [
        11,
        12,
        1,
        2,
        3
      ],
      "harvest": [
        4,
        5,
        6
      ],
      "prep": [
        7,
        8,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "rakkasei",
    "heatType": "warm",
    "name": "落花生",
    "category": "fruit_veg",
    "conditions": {
      "tempMeanMin": 22,
      "tempMeanMax": 32,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Arachis hypogaea",
      "taxonID": 2199,
      "family": "Fabaceae",
      "continuousCropYears": 1,
      "absTempMin": 10,
      "absTempMax": 45,
      "absRainMin": 400,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 8.5,
      "cropCategory": "pulses (grain legumes), vegetables, materials, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sowing": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "daikon_root",
    "heatType": "cool",
    "name": "ダイコン",
    "category": "root",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 26,
      "rainfallMin": 1000,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Raphanus sativus",
      "taxonID": 1839,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 10,
      "absTempMax": 37,
      "absRainMin": 800,
      "absRainMax": 2800,
      "absPhMin": 4.3,
      "absPhMax": 8.3,
      "cropCategory": "roots/tubers, vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 50,
      "growthPeriodMax": 80
    },
    "calendar": {
      "sowing": [
        3,
        4,
        8,
        9
      ],
      "manage": [
        4,
        5,
        9,
        10
      ],
      "harvest": [
        5,
        6,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kabu",
    "heatType": "cool",
    "name": "カブ",
    "category": "root",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Brassica rapa subsp. rapa",
      "taxonID": 547,
      "family": "Brassicaceae",
      "continuousCropYears": 1,
      "absTempMin": 8,
      "absTempMax": 34,
      "absRainMin": 500,
      "absRainMax": 2700,
      "absPhMin": 5.3,
      "absPhMax": 8,
      "cropCategory": "vegetables, materials",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "annual, biennial, perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sowing": [
        3,
        4,
        8,
        9
      ],
      "manage": [
        4,
        5,
        9,
        10
      ],
      "harvest": [
        5,
        6,
        10,
        11
      ],
      "prep": [
        1,
        2,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "renkon",
    "heatType": "warm",
    "name": "レンコン",
    "category": "root",
    "conditions": {
      "tempMeanMin": 25,
      "tempMeanMax": 30,
      "rainfallMin": 2000,
      "rainfallMax": 2800,
      "phMin": 6,
      "phMax": 6.5,
      "scientificName": "Nelumbo nucifera",
      "taxonID": 2359,
      "family": "Nelumbonaceae",
      "continuousCropYears": 2,
      "absTempMin": 10,
      "absTempMax": 40,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 5.5,
      "absPhMax": 7.3,
      "cropCategory": "roots/tubers, vegetables, materials, ornamentals/turf, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 200
    },
    "calendar": {
      "transplant": [
        3,
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10,
        11,
        12,
        1,
        2
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "beets",
    "heatType": "cool",
    "name": "ビーツ",
    "category": "root",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 25,
      "rainfallMin": 600,
      "rainfallMax": 800,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Beta vulgaris",
      "taxonID": 514,
      "family": "Chenopodiaceae",
      "continuousCropYears": 1,
      "absTempMin": 4,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 1000,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "roots/tubers, vegetables",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "biennial",
      "growthPeriodMin": 160,
      "growthPeriodMax": 240
    },
    "calendar": {
      "sowing": [
        4,
        5,
        9
      ],
      "manage": [
        5,
        6,
        10
      ],
      "harvest": [
        7,
        8,
        11,
        12
      ],
      "prep": [
        2,
        3,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ukon",
    "heatType": "warm",
    "name": "ウコン",
    "category": "root",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 28,
      "rainfallMin": 1000,
      "rainfallMax": 2000,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Curcuma longa",
      "taxonID": 828,
      "family": "Zingiberaceae",
      "continuousCropYears": 1,
      "absTempMin": 18,
      "absTempMax": 32,
      "absRainMin": 800,
      "absRainMax": 3000,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "roots/tubers, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 270,
      "growthPeriodMax": 300
    },
    "calendar": {
      "transplant": [
        3,
        4
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "konjac",
    "heatType": "warm",
    "name": "コンニャク",
    "category": "root",
    "conditions": {
      "tempMeanMin": 28,
      "tempMeanMax": 35,
      "rainfallMin": 1000,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.2,
      "scientificName": "Amorphophallus konjac",
      "taxonID": 400,
      "family": "Araceae",
      "continuousCropYears": 3,
      "absTempMin": 25,
      "absTempMax": 40,
      "absRainMin": 900,
      "absRainMax": 1800,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 220,
      "growthPeriodMax": 350
    },
    "calendar": {
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "nectarine",
    "heatType": "warm",
    "name": "ネクタリン",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 33,
      "rainfallMin": 900,
      "rainfallMax": 1100,
      "phMin": 5.5,
      "phMax": 6.3,
      "scientificName": "Prunus persica var. nucipersica",
      "taxonID": 1796,
      "family": "Rosaceae",
      "continuousCropYears": 15,
      "absTempMin": 7,
      "absTempMax": 35,
      "absRainMin": 750,
      "absRainMax": 1600,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts, ornamentals/turf, environmental",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 240,
      "growthPeriodMax": 270
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6
      ],
      "harvest": [
        7,
        8
      ],
      "prep": [
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kuri",
    "heatType": "cool",
    "name": "クリ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 17,
      "tempMeanMax": 28,
      "rainfallMin": 1100,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6,
      "scientificName": "Castanea crenata",
      "taxonID": 4312,
      "family": "Fagaceae",
      "continuousCropYears": 20,
      "absTempMin": 12,
      "absTempMax": 30,
      "absRainMin": 900,
      "absRainMax": 2300,
      "absPhMin": 5,
      "absPhMax": 7,
      "cropCategory": "fruits & nuts, ornamentals/turf, forest/wood",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 180
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ume_fruit",
    "heatType": "cool",
    "name": "ウメ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 34,
      "rainfallMin": 800,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Prunus mume",
      "taxonID": 8983,
      "family": "Rosaceae",
      "continuousCropYears": 15,
      "absTempMin": 6,
      "absTempMax": 38,
      "absRainMin": 600,
      "absRainMax": 1200,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "fruits & nuts, ornamentals/turf",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 210
    },
    "calendar": {
      "manage": [
        1,
        2,
        3,
        4,
        5
      ],
      "harvest": [
        6,
        7
      ],
      "prep": [
        11,
        12
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "sudachi",
    "heatType": "warm",
    "name": "スダチ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 25,
      "tempMeanMax": 30,
      "rainfallMin": 1200,
      "rainfallMax": 1400,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Citrus sudachi",
      "taxonID": 711,
      "family": "Rutaceae",
      "continuousCropYears": 25,
      "absTempMin": 12,
      "absTempMax": 42,
      "absRainMin": 350,
      "absRainMax": 2000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 140,
      "growthPeriodMax": 330
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7
      ],
      "harvest": [
        8,
        9,
        10
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kabosu",
    "heatType": "warm",
    "name": "カボス",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 25,
      "tempMeanMax": 30,
      "rainfallMin": 1200,
      "rainfallMax": 1400,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Citrus sphaerocarpa",
      "taxonID": 711,
      "family": "Rutaceae",
      "continuousCropYears": 25,
      "absTempMin": 12,
      "absTempMax": 42,
      "absRainMin": 350,
      "absRainMax": 2000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 140,
      "growthPeriodMax": 330
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7
      ],
      "harvest": [
        8,
        9,
        10
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "lemon",
    "heatType": "warm",
    "name": "レモン",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 28,
      "rainfallMin": 1000,
      "rainfallMax": 2300,
      "phMin": 6.5,
      "phMax": 7,
      "scientificName": "Citrus limon",
      "taxonID": 714,
      "family": "Rutaceae",
      "continuousCropYears": 25,
      "absTempMin": 12,
      "absTempMax": 36,
      "absRainMin": 300,
      "absRainMax": 4000,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 210,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7
      ],
      "harvest": [
        10,
        11,
        12,
        1,
        2,
        3
      ],
      "prep": [
        8,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ponkan",
    "heatType": "warm",
    "name": "ポンカン",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 23,
      "tempMeanMax": 34,
      "rainfallMin": 1200,
      "rainfallMax": 1800,
      "phMin": 6,
      "phMax": 6.8,
      "scientificName": "Citrus reticulata",
      "taxonID": 718,
      "family": "Rutaceae",
      "continuousCropYears": 25,
      "absTempMin": 12,
      "absTempMax": 38,
      "absRainMin": 300,
      "absRainMax": 4000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        12,
        1
      ],
      "prep": [
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "dekopon",
    "heatType": "warm",
    "name": "デコポン",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 23,
      "tempMeanMax": 34,
      "rainfallMin": 1200,
      "rainfallMax": 1800,
      "phMin": 6,
      "phMax": 6.8,
      "scientificName": "Citrus reticulata",
      "taxonID": 718,
      "family": "Rutaceae",
      "continuousCropYears": 25,
      "absTempMin": 12,
      "absTempMax": 38,
      "absRainMin": 300,
      "absRainMax": 4000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        1,
        2,
        3
      ],
      "prep": [
        10,
        11,
        12
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "amanatsu",
    "heatType": "warm",
    "name": "甘夏",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 25,
      "tempMeanMax": 30,
      "rainfallMin": 1200,
      "rainfallMax": 1400,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Citrus natsudaidai",
      "taxonID": 711,
      "family": "Rutaceae",
      "continuousCropYears": 25,
      "absTempMin": 12,
      "absTempMax": 42,
      "absRainMin": 350,
      "absRainMax": 2000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 140,
      "growthPeriodMax": 330
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        3,
        4,
        5
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "natsumikan",
    "heatType": "warm",
    "name": "夏みかん",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 25,
      "tempMeanMax": 30,
      "rainfallMin": 1200,
      "rainfallMax": 1400,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Citrus natsudaidai",
      "taxonID": 711,
      "family": "Rutaceae",
      "continuousCropYears": 25,
      "absTempMin": 12,
      "absTempMax": 42,
      "absRainMin": 350,
      "absRainMax": 2000,
      "absPhMin": 5.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 140,
      "growthPeriodMax": 330
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        4,
        5
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "raspberry",
    "heatType": "cool",
    "name": "ラズベリー",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 17,
      "tempMeanMax": 23,
      "rainfallMin": 800,
      "rainfallMax": 1200,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Rubus idaeus",
      "taxonID": 1877,
      "family": "Rosaceae",
      "continuousCropYears": 8,
      "absTempMin": 5,
      "absTempMax": 28,
      "absRainMin": 300,
      "absRainMax": 1700,
      "absPhMin": 4.5,
      "absPhMax": 7.8,
      "cropCategory": "fruits & nuts, medicinals & aromatic",
      "lifeForm": "sub-shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 180
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6
      ],
      "harvest": [
        6,
        7,
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "blackberry",
    "heatType": "cool",
    "name": "ブラックベリー",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Rubus fruticosus",
      "taxonID": 9359,
      "family": "Rosaceae",
      "continuousCropYears": 8,
      "absTempMin": -2,
      "absTempMax": 32,
      "absRainMin": 500,
      "absRainMax": 3500,
      "absPhMin": 5.5,
      "absPhMax": 7,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "sub-shrub",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ichijiku",
    "heatType": "warm",
    "name": "イチジク",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 16,
      "tempMeanMax": 26,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Ficus carica",
      "taxonID": 1071,
      "family": "Moraceae",
      "continuousCropYears": 15,
      "absTempMin": 4,
      "absTempMax": 38,
      "absRainMin": 300,
      "absRainMax": 2700,
      "absPhMin": 4.3,
      "absPhMax": 8.6,
      "cropCategory": "fruits & nuts, ornamentals/turf, medicinals & aromatic",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 300
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7
      ],
      "harvest": [
        8,
        9,
        10,
        11
      ],
      "prep": [
        12,
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "zakuro",
    "heatType": "warm",
    "name": "ザクロ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 23,
      "tempMeanMax": 32,
      "rainfallMin": 900,
      "rainfallMax": 1200,
      "phMin": 6.5,
      "phMax": 7.5,
      "scientificName": "Punica granatum",
      "taxonID": 1829,
      "family": "Punicaceae",
      "continuousCropYears": 15,
      "absTempMin": 8,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 4200,
      "absPhMin": 5.8,
      "absPhMax": 8.5,
      "cropCategory": "fruits & nuts, medicinals & aromatic",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10,
        11
      ],
      "prep": [
        12,
        1,
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "akebi",
    "heatType": "cool",
    "name": "アケビ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Akebia quinata",
      "taxonID": 2372885,
      "family": "Lardizabalaceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 35,
      "absRainMin": 600,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "fruits",
      "lifeForm": "climber",
      "growthHabit": "climbing",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 270
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "olive",
    "heatType": "warm",
    "name": "オリーブ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 34,
      "rainfallMin": 400,
      "rainfallMax": 700,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Olea europaea",
      "taxonID": 1553,
      "family": "Oleaceae",
      "continuousCropYears": 25,
      "absTempMin": 5,
      "absTempMax": 40,
      "absRainMin": 200,
      "absRainMax": 1200,
      "absPhMin": 5.3,
      "absPhMax": 8.5,
      "cropCategory": "materials, ornamentals/turf, medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      "harvest": [
        10,
        11,
        12
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kurumi",
    "heatType": "cool",
    "name": "クルミ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 30,
      "rainfallMin": 800,
      "rainfallMax": 1700,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Juglans regia",
      "taxonID": 2315,
      "family": "Juglandaceae",
      "continuousCropYears": 20,
      "absTempMin": 7,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 2200,
      "absPhMin": 4.5,
      "absPhMax": 8.3,
      "cropCategory": "fruits & nuts, materials, ornamentals/turf, medicinals & aromatic, forest/wood",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 180
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2,
        3
      ],
      "sow": null
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "hazelnut",
    "heatType": "cool",
    "name": "ヘーゼルナッツ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 24,
      "rainfallMin": 900,
      "rainfallMax": 1100,
      "phMin": 6,
      "phMax": 6.5,
      "scientificName": "Corylus avellana",
      "taxonID": 2246,
      "family": "Betulaceae",
      "continuousCropYears": 20,
      "absTempMin": 5,
      "absTempMax": 35,
      "absRainMin": 600,
      "absRainMax": 1400,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts, materials, medicinals & aromatic, forest/wood",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 210
    },
    "calendar": {
      "manage": [
        3,
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        11,
        12,
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "almond",
    "heatType": "warm",
    "name": "アーモンド",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 33,
      "rainfallMin": 900,
      "rainfallMax": 1100,
      "phMin": 5.5,
      "phMax": 6.3,
      "scientificName": "Prunus dulcis",
      "taxonID": 1796,
      "family": "Rosaceae",
      "continuousCropYears": 15,
      "absTempMin": 7,
      "absTempMax": 35,
      "absRainMin": 750,
      "absRainMax": 1600,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts, ornamentals/turf, environmental",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 240,
      "growthPeriodMax": 270
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "harvest": [
        8,
        9
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ginnan",
    "heatType": "warm",
    "name": "銀杏",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 25,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Ginkgo biloba",
      "taxonID": 2682929,
      "family": "Ginkgoaceae",
      "continuousCropYears": 25,
      "absTempMin": -30,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 2500,
      "absPhMin": 4.5,
      "absPhMax": 8.5,
      "cropCategory": "nuts",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        4,
        5,
        6,
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "prep": [
        12,
        1,
        2,
        3
      ],
      "sow": null
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "papaya",
    "heatType": "warm",
    "name": "パパイヤ",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 21,
      "tempMeanMax": 30,
      "rainfallMin": 1500,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Carica papaya",
      "taxonID": 630,
      "family": "Caricaceae",
      "continuousCropYears": 4,
      "absTempMin": 12,
      "absTempMax": 44,
      "absRainMin": 1000,
      "absRainMax": 3000,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "fruits & nuts, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 330,
      "growthPeriodMax": 365
    },
    "calendar": {
      "transplant": [
        4,
        5
      ],
      "manage": [
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "harvest": [
        8,
        9,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "mango",
    "heatType": "warm",
    "name": "マンゴー",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 24,
      "tempMeanMax": 30,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Mangifera indica",
      "taxonID": 1416,
      "family": "Anacardiaceae",
      "continuousCropYears": 20,
      "absTempMin": 8,
      "absTempMax": 48,
      "absRainMin": 300,
      "absRainMax": 2600,
      "absPhMin": 4.3,
      "absPhMax": 8.5,
      "cropCategory": "fruits & nuts, medicinals & aromatic, forest/wood",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 365
    },
    "calendar": {
      "manage": [
        2,
        3,
        4,
        5,
        6
      ],
      "harvest": [
        7,
        8,
        9
      ],
      "prep": [
        11,
        12,
        1
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "pineapple",
    "heatType": "warm",
    "name": "パイナップル",
    "category": "fruit",
    "conditions": {
      "tempMeanMin": 21,
      "tempMeanMax": 30,
      "rainfallMin": 800,
      "rainfallMax": 2500,
      "phMin": 4.5,
      "phMax": 8,
      "scientificName": "Ananas comosus",
      "taxonID": 402,
      "family": "Bromeliaceae",
      "continuousCropYears": 3,
      "absTempMin": 10,
      "absTempMax": 36,
      "absRainMin": 550,
      "absRainMax": 3500,
      "absPhMin": 3.5,
      "absPhMax": 9,
      "cropCategory": "fruits & nuts",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 330,
      "growthPeriodMax": 365
    },
    "calendar": {
      "transplant": [
        3,
        4,
        5
      ],
      "manage": [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11
      ],
      "harvest": [
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "prep": [
        1,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "fukinoto",
    "heatType": "cool",
    "name": "フキノトウ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 17,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 7,
      "scientificName": "Petasites japonicus",
      "taxonID": 15851,
      "family": "Asteraceae",
      "continuousCropYears": 5,
      "absTempMin": 5,
      "absTempMax": 24,
      "absRainMin": 400,
      "absRainMax": 1200,
      "absPhMin": 4.5,
      "absPhMax": 8.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 200
    },
    "calendar": {
      "sow": null,
      "harvest": [
        2,
        3
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "udo",
    "heatType": "cool",
    "name": "ウド",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Aralia cordata",
      "taxonID": 2891263,
      "family": "Araliaceae",
      "continuousCropYears": 5,
      "absTempMin": -15,
      "absTempMax": 30,
      "absRainMin": 600,
      "absRainMax": 4000,
      "absPhMin": 5,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": [
        10,
        11
      ],
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kogomi",
    "heatType": "cool",
    "name": "コゴミ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 20,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 4.5,
      "phMax": 6.5,
      "scientificName": "Matteuccia struthiopteris",
      "taxonID": 2649870,
      "family": "Onocleaceae",
      "continuousCropYears": 10,
      "absTempMin": -30,
      "absTempMax": 28,
      "absRainMin": 500,
      "absRainMax": 4000,
      "absPhMin": 4,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "mizu_sansai",
    "heatType": "cool",
    "name": "ミズ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 1200,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Elatostema umbellatum",
      "taxonID": 2983046,
      "family": "Urticaceae",
      "continuousCropYears": 10,
      "absTempMin": -5,
      "absTempMax": 28,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "shidoke",
    "heatType": "cool",
    "name": "シドケ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Cacalia hastata",
      "taxonID": 2875618,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 28,
      "absRainMin": 600,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "momijigasa",
    "heatType": "cool",
    "name": "モミジガサ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 8,
      "tempMeanMax": 20,
      "rainfallMin": 800,
      "rainfallMax": 2500,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Parasenecio delphiniifolius",
      "taxonID": 2876512,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 28,
      "absRainMin": 600,
      "absRainMax": 3500,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "azami",
    "heatType": "cool",
    "name": "アザミ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Cirsium japonicum",
      "taxonID": 4231414,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": -15,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "yomogi",
    "heatType": "cool",
    "name": "ヨモギ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 11,
      "tempMeanMax": 22,
      "rainfallMin": 500,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 6,
      "scientificName": "Artemisia indica",
      "taxonID": 3389,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": 4,
      "absTempMax": 26,
      "absRainMin": 350,
      "absRainMax": 1200,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "materials, ornamentals/turf, medicinals & aromatic",
      "lifeForm": "sub-shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "nobiru",
    "heatType": "cool",
    "name": "ノビル",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 24,
      "rainfallMin": 750,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 6.5,
      "scientificName": "Allium macrostemon",
      "taxonID": 363,
      "family": "Amaryllidaceae",
      "continuousCropYears": 10,
      "absTempMin": 6,
      "absTempMax": 27,
      "absRainMin": 350,
      "absRainMax": 2800,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, biennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "gyoja_ninniku",
    "heatType": "cool",
    "name": "ギョウジャニンニク",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 24,
      "rainfallMin": 750,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 6.5,
      "scientificName": "Allium victorialis",
      "taxonID": 363,
      "family": "Amaryllidaceae",
      "continuousCropYears": 15,
      "absTempMin": 6,
      "absTempMax": 27,
      "absRainMin": 350,
      "absRainMax": 2800,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, biennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sow": [
        9,
        10
      ],
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "hangonso",
    "heatType": "cool",
    "name": "ハンゴンソウ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 1800,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Senecio cannabifolius",
      "taxonID": 9691,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 28,
      "absRainMin": 500,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": null,
      "harvest": [
        7,
        8
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "itadori",
    "heatType": "cool",
    "name": "イタドリ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1800,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Reynoutria japonica",
      "taxonID": 2891770,
      "family": "Polygonaceae",
      "continuousCropYears": 15,
      "absTempMin": -35,
      "absTempMax": 35,
      "absRainMin": 400,
      "absRainMax": 3000,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "tsukushi",
    "heatType": "cool",
    "name": "ツクシ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 20,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5,
      "phMax": 7,
      "scientificName": "Equisetum arvense",
      "taxonID": 5723,
      "family": "Equisetaceae",
      "continuousCropYears": 15,
      "absTempMin": -30,
      "absTempMax": 25,
      "absRainMin": 400,
      "absRainMax": 2500,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        4
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "seri",
    "heatType": "cool",
    "name": "セリ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 30,
      "rainfallMin": 2000,
      "rainfallMax": 3000,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Oenanthe javanica",
      "taxonID": 2364,
      "family": "Apiaceae",
      "continuousCropYears": 5,
      "absTempMin": 4,
      "absTempMax": 32,
      "absRainMin": 1500,
      "absRainMax": 3500,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect, prostrate/procumbent/semi-erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": null,
      "harvest": [
        12,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "cress",
    "heatType": "cool",
    "name": "クレソン",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 17,
      "rainfallMin": 1000,
      "rainfallMax": 2300,
      "phMin": 6.5,
      "phMax": 7.5,
      "scientificName": "Nasturtium officinale",
      "taxonID": 1522,
      "family": "Brassicaceae",
      "continuousCropYears": 5,
      "absTempMin": 6,
      "absTempMax": 32,
      "absRainMin": 300,
      "absRainMax": 4200,
      "absPhMin": 4.5,
      "absPhMax": 8.3,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 40,
      "growthPeriodMax": 80
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "hamabofu",
    "heatType": "cool",
    "name": "ハマボウフウ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 7.5,
      "scientificName": "Glehnia littoralis",
      "taxonID": 3034905,
      "family": "Apiaceae",
      "continuousCropYears": 10,
      "absTempMin": -15,
      "absTempMax": 30,
      "absRainMin": 400,
      "absRainMax": 2500,
      "absPhMin": 5.5,
      "absPhMax": 8.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "mitsuba_akebi",
    "heatType": "cool",
    "name": "ミツバアケビ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Akebia trifoliata",
      "taxonID": 2372882,
      "family": "Lardizabalaceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 35,
      "absRainMin": 600,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "climber",
      "growthHabit": "climbing",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 270
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "yabukanzo",
    "heatType": "warm",
    "name": "ヤブカンゾウ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Hemerocallis fulva",
      "taxonID": 2767175,
      "family": "Asphodelaceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 35,
      "absRainMin": 400,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "katakuri",
    "heatType": "cool",
    "name": "カタクリ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 18,
      "rainfallMin": 900,
      "rainfallMax": 2000,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Erythronium japonicum",
      "taxonID": 2756573,
      "family": "Liliaceae",
      "continuousCropYears": 15,
      "absTempMin": -25,
      "absTempMax": 25,
      "absRainMin": 600,
      "absRainMax": 3000,
      "absPhMin": 4.5,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        4
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "yamaudo",
    "heatType": "cool",
    "name": "ヤマウド",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Aralia cordata",
      "taxonID": 2891263,
      "family": "Araliaceae",
      "continuousCropYears": 5,
      "absTempMin": -15,
      "absTempMax": 30,
      "absRainMin": 600,
      "absRainMax": 4000,
      "absPhMin": 5,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "takenoko",
    "heatType": "warm",
    "name": "タケノコ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 21,
      "rainfallMin": 1200,
      "rainfallMax": 1800,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Phyllostachys edulis",
      "taxonID": 2706922,
      "family": "Poaceae",
      "continuousCropYears": 20,
      "absTempMin": -18,
      "absTempMax": 38,
      "absRainMin": 800,
      "absRainMax": 2500,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "nemagari",
    "heatType": "cool",
    "name": "ネマガリタケ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 18,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Sasa kurilensis",
      "taxonID": 2706922,
      "family": "Poaceae",
      "continuousCropYears": 15,
      "absTempMin": -30,
      "absTempMax": 28,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        6,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "chishimazasa",
    "heatType": "cool",
    "name": "チシマザサ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 18,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Sasa kurilensis",
      "taxonID": 2706922,
      "family": "Poaceae",
      "continuousCropYears": 15,
      "absTempMin": -30,
      "absTempMax": 28,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        6,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kuromoji",
    "heatType": "cool",
    "name": "クロモジ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 1000,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Lindera umbellata",
      "taxonID": 3035005,
      "family": "Lauraceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 32,
      "absRainMin": 700,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": null,
      "harvest": [
        3,
        4
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "sansho",
    "heatType": "warm",
    "name": "サンショウ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 24,
      "rainfallMin": 800,
      "rainfallMax": 1400,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Zanthoxylum piperitum",
      "taxonID": 248815,
      "family": "Rutaceae",
      "continuousCropYears": 10,
      "absTempMin": 12,
      "absTempMax": 32,
      "absRainMin": 750,
      "absRainMax": 1500,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "forage/pasture, medicinals & aromatic, forest/wood",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kihada",
    "heatType": "cool",
    "name": "キハダ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Phellodendron amurense",
      "taxonID": 3189940,
      "family": "Rutaceae",
      "continuousCropYears": 15,
      "absTempMin": -30,
      "absTempMax": 38,
      "absRainMin": 400,
      "absRainMax": 2200,
      "absPhMin": 5,
      "absPhMax": 8.2,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "matatabi",
    "heatType": "cool",
    "name": "マタタビ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 21,
      "tempMeanMax": 30,
      "rainfallMin": 900,
      "rainfallMax": 1300,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Actinidia polygama",
      "taxonID": 889,
      "family": "Actinidiaceae",
      "continuousCropYears": 10,
      "absTempMin": 8,
      "absTempMax": 35,
      "absRainMin": 700,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "fruits & nuts",
      "lifeForm": "vine, shrub",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "perennial",
      "growthPeriodMin": 210,
      "growthPeriodMax": 330
    },
    "calendar": {
      "sow": null,
      "harvest": [
        6,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "akebi_bud",
    "heatType": "cool",
    "name": "アケビ新芽",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Akebia quinata",
      "taxonID": 2372885,
      "family": "Lardizabalaceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 35,
      "absRainMin": 600,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "climber",
      "growthHabit": "climbing",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 270
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kusasotetsu",
    "heatType": "cool",
    "name": "クサソテツ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 20,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 4.5,
      "phMax": 6.5,
      "scientificName": "Matteuccia struthiopteris",
      "taxonID": 2649870,
      "family": "Onocleaceae",
      "continuousCropYears": 10,
      "absTempMin": -30,
      "absTempMax": 28,
      "absRainMin": 500,
      "absRainMax": 4000,
      "absPhMin": 4,
      "absPhMax": 7,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "yamabuki_bud",
    "heatType": "cool",
    "name": "ヤマブキ新芽",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Kerria japonica",
      "taxonID": 5336099,
      "family": "Rosaceae",
      "continuousCropYears": 8,
      "absTempMin": -20,
      "absTempMax": 35,
      "absRainMin": 400,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "miyama_irakusa",
    "heatType": "cool",
    "name": "ミヤマイラクサ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 8,
      "tempMeanMax": 20,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Laportea macrostachya",
      "taxonID": 2982813,
      "family": "Urticaceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 28,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "obagiboshi",
    "heatType": "cool",
    "name": "オオバギボウシ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 8,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Hosta sieboldiana",
      "taxonID": 2781682,
      "family": "Asparagaceae",
      "continuousCropYears": 10,
      "absTempMin": -25,
      "absTempMax": 32,
      "absRainMin": 500,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "acaulescent (or rosette plants)",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "yaburegasa",
    "heatType": "cool",
    "name": "ヤブレガサ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 8,
      "tempMeanMax": 20,
      "rainfallMin": 900,
      "rainfallMax": 2500,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Syneilesis palmata",
      "taxonID": 2878132,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 28,
      "absRainMin": 600,
      "absRainMax": 3500,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        4,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "shiode",
    "heatType": "cool",
    "name": "シオデ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Smilax riparia",
      "taxonID": 9804,
      "family": "Smilacaceae",
      "continuousCropYears": 10,
      "absTempMin": -10,
      "absTempMax": 30,
      "absRainMin": 500,
      "absRainMax": 3500,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "sub-shrub",
      "growthHabit": "climber/scrambler/scadent",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "honna",
    "heatType": "cool",
    "name": "ホンナ",
    "category": "wildveg",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Cacalia hastata",
      "taxonID": 2875618,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": -20,
      "absTempMax": 28,
      "absRainMin": 600,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "hiratake",
    "heatType": "cool",
    "name": "ヒラタケ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 13,
      "tempMeanMax": 24,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5,
      "phMax": 7,
      "scientificName": "Pleurotus ostreatus",
      "taxonID": 5557391,
      "family": "Pleurotaceae",
      "continuousCropYears": 1,
      "absTempMin": 2,
      "absTempMax": 30,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4,
      "absPhMax": 8,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 21,
      "growthPeriodMax": 35
    },
    "calendar": {
      "sow": [
        1,
        3
      ],
      "harvest": [
        10,
        12
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "eringi",
    "heatType": "cool",
    "name": "エリンギ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 14,
      "tempMeanMax": 20,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 6.5,
      "scientificName": "Pleurotus eryngii",
      "taxonID": 5557389,
      "family": "Pleurotaceae",
      "continuousCropYears": 1,
      "absTempMin": 5,
      "absTempMax": 26,
      "absRainMin": 400,
      "absRainMax": 3000,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": null,
      "harvest": [
        1,
        12
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kikurage",
    "heatType": "warm",
    "name": "キクラゲ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 20,
      "rainfallMin": 1200,
      "rainfallMax": 3000,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Auricularia auricula-judae",
      "taxonID": 2552479,
      "family": "Auriculariaceae",
      "continuousCropYears": 1,
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 800,
      "absRainMax": 5000,
      "absPhMin": 4.5,
      "absPhMax": 7.5,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        6,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "tamogitake",
    "heatType": "warm",
    "name": "タモギタケ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Pleurotus cornucopiae",
      "taxonID": 5557394,
      "family": "Pleurotaceae",
      "continuousCropYears": 1,
      "absTempMin": 10,
      "absTempMax": 35,
      "absRainMin": 700,
      "absRainMax": 4000,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 21,
      "growthPeriodMax": 35
    },
    "calendar": {
      "sow": null,
      "harvest": [
        7,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "matsutake",
    "heatType": "cool",
    "name": "マツタケ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 14,
      "tempMeanMax": 19,
      "rainfallMin": 1000,
      "rainfallMax": 2000,
      "phMin": 4.5,
      "phMax": 6,
      "scientificName": "Tricholoma matsutake",
      "taxonID": 5560467,
      "family": "Tricholomataceae",
      "continuousCropYears": 20,
      "absTempMin": 5,
      "absTempMax": 25,
      "absRainMin": 600,
      "absRainMax": 3000,
      "absPhMin": 3.9,
      "absPhMax": 6.6,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 1825
    },
    "calendar": {
      "sow": null,
      "harvest": [
        9,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "truffle",
    "heatType": "cool",
    "name": "トリュフ",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 22,
      "rainfallMin": 600,
      "rainfallMax": 900,
      "phMin": 7.6,
      "phMax": 7.9,
      "scientificName": "Tuber melanosporum",
      "taxonID": 2594773,
      "family": "Tuberaceae",
      "continuousCropYears": 20,
      "absTempMin": 0,
      "absTempMax": 38,
      "absRainMin": 425,
      "absRainMax": 1500,
      "absPhMin": 7.1,
      "absPhMax": 8.5,
      "cropCategory": "mushrooms",
      "lifeForm": "mushroom",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 1825,
      "growthPeriodMax": 3650
    },
    "calendar": {
      "sow": null,
      "harvest": [
        12,
        2
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "urushi",
    "heatType": "warm",
    "name": "漆",
    "category": "forest",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 28,
      "rainfallMin": 1000,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Toxicodendron vernicifluum",
      "taxonID": 3188889,
      "family": "Anacardiaceae",
      "continuousCropYears": 15,
      "absTempMin": -15,
      "absTempMax": 38,
      "absRainMin": 700,
      "absRainMax": 3000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "materials",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": null,
      "harvest": [
        7,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "chamomile",
    "heatType": "cool",
    "name": "カモミール",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 19,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1000,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Matricaria chamomilla",
      "taxonID": 7637,
      "family": "Asteraceae",
      "continuousCropYears": 1,
      "absTempMin": 6,
      "absTempMax": 30,
      "absRainMin": 300,
      "absRainMax": 1300,
      "absPhMin": 5,
      "absPhMax": 7,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect, prostrate/procumbent/semi-erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 270,
      "growthPeriodMax": 300
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "mint",
    "heatType": "cool",
    "name": "ミント",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 1100,
      "phMin": 5.5,
      "phMax": 6.4,
      "scientificName": "Mentha spp.",
      "taxonID": 1448,
      "family": "Lamiaceae",
      "continuousCropYears": 5,
      "absTempMin": 3,
      "absTempMax": 30,
      "absRainMin": 500,
      "absRainMax": 4300,
      "absPhMin": 4.5,
      "absPhMax": 8.3,
      "cropCategory": "materials",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        5,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "lemon_balm",
    "heatType": "cool",
    "name": "レモンバーム",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 14,
      "tempMeanMax": 25,
      "rainfallMin": 800,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 6,
      "scientificName": "Melissa officinalis",
      "taxonID": 2340,
      "family": "Lamiaceae",
      "continuousCropYears": 5,
      "absTempMin": 6,
      "absTempMax": 30,
      "absRainMin": 500,
      "absRainMax": 1300,
      "absPhMin": 4.5,
      "absPhMax": 7.8,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect, prostrate/procumbent/semi-erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 140
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        5,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "rosemary",
    "heatType": "warm",
    "name": "ローズマリー",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 26,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Salvia rosmarinus",
      "taxonID": 2412,
      "family": "Lamiaceae",
      "continuousCropYears": 8,
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 300,
      "absRainMax": 1500,
      "absPhMin": 4.2,
      "absPhMax": 8.3,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "sub-shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 240
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        4,
        11
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "thyme",
    "heatType": "cool",
    "name": "タイム",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 16,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Thymus vulgaris",
      "taxonID": 2441,
      "family": "Lamiaceae",
      "continuousCropYears": 5,
      "absTempMin": 4,
      "absTempMax": 30,
      "absRainMin": 400,
      "absRainMax": 2600,
      "absPhMin": 4.5,
      "absPhMax": 8,
      "cropCategory": "ornamentals/turf, medicinals & aromatic",
      "lifeForm": "shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 100,
      "growthPeriodMax": 200
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        4,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "oregano",
    "heatType": "warm",
    "name": "オレガノ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 17,
      "tempMeanMax": 28,
      "rainfallMin": 700,
      "rainfallMax": 1300,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Origanum vulgare",
      "taxonID": 2369,
      "family": "Lamiaceae",
      "continuousCropYears": 5,
      "absTempMin": 4,
      "absTempMax": 32,
      "absRainMin": 400,
      "absRainMax": 2700,
      "absPhMin": 4.5,
      "absPhMax": 8.7,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 300
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        4,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "sage",
    "heatType": "cool",
    "name": "セージ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 26,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Salvia officinalis",
      "taxonID": 2412,
      "family": "Lamiaceae",
      "continuousCropYears": 5,
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 300,
      "absRainMax": 1500,
      "absPhMin": 4.2,
      "absPhMax": 8.3,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "sub-shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 240
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        4,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "lavender",
    "heatType": "cool",
    "name": "ラベンダー",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 15,
      "tempMeanMax": 24,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 6.5,
      "phMax": 7.5,
      "scientificName": "Lavandula angustifolia",
      "taxonID": 7172,
      "family": "Lamiaceae",
      "continuousCropYears": 8,
      "absTempMin": 7,
      "absTempMax": 28,
      "absRainMin": 300,
      "absRainMax": 1300,
      "absPhMin": 5.8,
      "absPhMax": 8.3,
      "cropCategory": "ornamentals/turf, medicinals & aromatic",
      "lifeForm": "sub-shrub, shrub",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 180,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": [
        9,
        10
      ],
      "harvest": [
        6,
        7
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "basil",
    "heatType": "warm",
    "name": "バジル",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 27,
      "rainfallMin": 1000,
      "rainfallMax": 1600,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Ocimum basilicum",
      "taxonID": 1547,
      "family": "Lamiaceae",
      "continuousCropYears": 1,
      "absTempMin": 7,
      "absTempMax": 36,
      "absRainMin": 600,
      "absRainMax": 4300,
      "absPhMin": 4.3,
      "absPhMax": 8.2,
      "cropCategory": "vegetables, medicinals & aromatic, weed",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 270
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        6,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "shiso",
    "heatType": "warm",
    "name": "シソ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 30,
      "rainfallMin": 250,
      "rainfallMax": 600,
      "phMin": 5.5,
      "phMax": 7.2,
      "scientificName": "Perilla frutescens",
      "taxonID": 8452,
      "family": "Lamiaceae",
      "continuousCropYears": 1,
      "absTempMin": 5,
      "absTempMax": 38,
      "absRainMin": 150,
      "absRainMax": 1200,
      "absPhMin": 4.5,
      "absPhMax": 8.3,
      "cropCategory": "vegetables, materials, ornamentals/turf, medicinals & aromatic, weed",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        7,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "echinacea",
    "heatType": "cool",
    "name": "エキナセア",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 24,
      "rainfallMin": 400,
      "rainfallMax": 800,
      "phMin": 6.5,
      "phMax": 7.5,
      "scientificName": "Echinacea purpurea",
      "taxonID": 148275,
      "family": "Asteraceae",
      "continuousCropYears": 5,
      "absTempMin": 10,
      "absTempMax": 36,
      "absRainMin": 300,
      "absRainMax": 1000,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "ornamentals/turf, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        8,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "dokudami",
    "heatType": "warm",
    "name": "ドクダミ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 27,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Houttuynia cordata",
      "taxonID": 2982574,
      "family": "Saururaceae",
      "continuousCropYears": 5,
      "absTempMin": -10,
      "absTempMax": 38,
      "absRainMin": 500,
      "absRainMax": 4000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "prostrate/procumbent/semi-erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "gennoshoko",
    "heatType": "cool",
    "name": "ゲンノショウコ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Geranium thunbergii",
      "taxonID": 6416,
      "family": "Geraniaceae",
      "continuousCropYears": 5,
      "absTempMin": -15,
      "absTempMax": 28,
      "absRainMin": 500,
      "absRainMax": 3500,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual, biennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": null,
      "harvest": [
        8,
        9
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "otane_ninjin",
    "heatType": "cool",
    "name": "オタネニンジン",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 12,
      "tempMeanMax": 20,
      "rainfallMin": 700,
      "rainfallMax": 1300,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Panax ginseng",
      "taxonID": 8227,
      "family": "Araliaceae",
      "continuousCropYears": 15,
      "absTempMin": 8,
      "absTempMax": 27,
      "absRainMin": 500,
      "absRainMax": 1500,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        9,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kihada_herb",
    "heatType": "cool",
    "name": "キハダ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Phellodendron amurense",
      "taxonID": 3189940,
      "family": "Rutaceae",
      "continuousCropYears": 15,
      "absTempMin": -30,
      "absTempMax": 38,
      "absRainMin": 400,
      "absRainMax": 2200,
      "absPhMin": 5,
      "absPhMax": 8.2,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 365,
      "growthPeriodMax": 365
    },
    "calendar": null,
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ukon_herb",
    "heatType": "warm",
    "name": "ウコン",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 28,
      "rainfallMin": 1000,
      "rainfallMax": 2000,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Curcuma longa",
      "taxonID": 828,
      "family": "Zingiberaceae",
      "continuousCropYears": 1,
      "absTempMin": 18,
      "absTempMax": 32,
      "absRainMin": 800,
      "absRainMax": 3000,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "roots/tubers, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 270,
      "growthPeriodMax": 300
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        10,
        11
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "aloe",
    "heatType": "warm",
    "name": "アロエ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 18,
      "tempMeanMax": 26,
      "rainfallMin": 400,
      "rainfallMax": 1500,
      "phMin": 5,
      "phMax": 6.5,
      "scientificName": "Aloe vera",
      "taxonID": 3031,
      "family": "Asphodelaceae",
      "continuousCropYears": 10,
      "absTempMin": 9,
      "absTempMax": 38,
      "absRainMin": 300,
      "absRainMax": 1700,
      "absPhMin": 4.2,
      "absPhMax": 7,
      "cropCategory": "ornamentals/turf, medicinals & aromatic, environmental",
      "lifeForm": "shrub, tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": null,
      "harvest": [
        1,
        12
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "yomogi_herb",
    "heatType": "cool",
    "name": "ヨモギ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 11,
      "tempMeanMax": 22,
      "rainfallMin": 500,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 6,
      "scientificName": "Artemisia indica",
      "taxonID": 3389,
      "family": "Asteraceae",
      "continuousCropYears": 10,
      "absTempMin": 4,
      "absTempMax": 26,
      "absRainMin": 350,
      "absRainMax": 1200,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "materials, ornamentals/turf, medicinals & aromatic",
      "lifeForm": "sub-shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 150,
      "growthPeriodMax": 180
    },
    "calendar": null,
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "hatomugi",
    "heatType": "warm",
    "name": "ハトムギ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 20,
      "tempMeanMax": 25,
      "rainfallMin": 1500,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Coix lacryma-jobi",
      "taxonID": 206429,
      "family": "Poaceae",
      "continuousCropYears": 2,
      "absTempMin": 9,
      "absTempMax": 28,
      "absRainMin": 1000,
      "absRainMax": 3000,
      "absPhMin": 4.5,
      "absPhMax": 8.4,
      "cropCategory": "cereals & pseudocereals",
      "lifeForm": "grass",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        9,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kanzo",
    "heatType": "cool",
    "name": "甘草",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 14,
      "tempMeanMax": 25,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 6.5,
      "phMax": 7.5,
      "scientificName": "Glycyrrhiza uralensis",
      "taxonID": 6467,
      "family": "Fabaceae",
      "continuousCropYears": 10,
      "absTempMin": 5,
      "absTempMax": 30,
      "absRainMin": 300,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 8.2,
      "cropCategory": "roots/tubers, forage/pasture, materials, medicinals & aromatic",
      "lifeForm": "herb, sub-shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 90,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        10,
        11
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "botan",
    "heatType": "cool",
    "name": "ボタン",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 7,
      "scientificName": "Paeonia suffruticosa",
      "taxonID": 50471,
      "family": "Paeoniaceae",
      "continuousCropYears": 15,
      "absTempMin": 5,
      "absTempMax": 35,
      "absRainMin": 400,
      "absRainMax": 2500,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "ornamentals/turf, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        5
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "shakuyaku",
    "heatType": "cool",
    "name": "シャクヤク",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 25,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Paeonia lactiflora",
      "taxonID": 50471,
      "family": "Paeoniaceae",
      "continuousCropYears": 10,
      "absTempMin": -30,
      "absTempMax": 35,
      "absRainMin": 400,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "ornamentals/turf, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 0,
      "growthPeriodMax": 0
    },
    "calendar": {
      "sow": null,
      "harvest": [
        5,
        6
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "senburi",
    "heatType": "cool",
    "name": "センブリ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 800,
      "rainfallMax": 1800,
      "phMin": 5.5,
      "phMax": 7,
      "scientificName": "Swertia japonica",
      "taxonID": 2889345,
      "family": "Gentianaceae",
      "continuousCropYears": 2,
      "absTempMin": -15,
      "absTempMax": 28,
      "absRainMin": 500,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": null,
      "harvest": [
        9,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "kuko",
    "heatType": "warm",
    "name": "クコ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 13,
      "tempMeanMax": 25,
      "rainfallMin": 700,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7.5,
      "scientificName": "Lycium chinense",
      "taxonID": 7444,
      "family": "Solanaceae",
      "continuousCropYears": 8,
      "absTempMin": 8,
      "absTempMax": 32,
      "absRainMin": 300,
      "absRainMax": 2200,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "vegetables, ornamentals/turf, medicinals & aromatic, cover crop, environmental",
      "lifeForm": "shrub",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 365
    },
    "calendar": {
      "sow": null,
      "harvest": [
        9,
        10
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "ashitaba",
    "heatType": "warm",
    "name": "アシタバ",
    "category": "herb",
    "conditions": {
      "tempMeanMin": 5,
      "tempMeanMax": 19,
      "rainfallMin": 700,
      "rainfallMax": 1100,
      "phMin": 5.5,
      "phMax": 6.5,
      "scientificName": "Angelica keiskei",
      "taxonID": 3218,
      "family": "Apiaceae",
      "continuousCropYears": 3,
      "absTempMin": 2,
      "absTempMax": 22,
      "absRainMin": 500,
      "absRainMax": 1300,
      "absPhMin": 4.5,
      "absPhMax": 7.3,
      "cropCategory": "medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "biennial, perennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        3,
        11
      ]
    },
    "fertilizer": null,
    "yield": null,
    "price": null,
    "risks": []
  },
  {
    "id": "sesame",
    "heatType": "warm",
    "name": "ゴマ",
    "category": "oil",
    "variety": "一般品種",
    "conditions": {
      "latMin": 25,
      "latMax": 40,
      "elevMax": 600,
      "tempMeanMin": 22,
      "tempMeanMax": 35,
      "rainfallMin": 500,
      "rainfallMax": 1200,
      "phMin": 5.5,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 2,
      "scientificName": "Sesamum indicum",
      "taxonID": null,
      "family": "Pedaliaceae",
      "absTempMin": 15,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 1800,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "oil crops",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": [
        5,
        6
      ],
      "harvest": [
        9,
        10
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 6,
      "K": 5
    },
    "yield": {
      "min": 80,
      "max": 150,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "sunflower",
    "heatType": "warm",
    "name": "ヒマワリ",
    "category": "oil",
    "variety": "油用品種",
    "conditions": {
      "latMin": 35,
      "latMax": 55,
      "elevMax": 800,
      "tempMeanMin": 15,
      "tempMeanMax": 28,
      "rainfallMin": 400,
      "rainfallMax": 1200,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Helianthus annuus",
      "taxonID": null,
      "family": "Asteraceae",
      "absTempMin": 5,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "oil crops",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 8,
      "K": 6
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "egoma",
    "heatType": "warm",
    "name": "エゴマ",
    "category": "oil",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Perilla frutescens var. frutescens",
      "taxonID": null,
      "family": "Lamiaceae",
      "absTempMin": 10,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 2000,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "oil crops, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 100,
      "growthPeriodMax": 130
    },
    "calendar": {
      "sow": [
        5,
        6
      ],
      "harvest": [
        9,
        10
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 7,
      "K": 6
    },
    "yield": {
      "min": 80,
      "max": 150,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "safflower",
    "heatType": "warm",
    "name": "ベニバナ",
    "category": "oil",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 50,
      "elevMax": 600,
      "tempMeanMin": 15,
      "tempMeanMax": 30,
      "rainfallMin": 300,
      "rainfallMax": 800,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 3,
      "scientificName": "Carthamus tinctorius",
      "taxonID": null,
      "family": "Asteraceae",
      "absTempMin": 5,
      "absTempMax": 38,
      "absRainMin": 250,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "oil crops, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 6,
      "P": 6,
      "K": 5
    },
    "yield": {
      "min": 80,
      "max": 200,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "oil_palm",
    "heatType": "warm",
    "name": "アブラヤシ",
    "category": "oil",
    "variety": "テネラ種",
    "conditions": {
      "latMin": 0,
      "latMax": 15,
      "elevMax": 500,
      "tempMeanMin": 24,
      "tempMeanMax": 32,
      "rainfallMin": 1500,
      "rainfallMax": 4000,
      "phMin": 4,
      "phMax": 6,
      "soilTypes": [
        "loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 25,
      "scientificName": "Elaeis guineensis",
      "taxonID": null,
      "family": "Arecaceae",
      "absTempMin": 18,
      "absTempMax": 38,
      "absRainMin": 1200,
      "absRainMax": 5000,
      "absPhMin": 3.5,
      "absPhMax": 7,
      "cropCategory": "oil crops",
      "lifeForm": "tree",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 1095,
      "growthPeriodMax": 1460
    },
    "calendar": {
      "sow": [
        1,
        12
      ],
      "harvest": [
        1,
        12
      ]
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 25
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "cotton",
    "heatType": "warm",
    "name": "ワタ（綿）",
    "category": "fiber",
    "variety": "アップランド種",
    "conditions": {
      "latMin": 25,
      "latMax": 40,
      "elevMax": 600,
      "tempMeanMin": 22,
      "tempMeanMax": 32,
      "rainfallMin": 500,
      "rainfallMax": 1200,
      "phMin": 5.8,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Gossypium hirsutum",
      "taxonID": null,
      "family": "Malvaceae",
      "absTempMin": 15,
      "absTempMax": 40,
      "absRainMin": 400,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "fiber crops, materials",
      "lifeForm": "shrub",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 150,
      "growthPeriodMax": 200
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        9,
        11
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "flax",
    "heatType": "cool",
    "name": "亜麻（リネン）",
    "category": "fiber",
    "variety": "繊維用品種",
    "conditions": {
      "latMin": 40,
      "latMax": 60,
      "elevMax": 800,
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 400,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 5,
      "scientificName": "Linum usitatissimum",
      "taxonID": null,
      "family": "Linaceae",
      "absTempMin": 0,
      "absTempMax": 30,
      "absRainMin": 300,
      "absRainMax": 1200,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "fiber crops, materials",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 8,
      "P": 8,
      "K": 6
    },
    "yield": {
      "min": 150,
      "max": 350,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "ramie",
    "heatType": "warm",
    "name": "ラミー（苧麻）",
    "category": "fiber",
    "variety": "一般品種",
    "conditions": {
      "latMin": 28,
      "latMax": 40,
      "elevMax": 700,
      "tempMeanMin": 18,
      "tempMeanMax": 30,
      "rainfallMin": 1000,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 10,
      "scientificName": "Boehmeria nivea",
      "taxonID": null,
      "family": "Urticaceae",
      "absTempMin": 10,
      "absTempMax": 38,
      "absRainMin": 800,
      "absRainMax": 2500,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "fiber crops, materials",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 60,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        6,
        10
      ]
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "kenaf",
    "heatType": "warm",
    "name": "ケナフ",
    "category": "fiber",
    "variety": "一般品種",
    "conditions": {
      "latMin": 25,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 20,
      "tempMeanMax": 32,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "clay",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Hibiscus cannabinus",
      "taxonID": null,
      "family": "Malvaceae",
      "absTempMin": 12,
      "absTempMax": 38,
      "absRainMin": 500,
      "absRainMax": 2000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "fiber crops, materials, environmental",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 120,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sow": [
        4,
        6
      ],
      "harvest": [
        10,
        11
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8
    },
    "yield": {
      "min": 500,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "hemp",
    "heatType": "cool",
    "name": "ヘンプ（産業用大麻）",
    "category": "fiber",
    "variety": "低THC品種",
    "conditions": {
      "latMin": 35,
      "latMax": 55,
      "elevMax": 800,
      "tempMeanMin": 14,
      "tempMeanMax": 26,
      "rainfallMin": 400,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 3,
      "scientificName": "Cannabis sativa",
      "taxonID": null,
      "family": "Cannabaceae",
      "absTempMin": 5,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "fiber crops, materials, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 70,
      "growthPeriodMax": 110
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8
    },
    "yield": {
      "min": 200,
      "max": 500,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "chicory",
    "heatType": "cool",
    "name": "チコリ",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 55,
      "elevMax": 800,
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 400,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 3,
      "scientificName": "Cichorium intybus",
      "taxonID": null,
      "family": "Asteraceae",
      "absTempMin": -5,
      "absTempMax": 30,
      "absRainMin": 300,
      "absRainMax": 1200,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "biennial",
      "growthPeriodMin": 90,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        10,
        12
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 10
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "endive",
    "heatType": "cool",
    "name": "エンダイブ",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 55,
      "elevMax": 700,
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 400,
      "rainfallMax": 900,
      "phMin": 5.5,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 3,
      "scientificName": "Cichorium endivia",
      "taxonID": null,
      "family": "Asteraceae",
      "absTempMin": -3,
      "absTempMax": 28,
      "absRainMin": 300,
      "absRainMax": 1200,
      "absPhMin": 5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "rosette",
      "lifeSpan": "annual",
      "growthPeriodMin": 70,
      "growthPeriodMax": 100
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        10,
        12
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "arugula",
    "heatType": "cool",
    "name": "ルッコラ",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 50,
      "elevMax": 600,
      "tempMeanMin": 12,
      "tempMeanMax": 22,
      "rainfallMin": 300,
      "rainfallMax": 800,
      "phMin": 6,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Eruca vesicaria",
      "taxonID": null,
      "family": "Brassicaceae",
      "absTempMin": 0,
      "absTempMax": 30,
      "absRainMin": 250,
      "absRainMax": 1000,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "rosette",
      "lifeSpan": "annual",
      "growthPeriodMin": 30,
      "growthPeriodMax": 50
    },
    "calendar": {
      "sow": [
        3,
        10
      ],
      "harvest": [
        4,
        12
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8
    },
    "yield": {
      "min": 400,
      "max": 800,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "fennel",
    "heatType": "cool",
    "name": "フェンネル（ウイキョウ）",
    "category": "vegetable",
    "variety": "球茎用品種",
    "conditions": {
      "latMin": 33,
      "latMax": 50,
      "elevMax": 700,
      "tempMeanMin": 12,
      "tempMeanMax": 24,
      "rainfallMin": 400,
      "rainfallMax": 900,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 3,
      "scientificName": "Foeniculum vulgare",
      "taxonID": null,
      "family": "Apiaceae",
      "absTempMin": -5,
      "absTempMax": 32,
      "absRainMin": 300,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "vegetables, medicinals & aromatic",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "perennial",
      "growthPeriodMin": 90,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        6,
        11
      ]
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 10
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "celeriac",
    "heatType": "cool",
    "name": "セルリアック（根セロリ）",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 55,
      "elevMax": 700,
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 3,
      "scientificName": "Apium graveolens var. rapaceum",
      "taxonID": null,
      "family": "Apiaceae",
      "absTempMin": -3,
      "absTempMax": 28,
      "absRainMin": 400,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "rosette",
      "lifeSpan": "biennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        10,
        11
      ]
    },
    "fertilizer": {
      "N": 14,
      "P": 10,
      "K": 14
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "kohlrabi",
    "heatType": "cool",
    "name": "コールラビ",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 55,
      "elevMax": 700,
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 400,
      "rainfallMax": 900,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Brassica oleracea var. gongylodes",
      "taxonID": null,
      "family": "Brassicaceae",
      "absTempMin": -5,
      "absTempMax": 28,
      "absRainMin": 350,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 50,
      "growthPeriodMax": 70
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        5,
        7
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "chard",
    "heatType": "cool",
    "name": "チャード（フダンソウ）",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 55,
      "elevMax": 700,
      "tempMeanMin": 12,
      "tempMeanMax": 25,
      "rainfallMin": 400,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Beta vulgaris subsp. cicla",
      "taxonID": null,
      "family": "Amaranthaceae",
      "absTempMin": -5,
      "absTempMax": 32,
      "absRainMin": 300,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "rosette",
      "lifeSpan": "biennial",
      "growthPeriodMin": 50,
      "growthPeriodMax": 80
    },
    "calendar": {
      "sow": [
        3,
        9
      ],
      "harvest": [
        5,
        12
      ]
    },
    "fertilizer": {
      "N": 14,
      "P": 8,
      "K": 12
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "leek",
    "heatType": "cool",
    "name": "リーキ（西洋ネギ）",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 55,
      "elevMax": 700,
      "tempMeanMin": 10,
      "tempMeanMax": 22,
      "rainfallMin": 400,
      "rainfallMax": 900,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Allium ampeloprasum var. porrum",
      "taxonID": null,
      "family": "Amaryllidaceae",
      "absTempMin": -10,
      "absTempMax": 28,
      "absRainMin": 300,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "biennial",
      "growthPeriodMin": 120,
      "growthPeriodMax": 180
    },
    "calendar": {
      "sow": [
        2,
        3
      ],
      "harvest": [
        9,
        12
      ]
    },
    "fertilizer": {
      "N": 14,
      "P": 10,
      "K": 12
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "kailan",
    "heatType": "warm",
    "name": "カイラン（中国ケール）",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 25,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 15,
      "tempMeanMax": 25,
      "rainfallMin": 400,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Brassica oleracea var. alboglabra",
      "taxonID": null,
      "family": "Brassicaceae",
      "absTempMin": 5,
      "absTempMax": 32,
      "absRainMin": 350,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 40,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": [
        3,
        9
      ],
      "harvest": [
        5,
        11
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "pakchoi",
    "heatType": "cool",
    "name": "パクチョイ",
    "category": "vegetable",
    "variety": "一般品種",
    "conditions": {
      "latMin": 25,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 13,
      "tempMeanMax": 23,
      "rainfallMin": 400,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Brassica rapa subsp. chinensis",
      "taxonID": null,
      "family": "Brassicaceae",
      "absTempMin": 2,
      "absTempMax": 30,
      "absRainMin": 300,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "vegetables",
      "lifeForm": "herb",
      "growthHabit": "rosette",
      "lifeSpan": "annual",
      "growthPeriodMin": 30,
      "growthPeriodMax": 50
    },
    "calendar": {
      "sow": [
        3,
        10
      ],
      "harvest": [
        4,
        12
      ]
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "hanabiratake",
    "heatType": "cool",
    "name": "ハナビラタケ",
    "category": "wildveg",
    "variety": "菌床栽培",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 12,
      "tempMeanMax": 20,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 6.5,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "scientificName": "Sparassis crispa",
      "taxonID": null,
      "family": "Sparassidaceae",
      "absTempMin": 5,
      "absTempMax": 28,
      "absRainMin": null,
      "absRainMax": null,
      "absPhMin": null,
      "absPhMax": null,
      "cropCategory": "mushrooms",
      "lifeForm": "fungus",
      "growthHabit": null,
      "lifeSpan": "perennial",
      "growthPeriodMin": 90,
      "growthPeriodMax": 150
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        9,
        11
      ]
    },
    "fertilizer": null,
    "yield": {
      "min": 30,
      "max": 80,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "yamabushitake",
    "heatType": "cool",
    "name": "ヤマブシタケ",
    "category": "wildveg",
    "variety": "菌床栽培",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1000,
      "tempMeanMin": 15,
      "tempMeanMax": 22,
      "rainfallMin": 800,
      "rainfallMax": 2000,
      "phMin": 5.5,
      "phMax": 6.5,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "scientificName": "Hericium erinaceus",
      "taxonID": null,
      "family": "Hericiaceae",
      "absTempMin": 8,
      "absTempMax": 28,
      "absRainMin": null,
      "absRainMax": null,
      "absPhMin": null,
      "absPhMax": null,
      "cropCategory": "mushrooms, medicinals & aromatic",
      "lifeForm": "fungus",
      "growthHabit": null,
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sow": [
        4,
        6
      ],
      "harvest": [
        8,
        11
      ]
    },
    "fertilizer": null,
    "yield": {
      "min": 40,
      "max": 100,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "agaricus",
    "heatType": "warm",
    "name": "アガリクス",
    "category": "wildveg",
    "variety": "菌床栽培",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 600,
      "tempMeanMin": 18,
      "tempMeanMax": 26,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 6.5,
      "phMax": 7.5,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "scientificName": "Agaricus blazei",
      "taxonID": null,
      "family": "Agaricaceae",
      "absTempMin": 12,
      "absTempMax": 32,
      "absRainMin": null,
      "absRainMax": null,
      "absPhMin": null,
      "absPhMax": null,
      "cropCategory": "mushrooms, medicinals & aromatic",
      "lifeForm": "fungus",
      "growthHabit": null,
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sow": [
        4,
        6
      ],
      "harvest": [
        7,
        10
      ]
    },
    "fertilizer": null,
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "kotake",
    "heatType": "cool",
    "name": "コウタケ",
    "category": "wildveg",
    "variety": "天然・半栽培",
    "conditions": {
      "latMin": 33,
      "latMax": 45,
      "elevMax": 1200,
      "tempMeanMin": 10,
      "tempMeanMax": 20,
      "rainfallMin": 1000,
      "rainfallMax": 2500,
      "phMin": 4.5,
      "phMax": 6,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "scientificName": "Sarcodon aspratus",
      "taxonID": null,
      "family": "Bankeraceae",
      "absTempMin": 5,
      "absTempMax": 25,
      "absRainMin": null,
      "absRainMax": null,
      "absPhMin": null,
      "absPhMax": null,
      "cropCategory": "mushrooms",
      "lifeForm": "fungus",
      "growthHabit": null,
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": null,
      "harvest": [
        9,
        11
      ]
    },
    "fertilizer": null,
    "yield": {
      "min": 5,
      "max": 20,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "tokiiro_hiratake",
    "heatType": "warm",
    "name": "トキイロヒラタケ",
    "category": "wildveg",
    "variety": "菌床栽培",
    "conditions": {
      "latMin": 30,
      "latMax": 45,
      "elevMax": 800,
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 5.5,
      "phMax": 6.5,
      "soilTypes": [
        "unknown"
      ],
      "waterNeed": "high",
      "continuousCropYears": 1,
      "scientificName": "Pleurotus djamor",
      "taxonID": null,
      "family": "Pleurotaceae",
      "absTempMin": 15,
      "absTempMax": 35,
      "absRainMin": null,
      "absRainMax": null,
      "absPhMin": null,
      "absPhMax": null,
      "cropCategory": "mushrooms",
      "lifeForm": "fungus",
      "growthHabit": null,
      "lifeSpan": "annual",
      "growthPeriodMin": 30,
      "growthPeriodMax": 60
    },
    "calendar": {
      "sow": [
        4,
        8
      ],
      "harvest": [
        6,
        10
      ]
    },
    "fertilizer": null,
    "yield": {
      "min": 50,
      "max": 120,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "chickpea",
    "heatType": "warm",
    "name": "ヒヨコマメ",
    "category": "legume",
    "variety": "一般品種",
    "conditions": {
      "latMin": 28,
      "latMax": 45,
      "elevMax": 800,
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "rainfallMin": 400,
      "rainfallMax": 800,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 3,
      "scientificName": "Cicer arietinum",
      "taxonID": null,
      "family": "Fabaceae",
      "absTempMin": 5,
      "absTempMax": 35,
      "absRainMin": 300,
      "absRainMax": 1000,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 90,
      "growthPeriodMax": 120
    },
    "calendar": {
      "sow": [
        3,
        5
      ],
      "harvest": [
        7,
        9
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 6
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "lentil",
    "heatType": "cool",
    "name": "レンズマメ",
    "category": "legume",
    "variety": "一般品種",
    "conditions": {
      "latMin": 33,
      "latMax": 52,
      "elevMax": 1000,
      "tempMeanMin": 12,
      "tempMeanMax": 24,
      "rainfallMin": 300,
      "rainfallMax": 700,
      "phMin": 5.5,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "low",
      "continuousCropYears": 4,
      "scientificName": "Lens culinaris",
      "taxonID": null,
      "family": "Fabaceae",
      "absTempMin": 2,
      "absTempMax": 32,
      "absRainMin": 250,
      "absRainMax": 1000,
      "absPhMin": 5,
      "absPhMax": 8,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "climbing",
      "lifeSpan": "annual",
      "growthPeriodMin": 80,
      "growthPeriodMax": 110
    },
    "calendar": {
      "sow": [
        3,
        4
      ],
      "harvest": [
        7,
        8
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 6
    },
    "yield": {
      "min": 80,
      "max": 180,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "mung_bean",
    "heatType": "warm",
    "name": "緑豆（ムング豆）",
    "category": "legume",
    "variety": "一般品種",
    "conditions": {
      "latMin": 25,
      "latMax": 38,
      "elevMax": 500,
      "tempMeanMin": 20,
      "tempMeanMax": 32,
      "rainfallMin": 500,
      "rainfallMax": 1200,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Vigna radiata",
      "taxonID": null,
      "family": "Fabaceae",
      "absTempMin": 15,
      "absTempMax": 38,
      "absRainMin": 400,
      "absRainMax": 1500,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "erect",
      "lifeSpan": "annual",
      "growthPeriodMin": 60,
      "growthPeriodMax": 90
    },
    "calendar": {
      "sow": [
        5,
        6
      ],
      "harvest": [
        8,
        9
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 6
    },
    "yield": {
      "min": 100,
      "max": 200,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "lima_bean",
    "heatType": "warm",
    "name": "ライマメ",
    "category": "legume",
    "variety": "一般品種",
    "conditions": {
      "latMin": 28,
      "latMax": 42,
      "elevMax": 600,
      "tempMeanMin": 18,
      "tempMeanMax": 28,
      "rainfallMin": 600,
      "rainfallMax": 1500,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Phaseolus lunatus",
      "taxonID": null,
      "family": "Fabaceae",
      "absTempMin": 12,
      "absTempMax": 35,
      "absRainMin": 500,
      "absRainMax": 2000,
      "absPhMin": 5.5,
      "absPhMax": 8,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "climbing",
      "lifeSpan": "annual",
      "growthPeriodMin": 70,
      "growthPeriodMax": 100
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        8,
        10
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 8
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  },
  {
    "id": "runner_bean",
    "heatType": "cool",
    "name": "ベニバナインゲン",
    "category": "legume",
    "variety": "一般品種",
    "conditions": {
      "latMin": 35,
      "latMax": 50,
      "elevMax": 800,
      "tempMeanMin": 14,
      "tempMeanMax": 22,
      "rainfallMin": 500,
      "rainfallMax": 1000,
      "phMin": 6,
      "phMax": 7.5,
      "soilTypes": [
        "loam",
        "sandy_loam",
        "unknown"
      ],
      "waterNeed": "medium",
      "continuousCropYears": 2,
      "scientificName": "Phaseolus coccineus",
      "taxonID": null,
      "family": "Fabaceae",
      "absTempMin": 5,
      "absTempMax": 28,
      "absRainMin": 400,
      "absRainMax": 1200,
      "absPhMin": 5.5,
      "absPhMax": 7.5,
      "cropCategory": "pulses (grain legumes)",
      "lifeForm": "herb",
      "growthHabit": "climbing",
      "lifeSpan": "annual",
      "growthPeriodMin": 70,
      "growthPeriodMax": 100
    },
    "calendar": {
      "sow": [
        4,
        5
      ],
      "harvest": [
        7,
        9
      ]
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 8
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": null,
    "risks": []
  }
];