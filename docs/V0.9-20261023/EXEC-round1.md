# V0.9 执行记录 · 第 1 轮（2026-10-23 ~ 10-24）

> 承接 `docs/V0.8-20261022/EXEC-round2.md`。分支 `upgrade` 单主线，起点 `c9bebe3`，本轮终态 CI **三 job 全绿**（gate / visual / docker，run 39995499020）。
> 7 张卡全部关闭：CI-01 / VIS-03 / T-05 / E2E-01 / V-01 / REL-02 + 承接的 V8-REL-01 解除。

## 1. 开局取证（对应 00-事实基线）

- 拉取：`git fetch`（socks5://127.0.0.1:10808）后本地 HEAD == origin/upgrade == `c9bebe3`，双端一致。
- **CI 真相**：GitHub API 取证（PAT 临时文件鉴权，600 权限用后即删）→ upgrade 分支 9 次运行**全部 failure**，两处根因：
  - gate `Build`：`ci-build.db` 从未 migrate → 静态导出 /about 时 `P2039 no such table: main.Setting`。
  - visual `Prepare DB`：`seed-visual.ts` 写死 `authorId:1` 依赖 seed.ts 的 admin（隐式跨脚本契约），CI 全新库 User 空 → `P2003`。
- 由此确立 V0.9 定位：V0.8 三张 pending 卡的"等 CI 结果"条件被证实为"CI 需要先修"。

## 2. 规划

`docs/V0.9-20261023/` 全套（README、00~09、tasks/、state.json、EXEC-log），提交 fa49deb。初版 4 卡 + 承接跟踪；执行中新发现追加 V9-T-05、V9-E2E-01 两张返工卡。

## 3. V9-CI-01（done，3 迭代）

| 迭代 | 提交 | 修复 | CI 证据 |
|---|---|---|---|
| 1 | fad1924 | gate 加 `Prepare build DB`（migrate deploy）；seed-visual 外键自足（ensureVisualAuthor） | run 39978424632：gate Build 步 ✓、visual Prepare DB ✓（历史性首次通过这两步） |
| 2 | f78cc1d | visual `npm ci --include=dev`（NODE_ENV=production 跳过 devDeps，@tailwindcss/postcss 缺失）；`.dockerignore` 取消 scripts 排除（TS2307） | run 39979767004：Clean build ✓（docker Build image 仍失败） |
| 3 | 643bebc | Dockerfile builder 加一次性已迁移库（构建期静态导出查库）；CI 增 workflow_dispatch 基线重生成入口 | run 39982327648：**docker job success**（build+起容器+/api/health 探活）→ **V8-REL-01 解除阻塞** |

本地修复证明：全新临时库复现 CI 场景，seed 从 P2003 → 12/12 全绿且幂等（v9-ci-check.db 用后即删）。

## 4. V9-VIS-03（done，含 2 次 flake 迭代）

- **分诊**（run 39979767004 产物，41 fail/5 pass）：**0 样式回归**。三类归因：渲染噪声（dh=0 亚像素）、数据差（合成文本 vs main 真实文本）、**数据面缺口**（ServiceGuide/HotMajor 空表 → home 整段缺失 + service-detail 导航失败；campus 参照图竟是空态）。详见 `evidence/V9/VIS-03/execution.md` §2 分诊表。
- **数据面增量**（6312746）：seed-visual 补 ServiceGuide(6)/HotMajor(10)（slug 用 visual- 前缀防冲突），counts.json 增至 12 表；全新库 12/12 ✓ 幂等。
- **基线重生成**（40a9331）：workflow_dispatch run 39983978470 以 `--update-snapshots` 在 Linux CI 重生成 45 张基线，41 张更新逐张理由入证据 §6；visual job 全步 success。
- **收口**（ca5303a）：`continue-on-error=false` —— visual 正式成为阻断性门禁。REQ-F-014 的结构一致性由分诊表 + diff 图逐块对齐证实。
- **flake 修复**（ab1d1e0 → ba4a0c9）：visual 转阻断后暴露 home@1440 图片区偶发空白（next/image 优化器冷启动超 3s 兜底）→ settle() 确定性等待图片解码；第一次实现误把 waitForFunction 放进 page.evaluate（全 45 例 ReferenceError，本地单测复现修正），修正后 **run 39995499020 visual success（46 passed）**。

## 5. V9-T-05（done）

V8-SEC-03 verify=FAIL（shuffle 顺序耦合，先于 V8 存在）→ 9 个测试文件自包含化（bf5afc9）：content-review（主代理）+ 8 文件（修复子代理，含根因"午夜真实时刻落静默窗""适配器被前例注销"等）。默认序与 shuffle×3（验证者另跑 4 轮）全部 1712/1712。verify **PASS**。

