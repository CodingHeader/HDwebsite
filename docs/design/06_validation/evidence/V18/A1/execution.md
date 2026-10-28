# A1 执行证据：契约补齐

## 5W1H
- **What**：`src/contracts/setting.ts` 补两处枚举：`settingGroups` 加 `display`、`settingDefinitionSchema.type` 加 `image`。
- **Why**：不补 `display`，A2 的 `showImageOverlays` 无处注册；不补 `image`，4 个图片键只能用 `string`。原版该键 group 即 `display`，且新版 SchemaForm 已实现 `image` 分支（`case "image"`、`fields/ImageField.tsx`）。
- **Where**：`src/contracts/setting.ts`（契约唯一源）。
- **Who**：external-assistant。
- **How**：`"display",` 插在 `"other",` 之后、`"email",` 之前（保持 17 组顺序不变）；`type` 枚举仅加 `"image"`（不加原版其余 9 种，避免死枚举）。
- **What if**：若误插末尾会打乱设置页 tab 顺序；若误加 `textarea/url/color` 等未实现类型会成死枚举。

## 改动文件
- `src/contracts/setting.ts`（+2 / 改 1 行）

## 验证据条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 分组数 17→18 | `grep -cE '^\s+"'` 区间 | PASS（18） |
| 2 | type 枚举含 image（5→6 值） | `grep 'type: z.enum'` | PASS |
| 3 | tsc exit 0 | `npx tsc --noEmit` | PASS（0） |
| 4 | diff 仅 2 行新增 | `git diff --stat` | PASS（2 insertions / 1 deletion） |

## UNKNOWN
无。