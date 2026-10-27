# V15-AUDIT-FIX-01 执行证据：审计脚本 PageHeader 判定修正

> 执行时间：2026-10-27
> 执行者：external-assistant
> 起点：`upgrade@463a50d`

## 5W1H 简版
- **What**：修正 `scripts/audit-manager-ui.mjs` 的 PageHeader 判定，识别经 `CrudPage` 间接渲染，把误报的"缺失 29 页"修正为真实 0 页，同时保留对真缺失的检出能力。
- **Why**：REQ-F-015 §5 要求每页有 PageHeader；旧判定 `PAGEHEADER = /<PageHeader\b/` 只匹配字面量，看不到组件内部的间接渲染 → 29 页被误报为缺失（其中 27 页经 `CrudPage` 渲染、news 为纯 redirect、login 用 `<h1>`）。
- **Where**：`scripts/audit-manager-ui.mjs`；重生成 `docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md`。
- **Who**：external-assistant。
- **How**：新增 `CRUDPAGE = /\bCrudPage\b/`；三态判定：含 `<PageHeader` → PASS(direct)；否则含 `CrudPage` → PASS(CrudPage 间接)；否则在已知例外清单（news=纯 redirect、login=`<h1>`）→ PASS(例外)；否则 FAIL。汇总只计 FAIL。
- **What if**：若 `CrudPage` 的 PageHeader 是条件渲染（非顶层），间接判定不成立 → 停止上报（实测 `CrudPage.tsx:370` 为无条件顶层渲染，判定成立）。

## 一、改动内容
### 1.1 `scripts/audit-manager-ui.mjs`
- 新增 `const CRUDPAGE = /\bCrudPage\b/;`
- 新增已知例外清单 `PAGEHEADER_EXCEPTIONS = new Set(["src/app/manager/news/page.tsx", "src/app/manager/login/page.tsx"])`
- 检测：`hasDirectHeader = PAGEHEADER.test(src)`、`hasCrudPage = CRUDPAGE.test(src)`、`isHeaderException = PAGEHEADER_EXCEPTIONS.has(relPath)`、`headerOk = hasDirectHeader || hasCrudPage || isHeaderException`
- 行单元：`PASS(direct)` / `PASS(CrudPage 间接)` / `PASS(例外)` / `FAIL`
- 汇总计数：`if (!headerOk) summary.pageheader++`

### 1.2 事实依据
- `CrudPage.tsx:32` import `PageHeader`；`:370` `<PageHeader title={spec.title} description={spec.description} actions={createBtn} />`（无条件顶层渲染）。
- `news/page.tsx:8` `redirect("/manager/articles")`（纯 redirect 兼容入口，永不渲染内容）。
- `login/page.tsx:90` `<h1 className="...">欢迎回来</h1>`（登录页范式，用 h1 标题）。

## 二、判定对比（修复前 → 修复后）

| 页面 | 修复前 | 修复后 |
|---|---|---|
| 27 页（banners/campus/... 等走 CrudPage） | FAIL（误报） | PASS(CrudPage 间接) |
| `news/page.tsx` | FAIL（误报） | PASS(例外)（纯 redirect） |
| `login/page.tsx` | FAIL（误报） | PASS(例外)（`<h1>` 范式） |
| 真缺失页（如 `__tmp_nohdr`） | FAIL | FAIL（保留检出） |

汇总：PageHeader 缺失 **29 → 0**；42 页 = 13 direct + 27 CrudPage 间接 + 2 例外。

## 三、验收逐条

| 验收条目 | 结果 | 证据 |
|---|---|---|
| `node scripts/audit-manager-ui.mjs` 汇总 PageHeader 缺失 0 | **PASS** | 矩阵 `\| PageHeader 缺失 \| 0 \|` |
| 判定逻辑区分三种情况（直接/CrudPage 间接/真缺失） | **PASS** | 矩阵含 `PASS(direct)`×13、`PASS(CrudPage 间接)`×27、`FAIL`（仅负向） |
| 负向：纯静态无 PageHeader 无 CrudPage 临时页 → FAIL | **PASS** | `__tmp_nohdr/page.tsx` 行 `pageheader: "FAIL"`，用后已删除 |
| 令牌作用域 FAIL 仍为 2 | **PASS** | 矩阵 `\| 令牌作用域 FAIL \| 2 \|`（本卡不改） |
| 未修改 `src/**` | **PASS** | `git status --short src` 为空（临时目录已删） |
| `audit-matrix.md` 已按新逻辑重生成 | **PASS** | 矩阵 mtime 晚于脚本改动；43→42 页（临时页已移除） |

## 四、命令输出摘要
```
$ node scripts/audit-manager-ui.mjs
# summary: pages=42, native=0, feedback=0, token=2, pageheader=0, frontend=0
# matrix: 审计页数 42 | 原生控件 FAIL 0 | 原生反馈 FAIL 0 | 令牌作用域 FAIL 2 | PageHeader 缺失 0 | 前台零改动 0

# 负向（已还原）
$ node scripts/audit-manager-ui.mjs | grep __tmp_nohdr
      "page": "src/app/manager/__tmp_nohdr/page.tsx",  ...  "pageheader": "FAIL",
$ rm -rf src/app/manager/__tmp_nohdr
$ git status --short src   # 空
```

## 五、UNKNOWN
无。判定逻辑可复现：直接引用 / CrudPage 间接 / 例外 / 真缺失四态，负向能力保留。