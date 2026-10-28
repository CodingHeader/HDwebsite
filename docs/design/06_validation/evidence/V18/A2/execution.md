# A2 执行证据：11 个配置键注册（settings-registry）

## 5W1H
- **What**：把原版 dev.db 实测的 11 个配置键注册进 `SETTINGS_REGISTRY`，并补 `display` 分组标签。
- **Why**：原版前台依赖这些键（四卡/顶栏/统计/横幅附加按钮/公众号二维码/图片遮罩），缺失会导致设置面板空白或前台回退默认值；补齐后设置定义与前台消费一致。
- **Where**：`src/lib/settings-registry.ts`（+11 键）、`src/app/api/settings/definitions/route.ts`（+1 GROUP_LABELS）。
- **Who**：external-assistant（V1.8 批次 2）。
- **How**：按 A1 已批准的 `image` 类型 + `display` 分组，逐键 `def(...)`；位置按原版插入点（cardKaifangLink/topNoticePhone/statsText/bannerShowBtn/address 后、registry 末尾新分组）。
- **What if**：`image` 类型未经 A1/CCR-3 放行会导致契约校验失败；`fourCardsBgColor`/`topbarBgImage` 默认 `""` 避免与 class 双控或破图。

## 改动文件
- `src/lib/settings-registry.ts`（+12 行：11 个 def + display 分组注释；已有 85 键零删除）
- `src/app/api/settings/definitions/route.ts`（+1 行：`display: "展示"`）

## 验证逐条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 11 键全部存在且 group/type 正确 | `npx tsx` 遍历 getSettingDefinition | PASS（11/11） |
| 2 | 类型检查 | `npx tsc --noEmit` | PASS（exit 0） |
| 3 | ESLint | `npx eslint src/lib/settings-registry.ts src/app/api/settings/definitions/route.ts --max-warnings 0` | PASS（exit 0） |
| 4 | 已有 85 键零变更 | `git diff` 无删除行 | PASS（0 删除） |
| 5 | 冻结面守卫 | `node scripts/check-frozen.mjs` | PASS（exit 0，CCR-3 豁免 setting.ts） |

## 键清单（11）
fourCardsShowSection(cards/boolean)/fourCardsBgColor(cards/string)/fourCardsBgImage(cards/image)/fourCardsContainerAlign(cards/string)/topbarBgImage(topbar/image)/statsBgImage(stats/image)/bannerShowExtraBtn(banner/boolean)/bannerExtraBtnText(banner/string)/bannerExtraBtnLink(banner/string)/wechatQrCode(contact/image)/showImageOverlays(display/boolean)

## UNKNOWN
无。
