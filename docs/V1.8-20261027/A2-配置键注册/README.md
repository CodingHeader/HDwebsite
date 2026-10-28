# A2 · 配置键注册

## 归属
- 阶段编号：A2
- 所属分组：A 能力对等（承接 V1.7 WP1-ST1）
- 来源凭据：`docs/V1.7-20261027/03-剩余任务大纲.md §AT1.1~1.4`、`08-管理层裁决.md §裁决2`

## 目标
在 `src/lib/settings-registry.ts` 注册 11 个键，恢复原版的配置入口。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// src/lib/settings-registry.ts:14-32 —— def() 签名
function def(key, label, group, defaultValue, opts: Partial<RegistryItem> = {}): RegistryItem
// opts 支持 type / isPublic / isEncrypted / description
```

### ② 实测证据
```bash
# 新版 85 个键中没有这 11 个
$ grep -cE 'def\("' src/lib/settings-registry.ts
85
$ grep -cE 'def\("(fourCards|topbarBg|statsBg|bannerShowExtra|bannerExtra|wechatQr|showImageOverlays)'
0

# 原版 dev.db 里这 11 个键真实存在（含 group/type/isPublic）
$ node -e "SELECT key,\"group\",type,isPublic FROM Setting WHERE key IN (...)"
showImageOverlays          display   boolean public=1
wechatQrCode               contact   string  public=1
fourCardsBgColor           cards     string  public=1
fourCardsBgImage           cards     string  public=1
fourCardsShowSection       cards     boolean public=1
fourCardsContainerAlign    cards     string  public=1
topbarBgImage              topbar    string  public=1
statsBgImage               stats     string  public=1
bannerShowExtraBtn         banner    boolean public=1
bannerExtraBtnText         banner    string  public=1
bannerExtraBtnLink         banner    string  public=1

# 原版前台的消费点（证明不是死键）
(web)/page.tsx:168  fourCardsShowSection !== "false"
(web)/page.tsx:170  fourCardsBgImage || ""
(web)/page.tsx:171  fourCardsContainerAlign
(web)/page.tsx:134  topbarBgImage
(web)/page.tsx:140  statsBgImage
(web)/page.tsx:161  bannerShowExtraBtn === "true"
(web)/page.tsx:162-163  bannerExtraBtnText/Link
(web)/layout.tsx:36,71  wechatQrCode
(web)/campus/page.tsx:38  showImageOverlays
```

### ③ 规划落点
- 本卡 → A3 的组件 props 从哪里取值、A4 的接线传什么
- 无本卡 → A3 的 props 恒 `undefined`，A4 无键可传

## 输入
- 前置阶段：**A1**（需 `display` 分组与 `image` 类型）
- 前置状态：A1 完成，`tsc` exit 0

## 输出
- 修改：`src/lib/settings-registry.ts`（+11 行 `def(...)`）

## 11 个键的精确规格

| # | key | label | group | defaultValue | opts |
|---|---|---|---|---|---|
| 1 | `fourCardsShowSection` | 四宫格整体显示 | cards | `"true"` | `{type:"boolean"}` |
| 2 | `fourCardsBgColor` | 四宫格背景色 | cards | **`""`** ⚠️ | — |
| 3 | `fourCardsBgImage` | 四宫格背景图 | cards | `""` | `{type:"image"}` |
| 4 | `fourCardsContainerAlign` | 四宫格内容对齐 | cards | `"center"` | — |
| 5 | `topbarBgImage` | 顶栏背景图 | topbar | **`""`** ⚠️ | `{type:"image"}` |
| 6 | `statsBgImage` | 统计横幅背景图 | stats | `""` | `{type:"image"}` |
| 7 | `bannerShowExtraBtn` | 显示第二按钮 | banner | `"false"` | `{type:"boolean"}` |
| 8 | `bannerExtraBtnText` | 第二按钮文字 | banner | `"了解更多"` | — |
| 9 | `bannerExtraBtnLink` | 第二按钮链接 | banner | `"/courses"` | — |
| 10 | `wechatQrCode` | 微信二维码 | contact | `""` | `{type:"image"}` |
| 11 | `showImageOverlays` | 显示图片遮罩 | display | `"true"` | `{type:"boolean"}` |

### 两处 ⚠️ 的裁决依据

**#2 `fourCardsBgColor` 默认 `""`（原版是 `#f9fafb`）**
- ① 原版 `FourCards.tsx:127,147`：`bgColor = "#f9fafb"` → `style={{backgroundColor: bgColor}}`
- ② 新版 `FourCards.tsx:115`：`<section className="bg-gray-50 py-6">`；Tailwind `gray-50` **标准值就是 `#f9fafb`**
- ③ 两者视觉等价。默认空 → 不设 inline style → 沿用类名；避免「inline style 与 class 双处控制同一属性」

