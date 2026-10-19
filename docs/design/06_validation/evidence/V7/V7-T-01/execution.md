# V7-T-01 执行证据

> 卡：V7-T-01（测试隔离：kb-coze 不依赖 dev.db；docx 用例超时修复）
> 执行者：主代理　分支：`upgrade`（单主线）　状态：**PASS**

## 1. 5W1H 简版
- **What**：V0.7 规划基线 F3 记录干净检出 `npm test` 597/599，2 例失败：
  - `kb-coze.test.ts` 读未迁移 `prisma/dev.db` 报 `no such column Knowledge.baseId`
  - `kb-api.test.ts` docx 用例 5s 超时
- **Why**：`kb-sync.ts` 的 `processKbSyncQueue` 经 `pendingKbSync`（`prisma.knowledge.findMany`）与 `configureCozeBackendFromSettings`（`prisma.setting.findMany`）触真 DB；docx 用例首次加载 mammoth（动态 import）慢。
- **Where**：`src/lib/__tests__/lane-c/kb-coze.test.ts`、`kb-api.test.ts`。
- **When**：测试运行期；不改业务代码、不改 `vitest.config.ts`。
- **Who**：P2 档；主代理实现 + 子代理复审。
- **How**：spyOn prisma delegate（单用例内 mock + `vi.restoreAllMocks`）；`beforeAll` 预热 mammoth。

## 2. 改动文件
| 文件 | 类型 |
|---|---|
| `src/lib/__tests__/lane-c/kb-coze.test.ts` | 修改（queue 用例 spyOn `prisma.setting/knowledge.findMany`） |
| `src/lib/__tests__/lane-c/kb-api.test.ts` | 修改（`beforeAll` 预热 mammoth） |

**冻结面**：未修改 `vitest.config.ts`、`src/lib/**`（非 `__tests__`）、业务路由、`prisma/**`、`src/contracts/**`、`package.json`/锁文件。

## 3. 子代理复审（完成度 90%，建议补实测）
- PASS：两处修复静态证据链完整、mock 生命周期正确（单用例 + afterEach/restoreAllMocks 双保险）、冻结面零触碰。
- 建议：补一次"无 dev.db / 干净检出"下的 `npm test` 实测回归。

## 4. 实测回归（补齐 10%）
在 `prisma/dev.db` 为 **0 字节空文件**（未迁移，正是失败环境）下运行：
```bash
$ npm test
EXIT=0
 Test Files  44 passed (44)
      Tests  620 passed (620)
   Duration  14.18s
```
- 620 用例全绿（含本轮 SEC-01 新增 21 用例），比基线 597/599 更多。
- 未修改任何业务代码与 `vitest.config.ts`。
- 结论：干净检出下 `npm test` 已全绿，T-01 完成度 100%。

## 5. 验收逐条
| 验收 | 结果 |
|---|---|
| 干净检出 + 无 dev.db：npm test 全绿 | PASS（实测 620/620，dev.db 0 字节） |
| 不改 vitest.config.ts | PASS |
| 不改业务代码 | PASS |
| 提交触及文件 ⊆ 允许修改 | PASS（仅 2 个测试文件） |

## 6. UNKNOWN / 遗留
- 子代理建议：CI 极慢机 `beforeAll` 本身可能 5s hookTimeout（极低概率），后续 D-13 CI 落地时观测。
- `kb-coze.test.ts` 是 lane-c 中唯一不设 `DATABASE_URL` 的文件，已用 spyOn 规避，但结构上仍实例化默认 `file:./prisma/dev.db` 的 PrismaClient；建议后续补注释说明（非本卡验收项）。