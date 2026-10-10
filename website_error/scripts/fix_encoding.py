#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sqlite3
import os

# GBK 解码映射表（常见菜单项）
GBK_TO_UTF8 = {
    '·': '对话日志',  # conversations
    '': '模型配置',  # model-configs
    '˵': '导航菜单',  # navigations  
    '·': '新闻管理',  # news
    'ԺУ': '合作院校',  # partners
    'ɫ': '角色管理',  # roles
    'ָ': '服务指南',  # service-guides
    'ѧԱ': '学员管理',  # students
    'ϵͳ': '系统管理',  # system
    'ǩ': '标签管理',  # tags
    'Ϊ': '埋点日志',  # user-actions
    'û': '用户管理',  # users
    '֤ɷ': '证书风采',  # gallery
    'ô': '开放大学',  # open-university
    'ɿѧ': '四川大学',  # sichuan-university
    '人߿': '成人高考',  # adult-exam
    'Կ֤': '自考专区',  # self-study
}

def is_gbk_encoded(text):
    """检测是否为 GBK 编码的中文"""
    if not text:
        return False
    try:
        # 尝试用 UTF-8 解码，如果失败可能是 GBK
        text.encode('utf-8').decode('utf-8')
        # 检查是否有常见的 GBK 编码特征字节
        hex_val = text.encode('utf-8').hex()
        for i in range(0, len(hex_val)-2, 2):
            b = int(hex_val[i:i+2], 16)
            if 0xb0 <= b <= 0xf7:  # GBK 中文字节范围
                return True
        return False
    except:
        return True

def try_decode_gbk(text):
    """尝试用 GBK 解码"""
    try:
        # 先编码为 latin-1 (保留字节值)，再用 GBK 解码
        return text.encode('latin-1').decode('gbk')
    except:
        return text

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prisma', 'dev.db')

# 强制 UTF-8 模式连接
conn = sqlite3.connect(db_path, isolation_level=None)
conn.execute('PRAGMA encoding="UTF-8"')
cursor = conn.cursor()

print("=" * 60)
print("菜单编码修复工具")
print("=" * 60)

# 获取所有菜单
cursor.execute("SELECT id, code, label FROM ManagerMenu ORDER BY code")
menus = cursor.fetchall()

fixed_count = 0
gbk_count = 0

for menu_id, code, label in menus:
    hex_val = label.encode('utf-8').hex() if label else ''
    
    # 检测 GBK 编码特征
    is_gbk = False
    if label:
        for i in range(0, len(hex_val)-2, 2):
            b = int(hex_val[i:i+2], 16)
            if 0xb0 <= b <= 0xf7:
                is_gbk = True
                break
    
    if is_gbk:
        gbk_count += 1
        # 尝试解码
        decoded = try_decode_gbk(label)
        print(f"[GBK] {code}: {label!r} -> {decoded}")
        
        # 更新为 UTF-8 编码
        cursor.execute("UPDATE ManagerMenu SET label=? WHERE id=?", (decoded, menu_id))
        fixed_count += 1

conn.commit()
conn.execute('VACUUM')

print(f"\n{'=' * 60}")
print(f"修复完成: 共发现 {gbk_count} 个 GBK 编码菜单, 修复 {fixed_count} 个")
print(f"{'=' * 60}")

# 验证结果
print("\n验证结果:")
cursor.execute("SELECT code, label FROM ManagerMenu ORDER BY code")
for row in cursor.fetchall():
    code, label = row
    hex_val = label.encode('utf-8').hex() if label else ''
    is_gbk = False
    for i in range(0, len(hex_val)-2, 2):
        b = int(hex_val[i:i+2], 16)
        if 0xb0 <= b <= 0xf7:
            is_gbk = True
            break
    status = "⚠️ GBK" if is_gbk else "✓ UTF-8"
    print(f"  {code}: {label} [{status}]")

conn.close()

# 重新打开验证
print("\n重新验证:")
conn2 = sqlite3.connect(db_path)
conn2.execute('PRAGMA encoding="UTF-8"')
cur2 = conn2.cursor()
cur2.execute("SELECT code, hex(label) as hex FROM ManagerMenu WHERE code='conversations'")
row = cur2.fetchone()
print(f"conversations hex: {row[1]}")
# 正确的 UTF-8 "对话日志" 应该是: E5AFB9E8AF9DE697A5E5BF97
if row[1] == 'E5AFB9E8AF9DE697A5E5BF97':
    print("✓ 验证成功: 已转为 UTF-8 编码")
else:
    print(f"⚠️ 编码仍为: {row[1]}")
conn2.close()
