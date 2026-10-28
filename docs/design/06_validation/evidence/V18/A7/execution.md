# A7 执行证据：复用去重

## 5W1H
- **What**：把两处重复的 `localImageExists` 提取为共享模块 `src/lib/image-exists.ts`。
- **Why**：gallery/page.tsx 与 data/home.ts 各自实现一份（重复），未来加 CDN 判定时容易只改一处 → 首页图"缺失"但图集页"正常"。
- **Where**：`src/lib/image-exists.ts`（新建）；`src/app/(web)/gallery/page.tsx`、`src/components/web/data/home.ts`（改 import）。
- **Who**：external-assistant。
- **How**：STEP-A7-1 先 diff 两处实现 —— **完全相同**（gallery :19-32 / home :17-30，逻辑逐行一致）→ 直接提取；STEP-A7-2 新建共享模块；STEP-A7-3 两处删除本地定义、移除不再使用的 `node:path`/`node:fs/promises` import、改引 `@/lib/image-exists`。
- **What if**：若两处有差异则须先在 evidence 写明差异与选择理由（本卡无差异，直接提取）；若漏掉 `startsWith("/")` 外链会被误判 missing。

## 改动文件
- `src/lib/image-exists.ts`（新增 22 行）
- `src/app/(web)/gallery/page.tsx`（-20 / 改 import）
- `src/components/web/data/home.ts`（-20 / 改 import）

## 验证据条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 0 个本地重复定义 | `grep -rc "async function localImageExists" src/` → 仅 image-exists.ts:1 | PASS |
| 2 | 2 处 import 自 `@/lib/image-exists` | `grep -rn 'from "@/lib/image-exists"'` → 2 | PASS |
| 3 | 外链 URL 仍返回 true | 代码：`if (!url.startsWith("/")) return true;` | PASS（代码级） |
| 4 | tsc exit 0 | `npx tsc --noEmit` | PASS（0） |

## UNKNOWN
无。两处实现完全相同，直接提取无差异取舍；外链行为由 `startsWith("/")` 分支保证（代码级）。