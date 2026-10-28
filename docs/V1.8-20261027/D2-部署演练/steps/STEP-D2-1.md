# STEP-D2-1：备份恢复演练 + 部署演练

## 演练 1 · 备份恢复（本机可做）

### 安全前置（**必做**）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
# 先备份当前库，防误操作
cp prisma/e2e.db /tmp/e2e.db.bak
echo "已备份到 /tmp/e2e.db.bak"
```

### 执行

```bash
# 记录开始
START=$(date +%s)

node scripts/drill-backup-restore.mjs

END=$(date +%s)
echo "耗时: $((END-START)) 秒"
```

**若脚本需要参数** → 先 `head -40 scripts/drill-backup-restore.mjs` 看用法。

### 核对（关键，不能只看"没报错"）

```bash
node -e "
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('prisma/e2e.db');
const tables=db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\").all();
console.log('表数:', tables.length);
for (const t of ['Article','User','Setting','Campus','Gallery']) {
  try { console.log(' ', t.padEnd(12), db.prepare('SELECT COUNT(*) c FROM ' + t).get().c, '行'); }
  catch(e){ console.log(' ', t, '查询失败'); }
}
db.close();
"
```

**核对口径**：
- 表数应为 **48**（`grep -c "^model " prisma/schema.prisma`）
- 关键表行数应与演练前一致

## 演练 2 · 全新服务器 30 分钟（需 Docker）

### 检查 Docker

```bash
docker --version 2>&1 | head -1 || echo "无 Docker"
```

### 若有 Docker

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
START=$(date +%s)

docker build -t hdwebsite:drill .
docker run -d --name hd-drill -p 6792:3000 --env-file .env.example hdwebsite:drill

# 轮询探活（最多 30 分钟）
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://127.0.0.1:6792/api/health 2>/dev/null)
  [ "$code" = "200" ] && { echo "探活成功"; break; }
  sleep 30
done

END=$(date +%s)
echo "总耗时: $((END-START)) 秒 ($(( (END-START)/60 )) 分钟)"

docker rm -f hd-drill
docker rmi hdwebsite:drill
```

### 若无 Docker

记 `UNKNOWN(本机无 Docker，需独立环境)`，写明：
- 需要什么（一台干净 Linux 或 Docker）
- 30 分钟预算分解（拉码 2 + 装依赖 5 + 迁移 3 + seed 2 + build 8 + 起服务 1 + 探活 1 = 22 分钟，留 8 分钟余量）

**不得**用本机跑一遍冒充"全新服务器"（本机有 node_modules 缓存与 npm cache）。

## 验收
- [ ] 备份恢复演练完成，有耗时
- [ ] 表数核对（48）
- [ ] 关键表行数核对
- [ ] 部署演练：Docker 完成 或 UNKNOWN + 需要什么
- [ ] 若完成，含各阶段耗时分解
- [ ] `/tmp/e2e.db.bak` 已清理或保留（不落仓库）
- [ ] 未改 `src/**`

## 常见坑

| 坑 | 防守 |
|---|---|
| 演练脚本误改真实库 | 先 `cp` 备份；确认脚本用临时路径 |
| 只看"没报错"就算成功 | 必须核对表数 + 行数 |
| 本机冒充全新服务器 | 无 Docker 就记 UNKNOWN，诚实 |
| Docker 容器没清理 | 用完 `docker rm -f` |
