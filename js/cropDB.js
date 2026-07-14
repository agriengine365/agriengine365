// ═══════════════════════════════════════════════════════════
//  CROP_DB — 作物データベース
//  223件 重複統合済み・calendar(sow/harvest)全件更新
//  最終更新: waterNeedLperSqmPerDay（1日あたり標準灌水量 L/m²/日）全223件追加
//  追加更新: yield/price NULL 145件を実勢推定値で補完（unit内に「実勢推定値」と明記）
// ═══════════════════════════════════════════════════════════
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
      ],
      "memo": {
        "seedling": "育苗箱に薄播き（乾籾150g/箱）。出芽温度30℃、緑化後は外気慣らしを段階的に行う",
        "transplant": "田植え適期は葉齢3.5〜4葉。深植えを避け、株間22〜25cm均一に",
        "manage": "分げつ期は浅水管理。出穂前20日頃から中干しで根を鍛え、出穂後は間断灌漑に切り替える",
        "harvest": "出穂後40〜45日、穂の85〜90％が黄化したら刈り取り。刈り遅れは胴割れの原因に"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 4,
      "K": 5,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "基肥はNPK一発肥料が便利。出穂前穂肥を忘れずに。",
      "perPlant": {
        "N": 0.5,
        "P": 0.2,
        "K": 0.3
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 30,
      "rowWidth": 60,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.043,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "地温15℃以上で播種。1穴2〜3粒、発芽後1本立ちに。排水良好な圃場を選ぶ",
        "manage": "開花期の水分が最重要。干ばつ時は灌水。結莢期〜肥大期に窒素固定が活発",
        "harvest": "葉が落ちて莢が茶色になったら収穫。脱粒前に早めに刈り取り、乾燥は水分13%以下に"
      }
    },
    "fertilizer": {
      "N": 2,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "根粒菌で自己窒素固定。N少なめ。リン酸・カリを重視。",
      "perPlant": {
        "N": 0.1,
        "P": 0.5,
        "K": 0.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 70,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.009,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "通常大豆より1〜2週間遅めに播種。畝立て栽培で排水を確保する",
        "manage": "摘心は本葉5〜6枚時に実施。倒伏しやすいので支柱か土寄せで対応",
        "harvest": "黒色が鮮やかになった完熟莢から順次収穫。枝豆として食べる場合は青莢のうちに"
      }
    },
    "fertilizer": {
      "N": 2,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "大豆と同様に根粒菌活用。N過多は蔓ぼけに注意。",
      "perPlant": {
        "N": 0.1,
        "P": 0.5,
        "K": 0.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 70,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.006,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上、6月下旬〜7月上旬が播種適期。1穴2粒、株間30cm",
        "manage": "開花後の高温乾燥に注意。多肥は禁物で茎葉の茂りすぎを防ぐ",
        "harvest": "莢の80%が褐色になったら収穫。一度に全部熟さないため順次収穫または機械刈り"
      }
    },
    "fertilizer": {
      "N": 4,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "根粒菌活用でN少なめ。排水良好なほ場を選ぶ。",
      "perPlant": {
        "N": 0.3,
        "P": 0.5,
        "K": 0.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 70,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.009,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "播種量は5〜7kg/10a。条播きで播種深さ3〜4cm。播種前にpH6.0〜7.0に石灰調整",
        "manage": "越冬前に麦踏みを2〜3回行い茎を強化。穂肥（幼穂形成期）は窒素過多に注意",
        "harvest": "穂が黄化して茎も乾燥したら収穫。雨が続く前に刈り取り、乾燥調整で水分14.5%以下に"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 8,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "穂肥（4月）が品質・収量に直結。過剰Nは倒伏リスク。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 6,
      "rowSpacing": 15,
      "rowWidth": 100,
      "linesPerRow": 6
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "小麦より早播きが基本。播種量6〜8kg/10a、条播き深さ3cm。排水不良圃場は高畦に",
        "manage": "麦踏みで耐倒伏性を高める。春の追肥タイミングは穂ばらみ期直前が効果的",
        "harvest": "穂が垂れて黄金色に変わり、粒が硬くなったら収穫。小麦より約2週間早い"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "小麦より早熟。N過多は倒伏しやすい。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 6,
      "rowSpacing": 15,
      "rowWidth": 100,
      "linesPerRow": 6
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "秋まき（10〜11月）。小麦より寒冷地向きで痩せた土地でも育つ",
        "manage": "耐寒性・耐酸性が強く手がかかりにくい。緑肥として利用されることも多い",
        "harvest": "穂が黄化して種が硬くなったら収穫。脱粒しやすいので早めに刈り取り"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "痩せ地・寒冷地に強い。緑肥・飼料用途にも。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 6,
      "rowSpacing": 15,
      "rowWidth": 100,
      "linesPerRow": 6
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "春まきまたは秋まき。発芽適温15〜20℃。肥沃な土壌を好む",
        "manage": "倒伏しやすいので密播きを避ける。追肥は分げつ期に1回",
        "harvest": "穂が垂れて種が硬くなったら刈り取り。燕麦として食用・飼料用に利用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "酸性土壌に耐える。燕麦として食用・飼料両用。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 6,
      "rowSpacing": 15,
      "rowWidth": 100,
      "linesPerRow": 6
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "播種量4〜5kg/10a、覆土1〜2cm。夏播き（6〜7月）と秋播き（8〜9月）の2作型がある",
        "manage": "生育が速いため中耕・除草は早期に。着花後は灌水を控えて倒伏を防ぐ",
        "harvest": "全体の8割程度の実が黒化したら収穫。刈り遅れると落粒が多くなるため適期収穫を徹底"
      }
    },
    "fertilizer": {
      "N": 4,
      "P": 6,
      "K": 6,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "痩せ地でも育つ。過剰Nは倒伏・品質低下につながる。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 30,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.005,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "5〜6月播種。条播き、株間15〜20cm。覆土1〜2cm。発芽温度20〜30℃",
        "manage": "雑草に弱いため初期除草を徹底。倒伏対策に土寄せを行う",
        "harvest": "穂が垂れて粒が固くなったら収穫。脱粒しやすいため早めに刈り取る"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 6,
      "K": 6,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "乾燥・痩せ地に強い。小規模・有機栽培向き。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.003,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上で播種。乾燥に強く生育期間が短い（90日程度）",
        "manage": "肥料は少量で十分。鳥害に注意して防鳥網を設置",
        "harvest": "穂が黄化したら収穫。乾燥後に脱穀して利用"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 5,
      "K": 5,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "短期間で収穫可能（約60日）。乾燥に非常に強い。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.003,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上で播種。湿地から乾燥地まで幅広く適応",
        "manage": "雑草との競合に注意。肥料は少量で十分",
        "harvest": "穂が黄化したら収穫。古来より救荒作物として重宝された"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 5,
      "K": 5,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "最も粗放栽培に強い雑穀。湿地にも適応。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.003,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "地温10℃以上になってから播種。1穴2粒播きで後に1本立ちに間引く",
        "manage": "雄穂出穂時に人工授粉（花粉をシルクに付ける）で着粒率を上げる。本葉5〜6枚で追肥",
        "harvest": "シルクが茶褐色になり、粒が硬くなったら完熟。子実用は完全黄熟後に機械収穫"
      }
    },
    "fertilizer": {
      "N": 14,
      "P": 8,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "追肥を2回に分けて。倒伏防止に中耕・土寄せを。",
      "perPlant": {
        "N": 2.5,
        "P": 1.5,
        "K": 1.8
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 35,
      "rowSpacing": 70,
      "rowWidth": 75,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.184,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "沖縄・南九州向け。春（2〜4月）に茎の節を植え付け",
        "manage": "高温多湿を好む。台風対策として倒伏防止の土寄せが重要",
        "harvest": "11〜4月に草丈2〜3mになったら根元から刈り取り"
      }
    },
    "fertilizer": {
      "N": 18,
      "P": 8,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "鹿児島・沖縄主体。カリ要求量が多い。株出し3年が基本。",
      "perPlant": {
        "N": 4.5,
        "P": 2.0,
        "K": 3.8
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 3.51,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "9〜10月播種。条播き3〜4kg/10a。発芽後は間引きながら越冬させる",
        "manage": "春の追肥（窒素）で菜の花の収量が上がる。アブラムシの早期防除が重要",
        "harvest": "菜の花として収穫する場合は蕾のうちに。種子採取は莢が黄褐色になったら刈り取る"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "越冬作物。春の追肥で収量アップ。菜の花油・飼料利用。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.004,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "育苗期間は30〜35日。発芽適温20℃。セル苗128穴トレイが標準",
        "seedling": "本葉4〜5枚、茎径5mm以上が定植適期。老化苗は活着不良の原因になる",
        "transplant": "株間35〜40cm。定植後すぐに灌水して活着を促す。春秋は防虫ネットで害虫を防ぐ",
        "manage": "外葉15〜16枚で球が巻き始める。追肥は定植後3〜4週間後に硫安で窒素補給",
        "harvest": "球頂を押して硬く締まったら収穫適期。割れ球・裂球は収穫遅れのサイン"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "結球前の追肥で球重アップ。過湿に注意。",
      "perPlant": {
        "N": 5.0,
        "P": 3.8,
        "K": 3.8
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 45,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 1.215,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "1穴3〜4粒播き、後に1本立ちに。深耕（30cm以上）と石や固まりのない土が必須",
        "manage": "間引きは本葉2〜3枚で2本、5〜6枚で1本立ちに。追肥は間引きのたびに施用",
        "harvest": "播種後60〜80日が目安。根の肩が土から出てきて直径6〜7cmになったら収穫"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "深耕必須（40cm以上）。石・硬盤があるとまた根になる。",
      "perPlant": {
        "N": 3.0,
        "P": 2.0,
        "K": 3.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.427,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種が細かいので砂と混ぜて条播き。覆土は薄く（3mm）、乾燥防止に新聞紙などで被覆",
        "manage": "発芽後は過湿・乾燥両方に注意。本葉3〜4枚で株間10cmに間引き",
        "harvest": "根の肩径3cm以上、播種後100〜120日が目安。裂根防止に急な灌水は避ける"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 15,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "発芽率が低いので鎮圧と水分管理が重要。分岐根防止に深耕。",
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.6
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.013,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "9月上旬が播種適期。セルトレイ128穴、1穴1〜2粒播き",
        "seedling": "草丈25〜30cm（鉛筆程度の太さ）が定植適期。極端な大苗は春に抽苔しやすい",
        "transplant": "株間10〜15cm。植え付け深さは根が隠れる程度。浅植えにすると球が大きくなる",
        "manage": "春の追肥は2月〜3月上旬が最後。それ以降の追肥は球の腐敗を招く",
        "harvest": "倒伏率80%以上になったら収穫。晴天を見計らって引き抜き、2〜3日畑で乾燥させる"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 12,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "3月の追肥（球肥大期）が収量を決める。肥料切れ注意。",
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.2
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.031,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種芋は60〜70g前後に切り分けて切り口を乾かしてから植え付け。株間30cm",
        "manage": "芽が出たら1〜2本に芽かき。土寄せは茎が20cmになったら実施（2回）。塊茎が露出すると緑化する",
        "harvest": "地上部が黄化して倒れたら収穫適期。掘り上げは晴天が2〜3日続いてから実施"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 12,
      "K": 20,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "カリ要求量が高い。石灰過多でそうか病発生注意。",
      "perPlant": {
        "N": 4.5,
        "P": 4.5,
        "K": 7.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 35,
      "rowSpacing": 70,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.735,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "seedling": "種芋から苗（挿し穂）を育てる。苗床は25〜30℃で管理。節2〜3つを土に挿す",
        "transplant": "株間30〜35cm、マルチ栽培で収量が上がる。つる返しを行い不定根の発生を防ぐ",
        "manage": "肥料は控えめに（窒素過多は葉ばかり繁茂する）。乾燥に強いが着芋期の水分は重要",
        "harvest": "葉が黄化し始めたら収穫適期。傷をつけないよう丁寧に掘り上げ、キュアリング（30℃・1週間）で甘みが増す"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 8,
      "K": 15,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "N過多でつる暴れ。やせ地でも栽培可。カリを多めに。",
      "perPlant": {
        "N": 2.5,
        "P": 3.3,
        "K": 6.3
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.495,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "育苗箱に播種。覆土は薄く（5mm程度）、発芽温度28℃前後で管理",
        "seedling": "本葉2〜3枚で間引き。第1花房が見えたら定植適期。老化苗は避ける",
        "transplant": "深植えにすると茎から不定根が出て活着が良くなる。支柱を立てて誘引準備",
        "manage": "第1花房以下の脇芽はすべて除去。誘引は週1回を目安に。着果後カルシウム欠乏（尻腐れ）に注意",
        "harvest": "果肩まで色づいたら収穫適期。完熟ほど糖度が上がる。朝の収穫が鮮度保持に有効"
      }
    },
    "fertilizer": {
      "N": 18,
      "P": 12,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "追肥は段ごと（第1花房着果後から）。カルシウム欠乏で尻腐れ。",
      "perPlant": {
        "N": 10.0,
        "P": 6.7,
        "K": 10.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 100,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 3.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上が必要。育苗トレイに1粒播き、発芽後は28〜30℃で管理",
        "seedling": "本葉2〜3枚、根がポット底に回り始めたら定植適期",
        "transplant": "株間50〜60cm。接木苗は接合部が土に埋まらないよう注意して定植",
        "manage": "親づる5〜6節で摘芯して子づるを伸ばす。うどんこ病・べと病の予防散布を定期実施",
        "harvest": "開花後7〜10日、果長20〜22cmで収穫。取り遅れると種が大きくなり食味が落ちる"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 12,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "収穫期は週1〜2回追肥が目安。水管理と肥培管理を連動。",
      "perPlant": {
        "N": 8.0,
        "P": 4.8,
        "K": 7.2
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 100,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 3.0,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "発芽温度30℃と高め。2月上旬から育苗開始。温床や電熱マットを活用",
        "seedling": "育苗期間は70〜80日と長い。本葉8〜9枚、第1花蕾が見えたら定植適期",
        "transplant": "株間50〜60cm。定植後は防風対策と灌水で活着を促す",
        "manage": "三本仕立てが基本。更新剪定（7月下旬〜8月）で秋ナスを狙う。乾燥させると果皮が硬くなる",
        "harvest": "ヘタ下の白い帯（白首）がくっきりしているうちに収穫。果皮にツヤがあるうちが食べごろ"
      }
    },
    "fertilizer": {
      "N": 22,
      "P": 12,
      "K": 20,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "多肥多水が基本。8月に切り戻し剪定で秋ナス収量アップ。",
      "perPlant": {
        "N": 12.0,
        "P": 6.7,
        "K": 11.1
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 100,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 2.625,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "ナスと同時期に育苗開始。発芽温度28〜30℃。育苗日数60〜70日",
        "seedling": "本葉8〜10枚、第1花蕾が見えたら定植適期。徒長苗は避ける",
        "transplant": "株間45〜50cm。支柱立てと誘引を同時に準備する",
        "manage": "第1果は小さいうちに除去して株の充実を優先。二本仕立てで管理が楽になる",
        "harvest": "緑果（未熟）でも収穫可能。完熟赤果は糖度・ビタミンCが大幅に増加する"
      }
    },
    "fertilizer": {
      "N": 18,
      "P": 12,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "カルシウム欠乏に注意（尻腐れ）。着果後の追肥が重要。",
      "perPlant": {
        "N": 8.0,
        "P": 5.3,
        "K": 8.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 45,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 1.215,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "酸性土壌に弱い。pH6.3〜7.0に石灰調整してから播種。条播き、株間3〜4cm",
        "manage": "本葉2〜3枚で間引き・除草。低温で甘みが増す。冬どりは不織布でトンネル保温",
        "harvest": "草丈20〜25cmで収穫。寒締め（霜を当てる）でシュウ酸が減り甘みが増す"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "酸性土に弱い。pH6.5〜7.0が適正。石灰施用を徹底。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 5,
      "rowSpacing": 10,
      "rowWidth": 90,
      "linesPerRow": 6
    },
    "yieldPerPlant": 0.001,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "高温では発芽率が落ちる（25℃以上で休眠）。夏播きは冷蔵庫で催芽処理してから播種",
        "seedling": "本葉4〜5枚で定植。根鉢を崩さないよう取り扱いに注意",
        "transplant": "株間25〜30cm。定植後は遮光して活着を促す。高温期は夕方定植が基本",
        "manage": "トンネル栽培で早出し可能。乾燥時は灌水でチップバーン防止",
        "harvest": "結球レタスは球を押して硬く締まったら収穫。葉レタスは外葉から随時かき取れる"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 12,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "高冷地（長野・群馬）が主産地。Tip burn対策にCa葉面散布。",
      "perPlant": {
        "N": 2.0,
        "P": 1.6,
        "K": 1.6
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 35,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.157,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種子は早めに使い切る（発芽力が1〜2年で低下）。条播き、覆土5mm",
        "manage": "軟白部を伸ばすため、3〜4回土寄せを行う。追肥は土寄せのたびに実施",
        "harvest": "葉ネギは草丈40〜50cmで随時収穫。根深ネギは軟白部20cm以上で順次収穫"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 10,
      "K": 18,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "土寄せごとに追肥。軟白部確保が品質の鍵。",
      "perPlant": {
        "N": 1.0,
        "P": 0.5,
        "K": 0.9
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "育苗期間は25〜30日。夏播きは高温で徒長しやすいため遮光ネットを使用",
        "seedling": "本葉4〜5枚で定植。徒長を防ぐため光を十分に当てる",
        "transplant": "株間50〜60cm。苗が小さいうちに定植するとゆっくり根が張り充実した株になる",
        "manage": "頂花蕾収穫後に追肥すると側枝の収穫が続けられる。アオムシ・コナガの早期防除が重要",
        "harvest": "花蕾が密で花が開く前に収穫。直径15cm前後が標準。遅れると黄化して商品価値が落ちる"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "花蕾形成期のN不足は収量減。ホウ素欠乏に注意（茎中空）。",
      "perPlant": {
        "N": 5.0,
        "P": 3.8,
        "K": 3.8
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.345,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "深耕（60cm以上）必須。直播きで株間10〜15cm。種は前日水に浸して発芽率を上げる",
        "manage": "間引きは本葉2〜3枚で株間10cmに。追肥は生育中期（7〜8月）に窒素を補給",
        "harvest": "播種後100〜120日、根長60〜80cmで収穫。掘り取りは折れないよう縦方向に丁寧に"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 15,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "深耕（60〜80cm）が必須。根が長くまっすぐになる。",
      "perPlant": {
        "N": 2.0,
        "P": 1.7,
        "K": 2.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.006,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上で播種。育苗の場合は3〜4月にポット播き",
        "seedling": "本葉2〜3枚で定植。寒さに当てると生育が止まるので注意",
        "transplant": "株間100cm以上。つるが伸びるスペースを十分確保する",
        "manage": "親づる5〜6節で摘芯、子づる2〜3本を伸ばす。人工授粉は午前中の開花直後に実施",
        "harvest": "着果後50〜55日、果梗（へた）がコルク化して表面に白粉が吹いたら収穫適期"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 10,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "つる性。整枝・摘心で着果数管理。N過多でつる暴れ。",
      "perPlant": {
        "N": 10.0,
        "P": 10.0,
        "K": 12.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 200,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 4.5,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "3〜4月に育苗。高接ぎ木栽培で連作障害を回避する",
        "seedling": "本葉3〜4枚で定植。根を傷めると活着不良になる",
        "transplant": "株間100〜120cm。マルチフィルムで地温を確保し活着を促す",
        "manage": "子づる2〜3本を伸ばし他は除去。人工授粉で確実に着果させる。着果節から11〜15節の果実を残す",
        "harvest": "受粉後35〜45日（品種による）。打音（ポンポン）と巻きひげの枯れ具合で判断"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 12,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "着果節位の管理が重要。過剰灌水で糖度低下。",
      "perPlant": {
        "N": 13.0,
        "P": 10.4,
        "K": 13.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 200,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 8.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温10℃以上で播種。1穴2粒、後に1本立ちに間引く。株間30〜35cm",
        "manage": "本葉5〜6枚で追肥・土寄せ。雄穂が出たら人工授粉で着粒率を上げる",
        "harvest": "ひげが出て20〜25日後、穂を押して乳液が出たら収穫適期。収穫後は速やかに調理する"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "追肥は草丈50〜60cm頃が目安。雄穂・雌穂の同調開花を管理。",
      "perPlant": {
        "N": 3.0,
        "P": 2.0,
        "K": 2.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 35,
      "rowSpacing": 70,
      "rowWidth": 75,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.282,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "9月下旬〜10月上旬に植え付け。鱗片を1片ずつ分けて尖った方を上にして植える",
        "manage": "越冬後3月に追肥。ムカゴ（花茎）は5月に摘除して球の肥大に栄養を集中させる",
        "harvest": "葉が黄化して倒れたら収穫。根を切らずに数株まとめて吊り干しで乾燥保存"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "りん片（種球）の品質が収量を左右。肥大期（3〜4月）の追肥重要。",
      "perPlant": {
        "N": 0.8,
        "P": 0.5,
        "K": 0.8
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.009,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上になってから植え付け（5月頃）。種ショウガを50〜60g片に分けて植える",
        "manage": "乾燥を嫌うため敷きわらで保湿。追肥は7月〜8月に2回実施",
        "harvest": "葉しょうが（8月〜9月）と根しょうが（10〜11月地上部枯れ後）で収穫時期が異なる"
      }
    },
    "fertilizer": {
      "N": 18,
      "P": 10,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "乾燥に弱い。マルチ＋適度な灌水が必須。種ショウガの品質選別が重要。",
      "perPlant": {
        "N": 5.5,
        "P": 3.0,
        "K": 5.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.12,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "気温が下がる8月下旬〜9月が播種適期。高温期は結球しにくい",
        "seedling": "本葉3〜4枚で定植。低温に当たると抽苔するので時期を守る",
        "transplant": "本葉4〜5枚で定植。株間35〜40cm。定植直後の高温・乾燥に注意",
        "manage": "追肥は定植後2〜3週おきに3回。球形成期の水分管理が品質を左右する",
        "harvest": "外葉ごと両手で包み、球頂を押して硬く締まったら収穫。裂球前に早め収穫"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "結球開始期の追肥が球重に直結。カルシウム欠乏（心腐れ）に注意。石灰施用徹底。",
      "perPlant": {
        "N": 4.0,
        "P": 3.0,
        "K": 3.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 45,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 1.62,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "ピーマンと同様に2月から育苗。発芽温度28℃以上が必要",
        "manage": "完熟すると辛みが強くなる。草丈が高くなるため支柱を早めに準備",
        "harvest": "緑〜赤に完熟するまで随時収穫可。乾燥唐辛子用は完熟後引き抜いて吊り干し"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "辛味成分カプサイシンは乾燥ストレスで増加。加工用途の場合は収穫適期管理が重要。",
      "perPlant": {
        "N": 7.0,
        "P": 4.7,
        "K": 7.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 45,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.223,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "早播きは晩霜に注意。トンネルやハウスで保温して4月から播種可能。株間25〜30cm",
        "manage": "本葉2〜3枚で間引き。開花〜結莢期に水分が足りないと収量が落ちる",
        "harvest": "莢が膨らみ、豆が莢の幅の8割を占めたら収穫適期。遅れると豆が硬くなる"
      }
    },
    "fertilizer": {
      "N": 3,
      "P": 8,
      "K": 8,
      "baseDressing": 1,
      "topDressing": 0,
      "notes": "根粒菌でN自己固定。追肥は原則不要。莢肥大期（開花2〜3週後）の水分確保が品質の鍵。",
      "perPlant": {
        "N": 0.2,
        "P": 0.5,
        "K": 0.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 70,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.036,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "育苗に1〜2年かかる多年生野菜。定植1年目は収穫せず株の充実に専念する",
        "transplant": "クラウンを3〜4月に定植。植え溝を深く掘って植え付け",
        "manage": "収穫後の残茎は冬枯れまで残して光合成させる。毎年春に堆肥と追肥を施用",
        "harvest": "萌芽後、茎径1cm以上、草丈25〜30cmになったら土際から切り取る。1株から3〜5本が目安"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "定植後2〜3年は収穫せず株を充実させる。追肥は収穫終了後（株充実期）が重要。",
      "perPlant": {
        "N": 5.0,
        "P": 3.3,
        "K": 5.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 150,
      "rowWidth": 120,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.36,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "4〜5月播種、株間10cm。定植1年目は収穫せず株の充実を優先",
        "manage": "収穫後は追肥（窒素系）で速やかな再生を促す。数年ごとに株分けして更新",
        "harvest": "草丈25〜30cmで株元から2cm残して刈り取る。年4〜5回収穫可能"
      }
    },
    "fertilizer": {
      "N": 18,
      "P": 10,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "収穫後すぐに追肥することで次回芽吹きが促進される。年3〜5回収穫可能。",
      "perPlant": {
        "N": 0.6,
        "P": 0.3,
        "K": 0.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.011,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温15〜20℃。好光性種子なので覆土なしで播種。育苗に60〜70日かかる",
        "seedling": "本葉4〜5枚で定植。育苗期間は長め（70〜90日）",
        "transplant": "株間30〜40cm。定植後は乾燥防止に敷きわらと灌水を徹底",
        "manage": "土寄せで茎の軟白化が進み食味が向上。ホウ素欠乏（茎の亀裂）に注意",
        "harvest": "草丈50〜60cmで外葉から収穫。または株ごと引き抜いて出荷"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "長野県が全国生産量の約70%を占める。高冷地での夏秋栽培が主流。水分要求量が高い。",
      "perPlant": {
        "N": 3.0,
        "P": 2.3,
        "K": 2.3
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.72,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "地温15℃以上（5月上旬〜）に植え付け。子芋や孫芋を種芋として使用",
        "manage": "土寄せを2〜3回行い芋の肥大を促す。乾燥に弱いため梅雨明け後は灌水を欠かさず",
        "harvest": "地上部が枯れたら収穫。掘り上げ後は子芋・孫芋に分けて保存。霜には弱い"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 20,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "土寄せごとに追肥。高温多湿を好む。乾燥が続くと子いもが肥大しない。",
      "perPlant": {
        "N": 5.0,
        "P": 3.3,
        "K": 6.7
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 70,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.63,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "ムカゴや切り種芋を4〜5月に植え付け。深耕（60〜90cm）が収量を左右する",
        "manage": "支柱に蔓を誘引。乾燥時は灌水し、芋の肥大期（夏〜秋）に追肥を忘れずに",
        "harvest": "地上部が黄化・枯れた後に収穫。霜が降りる前に掘り上げて砂中保存すると長持ち"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 18,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "深耕（60〜80cm）が必須。パイプ法や波板法で形状をそろえる技術が普及。",
      "perPlant": {
        "N": 5.0,
        "P": 3.3,
        "K": 7.5
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.81,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春播き（3〜4月）と秋播き（9月）が基本。株間10cm。半日陰でも育つ",
        "manage": "ひょろひょろと伸びやすいため遮光して軟白化させると品質向上。乾燥を嫌う",
        "harvest": "草丈20〜25cmで外葉から収穫。または株元から刈り取り再生を促す"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "半日陰でも栽培可能。軟白化（遮光）で高品質化。施設栽培で周年出荷。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.004,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "条播き、株間10〜15cm。春播きは抽苔に注意。9月播きの秋冬どりが品質良好",
        "manage": "間引きは本葉3〜4枚で株間5cmに。摘芯後の脇芽伸長で長期収穫できる",
        "harvest": "草丈20〜25cmで株ごと収穫、または先端を摘み取って側枝を伸ばして再収穫"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "鍋野菜として秋冬需要が高い。摘み取り収穫で長期収穫が可能。施設栽培で品質向上。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.004,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "芽かき・摘果は着果後2〜3週以内に行う。1花叢1果が基本。袋かけで害虫・病気・色づきをコントロール",
        "harvest": "品種ごとの満開後日数が目安（ふじは160〜180日）。ヨードデンプン反応で熟度を確認"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "摘花・摘果で果実肥大。カルシウム施用でビターピット防止。",
      "perPlant": {
        "N": 180.0,
        "P": 90.0,
        "K": 150.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 45.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "摘果は生理落果後に実施。葉25〜30枚に1果が目安。カイガラムシ・ハダニの防除を徹底",
        "harvest": "ハウスみかんは9月〜、露地は11〜12月。皮が橙色に着色したら収穫適期。糖度は11以上を目標に"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 8,
      "K": 12,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "夏肥（7月）が翌年の花芽分化に影響。傾斜地の水はけが品質を左右。",
      "perPlant": {
        "N": 150.0,
        "P": 80.0,
        "K": 120.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 48.0,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "manage": "芽かき・新梢管理・摘粒を徹底。開花前のジベレリン処理（50ppm）で種なし化。うどんこ病・べと病の防除が必須",
        "harvest": "着色が進んで果粉が出始めたら収穫適期。糖度計で16以上を確認してから収穫"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "房づくり・ジベレリン処理でシャインマスカットなど高品質化。",
      "perPlant": {
        "N": 120.0,
        "P": 80.0,
        "K": 120.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 11.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "仕上げ摘果は満開後40〜45日。葉30〜35枚に1果の目安。袋かけは摘果後すぐに実施",
        "harvest": "果実が品種特有の色になり、果肉がわずかに柔らかくなったら収穫。早朝収穫で品質保持"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 7,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "摘果（仕上げ摘果）が品質の鍵。1果あたり葉30〜40枚が目安。",
      "perPlant": {
        "N": 150.0,
        "P": 105.0,
        "K": 150.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 60.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "誘引・棚仕立てで受光量を確保。交差受粉が必須（単一品種では結実しない）。摘果は葉20〜25枚に1果",
        "harvest": "果梗が簡単に取れるようになったら収穫適期。収穫後すぐが最も美味しく長期保存には向かない"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 7,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "人工授粉が必須（自家不和合性）。棚仕立てで管理作業が楽になる。",
      "perPlant": {
        "N": 150.0,
        "P": 87.5,
        "K": 125.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 82.5,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "甘柿は放任でも可だが、結果母枝の更新剪定で安定収量を維持。渋柿は収穫後に脱渋処理",
        "harvest": "果皮がオレンジ色になり、果肉が少し軟化したら収穫適期。霜が降りると品質が落ちる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "隔年結果しやすい。摘蕾・摘花・摘果で安定生産。",
      "perPlant": {
        "N": 200.0,
        "P": 120.0,
        "K": 200.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 600,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 81.0,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "ランナーから育苗するのが一般的。8〜9月に採苗",
        "seedling": "育苗期間は6〜8週間。クラウンを埋めない浅植えが鉄則",
        "transplant": "9月中旬〜10月上旬に定植。クラウン（根元の茎部）が土に埋まらないよう浅植えに",
        "manage": "ランナーは随時除去。第1花房着果後に追肥。ハウス栽培では12月から加温開始",
        "harvest": "果実全体が赤く着色し、光沢が出たら収穫適期。ヘタのすぐ下まで赤くなってから"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 10,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ランナー管理で採苗。花芽分化には低温・短日処理が重要。",
      "perPlant": {
        "N": 1.0,
        "P": 1.0,
        "K": 1.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 25,
      "rowSpacing": 50,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.188,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "pHを4.5〜5.5に強酸性管理（ピートモス投入）。根が浅いのでマルチングで乾燥防止",
        "harvest": "色づき後1週間程度おいて完熟させてから収穫。房の中でも熟度差があるため選果しながら収穫"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "強酸性土（pH4.5〜5.5）が適正。ピートモス等で土壌改良必須。",
      "perPlant": {
        "N": 40.0,
        "P": 25.0,
        "K": 40.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 200,
      "rowWidth": 200,
      "linesPerRow": 1
    },
    "yieldPerPlant": 2.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "花粉が少ない品種は受粉樹が必須。生理落果後に摘果して1果あたりの葉枚数を確保",
        "harvest": "果皮が品種特有の色になり、押すとわずかに弾力が出てきたら収穫適期"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "開花が早く晩霜リスクが高い。剪定は収穫後〜落葉期。",
      "perPlant": {
        "N": 150.0,
        "P": 90.0,
        "K": 150.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 45.0,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "manage": "雌雄異株なので雄株が必須（雌10:雄1）。人工授粉か受粉樹を近くに植える。棚仕立てが基本",
        "harvest": "霜が降りる前に収穫し、常温（15℃前後）で後熟させる。リンゴと一緒に置くとエチレンで早く追熟"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "雌雄異株。受粉用の雄株が必要。棚仕立てで管理。",
      "perPlant": {
        "N": 150.0,
        "P": 100.0,
        "K": 150.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 33.75,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "棚仕立てが基本。摘果と袋かけで品質向上。受粉樹が必要",
        "harvest": "果実が品種固有の大きさになったら収穫。追熟させて食べる"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 7,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "収穫後2〜3週間の追熟が必須。山形県が国内生産の約70%。人工授粉が必要。",
      "perPlant": {
        "N": 150.0,
        "P": 87.5,
        "K": 125.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 67.5,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "剪定で樹形を整える。受粉樹を近くに植えると着果が安定する",
        "harvest": "果皮が赤〜紫に色づき少し柔らかくなったら収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "自家不和合性の品種が多く、授粉樹の選定が重要。山梨・長野が主産地。",
      "perPlant": {
        "N": 150.0,
        "P": 90.0,
        "K": 150.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 35.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "雨による裂果防止にビニル傘かけが有効。受粉樹が必要。摘果は軽め（着果多め）で",
        "harvest": "完熟すると落果しやすい。糖度が上がり果皮が品種特有の深い色になったら収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "山形県が全国生産量の約75%。収穫期の雨が致命的なため雨除けハウスが普及。",
      "perPlant": {
        "N": 150.0,
        "P": 90.0,
        "K": 150.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 25.5,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "暖地向き。寒冷地では防寒対策。袋かけで品質を向上させる",
        "harvest": "5〜6月に果皮がオレンジ色になったら収穫。収穫後の品質低下が早い"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "長崎・千葉が主産地。袋かけで品質向上。冬季の開花期の低温が最大リスク。",
      "perPlant": {
        "N": 200.0,
        "P": 120.0,
        "K": 200.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 42.0,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "manage": "隔年結果になりやすい。成り年は摘果、裏年は肥培管理を強化してバランスを保つ",
        "harvest": "黄色に着色したら収穫。青ゆず（9〜10月）は香りが強く加工用に。完熟（11〜12月）は絞り汁用に"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "高知県馬路村が有名。実生から結実まで約18年かかるため接ぎ木苗が必須。",
      "perPlant": {
        "N": 200.0,
        "P": 120.0,
        "K": 200.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 35.0,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "manage": "棚やフェンスに誘引。暖地向き。寒冷地では鉢植えで冬越し",
        "harvest": "果実が落下したものが完熟のサイン。皮にしわが寄るまで追熟させると甘い"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "沖縄・九州南部が主産地。棚仕立てで管理。自然落果したものが完熟の目安。",
      "perPlant": {
        "N": 100.0,
        "P": 66.7,
        "K": 100.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 8.4,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "山の縁部・切り株の根元などに自生。根伏せで増殖可能。3〜4月に根を10〜15cmに切って植える",
        "manage": "促成栽培は12〜1月に根株を掘り上げて温室に持ち込む（温度20〜25℃）",
        "harvest": "新芽が15〜20cmに伸びたら根元から切り取る。頂芽のみ収穫し脇芽を残すと再収穫できる"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "促成栽培（伏せ込み）で2月出荷も可能。株の疲弊防止に収穫は2〜3芽まで。",
      "perPlant": {
        "N": 2.0,
        "P": 1.5,
        "K": 2.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 100,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.24,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sow": "根茎（地下茎）の移植で増殖。根茎は秋〜早春に採取して10cmに切り分けて植え付け",
        "manage": "繁殖力が強いため管理されたエリアで栽培。翌年以降も毎年収穫できる多年生",
        "harvest": "先端が開く直前の巻き葉（コゴミ状）を収穫。固くなる前の15〜20cmが食べ頃"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "根茎での繁殖。定植後2〜3年は株の充実に専念。除草管理が重要。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.175,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "地下茎の株分けで増殖。湿った半日陰が適地。一度定植すれば毎年収穫できる",
        "manage": "花茎（フキノトウ）収穫後は葉が展開するまでそのまま管理。除草と水分管理が主作業",
        "harvest": "フキノトウは花が開く前の2〜3月に収穫。葉柄（フキ）は5〜7月に外葉から随時収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "根茎で増殖。半日陰を好む。収穫後の追肥で翌年の株充実を図る。",
      "perPlant": {
        "N": 2.0,
        "P": 1.2,
        "K": 2.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.945,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "根茎を3〜4月に植え付け。半日陰・腐植土が多い場所を好む",
        "manage": "ミョウガは株が増えると収量も上がる多年生。毎年秋に古い茎を整理する程度でよい",
        "harvest": "花穂が土から顔を出した直後が収穫適期。開花すると辛みが強くなるため早めに収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "半日陰で良く育つ。根茎で繁殖。定植後2年目から本格収穫。",
      "perPlant": {
        "N": 2.0,
        "P": 1.2,
        "K": 2.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.18,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "水わさびは渓流水（水温10〜18℃）が必須。畑わさびは半日陰で腐植土の多い冷涼地が適地",
        "manage": "清流の水温と水質管理が品質を左右する。追肥は少量を月1回が基本",
        "harvest": "わさびは2〜3年かけて根茎を肥大させてから収穫。根茎が2〜3cm径になったら随時収穫可"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "清涼な流水（沢ワサビ）または冷涼地の畑作。水温13〜15℃が適正。",
      "perPlant": {
        "N": 2.0,
        "P": 1.3,
        "K": 2.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 50,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.041,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sow": "原木（クヌギ・コナラ）に種駒を打ち込む（3〜4月）。菌床栽培はオガクズ培地に種菌接種",
        "manage": "原木は伏せ込みで菌を蔓延させる（1〜2年）。湿度70〜80%の半日陰で管理",
        "harvest": "傘が7〜8分開きで収穫。完全に開くと胞子が飛んで風味が落ちる"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "原木（クヌギ・ナラ）または菌床栽培。肥料不要。ほだ木の品質が収量を決める。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 20,
      "rowWidth": 20,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.016,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "菌床を準備（10〜12月）。または冬の雑木林でエノキ（榎）の木を確認",
        "manage": "菌床栽培は温度5〜10℃・遮光で細長く白く育てる",
        "harvest": "傘が2〜3cmになったら収穫。天然物は冬に榎の木の根元に発生"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "施設内菌床栽培が主流。低温（5〜10℃）・高CO2環境で白い細長い茎に仕上げる。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 10,
      "rowWidth": 10,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.006,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "天然ものは老大木の根元に発生。栽培は菌床（コナラオガクズ）または原木に菌を植え付ける",
        "manage": "菌床栽培は15〜20℃、湿度90%前後で管理。原木栽培は発生まで3〜5年かかる",
        "harvest": "傘がまだ内側に巻いているうちに収穫。株全体をまとめて切り取る"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "ミズナラ・クヌギが適木。原木接種から3年後に収穫開始。菌床なら1年目から収穫可。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 20,
      "rowWidth": 20,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.011,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "山地・林縁の自生地確認。コシアブラはウコギ科の落葉樹",
        "harvest": "春の芽吹き直後の若芽を収穫。タラノメより風味が上品"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "タラノメと並ぶ春山菜の王者。促成栽培で早出し可能。芽吹き量は株齢に依存。",
      "perPlant": {
        "N": 2.0,
        "P": 1.5,
        "K": 2.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.175,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sow": "湿った山地・渓谷沿いの自生地確認。綿毛の付いた胞子葉を確認",
        "harvest": "葉が開く前の若い胚芽葉を収穫。綿毛を取り除き、塩漬けまたは乾燥させて保存"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "半日陰・湿潤地を好む。根茎での繁殖。定植後2〜3年は株充実に専念。天日干し加工で単価が上がる。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.045,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "菌床または原木（サクラ・ナラ等）への植菌。秋に仕込む",
        "manage": "保湿が重要。菌床は毎日霧吹きで湿らせる",
        "harvest": "傘が開く前の粘液がたっぷりついた状態で収穫"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "ブナ・ナラの原木または菌床で栽培。ぬめり成分がきのこの中でも特徴的。湿度管理が重要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 10,
      "rowWidth": 10,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.002,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "菌床を準備（9〜11月）。温度15〜20℃で管理",
        "manage": "湿度80〜90%を保つ。光は弱光でよい",
        "harvest": "傘が1.5〜2cmになったら株ごと収穫"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 0,
      "topDressing": 0,
      "notes": "施設内菌床栽培で周年出荷が可能。長野県が全国トップ生産量。温度・湿度・CO2濃度の精密管理が重要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
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
    ],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 10,
      "rowWidth": 10,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.009,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温15〜20℃。高温期は冷蔵処理で催芽後播種",
        "manage": "外葉から順次摘み取り。直射日光を避けると葉色が安定する",
        "harvest": "外葉から順次収穫。株を残すと長期間楽しめる"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 12,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "追肥は生育中期に1〜2回分施。窒素過多でチップバーン発生注意。",
      "perPlant": {
        "N": 2.0,
        "P": 1.6,
        "K": 1.6
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 200,
      "max": 350,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 25,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.15,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "周年栽培可能。真夏と厳冬以外はほぼいつでも播種できる。条播き、株間4cm",
        "manage": "間引きは本葉1〜2枚で2〜3cm間隔に。追肥は1〜2回、液肥が効果的",
        "harvest": "草丈20〜25cmで収穫。軟らかく食べやすい若い段階での収穫が品質のポイント"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 10,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "生育期間が短いため元肥中心。追肥は収穫2週前まで。",
      "perPlant": {
        "N": 0.2,
        "P": 0.2,
        "K": 0.2
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 150,
      "max": 250,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 5,
      "rowSpacing": 10,
      "rowWidth": 90,
      "linesPerRow": 6
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "周年栽培可能だが、高温と寒さに注意。株間10〜15cm。直播きまたはセル育苗",
        "manage": "肥料食いで生育が速い。週1回の液肥施用が効果的。防虫ネット必須",
        "harvest": "草丈20〜25cmで収穫。株ごと引き抜くか外葉からかき取る。花蕾が出る前に収穫"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 10,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "生育が速いため元肥中心。追肥は本葉3〜4枚時に1回。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 150,
      "max": 250,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 25,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.15,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春秋まき。点播きまたはすじ播き。発芽率が落ちやすいので新しい種を使う",
        "manage": "間引きながら育てる。摘心すると脇芽が増えて収穫量が上がる",
        "harvest": "草丈20cm程度で摘み取り収穫。花が咲く前に収穫を終える"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "摘み取り収穫のため追肥を継続。収穫ごとに追肥。",
      "perPlant": {
        "N": 0.2,
        "P": 0.1,
        "K": 0.2
      }
    },
    "yield": {
      "min": 1000,
      "max": 1800,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 250,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.04,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "条播き、薄播きで筋蒔き。生育が早く周年栽培向き",
        "manage": "べと病・白斑病に注意。過湿に弱いため排水管理を徹底する",
        "harvest": "草丈15〜20cmのやわらかい段階で収穫。大きくなると辛みが増す"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 10,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "生育が速く元肥中心。密植栽培では追肥量を抑える。",
      "perPlant": {
        "N": 0.1,
        "P": 0.1,
        "K": 0.1
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 200,
      "max": 350,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 5,
      "rowSpacing": 10,
      "rowWidth": 90,
      "linesPerRow": 6
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "秋まき（9〜10月）。発芽適温20〜25℃",
        "manage": "耐寒性が強く冬の管理は少なくて済む。春に抽苔する前に収穫",
        "harvest": "葉が十分に展開したら外葉から収穫。漬物用は春先の大株で"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "漬菜用。元肥をやや多めにし、追肥は生育中期に1〜2回。",
      "perPlant": {
        "N": 0.4,
        "P": 0.3,
        "K": 0.3
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 150,
      "max": 250,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.3,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "秋まき主体。辛みが強く少量の摂取で十分",
        "manage": "間引きながら育てる。害虫はアブラムシに注意",
        "harvest": "若葉を摘み取り。葉が展開しすぎると辛みが増す"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "生育は比較的速い。追肥は生育中期に1回程度。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 150,
      "max": 250,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "育苗後定植が一般的。発芽適温20〜25℃",
        "manage": "外葉から収穫を続けることで長期間楽しめる。耐寒性が強い",
        "harvest": "外葉から順次摘み取り。霜に当たると甘みが増す"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "長期収穫のため追肥を定期的に。葉色を見て追肥量を調整。",
      "perPlant": {
        "N": 4.0,
        "P": 3.0,
        "K": 3.0
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.3,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上で播種。高温を好む夏野菜",
        "manage": "草丈50cmで摘心。花が咲く前に収穫を続ける（種に毒性あり）",
        "harvest": "葉と茎の先端（15〜20cm）を摘み取り。粘りが特徴的"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "高温性で生育旺盛。摘み取り収穫のため追肥を継続的に施す。",
      "perPlant": {
        "N": 1.5,
        "P": 1.0,
        "K": 1.2
      }
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 50,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.08,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "球根を秋（9〜10月）に植え付け。浅めに植える",
        "manage": "追肥は月1回程度。球根で増えるので毎年植え替えが必要",
        "harvest": "草丈30〜40cmで葉を収穫。甘みが強く薬味に最適"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "分けつ旺盛。追肥は分けつ促進のため2〜3回に分施。",
      "perPlant": {
        "N": 0.5,
        "P": 0.3,
        "K": 0.4
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 250,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "球根を秋に植え付け。野原にも自生する",
        "manage": "手がかかりにくい。多年草として毎年収穫できる",
        "harvest": "草丈20〜30cmで葉を収穫。細葉で香りが強い"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "小ネギ類。追肥は生育中期に1〜2回。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.015,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽に2〜3週間かかる。播種前に一晩水に浸すと発芽が揃う",
        "manage": "肥料切れすると葉色が悪くなる。月1回の追肥が目安",
        "harvest": "外葉から順次収穫。株を残すと長期間収穫できる"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "生育期間が長い。追肥は月1回程度、収穫後に施す。",
      "perPlant": {
        "N": 0.5,
        "P": 0.3,
        "K": 0.4
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 800,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "大玉と同様に育苗。生育旺盛なので株間は広めに",
        "seedling": "本葉2〜3枚で鉢上げ。徒長しないよう光を十分に当てる",
        "transplant": "株間60〜70cm。根鉢を崩さず深植えにして活着を促す",
        "manage": "脇芽かきを定期的に。裂果はかん水の均一化で防止",
        "harvest": "完熟（真っ赤）になったら収穫。房どりも可能"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "長期収穫型。追肥は果実肥大期から定期的に。窒素過多で空洞果注意。",
      "perPlant": {
        "N": 8.0,
        "P": 5.3,
        "K": 8.0
      }
    },
    "yield": {
      "min": 4000,
      "max": 6000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 100,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 1.5,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温25〜30℃。ピーマンより高温が必要",
        "manage": "ピーマンと同様の管理。着色に時間がかかる（開花後70〜90日）",
        "harvest": "品種固有の色（赤・黄・橙）に完全着色してから収穫"
      }
    },
    "fertilizer": {
      "N": 18,
      "P": 12,
      "K": 18,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "長期栽培。追肥を着果ごとに継続。カルシウム欠乏に注意。",
      "perPlant": {
        "N": 9.0,
        "P": 6.0,
        "K": 9.0
      }
    },
    "yield": {
      "min": 3000,
      "max": 5000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 900,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 45,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 1.2,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温25〜30℃。ピーマンより小型で育てやすい",
        "manage": "ピーマンと同様の管理。摘果は不要で着果させたまま収穫",
        "harvest": "果長5〜7cmで収穫。緑色のうちに収穫が基本"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "長期収穫型。追肥は収穫開始後から2週間ごとに。",
      "perPlant": {
        "N": 7.0,
        "P": 4.7,
        "K": 7.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 45,
      "rowSpacing": 90,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.6,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上で播種。1穴3〜4粒播き、発芽後2本立ちに",
        "transplant": "根が繊細なので直播きが基本。移植の場合はポット育苗で根を傷めずに",
        "manage": "草丈50cmで1回目の追肥。整枝は下葉を定期的に除去するだけでよい",
        "harvest": "開花後4〜5日、長さ7〜8cmで収穫。収穫遅れは株を弱らせる"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "高温性。着果後追肥を継続。窒素過多で草勢過繁茂注意。",
      "perPlant": {
        "N": 3.0,
        "P": 2.5,
        "K": 3.0
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 70,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.5,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温25〜30℃。種の端を少し削ると発芽が揃う",
        "manage": "親づる摘心で子づるを伸ばす。ネットに誘引して立体栽培",
        "harvest": "果皮の緑色が薄くなり始めたら収穫。過熟すると割れる"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "つる性。追肥は着果開始後から定期的に。マグネシウム欠乏注意。",
      "perPlant": {
        "N": 5.0,
        "P": 3.3,
        "K": 4.0
      }
    },
    "yield": {
      "min": 3000,
      "max": 5000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 250,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 150,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 3.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温25〜30℃。ポット育苗で本葉2〜3枚で定植",
        "manage": "株が大きくなるので株間1m以上確保。人工授粉で着果を安定させる",
        "harvest": "開花後5〜7日、長さ20〜25cmで収穫。大きくなりすぎると食味が落ちる"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "生育が旺盛。追肥は着果後から2週間ごとに施す。",
      "perPlant": {
        "N": 8.0,
        "P": 5.3,
        "K": 6.4
      }
    },
    "yield": {
      "min": 3000,
      "max": 5000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 200,
      "max": 350,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 80,
      "rowSpacing": 100,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 3.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温28〜30℃。高級品種は接ぎ木苗使用が基本",
        "seedling": "本葉3〜4枚で定植。根が繊細なので根鉢を絶対に崩さない",
        "transplant": "株間1.5m。ハウス栽培が一般的。温度管理が品質を左右する",
        "manage": "子づる2本仕立て。人工授粉後に着果数を制限して品質を上げる",
        "harvest": "果梗のひびと甘い香りで完熟を確認。ネットメロンは網目が発達したら"
      }
    },
    "fertilizer": {
      "N": 18,
      "P": 12,
      "K": 18,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "着果後の追肥が重要。果実肥大期にカリを増量。",
      "perPlant": {
        "N": 15.0,
        "P": 10.0,
        "K": 15.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 200,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 2.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温25〜30℃。ポット育苗で本葉2〜3枚で定植",
        "manage": "蔓が旺盛なので棚や支柱を準備。人工授粉で着果を安定させる",
        "harvest": "果皮が白い粉をふいてきたら収穫適期。貯蔵性が高い"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "大果。追肥は着果確認後から2〜3回施す。",
      "perPlant": {
        "N": 12.0,
        "P": 8.0,
        "K": 10.0
      }
    },
    "yield": {
      "min": 4000,
      "max": 6000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 100,
      "max": 200,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 200,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 5.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上で直播き。1穴3粒播き",
        "manage": "蔓あり品種は支柱を準備。開花期の水切れに注意",
        "harvest": "開花後10〜15日、莢がやや膨らんだら収穫"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "根粒菌があるため窒素は少なめ。着莢後にカリ中心の追肥。",
      "perPlant": {
        "N": 0.3,
        "P": 0.5,
        "K": 0.5
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 50,
      "rowWidth": 70,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.2,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "秋まき。1穴1〜2粒播き。播きすぎると徒長しやすい",
        "manage": "草丈50cmで摘心。アブラムシが多発しやすいので早期防除",
        "harvest": "莢が下向きに垂れ、表面に黒い線が出てきたら収穫適期"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 10,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "窒素固定能あり。リン酸・カリ中心の施肥。着莢後に追肥。",
      "perPlant": {
        "N": 0.5,
        "P": 1.0,
        "K": 0.8
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 800,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 25,
      "rowSpacing": 60,
      "rowWidth": 70,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.4,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "秋まき主体。霜に当たると枯れるので地域に応じて時期調整",
        "manage": "草丈30cmで支柱立て。開花期の追肥で着莢が増える",
        "harvest": "莢が緑色で豆が膨らんだら収穫。鮮度落ちが早い"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "根粒菌で窒素固定。元肥のリン酸をやや多めに。",
      "perPlant": {
        "N": 0.3,
        "P": 0.5,
        "K": 0.5
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 800,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 40,
      "rowWidth": 70,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.15,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上で播種。殻を剥いて播種。深さ3〜4cm",
        "manage": "子房柄が地面に刺さるよう土寄せ。開花期の水切れは厳禁",
        "harvest": "葉が黄化してきたら試し掘り。莢の網目がはっきりしたら収穫適期"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 10,
      "K": 8,
      "baseDressing": 0.8,
      "topDressing": 0.2,
      "notes": "地中結実。石灰施用が重要（カルシウム補給）。追肥は少量。",
      "perPlant": {
        "N": 0.4,
        "P": 0.8,
        "K": 0.6
      }
    },
    "yield": {
      "min": 300,
      "max": 500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 600,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 60,
      "rowWidth": 70,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.25,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "1穴4〜5粒播き。発芽後2回に分けて1本立ちに間引く",
        "manage": "本葉5〜6枚で2回目の間引きと追肥。土が硬いと又根になる",
        "harvest": "根径7〜8cmで収穫。抽苔前に収穫。冬は土中置きで貯蔵可"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "根部肥大期にカリを確保。",
      "perPlant": {
        "N": 3.0,
        "P": 2.0,
        "K": 3.0
      }
    },
    "yield": {
      "min": 4500,
      "max": 6000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 80,
      "max": 150,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.8,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春・秋まき。すじ播きまたは点播き。発芽適温15〜20℃",
        "manage": "間引きながら育てる。生育期間が短いので追肥は1〜2回",
        "harvest": "根径5〜6cmで収穫。大きくなると味が落ちる"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "生育期間短い。元肥中心。根部肥大期のカリ確保が重要。",
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.5
      }
    },
    "yield": {
      "min": 2500,
      "max": 3500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 150,
      "max": 250,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.15,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種藕を4〜5月に植え付け。水深10〜30cmの田圃で栽培",
        "manage": "水位管理が重要。初期は浅水、夏は深水で高温障害を防ぐ",
        "harvest": "葉が枯れてきた秋から収穫。泥の中から丁寧に掘り取る"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "水田栽培。元肥は代かき前に施用。追肥は葉が展開後に。",
      "perPlant": {
        "N": 6.0,
        "P": 4.0,
        "K": 6.0
      }
    },
    "yield": {
      "min": 1500,
      "max": 2200,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 80,
      "rowSpacing": 120,
      "rowWidth": 120,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.8,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "1粒に複数種子入り。発芽後に1本立ちに間引く",
        "manage": "本葉4〜5枚で追肥。乾燥すると根が割れるので水分管理が重要",
        "harvest": "根径6〜7cmで収穫。大きくなると繊維が硬くなる"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 10,
      "K": 15,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "根部肥大期にカリを十分確保。窒素過多で葉ばかり茂る。",
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.9
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.3,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種芋を5月に植え付け。暖地向きで沖縄・九州が主産地",
        "manage": "高温多湿を好む。マルチ栽培で地温を確保する",
        "harvest": "葉が黄化して枯れてきたら掘り取り。乾燥させてから利用"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "根茎肥大期（7〜9月）の追肥が重要。カリを多めに施す。",
      "perPlant": {
        "N": 5.0,
        "P": 3.3,
        "K": 6.0
      }
    },
    "yield": {
      "min": 1000,
      "max": 1800,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.3,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種芋（コンニャク芋）を4〜5月に植え付け。深さ10cm程度",
        "manage": "3年かけて大きな芋に育てる。毎年掘り取って翌春に植え直す",
        "harvest": "葉が枯れてきたら掘り取り。大きな芋はコンニャク加工へ"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "多年生。球茎肥大期の追肥が重要。カリを重視。",
      "perPlant": {
        "N": 8.0,
        "P": 5.3,
        "K": 10.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 150,
      "max": 300,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 1.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "桃と同様の管理。果皮に毛がなく雨に当たると裂果しやすい",
        "harvest": "果皮が品種固有の色になり少し柔らかくなったら収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 7,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "モモに準ずる施肥。果実着色期のカリ確保が重要。",
      "perPlant": {
        "N": 150.0,
        "P": 105.0,
        "K": 150.0
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 900,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 50.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "剪定で樹形を整える。受粉のため異品種を近くに植える",
        "harvest": "イガが割れて自然に落下したら収穫。拾い忘れると虫に食われる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "元肥中心。追肥は開花後（6月）と果実肥大期（8月）に。",
      "perPlant": {
        "N": 200.0,
        "P": 120.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 600,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 700,
      "rowWidth": 700,
      "linesPerRow": 1
    },
    "yieldPerPlant": 20.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "剪定は花後に実施。うどんこ病や黒星病に注意",
        "harvest": "梅干し用は青梅（6月）、梅酒用は少し熟した実で収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "収穫後（7月）の追肥が翌年の花芽分化に影響。",
      "perPlant": {
        "N": 150.0,
        "P": 90.0,
        "K": 150.0
      }
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 30.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "寒さに弱いので防寒対策。剪定で樹形を管理する",
        "harvest": "緑色のうちに収穫（8〜10月）。黄色くなると香りが落ちる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ユズに準ずる。隔年結実防止のため施肥管理を安定させる。",
      "perPlant": {
        "N": 200.0,
        "P": 120.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 900,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 15.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "大分県が主産地。病害虫防除と剪定で管理",
        "harvest": "緑色のうちに収穫（8〜10月）。スダチより大きい"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "カンキツ類準用。元肥と収穫後追肥が基本。",
      "perPlant": {
        "N": 200.0,
        "P": 120.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 20.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "寒さに弱いので防寒対策が重要。剪定は込み枝を除く程度に",
        "harvest": "果皮が緑から黄色に変わってきたら収穫。年間を通じて数回収穫できる"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "年数回収穫。施肥は春・夏・秋の3回分施が基本。",
      "perPlant": {
        "N": 180.0,
        "P": 120.0,
        "K": 180.0
      }
    },
    "yield": {
      "min": 1500,
      "max": 2500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 25.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "摘果で品質向上。寒さに弱いので暖地向き",
        "harvest": "12月〜1月に果皮がオレンジ色になったら収穫"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ミカン類準用。元肥は収穫後〜春前に施す。",
      "perPlant": {
        "N": 150.0,
        "P": 80.0,
        "K": 120.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 40.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "不知火（しらぬい）の選抜種。摘果と施肥管理が品質を左右する",
        "harvest": "3月頃に収穫。収穫後に貯蔵して糖度を高めてから出荷"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ミカン類準用。糖度向上のため着色期のカリを重視。",
      "perPlant": {
        "N": 150.0,
        "P": 80.0,
        "K": 120.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 900,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 45.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "自然落果しにくいので剪定と摘果で管理",
        "harvest": "4〜5月に収穫。酸味と甘みのバランスが良い"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ミカン類準用。大果のため施肥量はやや多め。",
      "perPlant": {
        "N": 150.0,
        "P": 80.0,
        "K": 120.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 200,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 35.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "樹勢が強く比較的手がかかりにくい。剪定で樹形を整える",
        "harvest": "5〜6月に果皮が黄色くなったら収穫。酸味が強い"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ミカン類準用。春肥・夏肥・秋肥の3回施肥が基本。",
      "perPlant": {
        "N": 150.0,
        "P": 80.0,
        "K": 120.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 200,
      "max": 350,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 35.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "2年枝に結果するので収穫後の古枝を切り取る。支柱で誘引",
        "harvest": "果実が赤く色づいて簡単に取れるようになったら収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ブルーベリーに準ずる酸性土壌好み。追肥は新梢伸長期に。",
      "perPlant": {
        "N": 40.0,
        "P": 24.0,
        "K": 40.0
      }
    },
    "yield": {
      "min": 300,
      "max": 600,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 200,
      "rowWidth": 200,
      "linesPerRow": 1
    },
    "yieldPerPlant": 1.5,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "トゲあり品種は取り扱いに注意。翌年の結果枝を誘引しておく",
        "harvest": "果実が完全に黒くなってから収穫。甘みが強くなる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "丈夫で施肥要求は中程度。元肥と収穫後追肥が基本。",
      "perPlant": {
        "N": 40.0,
        "P": 24.0,
        "K": 40.0
      }
    },
    "yield": {
      "min": 300,
      "max": 600,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 200,
      "rowWidth": 200,
      "linesPerRow": 1
    },
    "yieldPerPlant": 2.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "剪定で樹形管理。一季なりと二季なりで管理が異なる",
        "harvest": "果実が垂れ下がり皮が割れ始めたら食べごろのサイン"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "生育期間長い。追肥は果実発育中に2〜3回に分施。",
      "perPlant": {
        "N": 200.0,
        "P": 133.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 1000,
      "max": 1800,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 600,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 10.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "乾燥に強く手がかかりにくい。剪定で樹形を整える",
        "harvest": "果皮が赤く色づき表面がやや乾いた感じになったら収穫"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "施肥要求は少なめ。元肥中心。追肥は結実確認後に少量。",
      "perPlant": {
        "N": 160.0,
        "P": 120.0,
        "K": 160.0
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 900,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 8.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "山地・林縁の自生地確認。秋の果実の場所を把握しておく",
        "manage": "棚やフェンスに誘引して栽培も可能。人工授粉で着果を安定させる",
        "harvest": "果実が紫色になり自然に割れたら収穫。種が多いが果肉は甘い"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "つる性木本。施肥は少量で十分。元肥中心。",
      "perPlant": {
        "N": 80.0,
        "P": 60.0,
        "K": 80.0
      }
    },
    "yield": {
      "min": 200,
      "max": 500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 2.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "異品種を近くに植えると着果が安定。剪定で樹形を整える",
        "harvest": "テーブルオリーブは緑色のうちに、オイル用は完熟の黒色になってから収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "乾燥に強い。窒素過多で花芽分化が悪くなる。元肥重視。",
      "perPlant": {
        "N": 200.0,
        "P": 120.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 900,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 15.0,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "memo": {
        "sow": "実がなる木の周辺を事前に確認。落下した実を拾うための場所の把握を",
        "manage": "山地に自生するので栽培管理は不要。クマとの鉢合わせに注意",
        "harvest": "外皮が黒くなり自然に落下した実を拾う。拾ったらすぐに水洗いして乾燥"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "大木になる。元肥中心。追肥は開花後と果実肥大期に。",
      "perPlant": {
        "N": 300.0,
        "P": 180.0,
        "K": 240.0
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 600,
      "rowSpacing": 800,
      "rowWidth": 800,
      "linesPerRow": 1
    },
    "yieldPerPlant": 10.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "込み枝を整理して通気性を確保。ひこばえは随時除去する",
        "harvest": "果実が総苞から外れるようになったら収穫。乾燥させてから利用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "低木性。施肥要求は中程度。元肥と春の追肥が基本。",
      "perPlant": {
        "N": 80.0,
        "P": 60.0,
        "K": 80.0
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 400,
      "rowWidth": 400,
      "linesPerRow": 1
    },
    "yieldPerPlant": 3.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "暖地・乾燥地向き。受粉樹が必要。寒冷地では栽培困難",
        "harvest": "外皮が割れて乾燥したら収穫。乾燥させてから殻を割って利用"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 7,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "乾燥地向き。開花前の施肥が重要。追肥は結実後に。",
      "perPlant": {
        "N": 150.0,
        "P": 105.0,
        "K": 150.0
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 5.0,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "memo": {
        "sow": "イチョウ大木の周辺を確認。臭気があるので素手で触らないようゴム手袋を準備",
        "manage": "公共のイチョウ並木は採取禁止の場合あり。事前に確認を",
        "harvest": "落下した実を素早く拾い、外皮を洗い流す。乾燥後に殻を割って使用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "イチョウの実。大木のため1本あたりの施肥量は多い。元肥中心。",
      "perPlant": {
        "N": 400.0,
        "P": 250.0,
        "K": 400.0
      }
    },
    "yield": {
      "min": 150,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 700,
      "rowSpacing": 800,
      "rowWidth": 800,
      "linesPerRow": 1
    },
    "yieldPerPlant": 8.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "沖縄・南九州向け。高温多湿を好む。鉢植えで温室管理も可能",
        "harvest": "果皮が黄緑〜黄色になったら収穫。追熟させて食べる"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 20,
      "baseDressing": 0.4,
      "topDressing": 0.6,
      "notes": "熱帯性。生育旺盛で施肥要求量が多い。追肥を月1回継続。",
      "perPlant": {
        "N": 200.0,
        "P": 150.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 200,
      "rowWidth": 200,
      "linesPerRow": 1
    },
    "yieldPerPlant": 15.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "沖縄・宮崎等の暖地向け。ハウス栽培が主流。摘果で品質向上",
        "harvest": "果皮が品種固有の色になり甘い香りがしてきたら収穫"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 15,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "花芽分化期（乾燥ストレス期）の施肥は避ける。収穫後に元肥。",
      "perPlant": {
        "N": 300.0,
        "P": 200.0,
        "K": 300.0
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 500,
      "rowSpacing": 600,
      "rowWidth": 600,
      "linesPerRow": 1
    },
    "yieldPerPlant": 20.0,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "manage": "沖縄向け。高温を好む。株から出るひこばえで増やせる",
        "harvest": "果実全体が黄色くなり甘い香りがしてきたら収穫"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 20,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "カリ要求量が高い。追肥は吸芽発生後から定期的に。",
      "perPlant": {
        "N": 15.0,
        "P": 10.0,
        "K": 20.0
      }
    },
    "yield": {
      "min": 2000,
      "max": 3500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 1.5,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        12,
        1
      ],
      "harvest": [
        2,
        3
      ],
      "memo": {
        "sow": "雪解け直後から自生地（畦道・川岸等）を定期的に巡回",
        "harvest": "花芽がまだ閉じている状態で収穫。開いてしまうと苦みが強くなる"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "フキの花蕾。フキと同様の施肥で管理。元肥を収穫後に施す。",
      "perPlant": {
        "N": 2.0,
        "P": 1.2,
        "K": 2.0
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "畑または山地の自生地確認。軟白栽培で白い茎を育てる",
        "manage": "多年草。株が大きくなったら株分けして増やす",
        "harvest": "春の若芽（30〜40cm）を収穫。遮光して軟白化すると食味が良い"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "多年生。軟白栽培では土寄せ前後に追肥。元肥を春・秋に施す。",
      "perPlant": {
        "N": 4.0,
        "P": 2.4,
        "K": 4.0
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 100,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.5,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "湿った林縁・沢沿いの自生地を確認。群生地が見つかれば毎年同じ場所に出る",
        "harvest": "葉がクルクル巻いた状態（こごみ状態）で摘み取る。展開すると食感が悪い"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "シダ類。収穫後の追肥が翌年の萌芽に影響。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "清流沿い・湿地の自生地を確認。赤いミズ（ウワバミソウ）が採取対象",
        "harvest": "新芽の柔らかい茎と葉を摘み取る。5〜6月が最も美味しい"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "沢沿い植物。施肥は少量で管理。収穫後に追肥。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "深山の林縁に自生。自生地の把握と山行計画の立案",
        "harvest": "葉が完全に展開する前の若芽を収穫。強い香りがあり山菜の王とも呼ばれる"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "モミジガサ類。山菜栽培標準施肥で管理。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "沢沿い・湿った林内の自生地を確認",
        "harvest": "葉が開く前の若芽を摘み取る。天ぷらやお浸しに向く"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "山菜類。元肥中心。収穫後に追肥して翌年の収量を確保。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        6
      ],
      "memo": {
        "sow": "野原・林縁の自生地を確認。棘があるので作業着と手袋を準備",
        "harvest": "若葉・若芽を春に収穫。棘をある程度除去してから調理"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "多年生。施肥は少量。元肥と収穫後追肥で管理。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        2,
        3
      ],
      "harvest": [
        3,
        5
      ],
      "memo": {
        "sow": "畦道・野原の自生地確認。よく踏まれた場所にも多い",
        "harvest": "柔らかい若芽を手で摘み取る。草餅・天ぷら・乾燥してお茶にも"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 6,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "繁殖力旺盛。施肥は少量で十分。元肥中心で管理。",
      "perPlant": {
        "N": 0.5,
        "P": 0.3,
        "K": 0.4
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        2,
        3
      ],
      "harvest": [
        3,
        5
      ],
      "memo": {
        "sow": "畦道・草地の自生地確認。球根ごと掘り取るので道具を持参",
        "harvest": "球根と葉の両方が利用できる。小型スコップで丁寧に掘り取る"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "小型ネギ類。施肥は少量。元肥と追肥各1回で管理。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.3
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.01,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "北海道・東北の冷涼な林内の自生地確認。クマと鉢合わせに注意",
        "harvest": "4〜5月に葉が展開する前後で収穫。強いニンニク臭が特徴"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "生育遅い多年生。元肥を充実させ追肥は収穫後に少量。",
      "perPlant": {
        "N": 0.5,
        "P": 0.3,
        "K": 0.5
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        6,
        7
      ],
      "harvest": [
        7,
        8
      ],
      "memo": {
        "sow": "北海道・東北の林縁・草地の自生地を確認",
        "harvest": "葉が展開する前の若芽を摘み取る。特定外来生物に指定される前に採取が盛んだった"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "山菜類。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "空き地・林縁の自生地確認。大型になるので早期に若芽を収穫",
        "harvest": "30cm以下の若い茎を折り取る。外皮を剥いてアク抜き後に調理"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "繁殖力強い。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 0.8
      }
    },
    "yield": {
      "min": 300,
      "max": 600,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 80,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        2,
        3
      ],
      "harvest": [
        3,
        4
      ],
      "memo": {
        "sow": "畦道・土手の自生地確認。スギナの胞子茎がツクシ",
        "harvest": "頭の胞子袋がまだ閉じている状態で採取。袴（節）を取り除いてから調理"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 4,
      "K": 5,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "スギナの胞子茎。地下茎で繁殖。施肥はごく少量。",
      "perPlant": {
        "N": 0.2,
        "P": 0.1,
        "K": 0.2
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.005,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        11,
        12
      ],
      "harvest": [
        12,
        2
      ],
      "memo": {
        "sow": "水辺・湿地の自生地確認。春の七草のひとつ",
        "harvest": "冬から早春の若芽を摘み取る。根ごと引き抜いて泥を洗う"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "水湿地性。追肥は生育中期に1〜2回施す。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
    },
    "yield": {
      "min": 300,
      "max": 600,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        2,
        3
      ],
      "harvest": [
        3,
        5
      ],
      "memo": {
        "sow": "清流・湧き水のある場所を確認。汚染水のある場所は採取禁止",
        "harvest": "茎の先端の柔らかい部分を摘み取る。流水で十分に洗ってから食べる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "クレソン。水辺栽培。施肥は少量で十分。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 60,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        2,
        3
      ],
      "harvest": [
        3,
        5
      ],
      "memo": {
        "sow": "砂浜の海岸線の自生地確認。海岸保全地域での採取は注意",
        "harvest": "若葉と茎を春に収穫。天ぷらが最もポピュラーな食べ方"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "海浜植物。砂質土壌向き。施肥は少量で管理。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 50,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "山地・林縁の自生地確認。新芽と果実の両方が食用になる",
        "harvest": "新芽は春（4〜5月）に、果実は秋（9〜10月）に収穫"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "つる性木本。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "野原・林縁・湿地の自生地確認。ノカンゾウと見分ける",
        "harvest": "春の若芽を摘み取る。夏のつぼみも食用になる"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ユリ科山菜。根茎植物。収穫後の追肥が翌年の収量に影響。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 50,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        2,
        3
      ],
      "harvest": [
        3,
        4
      ],
      "memo": {
        "sow": "落葉樹林の群生地確認。保護区や国立公園内は採取禁止に注意",
        "harvest": "花が咲く前の若葉と花を収穫。球根（片栗粉の原料）は採取しない"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 4,
      "K": 5,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "球根性山菜。生育期間が短く施肥は少量。元肥中心。",
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.5
      }
    },
    "yield": {
      "min": 30,
      "max": 80,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 60,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "山地・林縁の自生地確認。大型になるが若芽が美味",
        "harvest": "30〜40cmの若い芽を折り取る。灰汁が強いので十分なアク抜きが必要"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 10,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "ウドの野生種。ウドに準じた施肥で管理。",
      "perPlant": {
        "N": 3.0,
        "P": 1.8,
        "K": 3.0
      }
    },
    "yield": {
      "min": 300,
      "max": 600,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 100,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.5,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        3,
        5
      ],
      "memo": {
        "sow": "竹林の下見と地主への許可取り。孟宗竹は3〜4月、真竹は5〜6月が旬",
        "manage": "竹林に入る際はイノシシやマムシに注意",
        "harvest": "地面から頭が少し出た状態が最も柔らかい。専用のクワで根元から掘り取る"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 8,
      "K": 12,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "竹林管理。元肥は秋〜冬に施す。親竹への施肥が翌年の筍に影響。",
      "perPlant": {
        "N": 30.0,
        "P": 16.0,
        "K": 24.0
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 300,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.5,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        5,
        6
      ],
      "harvest": [
        6,
        7
      ],
      "memo": {
        "sow": "北海道・東北の笹薮の自生地確認。クマの好物なので注意",
        "harvest": "タケノコ状の若芽を地際から折り取る。外皮を剥いてそのまま食べられる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "チシマザサの若竹。タケノコに準じた施肥で管理。",
      "perPlant": {
        "N": 20.0,
        "P": 12.0,
        "K": 16.0
      }
    },
    "yield": {
      "min": 200,
      "max": 500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 100,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        5,
        6
      ],
      "harvest": [
        6,
        7
      ],
      "memo": {
        "sow": "北海道・東北の高地の自生地確認。ネマガリタケの別名でも呼ばれる",
        "harvest": "若芽を根元から折り取る。皮を剥いて煮ると柔らかくなる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "山地性ササ。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 20.0,
        "P": 12.0,
        "K": 16.0
      }
    },
    "yield": {
      "min": 200,
      "max": 500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 100,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        2,
        3
      ],
      "harvest": [
        3,
        4
      ],
      "memo": {
        "sow": "林内の自生地確認。枝を折ると良い香りがする",
        "harvest": "若葉と枝を春に採取。枝は爪楊枝の最高品に使われる。乾燥してお茶にも"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "低木性。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 30.0,
        "P": 20.0,
        "K": 30.0
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 150,
      "rowWidth": 150,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "自生地（山際・林縁）を事前に確認。トゲがあるので手袋必須",
        "manage": "春の若葉（木の芽）、初夏の青い実、秋の赤い実と季節ごとに楽しめる",
        "harvest": "木の芽は展開直後に収穫。青い実は6〜7月に。赤くなると皮が乾燥して利用しやすい"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "低木性。元肥と収穫後追肥が基本。花山椒・実山椒とも同様。",
      "perPlant": {
        "N": 30.0,
        "P": 18.8,
        "K": 30.0
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 150,
      "rowSpacing": 200,
      "rowWidth": 200,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "山地の自生地確認。黄色い内皮が特徴で漢方薬の原料",
        "harvest": "春〜初夏に樹皮を剥いで内皮を採取。乾燥させて漢方素材として利用"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "樹木性。大木になるため1本あたりの施肥量は多い。元肥中心。",
      "perPlant": {
        "N": 200.0,
        "P": 133.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        5,
        6
      ],
      "harvest": [
        6,
        7
      ],
      "memo": {
        "sow": "山地・林縁の自生地確認。猫が好む植物として有名",
        "harvest": "虫えい果（虫こぶ）は6〜7月に収穫。果実は秋に熟したら収穫。果実酒に向く"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "つる性木本。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 30.0,
        "P": 18.8,
        "K": 30.0
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "林縁・雑木林の自生地確認。秋の果実の場所を覚えておくと春に新芽が採りやすい",
        "harvest": "芽吹き直後の若い芽と葉を収穫。苦みがあるがお浸しや炒め物に合う"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "アケビの新芽。アケビに準じた施肥で管理。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "湿った林内・沢沿いの群生地確認。クサソテツはコゴミとも呼ばれる",
        "harvest": "葉が巻いた状態のうちに収穫。アク抜き不要で食べやすい山菜"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "シダ類。コゴミに準じた施肥で管理。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "山地・林縁の自生地確認。黄色い花で有名な低木",
        "harvest": "展開前の若芽を摘み取る。少量採取にとどめ、植物を守る"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "バラ科低木。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 60,
      "rowSpacing": 100,
      "rowWidth": 100,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.02,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "深山の沢沿い・林縁の自生地確認。トゲに触れるとかぶれるので注意",
        "harvest": "若芽・若葉を採取。素手で触れないよう手袋を着用。ゆでるとトゲが無害化"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "草本性山菜。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 0.8,
        "P": 0.5,
        "K": 0.6
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 50,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "山地・林縁の湿った場所の自生地確認",
        "harvest": "葉が展開する前の若芽を収穫。ウルイとも呼ばれ食べやすい山菜"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ユリ科山菜。根茎植物。収穫後の追肥が重要。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.04,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        3,
        4
      ],
      "harvest": [
        4,
        5
      ],
      "memo": {
        "sow": "湿った林内・沢沿いの自生地確認。傘のような独特の葉形が目印",
        "harvest": "傘のように広がる前の若芽を摘み取る。天ぷらや和え物に向く"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "キク科山菜。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.5
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "山地・林縁の自生地確認。アスパラガスに似た風味がある",
        "harvest": "若い蔓の先端部を収穫。アスパラのように下から折って採る"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ユリ科つる性。施肥は少量。元肥と追肥1回で管理。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
    },
    "yield": {
      "min": 30,
      "max": 80,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "東北・北海道の林縁の自生地確認。ミヤマトウキとも呼ばれる",
        "harvest": "若芽を春に収穫。香りが強く独特の風味がある山菜"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ミズに近縁の山菜。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 1.0,
        "P": 0.6,
        "K": 1.0
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 50,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.04,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "原木（コナラ等）または菌床への植菌。秋〜冬に準備",
        "manage": "保湿管理が重要。菌床は定期的に霧吹きで湿らせる",
        "harvest": "傘が十分に展開したら収穫。鮮やかなグレーが食欲をそそる"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "菌床・原木栽培。培地自体に養分を含み施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 3000,
      "max": 5000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 800,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 20,
      "rowWidth": 20,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        10,
        11
      ],
      "harvest": [
        1,
        12
      ],
      "memo": {
        "sow": "菌床ブロックを購入して準備。10〜11月が最適な仕込み時期",
        "manage": "温度15〜20℃・湿度90%以上を保つ。霧吹きで毎日保湿",
        "harvest": "傘が開きすぎる前に収穫。収穫後は菌床を保湿して2回目の発生を促す"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "菌床栽培。培地自体に養分を含み施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 4000,
      "max": 6000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 15,
      "rowWidth": 15,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "原木（クワ・ニワトコ等）または菌床への植菌",
        "manage": "高温多湿を好む。雨後に多く発生する",
        "harvest": "傘が展開して耳形になったら収穫。乾燥保存が可能"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "原木・菌床栽培。施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 15,
      "rowWidth": 15,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        5,
        6
      ],
      "harvest": [
        7,
        9
      ],
      "memo": {
        "sow": "原木（コナラ・クヌギ等）への植菌は5〜6月。または菌床を購入",
        "manage": "原木栽培は2〜3年後から発生。乾燥しないよう定期的に散水",
        "harvest": "傘が展開しきる前に収穫。鮮やかな黄色が美しいうちに食べる"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "菌床・原木栽培。施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 3000,
      "max": 5000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 800,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 15,
      "rowWidth": 15,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "memo": {
        "sow": "松林の環境確認と山主への許可取り。シロ（発生場所）を把握しておく",
        "manage": "採取は地元ルールを守る。シロを壊さないよう松葉を元に戻す",
        "harvest": "傘が開く前のつぼみ状態が最高品質。根元から丁寧に抜き取る"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "天然菌根菌。アカマツ林と共生。施肥・栽培不可。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 5,
      "max": 20,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 20000,
      "max": 50000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        10,
        11
      ],
      "harvest": [
        12,
        2
      ],
      "memo": {
        "sow": "トリュフ菌を接種した苗木（ナラ・ハシバミ等）を植栽。結実まで5〜15年",
        "manage": "土壌を乾燥させないよう管理。犬や豚を使って発生場所を探す方法もある",
        "harvest": "冬季に地中で熟成。甘い香りがしてきたら地面を掘って収穫"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "菌根菌。宿主樹木（クヌギ等）と共生。施肥は宿主樹木への施肥のみ。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 1,
      "max": 5,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 30000,
      "max": 80000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 400,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        7,
        9
      ],
      "memo": {
        "sow": "採取可能なウルシ木の場所を確認。漆液は5〜10年生の木から採取",
        "manage": "ウルシはかぶれの原因になるので作業時は完全防護で",
        "harvest": "7〜9月に樹皮に傷をつけて採取。プロの漆掻き職人の技術が必要"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "漆。樹木性。大木になるため1本あたりの施肥量は多い。元肥中心。",
      "perPlant": {
        "N": 200.0,
        "P": 125.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 5,
      "max": 15,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 15000,
      "max": 30000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "秋または春に播種。光発芽種子なので覆土は薄く",
        "manage": "乾燥に強く手がかかりにくい。花が咲いたら随時摘み取る",
        "harvest": "花が満開になったら摘み取り。乾燥させてハーブティーに"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "施肥は少なめで風味が良くなる。窒素過多で香りが弱まる。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.3
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "ランナーでよく広がるため鉢植えまたは区画管理推奨。挿し木での増殖が簡単",
        "manage": "花が咲く前に摘芯してこんもり仕立てると香りが強まる。地下茎の広がりをセメント板などで制御",
        "harvest": "開花前の葉が最も香りが強い。茎ごと切り取り使用量に合わせて随時収穫"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "繁殖力旺盛。追肥は収穫後に施す。窒素過多で香りが弱まる。",
      "perPlant": {
        "N": 0.5,
        "P": 0.3,
        "K": 0.4
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春播きまたは株分けで増やす。レモンの香りが爽やかなシソ科のハーブ",
        "manage": "摘心で株を充実させる。花が咲く前に収穫量が最大になる",
        "harvest": "若い葉と茎を随時収穫。生葉のままティーやサラダに使用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "ミントに準ずる。施肥は少量で香りが良くなる。",
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.5
      }
    },
    "yield": {
      "min": 400,
      "max": 800,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "挿し木・株分けで増殖が容易。種からは発芽が遅い。水はけの良い土壌を好む",
        "manage": "過湿に弱いため水のやり過ぎに注意。剪定後の枝を挿し木で株を更新できる",
        "harvest": "周年収穫可能。開花前の若い枝を摘み取る。木質化した古い茎は使わない"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "木本性多年生。施肥は少なめで管理。春と収穫後に少量追肥。",
      "perPlant": {
        "N": 2.0,
        "P": 1.5,
        "K": 2.0
      }
    },
    "yield": {
      "min": 300,
      "max": 600,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.2,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種まきまたは株分けで増やす。小粒な種なので覆土は薄く",
        "manage": "乾燥に強く手がかかりにくい。開花後に剪定して株を若返らせる",
        "harvest": "茎の先端を随時収穫。開花前が香りのピーク"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 5,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "小低木性。施肥は少量で香りを維持。窒素過多で香りが弱まる。",
      "perPlant": {
        "N": 0.8,
        "P": 0.6,
        "K": 0.8
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種まきまたは株分けで増やす。光発芽種子なので覆土は薄く",
        "manage": "乾燥に強い。花が咲く前に収穫量が多い",
        "harvest": "茎の先端（10〜15cm）を随時収穫。乾燥させると香りが増す"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "地中海系ハーブ。施肥は少量で管理。",
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.5
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 25,
      "rowSpacing": 35,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.08,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種まきまたは挿し木で増やす。発芽適温20〜25℃",
        "manage": "過湿に弱いので水はけを確保。開花後に剪定で株を更新",
        "harvest": "若い葉を随時収穫。乾燥させると保存性が上がり香りも安定"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "木本性多年生。施肥は少量。春に元肥、収穫後に少量追肥。",
      "perPlant": {
        "N": 1.5,
        "P": 1.1,
        "K": 1.5
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 50,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "挿し木が一般的。種まきは発芽率が低く時間がかかる",
        "manage": "乾燥に強く過湿に弱い。開花後すぐに剪定して翌年の花を充実させる",
        "harvest": "開花直前〜満開時に茎ごと刈り取り。ドライフラワーやポプリに"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 5,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "木本性。施肥は少量で管理。窒素過多で徒長・病害リスク。",
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.5
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上が必要。4〜5月播き、または育苗してから定植。株間25〜30cm",
        "manage": "花穂が出たら早めに摘芯して葉の収穫期間を延ばす。水分に敏感で低温（15℃以下）で黒変する",
        "harvest": "草丈20〜30cmになったら上部1/3を摘み取る。開花前が香りが最も強い"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "1年草。追肥は生育中期に1〜2回。摘芯後の追肥が収量増。",
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.4
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽率が低めのため多めに播く。好光性種子なので覆土は薄く（2mm以下）",
        "manage": "摘芯で側枝を増やし長期収穫。アブラムシ・ハダニの発生に注意",
        "harvest": "青じそは本葉10〜15枚以降から随時収穫。穂じそ・花じそは開花時に摘み取る"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "摘み取り収穫のため追肥を継続。収穫ごとに追肥。",
      "perPlant": {
        "N": 0.4,
        "P": 0.3,
        "K": 0.3
      }
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春または秋に播種。多年草なので定植後は長く楽しめる",
        "manage": "乾燥に強く手がかかりにくい。花が終わったら花茎を切り取る",
        "harvest": "開花後に花・根・葉を収穫。乾燥させてハーブティーや免疫強化に利用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "多年生薬草。施肥は少量で管理。窒素過多で根の薬効成分が低下。",
      "perPlant": {
        "N": 1.5,
        "P": 1.1,
        "K": 1.5
      }
    },
    "yield": {
      "min": 200,
      "max": 500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 50,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "湿った日陰の自生地確認。庭に自生していることも多い",
        "harvest": "花が咲く5〜6月に葉と茎を収穫。乾燥させてドクダミ茶に"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "強健で施肥要求は少ない。元肥のみで管理可能。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.3
      }
    },
    "yield": {
      "min": 500,
      "max": 1000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        7,
        8
      ],
      "harvest": [
        8,
        9
      ],
      "memo": {
        "sow": "野原・草地の自生地確認。ゲンノショウコは現の証拠の意",
        "harvest": "花が咲く7〜9月に全草を収穫。乾燥させて下痢止め・胃腸薬として利用"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "多年生薬草。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 0.5,
        "P": 0.3,
        "K": 0.5
      }
    },
    "yield": {
      "min": 200,
      "max": 500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.03,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春に播種。発芽まで1ヶ月以上かかることも。冷涼な気候を好む",
        "manage": "朝鮮人参は栽培に5〜6年かかる。遮光して直射日光を避ける",
        "harvest": "植え付けから5〜6年後に根が十分に肥大したら秋に収穫"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "高麗人参。根部肥大期のカリを重視。過肥は禁物。",
      "perPlant": {
        "N": 1.5,
        "P": 1.1,
        "K": 1.9
      }
    },
    "yield": {
      "min": 300,
      "max": 600,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 5000,
      "max": 15000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
    "calendar": {
      "transplant": [
        3,
        4
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "山地の自生地確認。黄色い内皮が特徴で漢方薬の原料",
        "harvest": "春〜初夏に樹皮を剥いで内皮を採取。乾燥させて漢方素材として利用"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "キハダと同様。樹木性のため1本あたりの施肥量は多い。",
      "perPlant": {
        "N": 200.0,
        "P": 133.0,
        "K": 200.0
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 300,
      "rowSpacing": 500,
      "rowWidth": 500,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種芋を5月に植え付け。暖地向きで沖縄・九州が主産地",
        "manage": "高温多湿を好む。マルチ栽培で地温を確保",
        "harvest": "葉が黄化して枯れてきたら掘り取り。乾燥させてウコン茶や料理に利用"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 18,
      "baseDressing": 0.5,
      "topDressing": 0.5,
      "notes": "ウコンと同様。根茎肥大期のカリを重視。",
      "perPlant": {
        "N": 5.0,
        "P": 3.3,
        "K": 6.0
      }
    },
    "yield": {
      "min": 1000,
      "max": 1800,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.3,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        1,
        12
      ],
      "memo": {
        "manage": "室内または暖地での栽培。水はけの良い土で管理。過湿厳禁",
        "harvest": "外側の大きな葉から随時収穫。葉の断面から出るゲルが利用部位"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "多肉植物。過肥は禁物。元肥は少量にとどめる。",
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.8
      }
    },
    "yield": {
      "min": 3000,
      "max": 5000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 200,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.5,
    "waterNeedLperSqmPerDay": 3.5
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
    "calendar": {
      "transplant": [
        9,
        10
      ],
      "harvest": [
        6,
        7
      ],
      "memo": {
        "sow": "畦道・野原の自生地確認",
        "manage": "庭植えにも向く。旺盛に増えるのでスペースに注意",
        "harvest": "柔らかい若芽を手で摘み取る。お茶・草餅・天ぷら等に利用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 5,
      "K": 6,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "ヨモギと同様。施肥は少量。元肥中心で管理。",
      "perPlant": {
        "N": 0.5,
        "P": 0.3,
        "K": 0.4
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.05,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上で播種。5〜6月に播種するのが一般的",
        "manage": "病害虫が少なく手がかかりにくい。追肥は控えめに",
        "harvest": "実が黒〜灰褐色になったら収穫。乾燥後に薄皮を除いてハトムギ茶に"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 6,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "イネ科穀物。穂肥として追肥を施す。",
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.4
      }
    },
    "yield": {
      "min": 150,
      "max": 250,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 40,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.01,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "種子か株分けで増やす。栽培は難しく産地が限られる",
        "manage": "3〜4年かけて根を充実させる。多年草で乾燥に強い",
        "harvest": "秋に根を掘り取り。乾燥させて甘草（かんぞう）として漢方に利用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "甘草。根部肥大型薬草。カリを重視。過肥は根の品質低下。",
      "perPlant": {
        "N": 2.0,
        "P": 1.5,
        "K": 2.5
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        4
      ],
      "harvest": [
        5,
        5
      ],
      "memo": {
        "sow": "牡丹は根の確認と植え場所の準備（石灰で土壌調整）",
        "manage": "日当たり良い場所で管理。花後に花がら摘み。根皮（丹皮）は薬用",
        "harvest": "観賞用は開花期（5月）に楽しむ。薬用根皮は秋に掘り取り"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "牡丹。根皮を薬用利用。元肥中心で管理。開花後に追肥。",
      "perPlant": {
        "N": 20.0,
        "P": 15.0,
        "K": 20.0
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 150,
      "rowWidth": 150,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        4,
        5
      ],
      "harvest": [
        5,
        6
      ],
      "memo": {
        "sow": "芍薬は植え場所の準備と根の分株",
        "manage": "深根性なので深耕が必要。花後に花がら摘みで翌年の花を充実させる",
        "harvest": "観賞用は開花期（5〜6月）に。薬用根は3〜4年後の秋に掘り取り"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "芍薬。根を薬用利用。元肥中心で管理。",
      "perPlant": {
        "N": 15.0,
        "P": 11.3,
        "K": 15.0
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 2500,
      "max": 5000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 50,
      "rowSpacing": 80,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.1,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        8,
        9
      ],
      "harvest": [
        9,
        10
      ],
      "memo": {
        "sow": "高山・草地の自生地確認。人工栽培は難しいが高温多湿を嫌う",
        "harvest": "花が咲く9〜10月に全草を収穫。千回振り出しても苦いが語源の生薬"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 4,
      "K": 6,
      "baseDressing": 0.7,
      "topDressing": 0.3,
      "notes": "1〜2年草薬草。施肥は少量。過肥で薬効成分が低下。",
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.3
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 5000,
      "max": 10000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 20,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.01,
    "waterNeedLperSqmPerDay": 3.5
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
      "sow": [
        7,
        8
      ],
      "harvest": [
        9,
        10
      ],
      "memo": {
        "sow": "自生地または栽培株の準備。株分けまたは挿し木で増やせる",
        "manage": "剪定で樹形を整える。実・葉・根皮の全部が利用できる",
        "harvest": "赤い実が熟したら収穫。乾燥させてクコの実（枸杞）として利用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 6,
      "K": 8,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "クコ。実と葉を薬用食用に。低木性。元肥と収穫後追肥が基本。",
      "perPlant": {
        "N": 15.0,
        "P": 11.3,
        "K": 15.0
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 100,
      "rowSpacing": 150,
      "rowWidth": 150,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.15,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春または秋に播種。発芽適温15〜20℃。種の鮮度が重要",
        "manage": "摘葉しながら育てる。翌日には新芽が出ることが名前の由来",
        "harvest": "新葉を随時収穫。天ぷらや青汁に利用。独特の苦みと香りが特徴"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "baseDressing": 0.6,
      "topDressing": 0.4,
      "notes": "多年生。摘み取り収穫のため追肥を継続。収穫後に追肥。",
      "perPlant": {
        "N": 2.0,
        "P": 1.3,
        "K": 1.7
      }
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a（実勢推定値）"
    },
    "price": {
      "min": 500,
      "max": 1000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.2,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上が必要。5〜6月播種。1穴3粒播きで後に1本立ちに。覆土薄め",
        "manage": "花が咲き終わったら追肥を止める。倒伏しやすいため支柱・合掌立てで対策",
        "harvest": "下部の莢が割れ始めたら収穫。束ねて逆さに吊るし、容器の上で叩いて種を落とす"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 6,
      "K": 5,
      "perPlant": {
        "N": 0.5,
        "P": 0.6,
        "K": 0.5
      }
    },
    "yield": {
      "min": 80,
      "max": 150,
      "unit": "kg/10a"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 50,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.006,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "4〜5月播種。1穴2粒播きで後に1本立ちに。大型品種は株間60cm以上",
        "manage": "倒伏対策に深めに株元を土寄せ。切り花用は摘芯せず、採種・食用は摘芯で分枝を促す",
        "harvest": "花が終わり、花盤の裏面が黄化して種が固くなったら収穫。雨の少ない晴天の日に刈り取る"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 8,
      "K": 6,
      "perPlant": {
        "N": 2.0,
        "P": 2.0,
        "K": 1.5
      }
    },
    "yield": {
      "min": 200,
      "max": 400,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 45,
      "rowSpacing": 70,
      "rowWidth": 75,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.094,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上で播種。光発芽種子なので覆土は薄く",
        "manage": "摘心で分枝を促す。開花前後が収穫適期",
        "harvest": "莢が茶色になったら刈り取り。脱穀後に種子を搾油またはそのまま食用"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 7,
      "K": 6,
      "perPlant": {
        "N": 0.5,
        "P": 0.4,
        "K": 0.3
      }
    },
    "yield": {
      "min": 80,
      "max": 150,
      "unit": "kg/10a"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.01,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春まき（4〜5月）。乾燥に強く排水の良い土壌で栽培",
        "manage": "トゲがあるので作業時は厚手の手袋を着用",
        "harvest": "花が橙色から赤色になったら収穫（染料・食用花）。種は秋に収穫して搾油"
      }
    },
    "fertilizer": {
      "N": 6,
      "P": 6,
      "K": 5,
      "perPlant": {
        "N": 0.8,
        "P": 0.8,
        "K": 0.6
      }
    },
    "yield": {
      "min": 80,
      "max": 200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 1000,
      "max": 2000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.013,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "熱帯向け。国内栽培は沖縄でも困難。温室での観賞用栽培が限界",
        "manage": "高温多湿の熱帯気候が必要。国産パーム油は実質的に不可能",
        "harvest": "果実の房が赤くなったら収穫。パーム油は世界最大の植物油"
      }
    },
    "fertilizer": {
      "N": 20,
      "P": 15,
      "K": 25,
      "perPlant": {
        "N": 1500.0,
        "P": 1125.0,
        "K": 1875.0
      }
    },
    "yield": {
      "min": 1500,
      "max": 3000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 50,
      "max": 100,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 900,
      "rowSpacing": 900,
      "rowWidth": 900,
      "linesPerRow": 1
    },
    "yieldPerPlant": 182.25,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "地温20℃以上で播種。長い生育期間が必要（180日以上）",
        "manage": "草丈40cmで摘心。開花後は着果数を管理して品質向上",
        "harvest": "コットンボールが完全に開裂したら手摘みまたは機械収穫"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "perPlant": {
        "N": 3.0,
        "P": 2.0,
        "K": 2.4
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 70,
      "rowWidth": 75,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.037,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春まき（3〜4月）。発芽適温15〜20℃。肥沃な土壌を好む",
        "manage": "乾燥に比較的強い。倒伏しやすいので密播きを避ける",
        "harvest": "莢が褐色になったら刈り取り（繊維用）。亜麻仁油用は種が成熟してから"
      }
    },
    "fertilizer": {
      "N": 8,
      "P": 8,
      "K": 6,
      "perPlant": {
        "N": 0.2,
        "P": 0.2,
        "K": 0.1
      }
    },
    "yield": {
      "min": 150,
      "max": 350,
      "unit": "kg/10a"
    },
    "price": {
      "min": 200,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 6
    },
    "yieldPerPlant": null,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "株分けや種子で増やす。多年草で3〜4年栽培できる",
        "manage": "年3〜4回刈り取れる。収穫後に追肥して株を回復させる",
        "harvest": "草丈1〜1.5mになったら刈り取り。茎から繊維を取り出す"
      }
    },
    "fertilizer": {
      "N": 15,
      "P": 10,
      "K": 12,
      "perPlant": {
        "N": 3.0,
        "P": 2.0,
        "K": 2.4
      }
    },
    "yield": {
      "min": 100,
      "max": 300,
      "unit": "kg/10a"
    },
    "price": {
      "min": 400,
      "max": 800,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.036,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上で播種。乾燥に強く荒れ地でも栽培可能",
        "manage": "草丈が3〜4mになる。肥料はあまり必要としない",
        "harvest": "開花前後に刈り取り。茎から靭皮繊維を取り出す"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.2
      }
    },
    "yield": {
      "min": 500,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 50,
      "max": 150,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 40,
      "rowWidth": 60,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.025,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "栽培には都道府県知事の許可が必要。発芽適温は15〜20℃",
        "manage": "繊維用は密植して細い茎を育てる。雌雄異株",
        "harvest": "雄株が花粉を放出した後に刈り取り。茎から繊維を取り出す"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.2
      }
    },
    "yield": {
      "min": 200,
      "max": 500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 600,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.001,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "秋まきが主体。苦みを抑えるために軟白栽培が有効",
        "manage": "結球前に外葉を束ねて軟白処理すると苦みが減る",
        "harvest": "軟白後10〜15日で収穫。低温で甘みが増す"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 10,
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.5
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 400,
      "max": 700,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.069,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "秋まきが主体。苦みを抑えるために軟白栽培が有効",
        "manage": "結球前に外葉を束ねて軟白処理すると苦みが減る",
        "harvest": "軟白後10〜15日で収穫。低温で甘みが増す"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 8,
      "perPlant": {
        "N": 1.5,
        "P": 1.2,
        "K": 1.2
      }
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.054,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春・秋まき。すじ播きで薄く覆土。発芽適温15〜20℃",
        "manage": "間引きながら育てる。アブラムシとコナガに注意",
        "harvest": "草丈15〜20cmで摘み取り。花が咲くと辛みが強くなる"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 6,
      "K": 8,
      "perPlant": {
        "N": 0.3,
        "P": 0.2,
        "K": 0.2
      }
    },
    "yield": {
      "min": 400,
      "max": 800,
      "unit": "kg/10a"
    },
    "price": {
      "min": 500,
      "max": 900,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 15,
      "rowWidth": 90,
      "linesPerRow": 4
    },
    "yieldPerPlant": 0.002,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春・秋まき。直根性なので直播きが基本",
        "manage": "乾燥に強い。肥料はあまり必要としない",
        "harvest": "球が膨らんで直径8〜10cmになったら収穫。葉や種も利用可"
      }
    },
    "fertilizer": {
      "N": 10,
      "P": 8,
      "K": 10,
      "perPlant": {
        "N": 2.0,
        "P": 1.6,
        "K": 2.0
      }
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.216,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "発芽適温15〜20℃。細かい種なので浅く播く",
        "seedling": "育苗期間は長め（8〜10週間）。本葉4〜5枚で定植",
        "manage": "肥大してきたら土を少しずつ除けて緑化を防ぐ",
        "harvest": "根径10〜15cmで収穫。霜に当たっても大丈夫"
      }
    },
    "fertilizer": {
      "N": 14,
      "P": 10,
      "K": 14,
      "perPlant": {
        "N": 2.5,
        "P": 1.8,
        "K": 2.5
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 40,
      "rowSpacing": 60,
      "rowWidth": 90,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.276,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春・秋まき。直播きかポット育苗",
        "manage": "間引きながら育てる。球が膨らんできたら追肥を控える",
        "harvest": "球の直径が6〜8cmになったら収穫。大きくなると繊維が硬くなる"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "perPlant": {
        "N": 1.5,
        "P": 1.0,
        "K": 1.3
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 200,
      "max": 350,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 25,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.058,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春・秋まき。1粒に複数種子入りなので発芽後に間引く",
        "manage": "追肥は月1回程度。葉色が悪くなったら窒素を補給",
        "harvest": "外葉から順次収穫。株を残すと長期間収穫できる"
      }
    },
    "fertilizer": {
      "N": 14,
      "P": 8,
      "K": 12,
      "perPlant": {
        "N": 1.5,
        "P": 0.9,
        "K": 1.3
      }
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 250,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.09,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "育苗後定植するのが一般的。発芽適温15〜20℃",
        "seedling": "本葉4〜5枚で定植。育苗期間は60〜80日",
        "transplant": "深植えで軟白部分を長くする。溝を切って定植後に土寄せ",
        "manage": "土寄せを3〜4回繰り返して軟白化。収穫前まで続ける",
        "harvest": "草丈50〜60cmで収穫。霜に当たると甘みが増す"
      }
    },
    "fertilizer": {
      "N": 14,
      "P": 10,
      "K": 12,
      "perPlant": {
        "N": 2.0,
        "P": 1.4,
        "K": 1.7
      }
    },
    "yield": {
      "min": 1000,
      "max": 2000,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.022,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春・秋まき。発芽適温20〜25℃。中国野菜として親しまれる",
        "manage": "生育旺盛で手がかかりにくい。病害虫は比較的少ない",
        "harvest": "茎が伸びて蕾がついたら花茎ごと収穫。茎の甘みが特徴"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "perPlant": {
        "N": 1.5,
        "P": 1.0,
        "K": 1.3
      }
    },
    "yield": {
      "min": 600,
      "max": 1200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 300,
      "max": 500,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 25,
      "rowSpacing": 40,
      "rowWidth": 90,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.045,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "春・秋まき。発芽適温20〜25℃。直播きかポット育苗",
        "manage": "生育が早く追肥は1〜2回で十分。軟腐病に注意",
        "harvest": "草丈20〜25cmで株ごと収穫。葉が広がりきる前が最適期"
      }
    },
    "fertilizer": {
      "N": 12,
      "P": 8,
      "K": 10,
      "perPlant": {
        "N": 1.2,
        "P": 0.8,
        "K": 1.0
      }
    },
    "yield": {
      "min": 800,
      "max": 1500,
      "unit": "kg/10a"
    },
    "price": {
      "min": 250,
      "max": 400,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 30,
      "rowWidth": 90,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.023,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sow": "菌床または原木（スギ・マツ等）への植菌準備",
        "manage": "温度15〜20℃・湿度90%で管理。形が花びらに似た珍しいきのこ",
        "harvest": "白くふわふわした状態で収穫。βグルカン含有量が高い"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "菌床栽培。施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 30,
      "max": 80,
      "unit": "kg/10a"
    },
    "price": {
      "min": 3000,
      "max": 6000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 20,
      "rowWidth": 20,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.002,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sow": "菌床を準備（9〜11月）。山伏（修験者）の衣に似た独特の形",
        "manage": "温度15〜20℃・湿度85〜90%で管理。光は弱光でよい",
        "harvest": "白いふさふさした突起が十分に発達したら収穫"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "菌床・原木栽培。施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 40,
      "max": 100,
      "unit": "kg/10a"
    },
    "price": {
      "min": 2000,
      "max": 4000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 20,
      "rowWidth": 20,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.003,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sow": "堆肥を詰めた菌床を準備。ブラジル産のカワリハラタケが健康食品として有名",
        "manage": "温度20〜25℃で管理。殺菌した堆肥を使用することが重要",
        "harvest": "傘が開く前の状態で収穫。独特の甘い香りが特徴"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "堆肥培地栽培。培地に養分を含み追加施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 50,
      "max": 150,
      "unit": "kg/10a"
    },
    "price": {
      "min": 3000,
      "max": 8000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 15,
      "rowWidth": 15,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.001,
    "waterNeedLperSqmPerDay": 6.0
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
      "sow": [
        8,
        9
      ],
      "harvest": [
        9,
        11
      ],
      "memo": {
        "sow": "コナラ・クヌギ林の自生地確認。秋のきのこ狩りの計画立案",
        "manage": "毎年同じ場所に発生することが多い。菌根菌なので人工栽培は困難",
        "harvest": "傘が開く前の若いものを収穫。香りが強く焼いて食べるのが最高"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "天然菌根菌。栽培困難。施肥不可。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 5,
      "max": 20,
      "unit": "kg/10a"
    },
    "price": {
      "min": 8000,
      "max": 20000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 200,
      "rowSpacing": 300,
      "rowWidth": 300,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.075,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sow": "菌床または原木への植菌準備。桃色の美しいヒラタケ",
        "manage": "温度15〜20℃で管理。光が当たるとピンク色が鮮やかになる",
        "harvest": "傘が十分に展開したら株ごと収穫。色と香りが食欲をそそる"
      }
    },
    "fertilizer": {
      "N": 0,
      "P": 0,
      "K": 0,
      "baseDressing": 1.0,
      "topDressing": 0.0,
      "notes": "菌床栽培。施肥は不要。",
      "perPlant": {
        "N": 0.0,
        "P": 0.0,
        "K": 0.0
      }
    },
    "yield": {
      "min": 50,
      "max": 120,
      "unit": "kg/10a"
    },
    "price": {
      "min": 1500,
      "max": 3000,
      "unit": "円/kg（実勢推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 20,
      "rowSpacing": 20,
      "rowWidth": 20,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.003,
    "waterNeedLperSqmPerDay": 6.0
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
      ],
      "memo": {
        "sowing": "春まき（4〜5月）。発芽適温15〜25℃。乾燥地向きで過湿に弱い",
        "manage": "窒素固定するので施肥は少量。支柱は不要",
        "harvest": "莢が茶色く乾燥したら収穫。乾燥豆は長期保存が可能"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 6,
      "perPlant": {
        "N": 0.3,
        "P": 0.5,
        "K": 0.4
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": {
      "min": 800,
      "max": 1200,
      "unit": "円/kg（国内栽培ほぼなし・輸入品小売参考値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 25,
      "rowSpacing": 50,
      "rowWidth": 70,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.011,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "春まき（4〜5月）。発芽適温15〜25℃。乾燥に強い",
        "manage": "施肥は最小限。過湿を避けて排水の良い土壌で栽培",
        "harvest": "莢が完熟して茶色くなったら収穫。脱粒しやすいので早めに"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 6,
      "perPlant": {
        "N": 0.2,
        "P": 0.3,
        "K": 0.2
      }
    },
    "yield": {
      "min": 80,
      "max": 180,
      "unit": "kg/10a"
    },
    "price": {
      "min": 700,
      "max": 1300,
      "unit": "円/kg（国内栽培ほぼなし・輸入品小売参考値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 10,
      "rowSpacing": 30,
      "rowWidth": 70,
      "linesPerRow": 3
    },
    "yieldPerPlant": 0.001,
    "waterNeedLperSqmPerDay": 1.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上で播種。夏向きの豆で高温を好む",
        "manage": "生育が早く手がかかりにくい。灌水は控えめに",
        "harvest": "莢が黒〜茶色になったら収穫。もやし用には緑色の莢のうちに種を収穫"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 6,
      "perPlant": {
        "N": 0.3,
        "P": 0.5,
        "K": 0.4
      }
    },
    "yield": {
      "min": 100,
      "max": 200,
      "unit": "kg/10a"
    },
    "price": {
      "min": 800,
      "max": 1200,
      "unit": "円/kg（国内栽培ほぼなし・輸入品小売参考値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 15,
      "rowSpacing": 40,
      "rowWidth": 70,
      "linesPerRow": 2
    },
    "yieldPerPlant": 0.004,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温20℃以上で播種。蔓あり品種は支柱を準備",
        "manage": "開花期の水切れに注意。追肥は控えめに",
        "harvest": "莢がふっくらと膨らんだら収穫（グリーンリマ）。乾燥豆は完熟莢から"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 8,
      "perPlant": {
        "N": 0.3,
        "P": 0.5,
        "K": 0.5
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": {
      "min": 800,
      "max": 1500,
      "unit": "円/kg（直接相場データなし・類似大粒乾燥豆からの推定値）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 70,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.032,
    "waterNeedLperSqmPerDay": 3.5
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
      ],
      "memo": {
        "sowing": "地温15℃以上で播種。蔓あり品種は支柱またはネットを準備",
        "manage": "開花期の水切れに注意。追肥は2週間ごとに少量",
        "harvest": "莢が柔らかいうちに収穫（さやいんげんとして）。白花豆は完熟後に乾燥豆として"
      }
    },
    "fertilizer": {
      "N": 5,
      "P": 8,
      "K": 8,
      "perPlant": {
        "N": 0.3,
        "P": 0.5,
        "K": 0.5
      }
    },
    "yield": {
      "min": 100,
      "max": 250,
      "unit": "kg/10a"
    },
    "price": {
      "min": 4000,
      "max": 5000,
      "unit": "円/kg（国産「白花豆」として高級菜豆市場で流通・豆問屋実勢価格）"
    },
    "risks": [],
    "plantingStandard": {
      "plantSpacing": 30,
      "rowSpacing": 60,
      "rowWidth": 70,
      "linesPerRow": 1
    },
    "yieldPerPlant": 0.032,
    "waterNeedLperSqmPerDay": 3.5
  }
];