## 6. V9-E2E-01（done）

E2E 首跑暴露 3 例（run 39982327648：70/73）：
1. collect-publish 通知行选择器严格模式冲突（CI 无外网产生 collect_failed 行）→ 按事件名收窄。
2. e-kb-manage 确认框等待超时 → 根因 `getByRole("dialog")` 被 base-ui toast（role=dialog）抢占 → 改 `getByTestId("confirm-dialog")`；上传内容嵌入唯一文件名（服务端 baseId+sha256 去重不排除软删行）。
3. **生产缺陷**：`GET /api/knowledge-files` 硬编码 deletedAt:null 且忽略 `trash=1` → **管理端回收站恒为空**（用户无法恢复/彻底删除）。补 trash 视图（searchParams 直读，不触冻结契约），所有权扩展已报备。

本地全量 e2e **73/73**；CI gate 的 E2E 步 success（run 39990249476 起）。verify **PASS**。

## 7. V9-V-01（done）

子代理独立验证（与执行者上下文隔离，只看 diff+命令+CI API）：

| 组 | 卡 | 结论 |
|---|---|---|
| A | G-01、PERF-01、VIS-02、INT-01 | 4/4 PASS（PERF-01 独立复算 gzip 284,125B；INT-01 三脚本 exit 3 复跑） |
| B | SEC-01、SEC-02、SEC-03、SEC-04、T-01 | SEC-03 首验 **FAIL**（shuffle）→ V9-T-05 返工后复审 **PASS**；其余 4/4 PASS |
| C | T-02、T-03、T-04、VIS-01、UI-01 | 5/5 PASS（契约 876 双序亲跑、e2e 20/20、a11y 12/12 亲跑） |
| V9 | CI-01、VIS-03、T-05、E2E-01 | 4/4 PASS（CI run 结论 API 取证；seed 12/12 亲跑；e2e 73/73 亲跑） |

verify.md 计数：V8 15 张（含 REL-01 以 docker job 结论 PASS）+ V9 4 张（REL-02 本卡验证随终稿出具）。**14+4=18 份 verify.md，0 FAIL 遗留。**

## 8. V9-REL-02（done）

- changelog 补 V0.8/V0.9 段；parity 复核：missing=0、partial=0 维持，UNKNOWN 2→1（视觉像素回归闭环，余真实联调凭证项）。
- zip 交付包：`backups/release/HDwebsite-V0.9-20261023.zip`（gitignored 路径），SHA256 见 evidence/V9/REL-02/execution.md。
- 双端一致：`git fetch && git rev-list --left-right --count origin/upgrade...HEAD` = **0 0**（终稿提交推送后复核）。
- 临时凭据清理：`~/.api-header`、`~/.git-credentials` 已删除（本轮全程 remote URL 无 token）。

## 9. 门禁终态（本轮收口时）

```
npm run lint（--max-warnings 0）   exit 0
npx tsc --noEmit                  exit 0
npm test                          1712 passed / 72 files（默认序与 shuffle 同）
npm run build                     exit 0
npx vitest run --sequence.shuffle ×3  1712/1712
npm run test:e2e                  73 passed（本地）；CI E2E (Linux) 步 success
npm run test:visual               CI run 39995499020：gate ✓ visual ✓（46 passed）docker ✓
check-root / check-assets / check:audit   PASS
双端                              rev-list 0 0
```

## 10. UNKNOWN 与遗留（如实登记）

| 项 | 状态 | 说明 |
|---|---|---|
| 微信/SMTP/Coze 真实联调 | **UNKNOWN**（沿用 V0.8 裁决） | 凭证缺失；dry-run 手册与脚本已备好（INT-01） |
| 375 宽度基线像素宽 667（横向溢出） | 已登记，未修 | 新旧基线一致、非本轮引入；修复会改前台视觉（REQ-F-014 冻结），留待用户裁决的独立卡 |
| sqlite-busy-timeout shuffle 未复现 | 观察中 | 疑似时序 flake 非顺序耦合，V9-T-05 未改动；复现再立卡 |
| 参照图与数据集的"3px 级"文本差 | 已收口 | 属数据差（V9-Q1 方案 A），基线已按数据集口径重生成 |

## 11. 是否该停下

全部卡 ∈ {done}；blocked 清零（REL-01 经 CI docker job 解除）。唯一遗留 UNKNOWN 是"只有人能解除的外部条件"（第三方凭证），符合协议 §6 收尾条件。**HALT: waiting 用户凭证（微信/SMTP/Coze 真实联调）+ 375 溢出修复裁决。**
