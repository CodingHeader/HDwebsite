# C2 · API 缓存策略

## 归属
- 阶段编号：C2
- 所属分组：C 技术债（V1.7 P2-2）
- 来源凭据：`V1.7/02-能力退化清单与定级.md §P2-3`

## 目标
给适合缓存的只读接口加 HTTP 缓存头，减少重复查询。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// 全部 API 路由均 force-dynamic
src/app/api/**/route.ts  → 126 个文件
// 统一包装器
src/lib/api-handler.ts:146  export function withApi<P>(handler, options: Options = {})
```

### ② 实测证据
```bash
$ grep -rln "force-dynamic" src/app/api --include=route.ts | wc -l
126                     ← 100% 全部动态

$ grep -rn "Cache-Control" src/app/api --include=route.ts | wc -l
4                       ← 仅 4 处有缓存头

# 原版
$ grep -rln "force-dynamic" hdwebsite_0429/src/app/api --include=route.ts | wc -l
1                       ← 原版几乎不声明
$ grep -rn "Cache-Control" hdwebsite_0429/src/app/api --include=route.ts | wc -l
（需核实）
```

### ③ 规划落点
- **注意：这不是"退化"，是"优化空间"** —— 原版也没有 API 缓存
- 故列为 C 组（技术债）而非 A 组（能力对等）

## 输入
- 前置阶段：**无**（独立）
- 前置状态：任意

## 输出
- 修改：`src/lib/api-handler.ts`（可选，加 `cache` 选项）
- 或修改：若干只读路由（逐个加头）

## ⚠️ 必须先做风险评估

**改 `api-handler.ts` 影响 52 个使用 `withApi` 的路由。** 这是本阶段最大风险。

| 风险 | 后果 |
|---|---|
| 给写接口加了缓存 | 数据不一致（最严重） |
| 给鉴权接口加了 public 缓存 | 越权泄漏 |
| 缓存了实时数据（如 logs） | 用户看到旧数据 |

## 执行步骤

| 步骤 | 内容 |
|---|---|
| STEP-C2-1 | 盘点：哪些接口是"只读 + 非实时 + 非鉴权敏感" |
| STEP-C2-2 | 只给白名单接口加头，不改全局 `withApi` |
| STEP-C2-3 | 抽样验证 5 个路由的响应头 |
| STEP-C2-Z | 体检（含 `npm test`） |

## 白名单筛选标准（三条全满足才可加）

1. **只读**：仅 GET，无副作用
2. **非实时**：数据变化频率 < 1 分钟可接受
3. **非鉴权敏感**：不含用户私有数据

**候选（需逐个核实）**：
- `/api/health`（探活，可 `no-store` 或极短）
- `/api/settings` GET 的 isPublic 部分
- 前台内容接口（`/api/articles` 匿名访问时）

**明确不加**：
- `/api/auth/**`（鉴权）
- `/api/logs`、`/api/notify-records`（实时）
- 任何写接口

## 为什么只加白名单，不改全局 `withApi`

**② 凭据**：`grep -c "withApi(" src/app/api --include=route.ts` → 52

**③ 推理**：全局加缓存 = 52 个路由全部受影响，其中至少 20 个是写接口或实时接口。**风险远大于收益。**

**正确做法**：只在具体路由里加 `headers`，不改包装器默认行为。

## 验收标准
- [ ] 每个加缓存的路由都在白名单里且有三条标准的核实记录（人工）
- [ ] 写接口**零**缓存头（可自动化：grep 所有 POST/PUT/PATCH/DELETE）
- [ ] 鉴权接口**零** public 缓存（可自动化）
- [ ] 抽样 5 个路由 `curl -I` 能看到预期头（可自动化）
- [ ] `npm test` 通过（**api-handler 有单测覆盖**，必须跑）
- [ ] `npx tsc --noEmit` exit 0

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
# 写接口不得有缓存
grep -rn "Cache-Control" src/app/api --include=route.ts | grep -E "POST|PUT|PATCH|DELETE" && echo "违规" || echo "写接口无缓存 ✓"
# 抽样看头
for p in /api/health /api/articles /api/settings; do
  echo "--- $p"; curl -sI "http://127.0.0.1:6791$p" | grep -i "cache-control"; done
# 必须跑单测（api-handler 有覆盖）
npm test -- --run src/lib/__tests__/api-handler 2>/dev/null || npm test
npx tsc --noEmit
```

## 证据路径
`evidence/V18/C2/execution.md`

## 允许修改
- 白名单内的具体路由文件（逐个加 `headers`）
- 可选：`src/lib/api-handler.ts`（仅加可选参数，不改默认行为）

## 禁止修改
- 全局默认缓存策略
- 写接口、鉴权接口
- `src/contracts/**`、`prisma/**`

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：若盘点后发现**没有任何接口满足三条标准** → 整卡标 `N-A(无适用接口)`，不硬凑

## 建议执行档位
`opus`　理由：改 API 层影响面大，加错会导致数据不一致或越权

## 升级条件
若需要改 `withApi` 的默认行为 → 升级评估是否值得（52 路由受影响）

## 预估规模
中（3h，含盘点）

## 自我质疑

**质疑：原版也没有 API 缓存，为什么要加？**
→ 这确实是**性能优化**而非对等补齐。列在 C 组（技术债）而非 A 组。

**是否值得做？** 我的判断：**优先级最低**。
- ① 项目当前规模（126 路由，SQLite）下，API 缓存收益有限
- ② 风险（数据不一致）高于收益
- ③ 若有真实性能诉求，应先做 D1（Lighthouse 测量）确认瓶颈在哪

**建议**：C2 可**延后甚至不做**，除非 D1 测出 API 是瓶颈。

**质疑：那为什么还要写这个阶段？**
→ 因为它是 P2 待办之一，规划要"全量"。但我在卡里明确了「可能 N-A」和「优先级最低」，执行者可据此判断。
