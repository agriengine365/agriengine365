"""
monthly.json を局番号ごとの個別ファイルに分割する
実行方法: python split_monthly.py
実行場所: C:\\Users\\conio\\Desktop\\agri\\scripts\\
"""

import json
import os

# パス設定（scriptsフォルダから実行する想定）
INPUT_PATH  = '../data/monthly.json'
OUTPUT_DIR  = '../data/monthly'

def main():
    print(f'読み込み中: {INPUT_PATH}')
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total = len(data)
    print(f'局数: {total}')

    for i, (station_no, station_data) in enumerate(data.items(), 1):
        out_path = os.path.join(OUTPUT_DIR, f'{station_no}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(station_data, f, ensure_ascii=False, separators=(',', ':'))

        if i % 100 == 0 or i == total:
            print(f'  {i}/{total} 完了')

    print(f'\n完了: {OUTPUT_DIR} に {total} ファイル生成')

if __name__ == '__main__':
    main()