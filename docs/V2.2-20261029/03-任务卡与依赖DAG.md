---
id: PLAN-V022-03
title: V2.2 任务卡与依赖 DAG
status: active
module: planning
owner: main-agent
created: 2026-10-29
related: [PLAN-V022, PLAN-V022-02]
---

# 03 · 任务卡与依赖 DAG

## 一、切片划分

| 切片 | 名称 | 可演示的最终行为 | 卡 |
|---|---|---|---|
| **S1** | 文档可信 | 照 `.env.example` 配完就能启动，不出现"文档说可选、代码说必需" | DOC-01 |
| **S2** | 启动链路 | `npm start` 后数据可用、能自证是哪个项目 | ENV-01、ENV-02 |
| **S3** | 前台可追溯 | 每个 className 差异都能答"合规/有据/无据" | AUD-01、AUD-02 |
| **S4** | 功能对等 | 能回答"main 的每个功能在 HEAD 是否真能用" | PAR-01、PAR-02 |
| **S5** | 收口 | V2.2 结论可查、双端一致 | E1 |

**第一刀为 S1**：DOC-01 是 30 分钟能改完的文档修正，但它解锁 ENV-01（启动脚本要按正确的 env 列表做校验）。且它独立、零风险、立即可验收。

---

## 二、任务卡

---

### DOC-01：`.env.example` 与 `env.ts` 对齐

## 归属
- 所属切片：S1
- 来源需求：AGENTS.md §7「本地需 `.env.local`（JWT_SECRET ≥32 位等，参照 `.env.example`）」
- 来源方案：`02-未实现需求核查.md` §3.1

## 目标
照 `.env.example` 配置后能真正启动；文档描述与 `src/lib/env.ts` 的校验规则逐条一致。

## 输入
- 文档：`.env.example`（当前 36 行）
- 契约：`src/lib/env.ts:16-21` 的 `PROD_REQUIRED`、`:38-56` 的校验逻辑
- 前置任务：无
- 前置状态：无

## 输出
- `.env.example`（修正注释与键的注释状态）
- `docs/design/06_validation/evidence/V22/DOC-01/execution.md`

## Execution Steps
1. [ ] 读 `src/lib/env.ts` 全文，列出「必需键」与「生产必需键」两张表
2. [ ] 逐行比对 `.env.example`，标出三类错误：①声称可选但实际必需 ②声称有派生但无实现 ③键名拼写不符
3. [ ] 修正注释：`ENCRYPTION_KEY` 改为必需并删除"默认派生自 JWT_SECRET"的错误描述
4. [ ] `DATABASE_URL` / `APP_ORIGIN` 标注「生产必需」
5. [ ] 实测：按修正后的 `.env.example` 填值，`NODE_ENV=production npm start` 能起
6. [ ] 实测：故意漏填 `ENCRYPTION_KEY`，确认报错信息含该键名

## 验收标准
- [ ] `.env.example` 中每个「必需键」都未注释，且标注「必需」
- [ ] 不存在"默认派生自 X"但代码无派生的描述
- [ ] 按文档配置可启动（exit 0 / 200）
- [ ] 漏填时 FATAL 报错含键名
- [ ] 未改 `src/lib/env.ts`

## 验证命令
```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"

# 1) .env.example 与 env.ts 的必需键集合一致
node -e "
const fs=require('fs');
const envTs=fs.readFileSync('src/lib/env.ts','utf8');
const ex=fs.readFileSync('.env.example','utf8');
const req=[...envTs.matchAll(/(\w+):\s*\(v: string\)/g)].map(m=>m[1]);
const uncommented=[...ex.matchAll(/^([A-Z_]+)=/gm)].map(m=>m[1]);
const missing=req.filter(k=>!uncommented.includes(k));
console.log('env.ts 必需键:',req.join(','));
console.log('.env.example 未注释键:',uncommented.join(','));
console.log(missing.length?'缺: '+missing.join(','):'PASS 齐全');
process.exit(missing.length?1:0);
"

# 2) 无"派生"虚假描述
grep -c "派生自 JWT_SECRET" .env.example   # 期望 0

# 3) 未改 env.ts
git status --short src/lib/env.ts           # 期望空
```

## 证据路径
`docs/design/06_validation/evidence/V22/DOC-01/`

