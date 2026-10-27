# HDwebsite 规划 V1.5（2026-10-27）

**基线**：`upgrade@d25e0eb`（本机实测，`origin/upgrade...HEAD = 0 0`，工作区仅 2 个未跟踪规划文件）。
**上一轮**：`docs/V1.4-20261027/`（9 卡，**已全部完成**，但台账 4 卡未回填）。
**本版定位**：**验收闭环 + 已暴露缺口修复轮**。

> 本轮不新增业务功能。0 迁移 / 0 新依赖 / 不改前台视觉。
> 只做三件事：把 V1.4 的台账补平、修掉 V1.4 审计暴露但未修的缺口、把"待人工核验"的项真正核完。

---

## 一、为什么 V1.5 是"收口轮"而不是"功能轮"

三条独立证据支撑这个判断，任一条都可单独成立：

### 证据 1：功能对等已清零
`docs/design/02_requirements/parity-matrix.md:23-28` 实测：

| 项 | 数值 |
|---|---|
| present（对等主表 57 行） | 50 |
| replaced | 7 |
| partial | **0** |
| missing | **0** |

57 = 50 + 7，缺口为零。**没有"未实现的功能"可做**。

### 证据 2：需求验收已判定完（90/102）
`evidence/V14/REQ-LEDGER-01/requirements-ledger.md:3` 实测：PASS=90 / UNKNOWN=12 / N-A=0 / 合计=102。

需求文档未勾选数实测 **12**、已勾选 **90**（`grep -rc "^- \[ \]"` 与 `^- \[x\]` 逐文件累加）。数字对得上。

12 条 UNKNOWN 全部有具体原因，其中 5 条是**真实凭证依赖**（微信/SMTP）、1 条 Lighthouse 环境、3 条部署演练、**2 条是"独立验证者未执行"**、1 条首个真实采集源。

### 证据 3：V1.4 九卡全部有产出，但台账只回填了 5 张
`git log --grep` 实测：

| 卡 | 实际提交 | state.json 声明 |
|---|---|---|
| V14-FROZEN-GUARD-01 | `7d29740`、`ee57569` | **ready / commits=[]** ❌ |
| V14-UI-CONSIST-01 | `026c398` | **ready / commits=[]** ❌ |
| V14-PERF-01 | `0ed1264` | **ready / commits=[]** ❌ |
| V14-REQ-LEDGER-01 | `afc2089` | **ready / commits=[]** ❌ |
| V14-REL-01 | `d25e0eb` | **ready / commits=[]** ❌ |
| V14-BASE-01 / UI-HUB-01 / A11Y-01 / VIS-STAB-01 | 有 | done ✅ |

**9 张卡全部有代码/证据落地，但 5 张台账仍写 ready。** 这是台账滞后，不是功能缺失。

---

## 二、V1.4 遗留的真实缺口（本轮要做的）

审计矩阵 `evidence/V14/UI-CONSIST-01/audit-matrix.md` 暴露 4 类问题。我逐条复核，**其中 1 类是脚本误判，3 类是真缺口**。

### 2.1 已排除：PageHeader "缺失 29 页" 是误判

`scripts/audit-manager-ui.mjs:28` 的判定正则：

```js
const PAGEHEADER = /<PageHeader\b/;
```

它只检查页面文件里有没有 `<PageHeader` **字面量**，不看组件内部是否已渲染。

实测：29 个"缺失"页面中，**27 个使用 `CrudPage`**，而 `CrudPage.tsx:370` 明确渲染了：

```jsx
<PageHeader title={spec.title} description={spec.description} actions={createBtn} />
```

真正没有 PageHeader 的只有 2 个，且都合理：
- `manager/news/page.tsx`：纯 `redirect("/manager/articles")` 兼容入口，无 UI
- `manager/login/page.tsx`：登录页用 `<h1>欢迎回来</h1>`，本就不属于列表页范式

**结论：PageHeader 缺口 = 0。审计脚本需修正判定逻辑（加入 CrudPage 间接渲染识别）。**

### 2.2 真缺口 A：令牌作用域 2 页硬编码色值

实测证据（`grep -nE "#[0-9a-fA-F]{3,8}|rgba?\("`）：

