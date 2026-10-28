# STEP-1-1：配置键注册（WP1-ST1）

## 目标
在 `settings-registry.ts` 注册 11 个键，恢复原版的配置入口。

## 卡
WP1-ST1（`sonnect`，约 1h）

## 为什么先做
新键带默认值，等价原版默认行为 → 对现渲染**零影响**。且它是 ST2 的数据来源，没有键则组件 props 无处取值。

## 11 个键清单（默认值全部来自原版）

| # | 键 | 分组 | 默认 | type |
|---|---|---|---|---|
| 1 | `fourCardsShowSection` | cards | `"true"` | boolean |
| 2 | `fourCardsBgColor` | cards | `""` | — |
| 3 | `fourCardsBgImage` | cards | `""` | — |
| 4 | `fourCardsContainerAlign` | cards | `"center"` | — |
| 5 | `topbarBgImage` | topbar | `""` | — |
| 6 | `statsBgImage` | stats | `""` | — |
| 7 | `bannerShowExtraBtn` | banner | `"false"` | boolean |
| 8 | `bannerExtraBtnText` | banner | `""` | — |
| 9 | `bannerExtraBtnLink` | banner | `""` | — |
| 10 | `wechatQrCode` | contact | `""` | image |
| 11 | `showImageOverlays` | display | `"true"` | boolean |

**默认值依据**：
- #1/#11：原版 `page.tsx:168,38` 用 `!== "false"` 判定 → 默认开启
- #7：原版 `page.tsx:161` 用 `=== "true"` 判定 → 默认关闭

## 执行步骤

1. 读 `src/lib/settings-registry.ts:81`（`cardShowOverlay` 位置），确认 `def()` 签名与写法
2. 按分组插入 11 行（`def(key, label, group, defaultValue, opts?)`）
3. `wechatQrCode` 必须带 `{ type: "image" }`（管理端渲染上传控件）
4. `display` 分组若不存在，需在 `src/contracts/setting.ts` 的 `settingGroups` 加入
5. **不改任何已有键**的默认值

## 完成判据

- [ ] 11 个键全部存在，group 正确
- [ ] `bannerShowExtraBtn` 默认为 `"false"`，其余布尔为 `"true"`
- [ ] `wechatQrCode.type === "image"`
- [ ] 已有键的默认值零变更（`git diff` 只含新增行）

## 验证命令

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -cE 'def\("(fourCards|topbarBg|statsBg|bannerShow|bannerExtra|wechatQr|showImageOverlays)' src/lib/settings-registry.ts
# 期望 11
npx tsx -e "
import {getSettingDefinition} from './src/lib/settings-registry';
const keys=['fourCardsShowSection','fourCardsBgColor','fourCardsBgImage','fourCardsContainerAlign','topbarBgImage','statsBgImage','bannerShowExtraBtn','bannerExtraBtnText','bannerExtraBtnLink','wechatQrCode','showImageOverlays'];
for(const k of keys){const d=getSettingDefinition(k);console.log(k.padEnd(26), d?d.group+' / '+d.defaultValue+' / '+d.type:'MISSING');}
"
git diff --stat src/lib/settings-registry.ts
```

## 常见坑

| 坑 | 防守 |
|---|---|
| `bannerShowExtraBtn` 默认写成 `"true"` | 原版是 `=== "true"`，必须 `"false"` |
| 顺手“优化”了已有键默认值 | `git diff` 只允许新增行 |
| `display` 分组未在 contracts 注册 | 需同步 `settingGroups` |
| 给键加 `isPublic: false` | 前台要读，不能隐藏 |
