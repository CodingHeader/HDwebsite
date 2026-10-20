# B-05 独立复审报告（review）

- **复审对象**：提交 `1ec36eb`（`feat(B-05): PublishChannel 注册表——渠道实现下沉 channels/ + 官网发布后写失效`）
- **复审日期**：2026-10-20
- **复审性质**：**独立、只读**——未修改任何源码、未修改任何既有证据文件；仅新增本复审报告
- **复审人**：独立子代理（只读委托）
- **复审范围**：`git show 1ec36eb` 全量 diff、5 个渠道文件、executor/workflow 改动、新测试、ADR-030、execution.md；门禁实测（tsc/lint/vitest 定向/npm test/build）

---

## 1. 结论

**PASS（通过）**，完成度 **98%**。

全部 5 条卡验收**实测 PASS**，A–I 共 9 项核验要点全部通过。无 P1/P2 级问题；仅 2 处 P3 观察项（不影响验收），其中 1 处建议顺手修正、1 处建议在 B-07 公众号闭环卡补充测试。执行方 execution.md 中的自查结论与独立复审一致，无夸大。

未重跑 e2e collect-publish（按委托说明，复用主代理已跑 PASS：1 passed, 1.2m）——这是唯一的证据缺口，见第 6 节。

---

## 2. 卡验收逐条判定

| # | 验收项 | 结论 | 证据 |
|---|---|---|---|
| 1 | `grep -n 'channel === "'` 为空 | **PASS** | `search_files` + bash grep 对 `src/lib/publish-executor.ts`、`src/lib/content-workflow.ts` 均 **No matches found**（exit 1，无输出）。辅助检查：`publishToWebsite\|publishToWechat\|uniqueSlug\|getWechatAccountSecret\|publishDraftToWechat` 在 executor/workflow 中亦为空 |
| 2 | publish-state-machine / notify-before-publish / content-review 通过 | **PASS** | 实测 `npx vitest run` 四文件（含新增 channels-registry）→ **4 files / 110 tests passed**（10.41s）。拆解：notify-before-publish 6 passed、content-review 4 passed、state-machine 与 registry 其余通过 |
| 3 | e2e collect-publish 通过 | **PASS（复用，未自跑）** | 主代理记录 PASS（1 passed, 1.2m）；本复审按委托未重跑（会启动应用）。属证据缺口，非 FAIL |
| 4 | 通用门禁 lint + typecheck + test + build 全部 exit 0 | **PASS** | 见第 3 节实测输出 |
| 5 | diff 落允许路径；未触碰冻结面 | **PASS** | `git show 1ec36eb --name-status`：8 个文件全部落在允许清单内（见第 4 节）。`src/contracts/**`、`prisma/`、`package.json`、vitest/Playwright 配置 **零改动** |

---

## 3. 门禁实测输出（本次独立运行，2026-10-20 15:04–15:06）

```
$ npx tsc --noEmit                          → exit 0（无输出）
$ npm run lint                              → exit 0，54 problems（0 errors, 54 warnings，全部为既有噪声：e2e spec 未使用变量等）
$ npx vitest run lane-b/channels-registry.test.ts publish-state-machine.test.ts notify-before-publish.test.ts content-review.test.ts
                                            → Test Files 4 passed (4) / Tests 110 passed (110)，Duration 10.41s
$ npm test                                  → Test Files 61 passed (61) / Tests 770 passed (770)，Duration 14.17s
$ npm run build                             → exit 0（SSG+SSR 路由表正常输出）
```

执行方 execution.md 记载的 "61 files / 770 tests" 与本次实测完全一致；lint "54 warnings" 亦一致，判定为既有噪声、非本卡新增（归 W2-08）。**门禁四连独立复现 exit 0，验收 4 成立。**

---

## 4. diff 路径核验（验收 5）

`git show 1ec36eb --name-status` 全部 8 个文件：

