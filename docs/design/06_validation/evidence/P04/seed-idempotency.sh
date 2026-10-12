#!/usr/bin/env bash
# P04：seed 幂等断言。用法：bash docs/design/06_validation/evidence/P04/seed-idempotency.sh [db路径，默认 prisma/dev.db]
# 运行 seed 两次，第二次前后全部业务表计数 + 角色权限/菜单内容哈希必须一致。
set -euo pipefail
DB=${1:-prisma/dev.db}
export DATABASE_URL="file:$DB"
snap() {
  for t in $(sqlite3 "$DB" "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name<>'_prisma_migrations' order by name"); do
    echo "$t $(sqlite3 "$DB" "select count(*) from \"$t\"")"
  done
  echo "Role.permissions $(sqlite3 "$DB" "select slug||':'||permissions from Role order by slug" | md5sum | cut -c1-12)"
  echo "ManagerMenu.rows $(sqlite3 "$DB" "select code||path||ifnull(permission,'')||ifnull(parentId,'') from ManagerMenu order by code" | md5sum | cut -c1-12)"
  echo "TemplateBlock.rows $(sqlite3 "$DB" "select templateId||'-'||blockId||'-'||sort from TemplateBlock order by id" | md5sum | cut -c1-12)"
}
npx ts-node prisma/seed.ts >/dev/null 2>&1
snap > /tmp/p04-seed-run1.txt
npx ts-node prisma/seed.ts >/dev/null 2>&1
snap > /tmp/p04-seed-run2.txt
cat /tmp/p04-seed-run2.txt
for t in ManagerMenu Role Setting CollectSource PageTemplate ContentBlock TemplateBlock; do grep -q "^$t " /tmp/p04-seed-run2.txt || { echo "missing $t"; exit 1; }; done
if diff /tmp/p04-seed-run1.txt /tmp/p04-seed-run2.txt; then echo "SEED IDEMPOTENT: OK"; else echo "SEED IDEMPOTENT: FAIL"; exit 1; fi
