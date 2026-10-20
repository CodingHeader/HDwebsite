# D-04 独立复审报告（V0.7）

- 复审对象：D-04「设置键对等 16 键 + 默认值单一来源 + 修正 3 个不存在的默认资源路径」
- 起点：`3e588f9`；终点：`305ce80`（feat(V7-D-04)）
- 执行证据：`docs/design/06_validation/evidence/V7/D-04/execution.md` + `plan.md`
- 复审日期：2026-10-20
- 复审方式：子智能体独立复审（含 bash，只读）

## 一、子智能体复审结论

- **PASS（完成度 92%）**，有条件
- 验收1 parity 5/5 PASS；验收2 visual 间接 PASS（4 个前台冻结面 diff 为空）；验收3 门禁 4 连 exit 0；验收4 diff 6 文件全在允许路径内
- 静态审查确认 15 键补齐、3 个不存在路径已修正（existsSync 断言通过）、单一来源覆盖循环不动前台数据源、homeCards 断言 undefined
- 冻结面零触碰；无 P0/P1；3 项 P2 观察

## 二、逐条验收实测（子代理 bash）

| 项 | 结果 | 证据 |
|---|---|---|
| 验收1 settings-parity | PASS | `npx vitest run src/lib/__tests__/lane-d/settings-parity.test.ts` → 5 passed，exit 0 |
| 验收2 visual | UNKNOWN（间接 PASS） | 本机无 Playwright；`git diff --stat 3e588f9..305ce80 -- src/app/(web)/ src/components/web public src/app/globals.css` 无输出 → 前台冻结面零改动 |
| 验收3 通用门禁 | PASS | lint exit 0 / tsc exit 0 / vitest 706 passed（57 files）/ build exit 0 |
| 验收4 diff 白名单 | PASS | 6 文件全部落在允许路径内（`--first-parent` 口径） |

## 三、settings-registry 静态审查（子代理逐行确认）

- **15 键齐全**：`siteLogoIcon`(:44)、`bannerOverlayColor`(:60)、`bannerTextAlign`(:62)、`bannerTextVerticalAlign`(:63)、`bannerShowTitle/Subtitle/Btn`(:65-67)、`statsLabel`(:71)、`advantage1~4`(:76-79)、`cardZikaoSubtitle`(:83)、`cardChengkaoSubtitle`(:86)、`cardKaifangSubtitle`(:89)
- **3 个默认资源路径修正**：`defaultPlaceholderImage → /images/logo_card.png`(:42)、`bannerBgImage → ""`(:55)、`siteFavicon → ""`(:46)；parity 测试对这三项做 `existsSync(public/...)` 显式断言，5/5 passed 证明当前 checkout 文件真实存在
- **单一来源覆盖循环** `:192-200`：`WEB_GROUPS`（10 个前台分组）∪ `SKIP_WEB_OVERRIDE`（contactPhone/siteUrl/statsText），`WEB_SETTING_DEFAULTS` 有值才覆盖
- **不破坏前台数据源**：`src/components/web/data/**` 零改动，前台 `getWebSettings` 快照路径未变
- **homeCards 断言**：`settings-parity.test.ts:63-65` `expect(getSettingDefinition("homeCards")).toBeUndefined()`，与 main 注释「已迁移至 HomeCard 表、通过 /api/homecards 管理」一致

## 四、冻结面与允许路径

`git diff --stat 3e588f9..305ce80 -- src/contracts prisma/schema.prisma prisma/migrations package.json package-lock.json vitest.config.ts playwright.config.ts tests/e2e/playwright.config.ts public src/app/globals.css` 全部无输出。允许路径 6 文件（settings-registry.ts、lane-d/**、scripts/check-assets.known-missing.txt、D-04 证据目录）。`src/components/web/data/**` 未动（本卡确实只改 registry，不改 setting-defaults.ts）。

## 五、P2 观察（不阻塞）

1. `settings-registry.ts:195-200` 顶层覆盖循环在模块加载期执行；若未来用作可复用纯数据，字面量与导出值可能不一致——有注释说明，风险低。
2. visual 未实测，仅靠前台冻结文件零 diff 间接论证（任务设计允许的降级路径）。
3. `main-registry.keys.json` 57 键 vs 正文「56 扁平 + 1 废弃 homeCards」口径微不一致，不影响验收。

## 六、最终判断

- **结论：PASS（完成度 92%）**
- 依据：4 项验收 3 项实测 PASS + 1 项间接 PASS；门禁 4 连 exit 0；冻结面零触碰；无越界；静态审查 15 键 + 3 路径 + 单一来源 + homeCards 全部到位。
- 前提：本机无 Playwright，visual 未实跑；以冻结面零 diff 作为不破证。
- 局限性：
  - visual 未实跑（`npm run test:visual`），归 W2-05 全量回归或部署机实测闭合。
  - 契约 `type` 枚举不含 image/color/select，main 的这 3 类 UX 在后台退化为文本输入——已登记 UNKNOWN，需 CCR + 用户批准恢复。
- 允许进入下一阶段：**是**。