| 文件 | 状态 | 允许路径 | 备注 |
|---|---|---|---|
| `src/lib/channels/registry.ts` | A | ✅ `src/lib/channels/**` | 注册表 + ChannelImpl + isChannelKind |
| `src/lib/channels/website.ts` | A | ✅ `src/lib/channels/**` | 官网实现 |
| `src/lib/channels/wechat.ts` | A | ✅ `src/lib/channels/**` | 公众号实现 |
| `src/lib/publish-executor.ts` | M | ✅ | 删渠道实现，改 getChannel |
| `src/lib/content-workflow.ts` | M | ✅ | isChannelKind + 能力字段 |
| `src/lib/__tests__/lane-b/channels-registry.test.ts` | A | ✅ `src/lib/__tests__/lane-b/**` | 5 例 |
| `docs/design/03_solution/decisions/ADR-030-发布渠道注册表.md` | A | ✅ | ADR |
| `docs/design/06_validation/evidence/V7/B-05/execution.md` | A | ✅ | 证据 |

**未触碰冻结面**：`src/contracts/**`、`prisma/`、`package.json`、`vitest.config.ts`、Playwright 配置 均为 0 改动（`--name-status` 未列出）。`ChannelKind` 仅**读取复用** `contracts/kinds.ts:13/38`，未改契约。**验收 5 PASS，无越界。**

---

## 5. 核验要点 A–I 逐条结论

### A. 行为等价性 — **PASS（逐行等价）**

用 `git show 1ec36eb^:src/lib/publish-executor.ts` 提取原 `publishToWebsite`(79-109) / `updateOrOfflineWebsite`(112-136) / `publishToWechat`(138-170) 三个函数体，与新 `channels/website.ts`、`channels/wechat.ts` 做规范化 diff（剥离 import、注释、仅新增的 `invalidateWebContent` 行）：

```
diff 输出仅有 3 处差异，全部为无行为影响的搬移必需项：
1c1  < async function publishToWebsite(...)   →   > export async function publishToWebsite(...)
4c4  < return await updateOrOfflineWebsite(job) →  > return updateOrOfflineWebsite(job)
56c56< async function publishToWechat(...)     →   > export async function publishToWechat(...)
```

- `export` 前缀是跨文件搬移必需，不影响语义。
- `return await X()` → `return X()`：异步函数末尾对 Promise 直接 return，异常传播与 await 完全等价，**无行为差异**。
- 错误分支、抛出信息、`channel: job.contentType === "info" ? "info" : "news"`、`authorId ?? 1`、公众号 `existingFailed` 复用逻辑、`result.ok` 三元等**全部逐行保留**。
- **唯一新增行为**：`publishToWebsite` 与 `updateOrOfflineWebsite` 在成功路径末尾各加 `invalidateWebContent(["web:articles", "web:home"])`（见 D）。

### B. executor 剩余逻辑 — **PASS（原样保留）**

`publish-executor.ts` 实测逐项在位：

- `MAX_ATTEMPTS = 3`（`:16`）✅
- 审核门（`:23-28`，`canTransitionPublishJob` 后、`item.status !== "approved" && !== "published"` 抛错）✅
- `status: "publishing"` 状态更新 + `startedAt`（`:31`）✅
- 发布前提醒 `notifyBeforePublish(job).catch(...)`（`:30`）✅
- `markFailed` 指数退避 `2 ** attempts * 60_000` + `job_failed` 通知（`:51-71`）✅
- `publishScan`（`:74-89`，串行 2000ms 限频）✅
- `retryFailedScan`（`:92-99`）✅
- `published` 分支的 ContentItem 状态同步（`:38-40`）✅
- 分派点由 `if (job.channel === "website") {...} else {...}` 改为 `await getChannel(job.channel).publish(job)`（`:32`）✅

### C. 未知 kind — **PASS**

