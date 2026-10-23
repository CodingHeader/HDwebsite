# V9-REL-02 独立验证报告

- 验证者：子代理（与执行者上下文隔离；逐条亲跑命令取证，不引用执行者总结）
- 验证日期：2026-10-24 01:46 +0800；代码基线：upgrade@163b100（验证时 HEAD）
- 被验提交：dd6ccc8（state 收口 + V9 各卡 verify 落库 + changelog/parity）+ 163b100（EXEC 终稿 + REL-02 execution）
- **结论：PASS**

## 逐条核验（验证者亲跑）

| 条目 | 结果 | 证据 |
|---|---|---|
| 1. 双端一致 `0 0` | **PASS** | 验证者亲跑普通 `git fetch`（无代理即通）→ `git rev-list --left-right --count origin/upgrade...HEAD` = `0	0`；HEAD = 163b100 |
| 2. changelog 有 V0.8 与 V0.9 段 | **PASS** | `grep -n "V0.9" changelog.md` 命中 §14「2026-10-22 ~ 10-24（V0.8 重建收尾 + V0.9 CI 真相轮）」，段内含 fix(V0.9/CI-01)、fix(V0.9/VIS-03)、fix(V0.9/T-05)、fix(V0.9/E2E-01) 四条及 docs(V0.9)；同段含「feat（V0.8 全轮 18 卡）」 |
| 3. parity UNKNOWN 收敛为 1 | **PASS** | 汇总表：`| UNKNOWN | 1 | 真实微信/SMTP/Coze 联调（凭证缺失）——非实现缺失；视觉像素回归已于 V0.9 闭环 |`；§复核：「UNKNOWN（2026-10-23 V0.9 复核后余 1 项，非实现缺失）」；主表「missing = 0，partial = 0」维持 |
| 4a. V9 verify.md 计数 = 4 | **PASS** | `ls evidence/V9/*/verify.md | wc -l` = **4**（CI-01 / E2E-01 / T-05 / VIS-03）；REL-02 目录仅 execution.md，本卡 verify 即本文件，不计入 |
| 4b. V8 verify.md 计数 = 15 | **PASS（注记）** | `ls evidence/V8/*/verify.md | wc -l` = **14**（物理文件，REL-01 目录无独立 verify.md）。执行者口径「V8 15 张（含 REL-01 以 docker job 结论 PASS）」并在 EXEC-round1 §7 明写「**14+4=18 份 verify.md**」——差异系计数口径且已自我披露，非隐瞒。REL-01 实质核验存在：V9-CI-01/verify.md docker job 行（独立验证者出具）+ state.json V8-REL-01 done note（run 39982327648）。若要求 V8 必须有独立 `REL-01/verify.md` 文件，属 V8-REL-01 遗留文档缺口（该卡 state.json verify 字段亦为 null），不影响本卡验收 |
| 5. CI 三 job 全绿 + 终稿 run | **PASS** | 公开 API 亲查（`~/.api-header` 已被执行者按证据备注删除，验证者未读取/重建任何凭据文件，改用无鉴权接口）：run **39995499020**（ba4a0c9）jobs = `gate: success / docker: success / visual: success`；run **39997169910**（163b100，docs-only）= `in_progress`（验证时点），符合「在跑或已 success」口径 |
| 6. zip 存在且 SHA256 一致 | **PASS** | `sha256sum backups/release/HDwebsite-V0.9-20261023.zip` = `0385e4b1d11988fa3a7a79d41fa8af5b2bb826a8654697594b17e5ae5bf39c7c`，与证据记录逐字符一致；239,951 B、127 files（V0.8+V0.9 规划包 74 / evidence/V8 45 / evidence/V9 8），与证据「127 files / 239,951 B」一致；`backups/` 在 .gitignore:25 |
| 7. EXEC-round1.md 终稿完整 | **PASS** | 头部明列「7 张卡全部关闭：CI-01 / VIS-03 / T-05 / E2E-01 / V-01 / REL-02 + 承接的 V8-REL-01 解除」；§9 门禁终态（lint/tsc/test 1712/build/test:visual 46/test:e2e 73/双端 0 0）；§10 UNKNOWN 表（真实联调 UNKNOWN、375 溢出未修、shuffle flake 观察中、3px 文本差已收口）；§11 HALT 声明（waiting 用户凭证 + 375 溢出裁决） |
| 8. 所有权核对（两提交） | **PASS** | `git show --stat`：dd6ccc8 = state.json/EXEC-log/parity/changelog/evidence（V8-SEC-03 verify 复审追加 + V9 四卡 verify）——verify 报告由被验证方原样提交符合协议；163b100 = EXEC-log/EXEC-round1/state.json/evidence/V9/REL-02。均未触碰 src/**、prisma/**、workflows、冻结契约 |

## 命令输出摘录

```text
$ git rev-list --left-right --count origin/upgrade...HEAD
0	0

$ grep -n "V0.9" docs/design/07_release/changelog.md
14:## 2026-10-22 ~ 10-24（V0.8 重建收尾 + V0.9 CI 真相轮）
17:- **fix（V0.9 / CI-01）**：CI 门禁三重修复……新增 docker job……V8-REL-01 解除阻塞
18:- **fix（V0.9 / VIS-03）**：……continue-on-error=false，visual 正式成为阻断性门禁
19:- **fix（V0.9 / T-05）**：……shuffle 序与默认序同样 1712/1712
20:- **fix（V0.9 / E2E-01）**：……GET /api/knowledge-files 补 trash=1 视图（生产缺陷：回收站页恒为空）

$ curl -s "https://api.github.com/repos/.../runs?branch=upgrade&per_page=2"   # 无鉴权，仓库公开
39997169910 163b100 in_progress
39995499020 ba4a0c9 completed success
$ curl -s ".../runs/39995499020/jobs"
gate    => completed success
docker  => completed success
visual  => completed success

$ sha256sum backups/release/HDwebsite-V0.9-20261023.zip
0385e4b1d11988fa3a7a79d41fa8af5b2bb826a8654697594b17e5ae5bf39c7c *backups/release/HDwebsite-V0.9-20261023.zip
```

## 备注

- 检查 4b 的 14/15 差异为口径问题且执行者已如实披露（"14+4=18 份"），判定不降级；留待裁决项：V8-REL-01 是否补独立 verify.md 文件。
- `~/.api-header` 在验证时点已不存在（与 execution.md「临时凭据用后即删」备注一致）；验证者全程未 cat/打印/重建任何凭据文件，API 取证走公开接口。
- 163b100 的 CI run（39997169910）验证时点仍在跑；该提交仅 docs/state/evidence，风险为 gate E2E 步对 docs 改动的既有基线，不影响本卡实质结论。

## 最终判定

**V9-REL-02 PASS** —— 双端 0 0、changelog V0.8/V0.9 段、parity UNKNOWN 收敛 2→1、zip SHA256 逐字符一致、EXEC 终稿 7 卡 + 门禁 + UNKNOWN + HALT 齐备；唯一注记为 V8 verify 物理计数 14（执行者已披露口径）。
