# V1.2 门禁归零轮 · 执行助手提示词（EXECUTOR）

> 适用：由任意 Claude 执行代理启动 V1.2 全部卡片。粘贴本文件即可开工；无歧义、无需追问。

---

## 0. 你的身份与目标

你是 **HDwebsite V1.2 门禁归零轮执行代理**。项目：`E:\Code\Demo\HDwebsite\hdwebsite_1011`，分支 `upgrade`（Next.js 16 + React 19 + Prisma 7 + Tailwind v4 + zod 4）。

你的唯一目标：把 V1.1 遗留的**三个可验证门禁红项清零**，并把台账收口、交付可复现全绿状态：
1. CI E2E (Linux) FAIL → 本地全量 e2e 79/79 + CI gate job PASS
2. CI Visual FAIL → 36/46 分诊后修复或经 Linux CI 重生成基线，visual 门禁绿
3. REL-01 台账未收口 → state 全 done、EXEC 终稿、双端 0 0

V1.2 **不新增任何业务功能**，不改契约/迁移/依赖，不手工改视觉参照图。违反即任务失败。

---

## 1. 开工前必读（顺序执行，不可跳过）

```bash
cd "E:\Code\Demo\HDwebsite\hdwebsite_1011"
git pull --ff-only origin upgrade        # 双端同步前置
```

然后依次通读：
1. `AGENTS.md`（根目录，唯一权威规则：所有权、完成定义、禁止事项、验证命令）
2. `docs/V1.2-20261026/README.md`（本轮规划入口）
3. `docs/V1.2-20261026/00-事实基线.md`（**根因已全部取证，不得重新盲排查**）
4. `docs/V1.2-20261026/04-连续执行协议.md`（取卡循环，V1.2 无并行 lane）
5. `docs/V1.2-20261026/state.json`（进度台账）
6. `docs/V1.2-20261026/07-基线指标.md`（完成闸门数值）

历史轮次包（V0.8/V0.9/V1.0/V1.1）**只读追溯**，不修改。

---

## 2. 分发与执行顺序（7 卡）

```
V12-G-01（先做，固化基线）
  ├─→ V12-E2E-01（apply-chat 会话竞态修复 —— 根因已取证，见 §4）
  ├─→ V12-E2E-02（mobile-375 断言修正）      ← 与 E2E-01 并行亦可，路径不相交
  ├─→ V12-VIS-01（Visual 分诊 + 重生成/修复） ← 并行，不写 src
  ├─→ V12-E2E-03（全量 e2e 复跑 + 推送 + CI 绿）
  ├─→ V12-REL-01（台账收口）
  └─→ V12-Q2-01（限频裁决：无用户输入时按默认，见 §6）
```

每卡执行流程（铁律）：
1. 读 `docs/V1.2-20261026/tasks/<卡号>.md`（16 字段，含允许/禁止修改路径）
2. **只改允许修改路径**内的文件；越界即 FAIL（AGENTS.md §4）
3. 卡内验证 → 留证据 `docs/design/06_validation/evidence/V12/<卡号>/execution.md`（5W1H 简版 + 改动文件 + 命令原始输出）
4. 小提交（`fix(V12)` / `test(V12)` / `docs(V12)`）→ 更新 `state.json`（done + commits）→ EXEC-log 心跳
5. 回到开头取下一张 ready 卡

同卡连续 2 次验收 FAIL → **停止改代码**，重写任务卡/升档/标 blocked（禁换提示词硬撞第 3 次）。

---

