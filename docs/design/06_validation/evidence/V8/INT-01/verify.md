# V8-INT-01 独立验证报告（V9-V-01）
- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@f78cc1d
- **结论：PASS**

## 验证对象
- 卡定义：`docs/V0.8-20261022/tasks/V8-INT-01.md`；提交 `86aa84f`（feat(V8-INT-01)）
- 改动文件（git show --stat）：`scripts/smoke/`（_png.mjs 57、_shared.mjs 66、coze.mjs 138、smtp.mjs 114、wechat.mjs 172）、`docs/design/07_release/真实联调手册.md`(+190)、`evidence/V8/INT-01/execution.md`(+171)、`docs/V0.8-20261022/state.json`(+3/−2)

## 逐条验收
| 验收条目（引自卡定义） | 结果 | 证据（命令输出摘录/文件路径） |
| --- | --- | --- |
| 无凭证运行 3 个脚本均 exit 3 并列出缺失键 | PASS | **验证者重跑**（捕获真实退出码，不经管道）：wechat=3、smtp=3、coze=3。输出逐条列缺失键：wechat 缺 `WechatAccount（status=active）`；smtp 缺 `Setting.emailHost/emailUsername/emailPassword` + 环境变量 `SMOKE_TO`；coze 缺 `LLMProvider（kind="coze"）`，均附补齐路径。栈痕迹检查：`grep -cE "at .+\(…:[0-9]+:[0-9]+\)"` = **0**（无 stack trace） |
| dry-run 输出请求摘要且不出网（断网下也能跑） | PASS | 代码复核：`_shared.mjs:21` `isLive = () => process.argv.includes("--live")` —— 仅显式 --live 才出网；守卫计数 wechat isLive=5/fetch=4、coze isLive=4/fetch=3、smtp fetch=0（nodemailer），并逐段核验 wechat.mjs 四处 `await fetch` 全部位于 `if (isLive())` 块内（:74、:93、:130、:149）→ dry-run 下不存在可触网路径，等价于断网可跑。本机无凭证时脚本在出网段之前 exit 3（我的实跑即此路径，全程无网络调用）。带凭证的 dry-run 输出摘要（含掩码 `plai****1234（len=21）`、URL secret=***）见 execution.md §3.2，本验证未复现该路径（需向 DB 插测试行，超出本验证写入权限，见受限项） |
| 脚本中无硬编码密钥（CI secret scan 通过） | PASS | 重跑执行证据同款规则：`git grep -nE '(sk-[A-Za-z0-9]{20,}\|ghp_…\|github_pat_…\|AKIA…)' -- ':!docs/**' ':!.github/workflows/**'` → exit=1（零命中） |

## Execution Steps 核对
| 步骤 | 结果 | 证据 |
| --- | --- | --- |
| 1. smoke/wechat.mjs：token→uploadimg→draft/add→freepublish | 完成 | `scripts/smoke/wechat.mjs`（172 行）四步结构与 diff 一致，dry-run 段以 `pretend(...)` 打印请求摘要 |
| 2. smoke/smtp.mjs：连接+发 1 封到 SMOKE_TO | 完成 | `scripts/smoke/smtp.mjs`（114 行），verify → sendMail 两步，SMOKE_TO 由 env 传入 |
| 3. smoke/coze.mjs：建库→上传 .md→检索 | 完成 | `scripts/smoke/coze.mjs`（138 行）三步 |
| 4. 全部读 env/DB，缺键列清单后 exit 3 不抛栈 | 完成 | `_shared.mjs` 提供 `exitMissingCreds()` 统一出口；重跑三脚本确认 exit 3、缺键清单、零栈痕迹。执行证据补充的关键设计经代码核实：凭证确从 DB 读（`src/lib/wechat.ts:28`、`src/lib/notify-gateway.ts:26-36`、`src/lib/kb-adapter.ts:94`），与「本项目凭证在 DB 不在 env」的事实基线一致 |
| 5. 手册写清所需 env/凭证、预期输出、失败对照表 | 完成 | `docs/design/07_release/真实联调手册.md`（190 行）：§0 速查、§1 凭证为何在 DB、§2-4 每集成含「需要什么/怎么配/脚本做什么/预期输出/失败对照表」——抽验 §2.5 微信表（40164/40125/40013/48001/45009/40007 共 6 条含处置）与 §2.4 预期输出（4 步逐行）均具体可用 |

## 允许修改路径核对
- 卡允许：`scripts/smoke/**`、`docs/design/07_release/真实联调手册.md`、`evidence/V8/INT-01/**` —— 全部改动落在范围内。
- **越界披露**：`state.json`（status done + note）——同 G-01/PERF-01/VIS-02 报告判定：连续执行协议 §1 步骤 7 / §3 授权，最小、不触冻结面；未单独 chore(state) 提交，过程瑕疵已登记。
- 禁止修改（docs/V0.7-20261019/**、他卡路径）：未触碰。

## 未重跑/受限项
- 带凭证的 dry-run 输出路径未复现：需临时向本地 DB 插入测试 WechatAccount 行——本验证仅获授权写 4 个 verify.md，不得改库；引用 execution.md §3.2 的输出（含掩码）并已用代码结构（isLive 守卫 + mask 实现 `_shared.mjs:24`）交叉印证其可信。
- `--live` 真实出网路径、Coze `/v1/datasets` API 路径、微信 freepublish 配额：均未验证（无凭证，用户裁决不提供，卡定义本身按「凭证到位即测」关闭）——执行证据 §6 已如实登记，UNKNOWN 状态符合 AGENTS.md §2 裁决，不构成本卡 FAIL。
- `npm run typecheck` / `npm test` / `npm run build` 未单独重跑，引用 2026-10-23 HEAD=f78cc1d 全量结果；本机另重跑 lint exit 0、check:root PASS、check:assets PASS。

## 备注
- 统一退出码语义（0 成功/1 断言失败/2 网络错/3 缺凭证）在 `_shared.mjs` 中定义，与手册口径一致；「凭证到位后 10 分钟内可得结论」的卡目标由「一条命令 + 失败对照表 + 掩码输出」支撑。
- 执行证据对状态的处理诚实：交付前 UNKNOWN（缺凭证+验证手段）→ 交付后仍 UNKNOWN（只缺凭证），未把「脚本写好」粉饰成「联调通过」。
