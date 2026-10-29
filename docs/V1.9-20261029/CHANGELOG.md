# V1.9（2026-10-29）收口

> 分支 `upgrade` · 基线 `90eb97d`（V18 B1 五态验收回填）· 7 卡全终态。

## 一、7 卡结果

| 卡 | 名称 | 状态 | 结果 |
|---|---|---|---|
| FIX-01 | 空态动作（6 页） | done | 6/6 PASS（补 emptyAction + SearchInput→SearchField 修复清除筛选回写） |
| FIX-02 | toast 实体名（4 页） | done | 4/4 PASS（content-hub/publish-jobs 传名 + CrudPage displayName 扩候选键） |
| FIX-03 | 搜索字段（collect-tasks） | done | PASS（searchFields 空→errMsg；搜索 zzz 0 行 + 空态） |
| B2 | 键盘验收 | done | 43 页 × K1~K4 = 172 格：**152 PASS / 0 FAIL / 20 N-A**；K3 运行时验证（FormDialog+ConfirmDialog Esc） |
| B3 | 375px 验收 | done | 43 页 × M1~M4 = 172 格：**116 PASS / 40 FAIL（触达区<44px）/ 16 N-A**；spec 路由 3→43 |
| D1-FIX | 性能（CLS/LCP） | done（PARTIAL） | CLS 真实 0 达标；LCP Lighthouse Slow4G 模拟 3.1–3.3s 未达 ≤2.5s（真实 0.3s / 浏览器 136ms） |
| E1 | V19 收口 | done | 本卡（7/7 done + 唯一全量 + changelog + 冻结面复核） |

## 二、11 FAIL 修复情况（B1 实测 11 个 FAIL）

11 = FIX-01(6) + FIX-02(4) + FIX-03(1)，**全部已修复**：

| FIX 卡 | 覆盖 FAIL | 页 | 结果 |
|---|---|---|---|
| FIX-01 | F-01/03/04/06/09/10 | articles·chat-history·collect-items·content-hub·home-blocks·knowledge-bases | 6/6 PASS（空态容器内动作 ≥1 且可点击生效） |
| FIX-02 | F-02/07/08/11 | banners·content-hub·enrollment-offerings·publish-jobs | 4/4 PASS（toast 点名实体） |
| FIX-03 | F-05 | collect-tasks | PASS（搜索生效） |

> ⚠️ FIX-02 引入 1 个跨卡断链：`tests/e2e/hub-content.spec.ts` 仍断言旧 toast 文案「草稿已入库」，被 FIX-02 改名打断（见 UNKNOWN #2）。非功能回归。

## 三、唯一一次全量门禁（串行，2026-10-29）

| 项 | 命令 | 结果 |
|---|---|---|
| lint | `eslint --max-warnings 0` | **exit 0** |
| typecheck | `tsc --noEmit` | **exit 0** |
| test | `vitest run --no-file-parallelism` | **91 文件 / 1859 用例全过，exit 0** |
| build | `next build` | **exit 0** |
| visual | `npm run test:visual`（VISUAL_BASE_URL=6791） | 4 PASS / 42 FAIL（见 UNKNOWN #1） |
| e2e | `npm run test:e2e` | 77 PASS / 2 FAIL（见 UNKNOWN #2） |

## 四、UNKNOWN / 遗留（跑 ≠ 门禁，记录不阻断）

1. **视觉 42 FAIL**：win32 本地像素差异不采信（Linux 基线字体差异）。diff 图证实差异全部为文字字形抗锯齿，布局结构一致（非结构断裂）。**靠 CI 判定**，本地记 UNKNOWN。
2. **E2E 2 FAIL**（`hub-content.spec.ts` 第 22/53 行）：FIX-02 把 content-hub 创建 toast 由 `"已创建","草稿已入库，可提交审核。"` 改为 `"已创建","「${title}」已入库，可提交审核。"`，E2E 仍断言旧子串「草稿已入库」。E1 禁改 `tests/**` → 记为遗留：建议后续将断言改为「已入库」或按新文案调整。
3. **D1-FIX PARTIAL**：LCP Lighthouse Slow4G 模拟 3.1–3.3s 未达 ≤2.5s（模拟带宽 1.6Mbps 主导）；真实无节流 0.3s、真实浏览器 136ms（优秀）；`fetchpriority=high` 已按 lighthouse@13 建议试过，模拟下不敏感并已还原；CLS 模拟 0–0.208 波动（footer score 0.2078），真实 0。冻结面内无可改根因。
4. **外部提交 `88e72d69`**（用户 2026-10-29 裁决移动端导航）：触及前台 className（仅 `md:hidden` 移动分支 + 悬浮层，桌面 ≥768px 零变化）、`prisma/seed.ts`（种子数据，非契约/迁移）、`public/site.webmanifest`。**非 V19 卡**，属用户裁决；冻结面「复核」发现，建议规划者知悉（是否豁免/CCR）。

## 五、与 V1.8 差异

- V1.9 7 卡 = **V1.8 剩余 4 卡（B2/B3/D1-FIX/E1 重定义）+ B1 实测 11 FAIL 归并 FIX-01/02/03**。
- B2/B3 口径修正：V1.8 写 42 页/168 格 → 实测 **43 页/172 格**。
- D1-FIX 补全：V1.8 只登记未写卡，本轮补齐证据（baseline/after/attribution）。
- E1 重定义：依赖收窄至 6 卡（含 FIX 卡），V1.8 E1 漏验 FIX 卡。

## 六、双端同步

- `upgrade...origin/upgrade`：**本地领先 11 提交**（用户选 commit-only，只提交不推送）。
- 待推送命令：`git -c http.proxy=http://127.0.0.1:10808 push origin upgrade`。