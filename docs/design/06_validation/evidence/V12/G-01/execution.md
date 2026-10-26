# V12-G-01 执行证据：门禁基线与现状盘点

> 执行时间：2026-10-26（Linux 容器 /mnt/workspace/HDwebsite）
> 执行者：main-agent（CodingHeader V1.2 执行代理）
> 起点：upgrade@6af5fff（= origin/upgrade）

## 5W1H 简版

- **What**：在 a04530c→6af5fff 起点固化 V1.2 基线五连（lint/typecheck/test/build/check-root），盘点 e2e 79 例与 visual 46 例现状。
- **Why**：V1.2 门禁归零轮需要先固化起点数值，后续每卡验证以此为准绳（07-基线指标）。
- **Where/When**：Linux 容器；开工前第一步；环境准备（npm install + .env.local + Playwright + prisma generate + migrate deploy）已完成。
- **Who**：main-agent 执行；后续各卡依赖本卡快照。
- **How**：逐命令执行，原始输出入 stdout；证据落 docs/design/06_validation/evidence/V12/G-01/。

## 环境准备（非本卡范围，记录备查）

| 项 | 结果 |
|---|---|
| node | v22.22.3（engines ≥24，EBADAGE 警告按 AGENTS.md 忽略） |
| npm install | 850 包 |
| .env.local | 已创建（JWT_SECRET 61 字符，本地密钥不入库） |
| Playwright | chromium 已安装 |
| prisma generate | v7.10.1 生成成功（首次失败后重试成功） |
| prisma migrate deploy | 8 个迁移全部应用到 dev.db（此前 dev.db 缺 Setting 表致 build 失败，migrate 后 build 通过） |

## 基线五连（2026-10-26 16:36~16:46）

| 命令 | 结果 | 证据 |
|---|---|---|
| npm run lint | PASS（exit 0，--max-warnings 0） | 见命令输出 |
| npx tsc --noEmit | PASS（exit 0） | 见命令输出 |
| npm test | **89 文件 / 1846 通过**（基线 1842 + V1.1 尾部新增 4） | 见命令输出 |
| npm run build | PASS（全页面 Static/Dynamic 构建成功） | 见命令输出 |
| npm run check:root | PASS（根目录 30 条全白名单） | 见命令输出 |
| npm run check:assets | PASS（8 资源引用全存在） | 见命令输出 |
| npm run check:audit | PASS（critical/high 0） | 见命令输出 |

## e2e 现状（npm run test:e2e，5.5m）

**77 passed / 2 failed（79 例）**，与基线一致。

失败清单（与 V1.2 00 §3 根因一致）：
1. `tests/e2e/apply-chat.spec.ts:15` 访客在 /apply 发送消息收到 AI 流式回复（会话签发竞态 400）
2. `tests/e2e/mobile-375.spec.ts:40` 375：招生批次移动端卡片可渲染（空库 isVisible 即时快照竞态）

## visual 现状

- 参照图：`tests/visual/reference/*.png` = **45 张**（15 路由 × 3 宽度）
- 用例数：**46 例** = 45 路由截图 + 1 首页 Banner 轮播区块顺序断言（web.spec.ts:81）
- 本机从未跑过 test:visual（.cache/visual/results.json 不存在）；基线 10 passed / 36 failed 来自 V1.1 CI 记录。
- 本机为 Linux（规划假设 Windows 不可判），visual 本地可判定（V0.7 实证 Windows 字体差异不适用）。

## 双端快照

- HEAD = 6af5fff7c09805d117f754ecbc086543259b5577
- origin/upgrade = 6af5fff7c09805d117f754ecbc086543259b5577
- `git rev-list --left-right --count origin/upgrade...HEAD` = **0 0**

## 验收条目

- [x] 五连全绿（lint 0 / tsc / 单测 1846 / build / check-root）
- [x] e2e 现状计数入证据（77/2，失败清单）
- [x] visual 现状计数入证据（45 参照图 + 1 区块测试 = 46 例）
- [x] 快照（6af5fff + 双端 0 0）入 evidence

## 后续待办

- V12-E2E-01：apply-chat 竞态修复（根因已取证）
- V12-E2E-02：mobile-375 断言修正
- V12-VIS-01：visual 36/46 分诊
