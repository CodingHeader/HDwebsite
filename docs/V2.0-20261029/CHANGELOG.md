# V2.0（2026-10-29）收口

> 分支 `upgrade` · 基线 `d947dc1`（V2.0 规划目录重建）· 5 卡全终态。

## 一、5 卡结果

| 卡 | 名称 | 状态 | 结果 |
|---|---|---|---|
| ADR-01 | 前台冻结例外追认 | done | ADR-039 六节齐全；`88e72d69` 移动端导航/悬浮层豁免；基线 stale 交 Linux CI |
| E2E-01 | hub-content 断言同步 | done | 2/2 PASS（旧「草稿已入库」→「「${title}」已入库」，未弱化） |
| M3-01 | 命中区 ≥44px（方案 A） | done | 34 处/19 文件 + login 越界 2 处 + 分页 375 flex-wrap 防溢出；两视口全 ≥44；M3 40 FAIL 归零 |
| LCP-01 | LCP/CLS 测量口径 | done | 方案 C：真实浏览器为准（LCP 136ms PASS），模拟 3.1–3.3s 仅趋势；CLS 0.208→0 关闭 |
| E1 | V2.0 收口 | done | 本卡（5/5 done + 唯一全量 + changelog + 冻结面复核） |

## 二、4 项 V1.9 遗留处置结论

1. **M3 命中区 <44px（40 FAIL）** → **D-20-01 用户裁决方案 A 全局提升 44px（桌面端同样生效）** → M3-01 落地。已知代价：桌面密度变松（用户选择）、视觉基线需重建、B2 参照需复核。
2. **LCP 测量口径分歧** → **D-20-02 方案 C 双口径并存、真实为准** → LCP-01 裁定书。CLS 同步关闭。
3. **前台冻结面例外（`88e72d69`）** → ADR-01 追认 ADR-039（仅移动端响应式类、不可外推）。
4. **hub-content E2E 断言断链** → E2E-01 同步新 toast 文案。

## 三、唯一一次全量门禁（串行，2026-10-29）

| 项 | 命令 | 结果 |
|---|---|---|
| lint | `eslint --max-warnings 0` | **exit 0** |
| typecheck | `tsc --noEmit` | **exit 0** |
| test | `vitest run --no-file-parallelism` | **91 文件 / 1859 用例全过，exit 0** |
| build | `next build` | **exit 0** |
| visual | `npm run test:visual` | 5 PASS / 40 FAIL（见 UNKNOWN #1） |
| e2e | `npm run test:e2e` | **79 PASS / 0 FAIL，exit 0** |

> 首跑 e2e 曾 78P/1F（`/manager/media` 375 横向溢出 396>375），M3-01 分页按钮组加 `flex-wrap` 后重跑 **79P/0F** 归零。

## 四、UNKNOWN / 遗留（跑 ≠ 门禁，记录不阻断）

1. **视觉 40 FAIL**：win32 本地像素差异不采信（Linux 基线字体差异；M3-01 尺寸变化 + `88e72d69` 移动端导航致基线 stale）。diff 均为文字字形抗锯齿、布局结构一致。**靠 CI 重建判定**，本地记 UNKNOWN。
2. **视觉基线 stale 仍存在**：基线 `ad4cf70e`（10-27）< `88e72d69`（10-29）+ M3-01 尺寸变化；ADR-01 建议 Linux CI 重建，本方向未重建（合规）。
3. **B2 键盘验收参照复核**：M3-01 仅改尺寸类（`h-8/9/10→h-11`），DOM 结构与 Tab 顺序（按 DOM 序）不变，B2 参照仍有效；未重跑全量 B2（成本高），记为低风险、非阻断。
4. **桌面密度变松**：用户已知并选择（M3-01 记录）。

## 五、与 V1.9 差异

- V2.0 5 卡 = **V1.9 遗留 4 项 + 收口**：ADR-01（豁免追认）、E2E-01（断言同步）、M3-01（命中区）、LCP-01（测量口径）、E1（收口）。
- V1.9 E2E 遗留 2 FAIL（hub-content）→ **归零**（E2E-01，79P/0F）。
- V1.9 M3 40 FAIL → **归零**（M3-01，两视口全 ≥44）。
- V1.9 D1-FIX PARTIAL（LCP 口径）→ **LCP-01 裁定真实为准 = PASS**。
- 前台冻结面：V2.0 仅追认 `88e72d69` 例外（ADR-039），本方向零改动；`src/app/(web)/**`、`src/components/web/**` 零改动。

## 六、双端同步

- 推送后 `upgrade...origin/upgrade`：**0 0**。