## 允许修改
- `.env.example`
- `docs/design/06_validation/evidence/V22/DOC-01/**`

## 禁止修改
- `src/lib/env.ts`（改它等于改校验规则，属不同决策）
- `src/contracts/**`、`prisma/**`、`package.json`
- `.env.local`（含真实密钥，不得提交）

## 依赖与阻塞
- Depends on：无
- Blocks：ENV-01（启动脚本要按正确 env 列表做前置校验）
- 阻塞条件：若发现 `env.ts` 的规则本身有问题（如需改校验），停止并上报

## 建议执行档位
`sonnect`　理由：需读懂 env 校验逻辑并准确改写文档，非纯格式工作。

## 升级条件
若需改 `env.ts` 的校验规则 → `opus`。

## 预估规模
小（< 1 小时）

---

### ENV-01：启动链路固化

## 归属
- 所属切片：S2
- 来源需求：M-4（能正常启动）、M-5（端口不混用）
- 来源方案：`02-未实现需求核查.md` §3.1、§3.2

## 目标
`npm start` 后服务可用；缺条件时**在监听端口之前**失败并给出可复制的修复命令。

## 输入
- 契约：启动契约（`docs/V2.1-20261029/02-契约与不变量.md` §二）
- 前置任务：DOC-01
- 前置状态：`.env.example` 已与 `env.ts` 对齐

## 输出
- `scripts/start-next.mjs`：env 校验前置到 spawn 前
- `scripts/check-db.mjs`（新建）：DB 迁移状态检测
- `docs/design/06_validation/evidence/V22/ENV-01/{execution.md,before-after.json}`

## Execution Steps
1. [ ] 读 `scripts/start-next.mjs`，定位 spawn 调用位置
2. [ ] 在其之前插入 env 校验（复用 `src/lib/env.ts` 的规则，但不 import Next 运行时）
3. [ ] 新建 `scripts/check-db.mjs`：连 `DATABASE_URL`，查 `sqlite_master` 是否含 `CronJob`/`Setting`/`User` 三表
4. [ ] 缺表时打印 `npm run db:deploy && npm run db:seed` 并 exit 1
5. [ ] 三情形实测：正常 / 缺 env / DB 未迁移

## 验收标准
- [ ] 缺 `ENCRYPTION_KEY` 时 exit ≠ 0 且**端口未监听**
- [ ] DB 未迁移时 exit ≠ 0，输出含 `db:deploy`
- [ ] 正常情形 200
- [ ] 未改 `src/lib/env.ts`

## 验证命令
```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"

# 1) 缺 env → 不监听
PORT=6789 NODE_ENV=production node scripts/start-next.mjs; echo "exit=$?"
netstat -ano | grep ":6789 " | grep LISTENING || echo "PASS 端口未监听"

# 2) DB 未迁移
mv prisma/dev.db /tmp/dev.db.bak 2>/dev/null
PORT=6789 NODE_ENV=production ENCRYPTION_KEY=x0123456789abcdef0123456789abcdef \
APP_ORIGIN=http://127.0.0.1:6789 node scripts/start-next.mjs 2>&1 | grep -c "db:deploy"
mv /tmp/dev.db.bak prisma/dev.db 2>/dev/null

# 3) 正常
PORT=6789 NODE_ENV=production ENCRYPTION_KEY=x0123456789abcdef0123456789abcdef \
APP_ORIGIN=http://127.0.0.1:6789 node scripts/start-next.mjs &
sleep 8 && curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:6789/
```

## 证据路径
`docs/design/06_validation/evidence/V22/ENV-01/`

## 允许修改
- `scripts/start-next.mjs`
- `scripts/check-db.mjs`（新建）
- `docs/design/06_validation/evidence/V22/ENV-01/**`

## 禁止修改
- `src/**`
- `package.json`（`start` 语义不变）
- `prisma/**`

## 依赖与阻塞
- Depends on：DOC-01
- Blocks：ENV-02、E1

## 建议执行档位
`sonnect`

## 升级条件
若需改 `package.json` 的 `start` 脚本 → `opus`。

## 预估规模
中（2~3 小时）

---

### ENV-02：端口自证

