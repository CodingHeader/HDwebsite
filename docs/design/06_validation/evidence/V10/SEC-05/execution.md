# V10-SEC-05 / V10-Q1 执行证据（2026-10-24）

## SEC-05：新披露漏洞的既定授权升级

- **触发**：CI run 40051691774（755c51a）gate 的 `check:audit` 失败——npm 官方源新披露 4 条公告（2 high + 2 moderate，均为 2026-10-24 前后新出），high 为：
  - **zod** <4.6.6（GHSA-mrhx-c7xc-m3w5：校验超大集合可耗尽内存——zod 是全站输入校验骨干，DoS 相关性高）
  - **undici** 7.0.0-7.30.0（GHSA-4qv8-2p9j-2685 / GHSA-f72v-6w45-q472 / GHSA-xjj6-f33q-929c：DoS×2 + SRI 绕过；经 next 传递依赖）
- **授权依据**：Q1 裁决"只升不降"（V0.8 用户既定政策，sharp/vitest 升级同款先例）。升级全部在既有 semver 范围内：zod 4.6.5→**4.6.7**（^4.3.6 内）、undici 7.30.0→**7.30.1**（next 的 ^7 内）——**package.json 零改动，仅锁文件**；顺带把 lockfile 的 resolved 源从 npmmirror 规范化为 npmjs.org（与审计门禁的官方源策略一致）。
- **验证**：`check:audit` ✓（0 漏洞）；lint/tsc ✓（插曲：npm ci 后需 `prisma generate` 重生成客户端，见 EXEC §2）；单测 1712/1712（默认序 + shuffle 各一轮）；build ✓；e2e **73/73**。CI：run 40087305585（b452b43）**三 job 全 success**（含新锁文件的 audit 门禁）。
- **门禁脚本小修**：`fixVersion()` 对 `fixAvailable === true`（锁文件内可修）此前误标为"无可用修复版本"，改为如实标注"npm audit fix（锁文件内升级）"——仅文案，阻断逻辑不变。

## Q1：375 溢出授权修复（用户 2026-10-24 批准）

- **根因**（完整链见 `docs/V1.0-20261024/00-事实基线.md` §1）：Navbar 移动端导航行（9 项横排）撑出整页横向滚动；main 同病（旧基线 667px），upgrade 冻结面逐字复现。
- **修复**（提交 5c50fde）：`Navbar.tsx` 移动端容器 1 处 className（`justify-between` → `justify-start overflow-x-auto` + 隐藏滚动条）。配色/字体/间距零变化。已知边缘：hover 子菜单在 <595px 带鼠标窗口会被容器裁剪（该下拉为 hover 设计，触屏上原本不可达）——已写入代码注释。
- **验证**：本地 6 页 375 视口 scrollWidth **595→375**；e2e 73/73；CI run 40087305585 visual job 重生成 success；**375 组 15 张基线宽度恢复 375**（1440/768 组字节级未变——修复只在 <768px 生效，与 md:hidden 断点一致）。
- **REQ-F-014 状态**：此为本冻结条款唯一受控偏差（1 处 className，用户明示授权）；其余前台仍逐字对齐 main。

## 插曲登记

1. 后台 build 曾因残留服务器进程锁 .next 产出半成品（无 BUILD_ID）→ taskkill + 清理重建恢复，非代码缺陷。
2. workflow_dispatch 重生成 run 曾被后续 push 的并发组取消（ci-${ref} cancel-in-progress）→ 教训：基线重生成期间不推送；本次调整为"先推完所有提交，再触发重生成"。
3. `npm ci` 后必须 `prisma generate`（Prisma 7 无 postinstall generate）——新环境/干净安装的既知事项。