**#5 `topbarBgImage` 默认 `""`（原值是失效路径）**
- ① 原版 DB 值：`/uploads/202605/1778048088558-ne0f5b.png`
- ② `test -f public/uploads/202605/1778048088558-ne0f5b.png` → **不存在**（该目录只有另外两张图）
- ③ 恢复失效路径 → 前台加载 404 图片 → 破图。故置空

## Execution Steps
见 `steps/STEP-A2-1.md`（cards 4 键）、`STEP-A2-2.md`（topbar/stats 2 键）、`STEP-A2-3.md`（banner 3 键）、`STEP-A2-4.md`（contact/display 2 键）、`STEP-A2-Z-体检.md`

## 验收标准
- [ ] 11 个键全部存在且 group 正确（可自动化）
- [ ] `bannerShowExtraBtn` 默认 `"false"`，其余布尔默认 `"true"`（可自动化）
- [ ] 4 个图片键的 `type === "image"`（可自动化）
- [ ] `wechatQrCode` 的 `isPublic === true`（前台要读）
- [ ] `npx tsc --noEmit` exit 0（可自动化）
- [ ] 已有 85 个键的默认值零变更（可自动化：`git diff` 只含新增行）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
npx tsx -e "
import {getSettingDefinition} from './src/lib/settings-registry';
const ks={fourCardsShowSection:'cards',fourCardsBgColor:'cards',fourCardsBgImage:'cards',
fourCardsContainerAlign:'cards',topbarBgImage:'topbar',statsBgImage:'stats',
bannerShowExtraBtn:'banner',bannerExtraBtnText:'banner',bannerExtraBtnLink:'banner',
wechatQrCode:'contact',showImageOverlays:'display'};
let bad=0;
for(const [k,g] of Object.entries(ks)){
  const d=getSettingDefinition(k);
  if(!d){console.log('MISSING',k);bad++;continue}
  if(d.group!==g){console.log('GROUP_WRONG',k,d.group);bad++}
  console.log(k.padEnd(26), d.group.padEnd(10), d.type.padEnd(8), JSON.stringify(d.defaultValue));
}
console.log(bad?'FAIL '+bad:'ALL OK');
"
npx tsc --noEmit && echo "tsc PASS"
git diff --stat src/lib/settings-registry.ts
```

## 证据路径
`docs/design/06_validation/evidence/V18/A2/execution.md`

## 允许修改
- `src/lib/settings-registry.ts`

## 禁止修改
- `src/contracts/**`（A1 已改，本卡不再动）
- 已有 85 个键的任何字段
- `prisma/**`、`package.json`

## 依赖与阻塞
- Depends on：A1
- Blocks：A3、A4、A5、A8、B1（审计矩阵可信度）
- 阻塞条件：若 `display` 分组报类型错 → 说明 A1 未生效，停手回查

## 建议执行档位
`sonnect`　理由：按表注册键，规则明确，但两处特例需理解裁决依据。

## 升级条件
若 `tsc` 报 `display` 不在 `settingGroups` → 说明 A1 漏改，回退到 A1。

## 预估规模
小（0.7h，约 40 分钟）

## 自我质疑

**质疑：为什么不照抄原版全部 90 个键，只补 11 个？**
→ 因为新版已有 85 个键覆盖了绝大部分。逐项比对后真实缺失只有 8 项（另 3 项是 variant），其余 20 个"看似缺失"实际是分组名被误当键（`V1.7/02` 已证）。**补 11 个是去重后的真实缺口。**

**质疑：`bannerShowExtraBtn` 默认 `false` 会不会让运营以为丢了功能？**
→ 不会。原版默认也是 `false`（`page.tsx:161` 用 `=== "true"` 判定，严格等于才显示）。默认 `false` 是**忠实还原**，不是新决定。