## 归属
- 所属切片：S2
- 来源需求：M-5、I-1（不被其它项目误导）
- 来源方案：`02-未实现需求核查.md` §3.3

## 目标
一条 curl 即可确认「打开的是 HDwebsite 而不是 Aidean」。

## 输入
- 契约：`/api/health` 须含 `app: "hdwebsite"` 与 `port`
- 前置任务：ENV-01
- 前置状态：ENV-01 已合并

## 输出
- `src/app/api/health/route.ts`：追加 `app` 与 `port` 字段（不改已有字段）
- `scripts/start-next.mjs`：启动日志打印身份块
- `docs/design/06_validation/evidence/V22/ENV-02/execution.md`

## Execution Steps
1. [ ] 读 `src/app/api/health/route.ts` 当前返回体，记录字段
2. [ ] 追加 `app: "hdwebsite"`、`port`
3. [ ] 在 `start-next.mjs` 启动成功后打印标识块
4. [ ] 实测 curl 断言

## 验收标准
- [ ] `curl /api/health` 输出含 `"app":"hdwebsite"`
- [ ] 含 `"port":6789`
- [ ] 已有字段未变
- [ ] 启动日志含 `弘道教育` 与 `6789`

## 验证命令
```bash
curl -s http://127.0.0.1:6789/api/health | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const j=JSON.parse(s); const b=j.data??j;
  if(b.app!=='hdwebsite') throw new Error('FAIL app='+b.app);
  if(Number(b.port)!==6789) throw new Error('FAIL port='+b.port);
  console.log('PASS', JSON.stringify(b));
})"
```

## 证据路径
`docs/design/06_validation/evidence/V22/ENV-02/`

## 允许修改
- `src/app/api/health/route.ts`
- `scripts/start-next.mjs`
- `docs/design/06_validation/evidence/V22/ENV-02/**`

## 禁止修改
- 其它 API 路由、`src/contracts/**`、前台

## 依赖与阻塞
- Depends on：ENV-01
- Blocks：E1

## 建议执行档位
`haiku`

## 升级条件
若 `/api/health` 不存在需新建且涉及鉴权 → `sonnect`。

## 预估规模
小（< 1 小时）

---

### AUD-01：前台 className 差异全量审计

## 归属
- 所属切片：S3
- 来源需求：M-1（前台视觉与 main 一致）、I-3（差异有据可查）
- 来源方案：`docs/V2.1-20261029/02-契约与不变量.md` §四

## 目标
对 **59 个前台文件**逐一定性「合规 / 有据例外 / 无据改写」。

## 输入
- 契约：审计契约（值集合 diff，非行数 diff）
- 对照基线：`origin/main@94dbbbb`
- 前置任务：无
- 前置状态：HEAD = `79df243`

## 输出
- `evidence/V22/AUD-01/audit.json`
- `evidence/V22/AUD-01/matrix.md`
- `evidence/V22/AUD-01/execution.md`

## Execution Steps
1. [ ] `git ls-files 'src/app/(web)/' 'src/components/web/'` 列 59 个文件（**不得用路径猜测**——见 `01-自我纠错与台账可信度.md` §二）
2. [ ] 每文件提取 `className="…"` 值集合（`grep -oE 'className="[^"]*"' | sort -u`）
3. [ ] `comm` 求两侧差集
4. [ ] 每个差异值判三档，有据档须引 ADR/卡片/用户裁决出处
5. [ ] 输出 audit.json + matrix.md

## 验收标准
- [ ] 覆盖 59 文件，无遗漏
- [ ] 每个差异值有档位，无「待定」
- [ ] 「有据」档附出处（ADR 编号或 `文件:行`）
- [ ] 「无据」档汇总交 AUD-02
- [ ] `git status --short src/` 为空

## 验证命令
```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"
node -e "
const a=require('./docs/design/06_validation/evidence/V22/AUD-01/audit.json');
const f=a.files||[];
console.log('文件数',f.length);
if(f.length!==59) throw new Error('覆盖不全 '+f.length);
const und=f.filter(x=>x.verdict==='undocumented');
console.log('无据改写',und.length,und.map(x=>x.path).join(','));
const noRef=f.filter(x=>x.verdict==='documented'&&!x.evidenceRef);
if(noRef.length) throw new Error('有据档缺出处 '+noRef.length);
console.log('PASS');
"
test -z "$(git status --short src/)" && echo "PASS src 未改"
```

