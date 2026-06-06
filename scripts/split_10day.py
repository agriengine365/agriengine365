"""
amedas_10day.json → data/10day/{stationId}.json に1局1ファイル分割

使い方:
  1. このスクリプトを agri/ プロジェクトルートに置く
  2. python split_10day.py
  3. data/10day/ に1298ファイルが生成される
  4. git add data/10day/ してpush
"""

import json
import os
from pathlib import Path

INPUT  = 'data/amedas_10day.json'   # 元ファイルのパス（適宜変更）
OUTPUT = 'data/10day'               # 出力ディレクトリ

def main():
    print(f'読み込み中: {INPUT}')
    with open(INPUT, 'r', encoding='utf-8') as f:
        all_data = json.load(f)

    out_dir = Path(OUTPUT)
    out_dir.mkdir(parents=True, exist_ok=True)

    total = len(all_data)
    print(f'総局数: {total}')

    for i, (station_id, station_data) in enumerate(all_data.items(), 1):
        out_path = out_dir / f'{station_id}.json'
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(station_data, f, ensure_ascii=False, separators=(',', ':'))

        if i % 100 == 0 or i == total:
            print(f'  {i}/{total} 完了')

    print(f'\n完了: {out_dir}/ に {total} ファイル生成')
    print('\n次のステップ:')
    print('  git add data/10day/')
    print('  git commit -m "feat: AMeDAS旬別データ追加(1局1ファイル)"')
    print('  git pull --rebase origin main')
    print('  git push origin main')

if __name__ == '__main__':
    main()