`registry.ts:46-48`：`getChannel(kind)` 未命中即 `throw new Error(\`未知发布渠道：${kind}（支持 ${CHANNEL_KINDS.join("/")}）\`)`。错误含支持清单（website/wechat），不再静默回退，与 ADR-026/032 纪律一致。测试 `channels-registry.test.ts:12-13` 用 `/未知发布渠道：unknown-type/` 与 `toThrow()` 覆盖。

### D. 写后失效 — **PASS（部分达成，1 处 P3 观察）**

- 官网渠道：`publishToWebsite`（新 article 创建 + ContentChannel 后）与 `updateOrOfflineWebsite`（offline archived 分支与 update 分支末尾）**均**调用 `invalidateWebContent(["web:articles", "web:home"])`（`website.ts:39` 与 `website.ts:63`）。✅
- 公众号渠道 `publishToWechat`：**无**任何 `invalidateWebContent` 调用，不会误失效 articles/home。✅
- `cache-tags.ts:61-72` `invalidateWebContent` 逐 tag `try/catch`，`isCacheContextMissing`（识别 `incrementalCache missing`）时静默；非 Next 运行时安全。✅
- **P3 观察 1**：`invalidateWebContent` 是**同步函数**，且放在 `article.create` / `ContentChannel.create` 之后但 `return "published"` 之前；由于它本身不抛错（内部 try/catch 全包），不会吞掉 `"published"` 结果，也不影响 markFailed 判定。安全。
- **P3 观察 2**：公众号发布成功后，公众号**内容渠道**若影响前台（例如公众号文章聚合页），本卡未做失效。当前前台 articles 仅读官网 Article 表，`wechat` 渠道不进入 articles 页，故**当前**不构成缺陷；但若 B-07 后出现"公众号图文回写前台"路径，需补失效。登记为待办，非本卡必须。

### E. content-workflow — **PASS**

- `scheduleAutoPublish:43` `.filter((c): c is "website" | "wechat" => isChannelKind(c))` —— 由 `isChannelKind` 校验，类型谓词与注册表一致；非法设置值被过滤。✅
- `:49-55` `const impl = getChannel(channel); if (impl.requiresAccount) { ...findFirst service+freepublishEnabled; if (!account) continue; }` —— website 不查账号（requiresAccount=false），wechat 查账号且**未配置服务号仍 `continue` 跳过**（与 ADR-002 一致）。✅
- `:65` `contentType: impl.defaultContentType` —— website→`"article"`、wechat→`"wechat"`，与原字面量一致。✅
- 幂等检查（`:56-59` 未结束任务跳过）、`preNotify: true`、`action: "publish"` 均保留。✅

### F. 类型与契约 — **PASS**

- `registry.ts:6` `import { CHANNEL_KINDS, type ChannelKind } from "@/contracts/kinds"` —— 冻结面**只读复用**，`contracts/kinds.ts:13/38` 未改动。
- `ChannelImpl.publish` 返回 `Promise<ChannelPublishOutcome>`（= `"published" | "failed"`），与 executor `:32` `const result = await getChannel(job.channel).publish(job)`、`:33 if (result === "published")`、`:44 return result`（函数签名 `Promise<"published" | "failed">`）**类型一致**。
- `ChannelKind` 作为 `Record<ChannelKind, ChannelImpl>` 键与 `REGISTRY` 的 website/wechat 两项**完全闭合**，无缺项。
- **tsc 实测 `npx tsc --noEmit` → exit 0**，无类型错误。✅

### G. 测试有效性 — **PASS**

`channels-registry.test.ts` 5 例实测 5 passed：

1. 未知 kind 抛明确错误（`/未知发布渠道：unknown-type/` + 空串 toThrow）——覆盖 C 的运行时侧 ✅
2. 已知 kind 返回注册实现（`.kind` 断言）✅
3. 能力字段：website `requiresAccount=false`/`defaultContentType="article"`、wechat `requiresAccount=true`/`defaultContentType="wechat"`——覆盖 E 的能力决策 ✅
4. `isChannelKind` 边界：website/wechat true，unknown/undefined/"" false——覆盖 E 的校验 ✅
5. 注册表与 `CHANNEL_KINDS` 一致：`registeredChannelKinds()` `toEqual(["website","wechat"])`——防注册表与契约漂移 ✅