## 证据路径
`docs/design/06_validation/evidence/V22/AUD-01/`

## 允许修改
- `docs/design/06_validation/evidence/V22/AUD-01/**`
- `.cache/v22-aud/**`

## 禁止修改
- `src/**`（只审计不改码）
- `tests/**`、`prisma/**`

## 依赖与阻塞
- Depends on：无
- Blocks：AUD-02、E1

## 建议执行档位
`opus`　理由：需判断"className 变化是设计改进还是违规"，属视觉语义判断。

## 升级条件
无据改写 > 10 个文件 → `fable`。

## 预估规模
中（3~4 小时）

---

### AUD-02：FourCards 结构性改写归因

## 归属
- 所属切片：S3
- 来源需求：M-1
- 来源方案：`02-未实现需求核查.md` §4.2

## 目标
判定 `relative flex-1` → `absolute inset-0 …` 是缺陷、合规还是待裁决，并给出处置。

## 输入
- 已确认事实：见 `02-未实现需求核查.md` §4.2
- 前置任务：AUD-01
- 前置状态：AUD-01 已产出无据清单

## 输出
- `evidence/V22/AUD-02/attribution.md`
- 若判合规：`docs/design/03_solution/decisions/ADR-040-*.md`
- 若判缺陷：`ADR-041-*.md` + 回滚方案（**需用户批准后执行**）

## Execution Steps
1. [ ] `git log --oneline -S "absolute inset-0 bg-cover bg-center" -- src/components/web/FourCards.tsx` 找引入提交
2. [ ] 读该提交 message 与关联卡片（V18/A3 或 A4）
3. [ ] 检查 `bgImage` 配置键是否正是通过该绝对定位层实现
4. [ ] 对比两版渲染（截图 + 计算样式）
5. [ ] 判定并输出

## 关键判断点

`absolute inset-0 bg-cover bg-center` 很可能正是 **`bgImage` 能力**（V1.8 A3 恢复的 props）的实现方式。若成立 → 属**有需求来源但缺 ADR**，应判「合规 + 补 ADR」，而非「缺陷回滚」。

## 验收标准
- [ ] 找到引入提交 hash 与 message
- [ ] 说明该改写与 `bgImage` 配置键的关系（有/无）
- [ ] 结论明确：合规 / 缺陷 / 待裁决
- [ ] 若判缺陷，回滚方案须说明影响面且经用户批准

## 验证命令
```bash
git log --oneline -S "absolute inset-0 bg-cover bg-center" -- src/components/web/FourCards.tsx
test -f docs/design/06_validation/evidence/V22/AUD-02/attribution.md && echo "PASS"
```

## 证据路径
`docs/design/06_validation/evidence/V22/AUD-02/`

## 允许修改
- `docs/design/06_validation/evidence/V22/AUD-02/**`
- `docs/design/03_solution/decisions/ADR-04*.md`（新建）
- `src/components/web/FourCards.tsx`（**仅当判缺陷且用户批准**）

## 禁止修改
- 其它前台文件
- 历史目录与证据

## 依赖与阻塞
- Depends on：AUD-01
- Blocks：E1
- 阻塞条件：回滚须用户批准

## 建议执行档位
`opus`

## 升级条件
需回滚且影响多页 → `fable`。

## 预估规模
小（1~2 小时）

---

### PAR-01：功能对等独立复核（方法修正版）

## 归属
- 所属切片：S4
- 来源需求：M-2（main 的功能不缺失）
- 来源方案：`01-自我纠错与台账可信度.md` §三

## 目标
把台账的「missing=0（部分确认）」推到「已确认」，方法上**禁止路径猜测**。

## 输入
- 台账：`docs/design/02_requirements/parity-matrix.md`（57 行主表 + F 节 11 项）
- 已确认：`comm -23` 证明前台文件零丢失
- 前置任务：无
- 前置状态：HEAD = `79df243`

## 输出
- `evidence/V22/PAR-01/parity.json`（57 + 11 项，逐项）
- `evidence/V22/PAR-01/matrix.md`
- `evidence/V22/PAR-01/defects.md`

