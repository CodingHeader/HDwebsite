#!/usr/bin/env python3
"""P04：对比 main@94dbbbb 与当前 upgrade schema 的 ADR-024 四模型 + Navigation.templateId/elements（规范化：去注释、合并空白）。
用法：python3 docs/design/06_validation/evidence/P04/model-diff.py ；输出为空 diff 即一致（exit 0）。"""
import re, subprocess, sys
def blocks(text):
    out = {}
    for m in re.finditer(r'^model (\w+) \{\n(.*?)^\}', text, re.S | re.M):
        lines = []
        for l in m.group(2).splitlines():
            l = re.sub(r'//.*', '', l).strip()
            if l: lines.append(re.sub(r'\s+', ' ', l))
        out[m.group(1)] = lines
    return out
main = blocks(subprocess.run(['git', 'show', 'origin/main:prisma/schema.prisma'], capture_output=True, text=True).stdout)
up = blocks(open('prisma/schema.prisma').read())
bad = 0
for n in ['PageTemplate', 'ContentBlock', 'TemplateBlock', 'ElementConfig']:
    a, b = main[n], up.get(n, [])
    if a != b:
        bad += 1; print(f'## {n} differs'); print(' main-only:', [x for x in a if x not in b]); print(' upgrade-only:', [x for x in b if x not in a])
    else:
        print(f'{n}: identical ({len(a)} lines)')
nav_main = [l for l in main['Navigation'] if l.split(' ')[0] in ('templateId', 'template', 'elements')]
nav_up = [l for l in up['Navigation'] if l.split(' ')[0] in ('templateId', 'template', 'elements')]
print('Navigation template/elements fields main:', nav_main); print('Navigation template/elements fields upgrade:', nav_up)
if nav_main != nav_up: bad += 1; print('## Navigation fields differ')
sys.exit(1 if bad else 0)