**`content-hub/page.tsx:531-534`** —— 公众号预览模拟区：
```jsx
<div className="rounded-mgr-control bg-[#f7f7f7] p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
  <p className="mb-2 text-center text-[15px] font-bold text-black">{viewing.title}</p>
  <p className="mb-3 text-center text-[11px] text-gray-400">点击上方蓝字关注我们</p>
  <div className="text-[13px] leading-6 text-gray-800">
```

这里硬编码 `#f7f7f7` / `black` / `gray-400` / `gray-800`。

**但这处有正当理由**：它在**模拟微信公众号的阅读界面**，必须用微信的真实配色，用 `mgr-*` 令牌反而失真（公众号不会跟随后台主题）。这是设计意图，不是缺陷。

**`login/page.tsx:63,68,73,77`** —— 登录页渐变与白字：
```jsx
"radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), ..."
<span className="... bg-white/15 ...">弘</span>
<p className="mt-3 text-[14px] leading-relaxed text-white/80">
```

登录页是品牌落地页，用 `#fff`/`white` 是因为**背景是深色品牌渐变**，`mgr-*` 令牌没有"反色"语义。

**结论：两处都是"有理由的例外"，应登记为受控白名单，而不是修掉。** 强行改成令牌会导致视觉失真 —— 这正是 REQ-F-014 冻结要防的事。

### 2.3 真缺口 B：3 项人工校验从未执行

审计矩阵 42 行里 `五态覆盖 / 键盘可达 / 375px 可用` 三列**全是"待核"**。

`requirements-ledger.md` 里 2 条 UNKNOWN 也写明："独立验证者抽查≥10 行未执行"、"独立验证者逐页人工核对未执行"。

**这是本轮最实的工作量**：42 页 × 3 项 = 126 个判定格，目前 0 格有结论。

### 2.4 真缺口 C：1 处五态覆盖可疑

实测 `categories` 页面：
```
grep -cE "EmptyState|ErrorState|TableSkeleton|PageSkeleton|Forbidden" src/app/manager/categories/page.tsx → 0
```

对比 `articles: 4`、`media: 5`。`categories` 走 `CrudPage`（内部有五态），所以可能是间接覆盖 —— **但需实测确认**，不能假设。

---

## 三、V1.5 的三个切片 / 6 张卡

| 切片 | 卡 | 目标 | 执行者 | 档位 |
|---|---|---|---|---|
| S0 | V15-LEDGER-01 | V1.4 五卡台账回填（纯文书） | 外部助手 | haiku |
| S1 | V15-AUDIT-FIX-01 | 审计脚本修正（PageHeader 误判） | 外部助手 | sonnect |
| S1 | V15-TOKEN-01 | 令牌例外白名单化（2 页登记，不改样式） | 外部助手 | sonnect |
| S2 | V15-UX-STATES-01 | 42 页五态覆盖实测（**UI 判断，我做**） | main-agent | opus |
| S2 | V15-KEYBOARD-01 | 42 页键盘可达实测（**交互判断，我做**） | main-agent | opus |
| S3 | V15-MOBILE-375-01 | 42 页 375px 可用实测（**交互判断，我做**） | main-agent | opus |
| S4 | V15-CLOSE-01 | 收口：台账终态 + changelog + 双端 | 外部助手 | haiku |

### 分工依据（按 5 年判据，不是按工作量）

**我做**（3 张）：五态 / 键盘 / 375px 都是**需要判断"什么叫覆盖充分"**的验收工作。判错会把真缺陷放过，或把合理设计判成缺陷 —— 这是不可逆的验收决策。而且三者共享同一批 42 页的上下文，同一个人做才不会前后口径不一。

**助手做**（4 张）：台账回填（纯转录）、脚本正则修正（规则明确）、白名单登记（枚举）、收口（模板填空）。

**注意**：我没有为了"少干活"把验收也推给助手。恰恰相反，**最需要判断力的三张我留给自己**，因为它们决定"V1.4 到底算不算真完成"。

---

## 四、执行顺序