## Execution Steps
1. [ ] 解析 parity-matrix 的 57 行主表，提取每行的「upgrade 证据」字段
2. [ ] **用 `git ls-files` 与 `grep -rl` 反查证据路径**，不得凭命名推断（见自我纠错 §二）
3. [ ] 对 `present` 项：验证 ①路径存在 ②若可行做一次运行时调用
4. [ ] 对 `replaced` 7 项：验证 ADR 是否真的覆盖原功能
5. [ ] F 节 11 项同样处理
6. [ ] 输出 parity.json

## 验收标准
- [ ] 68 项（57+11）全部有结论
- [ ] 每项证据路径经 `git ls-files` 或 `grep -rl` 反查命中
- [ ] 「路径存在但行为未验证」的项须标注 `present-unverified`，不得算作已确认
- [ ] `missing` 数为 0，或每个附理由

## 验证命令
```bash
node -e "
const p=require('./docs/design/06_validation/evidence/V22/PAR-01/parity.json');
const r=p.items||[];
console.log('总数',r.length);
if(r.length!==68) throw new Error('覆盖不全 '+r.length);
const by={};r.forEach(x=>by[x.verdict]=(by[x.verdict]||0)+1);
console.log(JSON.stringify(by));
const miss=r.filter(x=>x.verdict==='missing');
if(miss.length){console.log('缺失:',miss.map(x=>x.id).join(','));process.exit(1);}
console.log('PASS');
"
```

## 证据路径
`docs/design/06_validation/evidence/V22/PAR-01/`

## 允许修改
- `docs/design/06_validation/evidence/V22/PAR-01/**`
- `.cache/v22-par/**`

## 禁止修改
- `src/**`（只复核不改码）
- `docs/design/02_requirements/parity-matrix.md`（**台账只读，结论写进 evidence，不改台账**——避免自证循环）

## 依赖与阻塞
- Depends on：无
- Blocks：PAR-02、E1
- 阻塞条件：运行时验证需服务可用 → 依赖 ENV-01；不可用时标 `present-unverified`

## 建议执行档位
`opus`

## 升级条件
发现真缺失 → `fable` 决定是否补实现。

## 预估规模
大（6~8 小时）

---

### PAR-02：前台零丢失复核

## 归属
- 所属切片：S4
- 来源需求：M-2
- 来源方案：`docs/V2.1-20261029/00-规划快照与事实基线.md` §2.5

## 目标
确认 origin/main 的 16 页 + 27 组件在 HEAD 全部存在，新增组件有用途说明。

## 输入
- 已确认：`comm -23` 空
- 前置任务：PAR-01

## 输出
- `evidence/V22/PAR-02/inventory.md`

## Execution Steps
1. [ ] `git ls-tree -r --name-only origin/main -- "src/app/(web)/" "src/components/web/"` 列 main 侧
2. [ ] `git ls-files "src/app/(web)/" "src/components/web/"` 列 HEAD 侧
3. [ ] `comm -23` 确认零缺失
4. [ ] 对新增 `ChatWidget`/`MarkdownRenderer`/`UserActionTracker`/`data/*` 说明用途与视觉影响
5. [ ] 输出 inventory.md

## 验收标准
- [ ] `comm -23` 输出 0 行
- [ ] 新增组件有用途说明
- [ ] 新增组件不改变既有区块视觉，或已由 ADR-039/`79df243` 覆盖

## 验证命令
```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"
comm -23 <(git ls-tree -r --name-only origin/main -- "src/app/(web)/" "src/components/web/" | sort) \
         <(git ls-files "src/app/(web)/" "src/components/web/" | sort) | wc -l
# 期望 0
```

## 证据路径
`docs/design/06_validation/evidence/V22/PAR-02/`

## 允许修改
- `docs/design/06_validation/evidence/V22/PAR-02/**`

## 禁止修改
- `src/**`

## 依赖与阻塞
- Depends on：PAR-01
- Blocks：E1

## 建议执行档位
`sonnect`

## 升级条件
发现缺失 → `opus`。

## 预估规模
小（< 1 小时）

---

### E1：V2.2 收口

## 归属
- 所属切片：S5
- 来源需求：全部
- 来源方案：本文件

## 目标
8 卡终态 + 定向检查（**不做全量回归**）+ 双端一致。

