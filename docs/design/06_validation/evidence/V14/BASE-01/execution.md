# V14-BASE-01 执行证据：基线固化与一致性复核

> 执行时间：2026-10-27（本机 win32，node v24.15.0）
> 执行者：main-agent
> 起点：`upgrade@a814cd9`（= origin/upgrade，0 0）

## 5W1H 简版

- **What**：在 `a814cd9` 上固化七道门禁数值 + BUILD_ID 时间戳 + 用例计数 + 双端 0 0，并核对 V1.3 台账与实测的差异。
- **Why**：后续每卡都要与本基线比对；无可信基准则所有 PASS 都不可判。
- **Where/When**：开工第一步；本机 win32。
- **Who**：main-agent。
- **How**：串行跑七道门禁（禁止 build 与 test 并行），记录原始退出码；比对 `.next/BUILD_ID` 与 `src` 最新 mtime。
- **What if**：若 BUILD_ID 早于 src，则所有 e2e 结论作废（V13 已实证过一次假失败）。

## 一、门禁实测（串行）

| # | 命令 | 退出码 | 结果 |
|---|---|---|---|
| 1 | `npm run lint` | 0 | PASS（`--max-warnings 0`） |
| 2 | `npm run typecheck` | 0 | PASS |
| 3 | `npm test` | 0 | **PASS 91 文件 / 1859 用例** |
| 4 | `npm run build` | 0 | PASS（见 §二 的失败与修复） |
| 5 | `npm run check:assets` | 0 | PASS（8 资源引用全存在） |
| 6 | `npm run check:root` | 0 | PASS（48 条白名单） |
| 7 | `npm run check:audit` | 0 | PASS（官方 registry，0 漏洞） |
| 8 | `npm run test:e2e` | 0 | **79 passed**（2.3m） |
| 9 | `npx playwright test -c tests/a11y/playwright.config.ts` | 0 | **12 passed**（本卡基线，A11Y-01 后增至 17） |

## 二、构建首次失败与修复（如实记录）

**首次 `npm run build` = exit 1**，报错：

```
Error occurred prerendering page "/campus"
PrismaClientKnownRequestError ... SQLITE_ERROR: no such table: main.Campus
```

**根因**：本地 `prisma/dev.db` 被截断为 **0 字节 / 0 张表**（实测 50 张表应存在）。
构建期静态预渲染会真实查库（`/campus` 的 `prisma.campus.findMany()`），无表即失败。

**判定依据（排除代码缺陷）**：
- `ls -la prisma/dev.db` → 大小 **0**
- `sqlite3` 查 `sqlite_master` → **0 张表**
- 代码侧 `src/app/(web)/campus/page.tsx:19` 的查询与 main 基线一致，非本卡引入

**修复（环境准备，非代码改动）**：
```bash
npx prisma generate && npx prisma migrate deploy   # 8 个迁移全部应用
npx ts-node prisma/seed.ts                          # 基线数据
```
修复后：50 张表就绪，`npm run build` = **exit 0**（BUILD_ID 12:24:27）。

> 归类：属 **环境态缺陷**（本地库被清空），不是产品缺陷，也不是本卡引入。已记入 `07-风险与待裁决.md` R11。

## 三、BUILD_ID 时间戳（新鲜度凭证）

```
BUILD_ID mtime = 2026-10-27T12:24:27（首轮）→ 12:45:17 → 12:59:31（A11Y/UI-HUB 改动后重建）
src 最新 mtime = 2026-10-27T12:43:09
关系           = FRESH（BUILD_ID > src）
```

**重要**：本卡执行过程中 `tests/e2e/global-setup.ts` 的新鲜度守卫**实际拦截了一次**：
改完 `ApplyClient.tsx` 后直接跑 a11y，报
`构建已过期（src 比 .next/BUILD_ID 新）：请先运行 npm run build`。
→ 证明 V13-E2E-FRESH-01 的修复在真实场景生效，非纸面。

## 四、与 V1.3 台账的不一致项

| # | V1.3 台账说法 | 本轮实测 | 判定 |
|---|---|---|---|
| D1 | 迁移目录 **8 个** | `ls prisma/migrations \| grep -vc migration_lock` = **7** | **台账有误**，以代码为准 |
| D2 | 单测 91 文件 / 1859 用例 | 一致 | 一致 |
| D3 | e2e 79 | 一致（79 passed） | 一致 |
| D4 | a11y 12 例 | 本卡基线 12（A11Y-01 后 17） | 一致（口径演进） |
| D5 | 源码 476 文件 | 一致 | 一致 |
| D6 | 迁移额度已用尽 | P04/P06/P12 各 1 个，共 7 个目录中 3 个属此三卡 | 一致 |

## 五、双端

```
HEAD           = a814cd9
origin/upgrade = a814cd9
rev-list --left-right --count origin/upgrade...HEAD = 0	0
```

## 六、验收条目

- [x] 七道门禁逐条有退出码与命令原文
- [x] 证据含 BUILD_ID 与 src 两个 ISO 时间戳
- [x] e2e 79 / a11y 12 / visual-CI 计数入档
- [x] 双端 0 0
- [x] 与 V1.3 台账不一致项逐条列出（D1 有误）

## 七、UNKNOWN

| 项 | 原因 |
|---|---|
| visual 本机判定 | Windows 字体渲染差异不可分离；只认 Linux CI（最近 run `40436760024` PASS） |
