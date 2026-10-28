# D2 · 部署演练

## 归属
- 阶段编号：D2
- 所属分组：D 环境受限
- 来源凭据：REQ-LEDGER UNKNOWN #10/#11

## 目标
验证「备份恢复」与「全新服务器部署」两条运维路径可用，关闭 `REQ-NF-004` 的 2 条 UNKNOWN。

## 为什么它是 UNKNOWN（三级凭据）

### ① 代码位置
```bash
# 已有备份/恢复脚本
scripts/restore.mjs
scripts/drill-backup-restore.mjs     ← 演练脚本已存在
scripts/scan-orphan-uploads.mjs
```

### ② 实测证据
```bash
# REQ-LEDGER 记为 UNKNOWN
$ grep -E "部署演练|备份恢复|30 分钟恢复" docs/design/06_validation/evidence/V14/REQ-LEDGER-01/requirements-ledger.md
| UNKNOWN | - | 全新服务器 30 分钟恢复需部署演练 |
| UNKNOWN | - | 备份恢复演练 1 次未执行 |

# 脚本存在
$ ls scripts/drill-backup-restore.mjs
scripts/drill-backup-restore.mjs
```

### ③ 规划落点
- 脚本有，但**从未实际执行并记录结果**
- 本卡是把"有脚本"变成"有演练证据"

## 输入
- 前置阶段：**无**
- 前置状态：任意

## 输出
- 新增：`evidence/V18/D2/drill-restore.md`（备份恢复演练记录）
- 新增：`evidence/V18/D2/fresh-deploy.md`（全新部署记录）
- 新增：`evidence/V18/D2/execution.md`

## 两项演练

### 演练 1 · 备份恢复（**本机可做**）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011

# 1) 记录开始时间
date +%s

# 2) 执行演练脚本
node scripts/drill-backup-restore.mjs

# 3) 记录结束时间，算耗时
# 4) 核对：表数、行数、关键记录是否一致
```

**验收要点**：
- [ ] 48 张表全部恢复
- [ ] 关键表行数一致（Article/User/Setting）
- [ ] 耗时记录（秒）
- [ ] 无报错

### 演练 2 · 全新服务器 30 分钟（**需环境**）

**本机无法完成"全新服务器"**（没有第二台机器/容器）。两种做法：

**做法 A（推荐）**：用 Docker 模拟
```bash
docker build -t hdwebsite:drill .
docker run -d -p 6792:3000 --env-file .env.example hdwebsite:drill
# 计时：从 docker run 到 /api/health 返回 200
```

**做法 B**：若无 Docker → 记 `UNKNOWN(无独立环境)`，写明需要什么

## 30 分钟目标的分解

| 阶段 | 预算 | 检查点 |
|---|---|---|
| 拉代码 | 2 min | `git clone` 完成 |
| 装依赖 | 5 min | `npm ci` 完成 |
| 建库迁移 | 3 min | `prisma migrate deploy` 完成 |
| seed | 2 min | `seed.ts` 完成 |
| build | 8 min | `npm run build` 完成 |
| 起服务 | 1 min | `next start` 起 |
| 探活 | 1 min | `/api/health` 200 |
| **合计** | **22 min** | 留 8 min 余量 |

**若实测 >30 min**：记 FAIL + 各阶段实际耗时 + 瓶颈在哪。

## 验收标准
- [ ] 备份恢复演练完成且有耗时记录（可自动化：文件存在）
- [ ] 报告含表数/行数核对（人工）
- [ ] 全新部署：Docker 方式完成 或 明确记 UNKNOWN（人工）
- [ ] 若完成，含各阶段耗时分解（人工）
- [ ] 未修改任何 `src/**`（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
ls evidence/V18/D2/
grep -cE "^\| " evidence/V18/D2/drill-restore.md     # 至少一行表格
git status --short src                                # 空
```

## 证据路径
`evidence/V18/D2/`

## 允许修改
- `evidence/V18/D2/**`
- 临时目录 `/tmp/**`（演练产物，不落仓库）

## 禁止修改
- `src/**`、`prisma/**`、`package.json`
- 不得修改 `scripts/restore.mjs` 等既有脚本（本卡是"跑"，不是"改"）

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：无 Docker 且无第二台机器 → 演练 2 记 `UNKNOWN(无独立环境)`，演练 1 照做

## 建议执行档位
`opus`　理由：涉及数据恢复，误操作可能损坏数据；且需判断"恢复是否真的完整"

## 升级条件
若恢复后发现数据不一致 → 升级，可能暴露 `restore.mjs` 的缺陷

## 预估规模
中（4h，含 Docker build）

## 自我质疑

**质疑：演练会不会破坏现有数据？**
→ **有风险**。`drill-backup-restore.mjs` 应该用独立路径，但必须核实。
- ① 执行前先备份当前 `prisma/e2e.db`
- ② 演练用 `/tmp` 下的独立 db
- ③ 不得动 `prisma/e2e.db`

**质疑：本机演练算"全新服务器"吗？**
→ 不算。本机已有 node_modules 缓存、npm cache。Docker 才算接近。**故做法 B（UNKNOWN）比"用本机冒充"更诚实。**