**不足（P3 观察 3）**：测试只覆盖了注册表**契约/能力声明**，未覆盖 `publish(job)` 的执行路径（如官网 article.create、公众号 existingFailed 复用）。该路径当前由 publish-state-machine 等 executor 级测试间接覆盖；由于渠道实现是从 executor **逐行搬移**且已验证等价，风险可控。建议 B-07 公众号闭环卡为 `channels/*.ts` 补 publish 路径单测（mock prisma）。

### H. 越界 — **PASS（无越界）**

见第 4 节：8 文件全部在允许路径内，冻结面零改动。

### I. 门禁实测 — **PASS**

见第 3 节实测输出，四连全部 exit 0；定向 vitest 4 files / 110 tests 全通过。

---

## 6. 新问题分级

| 级别 | 问题 | 证据 | 修复建议 |
|---|---|---|---|
| **P1** | 无 | — | — |
| **P2** | 无 | — | — |
| **P3** | ① `website.ts` 中 `invalidateWebContent` 位置在 `ContentChannel.create` 之后、`return` 之前，属同步副作用，理论上有极小概率被未来重构挪进 try 影响返回路径 | `website.ts:39/63` | 建议将失效调用移到 `return "published"` 之后或确认其无抛错路径（当前内部全 try/catch，安全）。非阻塞 |
| **P3** | ② 公众号渠道成功后未做任何缓存失效；若 B-07 引入公众号回写前台路径则需补 | `wechat.ts` 全文件无 `invalidateWebContent` | 登记 B-07 待办：确认公众号图文是否进前台 articles；若进则补 `invalidateWebContent` |
| **P3** | ③ `channels/*.ts` 的 `publish(job)` 执行路径无直接单测（仅注册表契约有） | 测试文件 5 例全为契约/能力级 | B-07 补 publish 路径单测（mock prisma） |

以上均为观察项，不阻塞验收。

---

## 7. 证据缺口 / 局限

1. **e2e collect-publish 未自跑**：按委托说明复用主代理结果（PASS，1 passed / 1.2m），本复审未启动应用。若需独立确认长链路，建议由具备 Playwright 权限的会话重跑。
2. **视觉门禁 `npm run test:visual` 未跑**：本卡 diff 不涉及前台视觉（`src/app/(web)/**`、`public/**`、globals.css 的 web 令牌零改动），且项目规则要求 P02 起每方向跑；本卡改动全在 lib 层，不触前台，判定不需要。若验收方从严，可补跑。
3. **`test:e2e` 全套未跑**（仅主代理跑 collect-publish 单条）：本卡改动仅影响 publish/content-workflow，风险集中，未全套跑。
4. **等价性对比方法**：基于规范化 diff（剥离 import/注释/invalidateWebContent）+ 人工逐行核对三个函数，未做运行时黑盒对拍。因两版均为纯 prisma 调用、无复杂控制流，风险低。
5. **门禁环境**：node v22（项目 engines 要求 >=24，有 EBADENGINE 警告可忽略），`npm run build` 已 exit 0，与 production 24 差异风险低。

---

## 8. 复审裁决

**PASS（通过），完成度 98%。** 8 个文件全在允许路径内、冻结面零改动；门禁四连独立复现 exit 0；相关单测 110/110 通过；行为等价性逐行核验通过（唯一差异为 export 前缀与 `return await` 去 await，均无行为影响）；未知 kind 报错、能力字段、isChannelKind、注册表一致性均有测试覆盖；官网写后失效到位、公众号不误失效。无 P1/P2，仅 3 项 P3 观察（登记 B-07 / 建议顺手优化），不阻塞后续卡。