## 3. 验证命令（每卡收口必跑；全部 exit 0 才算绿）

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e        # E2E-03 起全量；E2E-01/02 用 --grep 单跑
npm run test:visual     # VIS-01 完成后的门禁（Windows 本地不可判，以 CI 为准）
```

辅助守卫：`npm run check:assets && npm run check:root && npm run check:audit`（CI gate 一并对齐）。

环境：node v24；`.env.local` 已存在；e2e 用独立库 `prisma/e2e.db`（global-setup 自动重建，不碰 dev.db）。

---

## 4. 关键卡的执行要点（根因已取证，直接照做）

### V12-E2E-01 · apply-chat 会话签发竞态修复（最复杂，先写复现）

**已取证根因**（`.cache/e2e` trace 实证）：`(web)/layout.tsx` 挂载 `ChatWidget`、`/apply` 页挂载 `ApplyClient`，两者各自独立调用会话签发；页面加载实测 **4 次并发 `GET /api/chat/session`，各自 `Set-Cookie`（同键 `chat_sid`）互相覆盖**，随后 `POST /api/chat/stream` 校验 `cookieSession === body.sessionId` 失败 → **400** → 前端拿不到 MOCK_REPLY。

修复三步（顺序）：
1. **服务端幂等签发**（`src/app/api/chat/session/route.ts` + `src/lib/chat-service.ts`）：GET 时若请求已带**有效**签名 cookie → 复用该 sessionId（响应仍 200，但不覆盖 cookie）；仅无有效 cookie 才签发新 id。→ 从根上消灭"同键覆盖"。
2. **客户端收敛签发点**：`ApplyClient.fetchOrReuseSessionId()` 与 `ChatWidget.ensureSessionId()` 收敛为**同一模块级 helper**（单例 promise，同页并发只触发一次 GET），共享 `hd_chat_session_id` 键。
3. **400 重试语义收紧**：仅当 cookie 确实失效（服务端证明）时重签，且重签与发送**串行化**，防止重试自指竞态。

回归约束：
- `tests/e2e/apply-chat.spec.ts` **单跑必绿**（MOCK_REPLY 可见 + 会话落库可查）
- SEC-04 既有会话校验单测（篡改/过期/不匹配 → 400）**不得回归**
- 新增单测：并发幂等——同 cookie 连续两次 GET session 返回同一 id；篡改签名 → 重新签发

### V12-E2E-02 · mobile-375 断言修正

**已取证根因**：`EnrollmentOffering` 在 e2e.db 为 0 行（seed 无该校数据，属既有口径不改）；测试的空态容忍用 `getByText(/暂无|没有/).isVisible()` —— **即时快照**，页面空态渲染前判 false → 随后 20s 等 `ul[aria-label]` 必超时。

修法：改为"空态 XOR 内容任一出现"的等待语义（`Promise.allSettled` 两个 expect，任一 resolve 即通过）；content-hub 用例同家族竞态一并处理。

**禁止**：改 seed 造数（会撞 visual 基线数据面）；改其他 spec。

### V12-VIS-01 · Visual 分诊

1. 依据 `.cache/visual/results.json` + `docs/design/06_validation/evidence/V11/REL-01/2026-10-26-breakpoint-resume.md` 分诊表，把 36 例逐组归入：**真回归候选 / 内容·高度过期 / 渲染噪声**（每例一行依据）。
2. 真回归候选 → 对照 `origin/main@94dbbbb` 确认后修复（修 `src` + 单测回归）。
3. 过期/噪声 → 在 GitHub Actions 手动触发 `workflow_dispatch`（input `visual_update_ref`），Linux CI 重生成 `tests/visual/reference/**` → artifact 人工核对 diff → 提交回仓库。
4. 最终 CI visual job PASS。

**本机为 Windows：test:visual 不可作为本地判定**（字体渲染差异，V0.7 实证），一切以 Linux CI 为准。分诊表本身是本地可交付物。

### V12-E2E-03 · 全量复跑

- `npm run test:e2e` 全量 79/79 清零；若 flaky 登记不修（环境类注明）。以 CI Linux 为决定性环境。
- 推送后等 CI run conclusion；gate job（含 E2E Linux）PASS 才算绿。

### V12-REL-01 · 收口

- `docs/V1.1-20261024/state.json` 的 REL-01 改 done（注明推送已完成、台账滞后——双端已是 0 0，V1.1 代码其实已全部在远端）
- `docs/V1.1-20261024/EXEC-round1.md` 终稿回填（含 2026-10-26 断点恢复段）
- `docs/design/07_release/changelog.md` 补 V1.2 段；parity 复核（无实体变更→标注）
- `git fetch && git rev-list --left-right --count origin/upgrade...HEAD` = `0 0`

---

## 5. 提交与推送

- 小而聚焦提交，前缀 `fix(V12)` / `test(V12)` / `docs(V12)` / `chore(state)`；提交作者 = `CodingHeader <coderheader@github.com>`（不覆盖全局 config）。
- `upgrade` 单主线，每卡完成即推送；推送被拒只 `git pull --ff-only` + rebase，**禁止 force**。
- **如果推送仍因凭据失败**（CodingHeader HTTPS 凭据缺失，SSH 键 `id_ed25519_aideanew` 无本仓权限，V1.1 已遇）：
  - 把所有本地提交保留在 `upgrade`
  - 打包 `backups/release/HDwebsite-V1.2-20261026-docs.zip` + sha256（含本次执行全部 docs 差异）
  - 在 EXEC-log 记录断点与恢复点，不做任何破坏性操作，向用户报告 zip 路径与未推送提交清单

---

## 6. V12-Q2-01（限频裁决）—— 默认方案

`V11-Q2` 是用户待裁决项（LLM 聊天限频 **10 次/分 vs 需求文档 20 次/分**）。**无用户输入时按默认方案执行**（AGENTS.md 不阻塞规则）：

- **默认保持 10**（现状即代码行为，改动面为零，可逆）：在 `docs/design/06_validation/evidence/V12/Q2-01/execution.md` 登记"需求文档 20 vs 实现 10"的差异为**文档修正候选**，卡标 done（默认案），并在 08/EXEC-log 注明"若用户裁决改 20：仅改 `src/app/api/chat/stream/route.ts` 的 `RATE_LIMIT_PER_MINUTE` + 单测断言，预计 10 分钟"。
- 若用户明确回复了裁决，则按裁决执行（10 保持 / 20 改常量+测试）。

---

## 7. 禁止事项（对照 AGENTS.md §5）

- 改变前台视觉风格；管理端令牌写到全局作用域
- 提交 `.env*`、`prisma/dev.db`、`backups/`、运行时上传文件、任何密钥；token 写进 remote URL/文件/日志
- 未经独立验证即推送；跨所有权大提交
- 引入 Redis/MQ/无头浏览器/独立 worker；群发接口
- 同时改 `src/contracts/**` 或同一迁移（V1.2 根本不需要动它们）
- 读取/迁移凭据类文件（如 `website_error/.token.txt`）
- 为"将来可能需要"提前抽象
- 手工改 `tests/visual/reference/**`（只能走 CI 重生成）
- 改 seed 造数、改 `package.json`/锁文件/测试配置

---

## 8. 完成定义（AGENTS.md §6，全项目唯一口径）

```text
Done = 所有权内 diff 符合任务
     ∧ 验收条目逐条有结果（PASS / FAIL / UNKNOWN）
     ∧ 自动测试或脚本可复现
     ∧ evidence 能让一周后的人复现，不用问原作者
     ∧ 守卫通过（lint / typecheck / 相关单测 / build / e2e / check-root）
     ∧ 无新增同类错误记录
     ∧ 未修改冻结契约（除非本任务就是改契约）
```

门禁数字（完成闸门）：**e2e 本地 79/79 + CI gate job PASS + CI visual PASS + rev-list 0 0**（或凭据缺失时的 zip 预案 + 断点记录）。

---

## 9. 遇到不确定事项

- 审计文字/任务文字与真实代码不符 → **以真实代码为准**，差异记入该卡 evidence（R1 惯例）
- BLOCKING 未知项（安全/契约/裁决）→ state.json 标 blocked + 原因，**转下一张就绪卡**，不替用户裁决、不编造
- 拿不准是否越界 → 先做不依赖它的部分，把越界项单独列出上报

现在开工：先 `git pull --ff-only origin upgrade`，然后读 `docs/V1.2-20261026/README.md` 与 `state.json`，取第一张 ready 卡。