## 输入
- 前置任务：DOC-01、ENV-01、ENV-02、AUD-01、AUD-02、PAR-01、PAR-02
- 前置状态：全部 done

## 输出
- `docs/V2.2-20261029/state.json` 全部 done
- `docs/V2.2-20261029/CHANGELOG.md`
- 双端 `0 0`

## Execution Steps
1. [ ] 终态核对
2. [ ] 逐卡定向检查汇总
3. [ ] 冻结面复核（`src/contracts`/`prisma`/`package.json` 零改动）
4. [ ] changelog
5. [ ] 推送（需凭据）

## 验收标准
- [ ] 8/8 done
- [ ] `git diff 79df243..HEAD --stat -- src/contracts/ prisma/ package.json` 为空
- [ ] 双端 0 0

## 验证命令
```bash
node -e "const s=require('./docs/V2.2-20261029/state.json');if(Object.values(s).some(v=>v.status!=='done'))process.exit(1);console.log('done')"
git diff 79df243..HEAD --stat -- src/contracts/ prisma/ package.json
test "$(git rev-list --left-right --count origin/upgrade...HEAD | tr -d ' \t')" = "00" && echo "PASS 双端一致"
```

## 证据路径
`docs/design/06_validation/evidence/V22/E1/`

## 允许修改
- `docs/V2.2-20261029/state.json`、`CHANGELOG.md`
- `docs/design/06_validation/evidence/V22/E1/**`

## 禁止修改
- `src/**`、`tests/**`、`prisma/**`

## 依赖与阻塞
- Depends on：全部 7 卡
- 阻塞条件：推送需凭据

## 建议执行档位
`haiku`

## 升级条件
有卡未 done → `sonnect`。

## 预估规模
小（1 小时）

---

## 三、依赖 DAG

```text
S1                  S3
 ┌──────────┐        ┌──────────┐      ┌──────────┐
 │  DOC-01  │        │  AUD-01  │─────►│  AUD-02  │
 └────┬─────┘        └──────────┘      └────┬─────┘
      │                                     │
S2    ▼                                     │
 ┌──────────┐      ┌──────────┐             │
 │  ENV-01  │─────►│  ENV-02  │             │
 └────┬─────┘      └────┬─────┘             │
      │                 │                   │
S4    │           ┌──────────┐      ┌───────┴──┐
      │           │  PAR-01  │─────►│  PAR-02  │
      │           └────┬─────┘      └────┬─────┘
      │                │                 │
      └────────────────┴─────────────────┴──────► ┌──────────┐
                                                   │    E1    │
                                                   └──────────┘
```

**环检测：0 环。**

---

## 四、并行判定（机械规则）

可并行 ⟺ ① 无共享可变状态 ∧ ② 契约已冻结且机器可校验 ∧ ③ 文件所有权不相交 ∧ ④ 不共用同一迁移版本号

| 卡 | ① | ② | ③ | ④ | 判定 |
|---|:-:|:-:|:-:|:-:|---|
| DOC-01 | ✓ 改 `.env.example` | ✓ | ✓ | ✓ | **可并行** |
| ENV-01 | ✓ 改 `scripts/` | ✓ | 与 DOC-01 不相交 | ✓ | 需 DOC-01 先（env 列表规范）→ **串行** |
| ENV-02 | ✓ 改 `api/health` + `scripts/` | ✓ | 与 ENV-01 重叠 `start-next.mjs` | ✓ | 需 ENV-01 → **串行** |
| AUD-01 | ✓ 只读 + evidence | ✓ | ✓ | ✓ | **可并行** |
| AUD-02 | ✓ 可能改 FourCards | ✓ | 与 AUD-01 只读冲突 | ✓ | 需 AUD-01 → **串行** |
| PAR-01 | ✓ 只读 + evidence | ✓ | ✓ | ✓ | **可并行** |
| PAR-02 | ✓ 只读 + evidence | ✓ | ✓ | ✓ | 需 PAR-01 → **串行** |
| E1 | ✗ 改 state.json | — | — | — | **串行，最后** |

**三组真并行**：`DOC-01` ‖ `AUD-01` ‖ `PAR-01`。

依据：三者文件所有权不相交（`.env.example` / `src/components/web`（只读）/ `src/app/api`（只读）+ 各自 evidence 目录），契约均已在既有文档冻结，本轮无迁移。

