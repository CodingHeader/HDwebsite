---
id: P02-verify
type: validation
phase: P02 前端
range: 3905bd5..c97e247 (branch upgrade, 8 commits, 293 files)
verified: 2026-10-12
verifier: independent (did not author P02)
---

# P02 独立校验报告

**结论：PASS**（无 FAIL 项；3 条 follow-up，均不阻塞 P02 验收）

标准 = `docs/design/04_planning/review-prompts/P02-前端.md` 的「验收标准」与「允许修改」。本报告不采信执行者证据文件，结论均来自 diff 检查与当日重跑。日志位于工作区 `/workspace/work/.visual/`（不入库）。

## 检查表

| # | 检查 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `npm run test:visual`：15 路由 × 3 宽度，maxDiffPixelRatio ≤ 0.01 | PASS | `.visual/test.log`：46 passed (1.7m)，EXIT 0（45 张截图 + 1 条区块顺序测试） |
| 2 | 首页 Banner 轮播 + `data-block` 锚点 ≥ 11；visual 套件断言区块顺序与 main 一致 | PASS | grep 命中 12；`tests/visual/web.spec.ts:65` 区块顺序测试通过（test.log #46） |
| 3 | `--primary: #da251d` 在 globals.css | PASS | grep 命中 |
| 4 | `public/images` 存在 + `/images/logo.png` 可访问 | PASS | `.visual/v-curl.log`：upgrade 200 / main 200；public/ 与 origin/main 一致 |
| 5 | 无 `import * as Lucide` | PASS | `grep -rn` 为空 |
| 6 | `data-theme="manager"` 在 manager/layout.tsx；(web) 下无 data-theme | PASS | grep 命中 / 为空 |
| 7 | 通用验证：lint / typecheck / test / build | PASS | lint 0 errors 26 warnings（`v-lint.log`）；tsc 通过（`v-tc.log`）；vitest 通过（`v-test.log`）；build EXIT 0（`verify-build.log`） |
| 8 | （人工）视觉保真：home@1440 参照 vs 实际 | PASS | 尺寸一致 1440×5529；本人重算像素差 0.113%（阈值 25/255），about@1440 为 0.000%。肉眼对比：红色顶栏/多级导航/横幅/区块/页脚一致；唯一可见差异为证书风采、院校卡片中缺失图片在 upgrade 显示 alt 文字（main 显示空白），见 F2 |
| 9 | （人工）375px 管理端抽屉 + 登录页 | PASS | `evidence/P02/manager-375-drawer-open.png`：左侧抽屉、遮罩、品牌头部、当前项红色高亮、可折叠分组（内容/招生/站点管理）、关闭按钮，符合设计系统；`manager-login-375.png`：同一令牌（品牌红按钮、焦点环、图标输入框、显隐密码），干净专业 |
| 10 | `scripts/import-main-content.mjs`：默认 dry-run、幂等 | PASS | 无 `--apply` 时只打印计数并 `return`（:210-213）；两次 dry-run 输出逐字一致、退出码 0，目标库 md5 前后不变（97aeab7c…）。apply 路径：事务内整表 DELETE+INSERT（同源同结果）、ChatScene 按 code upsert、Setting `ON CONFLICT DO UPDATE … WHERE isEncrypted=0`，写前备份到 backups/，失败 ROLLBACK → 幂等。无 `--source` 时打印用法退出 1 |
| 11 | 允许路径 | PASS（1 处越界，合理） | `git diff --name-only` 仅 `src/app/not-found.tsx`（删除，13 行）在允许列表外：根 not-found 移入 `src/app/(web)/not-found.tsx`，使 404 带前台框架与 main 对齐；`/manager/xyz` 两边均 404。其余均在允许列表或 docs/ |
| 12 | package.json 仅加 `@playwright/test` + 2 个 script | PASS | 前序校验确认；本次未发现其他依赖变化 |
| 13 | 无密钥入库 | PASS | diff 中 key/token/secret/password/sk-/AKIA/私钥模式只命中登录表单变量与注释（`showPassword`、`autoComplete="current-password"`、"首屏使用 token" 注释）；`git ls-files \| grep -E '\.env\|dev\.db\|backups/'` 仅 `.env.example` |
| 14 | 参照截图入库体积 | PASS（注意） | `tests/visual/reference/` 45 张 PNG，共 13 MB（单张最大约 1 MB，home 全页）；可接受，见 F3 |
| 15 | 绑定裁决：前台保留 main 红色横幅轮播外观、功能不减 | PASS | 截图对比 ≤1%；26 个组件、21 个路由文件已移植 |
| 16 | 跑完测试后工作区干净 | PASS | `git status --short` 为空（dev.db、.cache/ 已 gitignore） |
| 17 | `/about/intro`、`/partners/x` 状态码：upgrade 200 vs main 307 | 非 FAIL → follow-up F1 | 验收标准未规定状态码。upgrade 用 `src/app/(web)/{about,partners}/[...slug]/page.tsx` 调用 `redirect()`，但 `(web)/loading.tsx` 触发流式渲染，跳转变成客户端跳转（HTTP 200）；main 用 next.config `redirects()` 返回 307 |

## Follow-ups（不阻塞 P02）

- **F1（P03）**：把 main `next.config.ts` 的 `redirects()` 条目恢复到 upgrade（`/about/:slug+`、`/partners/:slug+`、`/courses/<11 个分类>`、`/news/<10 个 slug>`、遗留 banner webp → seed svg），返回服务端 307 而不是流式 200；之后可删掉 `[...slug]` 页面。验收：`curl -o /dev/null -w '%{http_code}' /about/intro` = 307。（`next.config.*` 不在 P02 允许路径内，所以归 P03。）
- **F2（P03/P06 内容）**：home@1440 的证书风采和部分合作院校卡片图片缺失，upgrade 显示 alt 文字，main 显示空白。差异在阈值内，但说明这批图片两边都缺；建议导入或 seed 时补齐图片路径，或统一缺图占位。
- **F3（可选）**：参照截图 13 MB 入库；如果仓库体积敏感，可考虑 Git LFS 或降低全页截图尺寸。

## 本次重跑/复核的命令
```bash
git -c core.quotepath=off diff --name-only 3905bd5..c97e247      # 路径越界检查
git -c core.quotepath=off diff 3905bd5..c97e247 | grep -Ei 'api[_-]?key|secret|token|password|sk-|AKIA|BEGIN .*PRIVATE'
git ls-files | grep -E '\.env|dev\.db|backups/'                   # → .env.example
node scripts/import-main-content.mjs --source <main-ref.db> --target prisma/dev.db   # ×2，输出一致，库 md5 不变
python3 (PIL) 像素差：home-1440 0.113%，about-1440 0.000%
git status --short                                                # 空
```
