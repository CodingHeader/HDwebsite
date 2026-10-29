---
task: V19-FIX-02
date: 2026-10-29
head: fd64d5d
status: done
---
# FIX-02 · toast 实体名（4 页）· 执行记录

## 5W1H
- **What**：4 个页面的成功性 toast 点出所建实体名（F-02/F-07/F-08/F-11）
- **Why**：B1 实测 F-02/F-07/F-08/F-11 成功 toast 仅「已创建/已保存」泛词，未点实体名，v2 判据 FAIL
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `fd64d5d`（FIX-01 之后）
- **When**：2026-10-29
- **Who**：执行助手（product-development Skill · EXECUTE 模式）
- **How**：读 4 页 toast 调用 + CrudPage displayName 基线 → 类型 A/B 分路 → 改码 → tsc → 起服务（6791）→ Playwright 探针实测 toast 原文

## 分型与裁决
- **类型 B（content-hub / publish-jobs）**：页面自调 `toast.success`，description 为固定模板 → 走 **路径 A**（直接传实体名）
- **类型 A（banners / enrollment-offerings）**：走 CrudPage 泛型，无页面代码 → 先试 A（新建响应体含可读字段：banners 含 `image/link`，enrollment 含 `sourceBatch`），但实现 A 需在 CrudPage 捕获响应体，超出本卡允许范围（CrudPage 仅允许改 `displayName` 候选键数组，路径 B 时）→ 走 **路径 B**（扩 displayName 候选键）

## 改动清单（3 文件，均在允许路径内）

| 文件 | 改动 | 分型 |
|---|---|---|
| `src/app/manager/content-hub/page.tsx` | 新建成功 toast 描述改 `「${body.title}」已入库，可提交审核。` | B / 路径 A |
| `src/app/manager/publish-jobs/page.tsx` | 新建成功 toast 描述改 `「${contentName}」…`，contentName 取自 `items`（内容条目 label `#id title`） | B / 路径 A |
| `src/components/manager/CrudPage.tsx` | `displayName` 候选键追加 `sourceBatch`、`link`（仅此一行，路径 B） | A / 路径 B |

**候选键安全性**：全量核对 specs.ts —— 所有含 `link` 的资源（hot-majors/service-guides/navigations）均已有更靠前的 `title`/`name` 候选键，故追加 `link` 不改变其显示名；`sourceBatch` 仅 enrollment-offerings 使用。无回归。

## 验证

### tsc + 契约
- `npx tsc --noEmit` → exit 0
- `git diff --stat src/contracts/` → 空（契约未改，冻结面 N-2 未触碰）

### 运行时 toast 原文（`verify.json`，4/4 PASS）
起服务（`next dev -p 6791`，DATABASE_URL=e2e.db）→ Playwright 探针逐页填表单提交 → 截 `toast-success` 原文：

| 页 | Title | Description | 含实体名 |
|---|---|---|---|
| `/manager/content-hub` | 已创建 | 「FIX02内容标题A」已入库，可提交审核。 | ✓ |
| `/manager/publish-jobs` | 已创建 | 「#1 测试内容A」系统每分钟扫描执行 | ✓ |
| `/manager/banners` | 已创建 | /banner-1 | ✓ |
| `/manager/enrollment-offerings` | 已创建 | 2026秋季 | ✓ |

## 判据逐条（与 B1 v2 一致）

| 判据 | 结果 |
|---|---|
| toast-success 可见 | PASS（4/4） |
| (Title + Description) 合并文本包含所建实体名 | PASS（4/4） |
| 该实体名 ∉ {已创建, 已保存, 操作成功, 提交成功} | PASS（4/4，均为具体值） |

## 门禁
- tsc 0 ✓ · 契约未改 ✓ · 仅改 3 文件 ✓ · verify.json 4/4 PASS ✓

## 越界检查
- 未触碰 `src/contracts/common.ts`（toastCopy 冻结）、`src/contracts/**` 其余、`prisma/**`、`package.json`、`tests/**`、前台路径、`docs/V1.8-20261027/**`、`evidence/V18/**`
- 改动仅限：content-hub/publish-jobs 两页（允许）+ CrudPage `displayName` 候选键数组（路径 B，允许）+ `docs/design/06_validation/evidence/V19/FIX-02/**`
- `.cache/v19/`（探针脚本与运行期产物）未提交

## UNKNOWN / 遗留
- 类型 A 的 toast 描述为裸实体值（`/banner-1`、`2026秋季`），未带 `轮播图`/`招生批次` 名词前缀（因 CrudPage 全局 displayName 无 per-spec 名词上下文，超出允许范围）。符合判据（实体名非泛词），但可读性略低于卡片建议的 `轮播图<链接>` 格式；如需前缀，需另开卡改 CrudPage 的 per-spec 名词注入。
- 探针使用 e2e.db 且拦截创建 POST（不落库）；真实创建路径未被污染。
- FIX-01 与 FIX-02 共改 content-hub，已按「先 FIX-01 后 FIX-02」串行完成，各自独立 commit。