---

## 五、所有权矩阵

| 路径 | DOC-01 | ENV-01 | ENV-02 | AUD-01 | AUD-02 | PAR-01 | PAR-02 | E1 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `.env.example` | **W** | — | — | — | — | — | — | — |
| `scripts/start-next.mjs` | — | **W** | W | — | — | — | — | — |
| `scripts/check-db.mjs` | — | **W** | — | — | — | — | — | — |
| `src/app/api/health/route.ts` | — | — | **W** | — | — | — | — | — |
| `src/app/api/**`（其余） | — | — | — | — | — | **R** | — | — |
| `src/app/(web)/**` | — | — | — | **R** | — | **R** | **R** | — |
| `src/components/web/**` | — | — | — | **R** | ⚠️W* | **R** | **R** | — |
| `docs/design/03_solution/decisions/ADR-04*.md` | — | — | — | — | **W** | — | — | — |
| `evidence/V22/<卡号>/**` | **W** | **W** | **W** | **W** | **W** | **W** | **W** | **W** |
| `docs/V2.2-20261029/state.json` | — | — | — | — | — | — | — | **W** |

⚠️ `W*`：AUD-02 对 `FourCards.tsx` 的写权限**仅在判缺陷且用户批准回滚后生效**，默认不写。

**重叠点与处置**：

| 重叠 | 卡 | 处置 |
|---|---|---|
| `scripts/start-next.mjs` | ENV-01 + ENV-02 | 串行（ENV-02 依赖 ENV-01） |
| `src/components/web/FourCards.tsx` | AUD-01(R) + AUD-02(W*) | 串行（先审计后改） |

**除上述两处，无重叠。**

---

## 六、档位与成本

| 卡 | 档位 | 理由 | 升级条件 |
|---|---|---|---|
| DOC-01 | `sonnect` | 需读懂 env 校验并准确改写 | 改 `env.ts` → opus |
| ENV-01 | `sonnect` | 脚本改动清晰 | 改 `package.json` → opus |
| ENV-02 | `haiku` | 追加两字段 | 新建 health 含鉴权 → sonnect |
| **AUD-01** | `opus` | 59 文件视觉语义判断 | 无据 > 10 → fable |
| **AUD-02** | `opus` | 视觉语义 + 处置决策 | 回滚多页 → fable |
| **PAR-01** | `opus` | 68 项对等判断 | 发现真缺失 → fable |
| PAR-02 | `sonnect` | 清单比对 | 发现缺失 → opus |
| E1 | `haiku` | 核对 + 文档 | 有卡未 done → sonnect |

| 切片 | 卡数 | haiku | sonnect | opus | fable |
|---|---:|---:|---:|---:|---:|
| S1 | 1 | 0 | 1 | 0 | 0 |
| S2 | 2 | 1 | 1 | 0 | 0 |
| S3 | 2 | 0 | 0 | 2 | 0 |
| S4 | 2 | 0 | 1 | 1 | 0 |
| S5 | 1 | 1 | 0 | 0 | 0 |
| **合计** | **8** | **2** | **3** | **3** | **0** |

**券制度**：opus 每切片 ≤3（S3 用 2、S4 用 1）；fable 每切片 ≤1（本轮 0）。

**核心/高难度由我本人做**：AUD-01、AUD-02、PAR-01。

---

## 七、执行顺序

| 批 | 卡 | 并行性 | 预估 |
|---|---|---|---|
| 批 1 | **DOC-01** ‖ **AUD-01** ‖ **PAR-01** | 三卡可同时下发 | 1h / 3~4h / 6~8h |
| 批 2 | ENV-01 ‖ AUD-02 ‖ PAR-02 | 各依赖批 1 | 2~3h / 1~2h / 1h |
| 批 3 | ENV-02 | 依赖 ENV-01 | 1h |
| 批 4 | E1 | 串行 | 1h |

**关键路径**：`PAR-01(8h) → PAR-02(1h) → E1(1h)` ≈ 10 小时。

---

## 八、熔断

同一卡连续 2 次验收失败 → 停止改码，改为重写任务书 / 升级档位 / 标 blocked。**禁止换提示词硬撞第 3 次。**
