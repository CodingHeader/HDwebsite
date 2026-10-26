# HDwebsite 规划 V1.2（2026-10-26）

**基线**：`upgrade@a04530c`（本地=远端 0 0；V1.1 终态，36 卡中 34 执行卡 done、V-01 独立验证 34 份 verify 0 FAIL）。
**本版定位**：**门禁归零轮**——V1.1 代码功能全部交付，但 CI 双门禁（E2E Linux + Visual）红、REL-01 台账未收口、LLM-03 限量频待用户裁决。V1.2 只做"把可验证的未完成项清零"，不新增业务功能。

## 一、本轮事实（本机复核，2026-10-26）

| # | 项 | 状态 | 证据 |
|---|---|---|---|
| F1 | 双端同步 | 0 0（local = origin/upgrade = a04530c） | git rev-list 实测 |
| F2 | V1.1 执行卡 | 34/34 done；V-01 独立验证 0 FAIL | docs/V1.1-20261024/state.json；evidence/V11/*/verify.md ×34 |
| F3 | 本地 e2e | **77 passed / 2 failed**（CI E2E Linux 同源） | 本机复现：`apply-chat`（400 会话竞态）+ `mobile-375 招生批次`（空库断言竞态） |
| F4 | CI gate job | **E2E (Linux) FAIL**（run 40281405584 / 40275758765） | GitHub API |
| F5 | CI visual job | **Visual regression FAIL**（36/46 diff，系统性基线漂移） | 断点文档 + results.json |
| F6 | REL-01 | state.json 仍标 blocked（推送完成于后续会话，台账未收口） | state.json + changelog 已含 V1.1 |
| F7 | V11-Q2 | LLM 限频 10次/分 vs 需求 20 → 待用户裁决 | LLM-03 execution 注 |
| F8 | 真实凭证 | 微信/SMTP/Coze 真实联调 UNKNOWN（凭证缺失，长期项） | parity F 节 |

## 二、根因（V1.2 任务的设计依据，全部本机取证）

1. **apply-chat 400（V12-E2E-01 核心）**：SEC-04 服务端会话改造后，`ApplyClient` 与 `ChatWidget` 各自调用会话签发；trace 实测页面加载出现 **4 次并发 GET `/api/chat/session`，各自 Set-Cookie（同一 `chat_sid` 键互相覆盖）**，POST `/api/chat/stream` 时 body.sessionId 与最终 cookie 不一致 → 400 → 前端重签竞态仍可能失败 → 无 MOCK_REPLY 渲染。
2. **mobile-375 招生批次（V12-E2E-02）**：e2e.db seed 无 `EnrollmentOffering` 数据（0 行，空库）且测试的空态容忍用 `isVisible()` 即时快照（页面空态渲染前判 false）→ 20s 等 `ul[aria-label]` 必超时。测试断言竞态，非产品缺陷。
3. **Visual 36/46（V12-VIS-01）**：断点文档已归因为系统性基线漂移（跨路由跨宽度，`articles/courses/service-detail` 高度/内容显著差；1440 组多数 ratio 0.02 渲染噪声），需逐组 diff 分诊判定是"基线过期应重生成"还是"真回归"。

## 三、切片与卡片总览（7 卡，5 切片）

| 切片 | 卡 | 执行者 |
|---|---|---|
| S0 门禁与基线 | V12-G-01（五连 + 双端 + seed 数据盘点） | P2 |
| S1 E2E 归零 | V12-E2E-01（apply-chat 会话竞态修复）、V12-E2E-02（mobile-375 断言修正）、V12-E2E-03（全量 e2e 复跑 + CI 绿） | E2E-01: main-agent；E2E-02: P2；E2E-03: 整合者 |
| S2 Visual 分诊 | V12-VIS-01（36 例逐组分诊：基线更新 vs 真回归 → Linux CI 重生成或修复） | main-agent 分诊 + CI 执行 |
| S3 收口 | V12-REL-01（state 台账收口 + REL-01 终稿 + 双端 + changelog 尾） | P1 |
| S4 待用户 | V12-Q2-01（LLM 限频 10→20 裁决执行，blocked 直到用户回答） | P2（裁决后） |

## 四、读这个

| 文件 | 内容 |
|---|---|
| `00-事实基线.md` | a04530c 快照 + 根因取证链 |
| `01-需求复核与辩证分析.md` | 5W1H + 竞态双向论证 |
| `02-契约增量.md` | 0 增量、0 迁移（冻结面不动） |
| `03-剩余可执行大纲.md` | 三级大纲 |
| `04-连续执行协议.md` | 单主线串行协议（V1.2 无并行 lane；E2E-01 先独占变更区） |
| `05-任务索引.md`、`tasks/` | 7 卡 |
| `06-DAG-所有权-档位.md` | DAG + 所有权 + 档位 |
| `07-基线指标.md` | 基线五连 + e2e 77→79 口径 + visual 重生成门禁 |
| `08-风险与待裁决.md` | V11-Q2、K1 可选项、真实凭证 |
| `09-自检与局限.md` | 自检表 |

## 五、执行顺序（第一刀）

V12-G-01 → V12-E2E-01（根因已取证，直接修）→ V12-E2E-02（并行）→ V12-E2E-03（复跑+推送）→ V12-VIS-01（分诊+CI 基线）→ V12-REL-01 → V12-Q2-01 待用户。

**推送规则**：与 V1.1 相同（K3=直推；`upgrade` 单主线，小提交即推送，被拒只 rebase 禁 force）。