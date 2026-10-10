#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prisma', 'dev.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def is_gbk_hex(hex_val):
    if len(hex_val) < 4:
        return False
    for i in range(0, len(hex_val)-2, 2):
        b = int(hex_val[i:i+2], 16)
        if 0xb0 <= b <= 0xf7:
            return True
    return False

print("扫描所有表的 GBK 编码...")
print("=" * 60)

# 获取所有表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]

gbk_found = []

for table in tables:
    if table.startswith('sqlite_'):
        continue
    try:
        cursor.execute(f'SELECT name FROM pragma_table_info("{table}")')
        cols = [r[0] for r in cursor.fetchall()]
        
        for col in cols:
            try:
                cursor.execute(f'SELECT "{col}" FROM "{table}" WHERE "{col}" IS NOT NULL LIMIT 5')
                rows = cursor.fetchall()
                for row in rows:
                    if row[0] and isinstance(row[0], str):
                        val = row[0]
                        hex_val = val.encode('utf-8', errors='ignore').hex()
                        if is_gbk_hex(hex_val):
                            decoded = val.encode('latin-1').decode('gbk', errors='ignore')
                            gbk_found.append({
                                'table': table,
                                'col': col,
                                'value': val[:30],
                                'decoded': decoded[:30]
                            })
                            print(f"[GBK] {table}.{col}: {decoded[:30]}")
                            break
            except Exception as e:
                pass
    except Exception as e:
        pass

print("=" * 60)
print(f"共发现 {len(gbk_found)} 个 GBK 编码字段")
conn.close()
