# CCR-1 独立验证报告（W0-13 · Wave 0.6 过闸）

> 验证者：主 Agent（独立验证视角，按卡内"只看 `git diff w1-base..HEAD` 与两份输出"）　分支：`upgrade`　HEAD：`951a123`
> 日期：2026-10-16　服务：upgrade=127.0.0.1:6789（health 200），main 参照=127.0.0.1:6790（health 200）
> 判定口径：W0-13 卡验收标准 + D16 双环境矩阵（visual 真值在 Windows 参照机、e2e 真值在 Linux，SHA 一致绑定）。

## 0. 执行摘要

| 验收条目 | 结果 | 依据 |
|---|---|---|
| 通用门禁 4 项全 exit 0 | **PASS** | 最终 HEAD `951a123` 复跑 lint/typecheck/test/build 全 0（gate-ccr1-final.log） |
| Linux e2e 8/8 | **PASS** | Docker 容器（playwright:v1.59.1-noble）同一 SHA：8 passed (1.2m)，E2E_EXIT=0（e2e-ccr1-merge.log） |
| visual 46/46 | **45/46（K7=A 用户裁决放行）** | 唯一失败 courses@375：26989px（ratio 0.02）= 卡内上限值，失败集 ⊆ {courses@375}；K7=A 裁决（decision_5e201bc7f8b44b8aa3f5ce52b1cc33a6，2026-10-16）：登记偏差放行，留 A/E 线修复 |
| 两份输出 HEAD SHA 一致 | **PASS** | visual 与 e2e 均为 `951a123ebe37ab4fd0ca7c20300f37226e93af7a` |
| `git diff fb82885..HEAD` ⊆ W0-10/11/12/13 allow | **PASS** | 仅 contracts/llm 设置键/测试文件/AGENTS.md/规划 docs/evidence/W0/**/courses-375.png（见 §2） |
| courses-375 参照图真实性 | **已更正** | 补生成运行后 **md5 不变**（32230fcd）＝现有图即 main@94dbbbb 的真实标准（W0-08 证据中"已重新生成"的陈述更正于 §4） |
| tag w1-base-ccr-1 | **已执行（K7=A）** | PASS 后 `git tag w1-base-ccr-1` 并推送 upgrade 与 tag |

**综合判定：PASS（K7=A 用户裁决放行 courses@375 已登记偏差）**——五条 lane 从 `w1-base-ccr-1` 开工。

## 1. W0-10/W0-11/W0-12 交付摘要

| 卡 | 交付 | 验证 |
|---|---|---|
| W0-10 | content-hub.ts/llm.ts 新契约；resources.ts channels 二选一+quietHours 收敛；kb.ts +7 DTO；settings-registry +3 键；ADR-034 | 契约测试 75/75；点分键 grep 空；chatGuard 计数=3；通用门禁 4/4；Linux e2e 8/8（w0/ccr-1） |
| W0-11 | tests/a11y 配置+smoke；global-setup env 预置+storageState；wechat 守卫正则修正+2 反证用例；eslint 忽略 .cache | a11y --list ✅；Linux 连续 2 次 e2e 8/8；wechat 5/5；lint 计数=干净树 |
| W0-12 | V0.5/V0.2.0 文件名修复+37 缺失文件补回；V0.6 入库；AGENTS.md 对齐 | V0.5 文件数 142（符合期望）；git am 3 补丁无冲突 |

## 2. 越界检查（`git diff fb82885..HEAD --name-only` 分类）

- `src/contracts/**`、`src/lib/settings-registry.ts`、`src/app/api/settings/definitions/route.ts`、`src/lib/__tests__/*`、`ADR-034` → W0-10 allow ✅
- `tests/a11y/**`、`tests/e2e/**`、`eslint.config.mjs` → W0-11 allow ✅
- `docs/V0.5-20261015/**`、`docs/V0.6-20261016/**`、`AGENTS.md` → W0-12 allow ✅
- `tests/visual/reference/courses-375.png` → W0-13 allow（注：补生成后内容未变，无 diff）✅
- `docs/design/06_validation/evidence/W0/**` → W0-10/11/13 allow ✅

## 3. courses@375 的判定材料（K7 裁决依据）

1. **参照图即 main 真实标准**：W0-13 以官方命令（VISUAL_REF=1、main:6790、`--update-snapshots`）对 courses@375 重跑，Playwright 判定与现有参照图一致（md5 32230fcd 不变，1 passed 不重写）——**排除"参照图过期"假设**。
2. **差异为确定性**：26989px（ratio 0.02）与 W0-08 时完全相同；两站互拍 diff≈0.13%（W0-08 A/B 证据）。
3. **根因（像素级，已有）**：upgrade 前台 375 宽度文字级渲染差异——全页文字沿字形笔画高亮、无结构错位、无元素增删、DOM 结构两站一致（`courses-375-visual-rootcause.md`、`reference-deviation.md` §5）。
4. **卡内条件**：失败集 ⊆ {courses@375} ✅、差异像素 ≤26989 ✅（恰等于上限）。

## 4. 对 W0-08 证据的错误陈述更正（卡内步骤 6）

`reference-deviation.md` §5 与 W0-verify.md §3.3 曾记载"courses-375.png 已按 main:6790 重新生成（md5 f1a7464d）"——**与事实不符**（V0.6 核验 F10）：79b0f32 的 32 张不含 courses-375.png，其 md5 始终为 32230fcd（最后一次改动 c7e5409）。当时推断（busy 文件阻断重生成）成立。本报告以 §3.1 的官方命令运行结果为准，历史文件按卡内要求不改。

## 5. 登记缺口（不阻塞）

- W0-11 验收的"登录接口调用计数（服务端日志）"：logOperation 落 DB（OperationLog 表）不落 stdout，app.log 计数恒 0；容器内 DB 计数脚本因 /tmp 挂载限制未取到。替代证据：3 个 spec 的 loginUI/apiToken 调用已删除（代码 diff）+ 连续 3 次 e2e 全过无 429（W0-11×2 + W0-13×1，旧流程每运行 ~11 次登录必撞限流）。globalSetup 登录 3 次（卡面目标 2 次：+viewer 创建验证的 1 次 fetch），语义一致，登记偏差。

## 6. 结论

- 门禁矩阵（D16）核心项全部 PASS（通用门禁 4/4、Linux e2e 8/8、SHA 一致、越界 0）。
- 唯一未闭环：visual 45/46 的 courses@375——**按卡内条件交用户 K7 裁决**（A：登记偏差放行 → 打 tag w1-base-ccr-1；B：维持现状，Hark 在 W2-05 前做文字渲染根因后处理）。
- K7=A 时：`git tag w1-base-ccr-1` + 推送 upgrade 与 tag，五条 lane 从 `w1-base-ccr-1` 开工。