```text
第一波（可并行，路径不相交）
├─ S0 V15-LEDGER-01       docs/V1.4-20261027/state.json
├─ S1 V15-AUDIT-FIX-01    scripts/audit-manager-ui.mjs
└─ S1 V15-TOKEN-01        docs/design/06_validation/evidence/V14/UI-CONSIST-01/

第二波（串行，需第一波结论）
└─ S2 三张验收卡           只写 evidence，不改 src

第三波（串行，需全部证据）
└─ S4 V15-CLOSE-01        state 终态 + changelog + 双端
```

**为什么 S2 三张可并行**：它们只写 `evidence/V15/**` 下各自的文件，不共享可变状态，不改 `src/**`，不改同一份 evidence，天然路径不相交。

**为什么 S2 必须在 S1 之后**：如果审计脚本的 PageHeader 判定不先修正，S2 的人工复核会被误导 —— 执行者会以为 29 页缺头部而去"补"，那是白干甚至改坏。

---

## 五、本轮的"拒绝全量回归"怎么落地

用户明确要求：拒绝全量回归/门禁，按阶段体检，单卡只跑它改到的测试。

| 卡 | 只跑什么 | 为什么够 |
|---|---|---|
| V15-LEDGER-01 | `node -e "JSON.parse(...)"` 校验 state.json 合法 | 纯文书，无代码 |
| V15-AUDIT-FIX-01 | `node scripts/audit-manager-ui.mjs` + 对 2 个已知页断言输出 | 只改一个脚本 |
| V15-TOKEN-01 | `node scripts/audit-manager-ui.mjs \| grep 令牌` | 只改 evidence |
| V15-UX-STATES-01 | 无需命令，人工逐页 | 只写 evidence |
| V15-KEYBOARD-01 | 无需命令，人工逐页 | 只写 evidence |
| V15-MOBILE-375-01 | 无需命令，人工逐页 | 只写 evidence |
| V15-CLOSE-01 | `git rev-list --left-right --count` | 纯台账 |

**全量 `npm run check` + `test:visual` + `test:e2e` 只在 V1.5 全部完成后跑一次**（S4 收口时），不按卡跑。

理由：本轮 7 张卡里 6 张不碰 `src/**`，跑全量门禁的边际收益接近零，而 e2e 单轮 3 分钟 × 7 次 = 21 分钟纯浪费。这与 V1.4 的教训一致 —— BASE-01 已经把七道门禁全跑过一遍，基线是绿的。

---

## 六、读这个

| 文件 | 内容 |
|---|---|
| `00-规划快照与事实基线.md` | 快照 + 9 条实测 + 文档/代码不一致 5 条 |
| `01-需求基线复核.md` | MUST/SHOULD/COULD/MUST NOT + 冲突 + 未知登记 |
| `02-契约冻结包.md` | 六份契约（本轮 0 变更，标注"沿用 V1.4"） |
| `03-数据模型基线.md` | 48 模型 / 8 迁移目录 / 0 新迁移理由 |
| `04-垂直切片清单.md` | 4 刀 + 排序 + 并行组 |
| `05-DAG-所有权-档位.md` | DAG + 所有权矩阵 + 档位 + 成本 |
| `06-验收体系.md` | 门禁 + 阶段体检口径 + 完成定义 |
| `07-风险与待裁决.md` | 待裁决 + 未决 + 风险 + 历史坑 |
| `08-自检与局限.md` | 自检 12 项 + 局限声明 |
| `09-落盘清单与执行协议.md` | 文件清单 + 取卡循环 + 铁律 |
| `10-助手交付核实与规划差异.md` | 助手五卡交付逐条核实（10/12 成立，2 处偏差）|
| `11-阶段收尾与交接.md` | **本轮收尾：3/7 卡完成 + 剩余启动条件 + 交接清单** |
| `tasks/` | 7 张卡（16 项字段齐全） |
| `steps/` | STEP-S0 ~ S3，每步一个 md |
| `state.json` | 状态机（7 卡，0 环） |

---

## 七、第一刀

`V15-LEDGER-01`（纯文书，10 分钟）→ 然后并行 `V15-AUDIT-FIX-01`、`V15-TOKEN-01`。

**第一刀必须是台账回填**，理由：现在 `state.json` 显示 5 卡 ready，会误导任何执行者以为还有 5 卡要做。先把台账钉正，后续并行才有正确前提。
