# STEP-A2-Z：阶段体检

## 体检表

| # | 项 | 命令 | 期望 | 判据 |
|---|---|---|---|---|
| 1 | 11 键全存在 | `npx tsx -e` 逐键查 `getSettingDefinition` | 11/11 非 undefined | 缺一即 FAIL |
| 2 | group 正确 | 同上，比对 group 字段 | 全部匹配规格表 | 分组错会导致设置页 tab 错位 |
| 3 | 图片键 type | 同上，查 4 个图片键 | `type === "image"` | 否则退化为文本框 |
| 4 | 布尔默认值 | 同上 | `bannerShowExtraBtn="false"`，其余 `"true"` | 与原版一致 |
| 5 | 已有键零变更 | `git diff src/lib/settings-registry.ts \| grep -E "^-" \| grep -v "^---"` | 空 | 只允许新增行 |
| 6 | 类型检查 | `npx tsc --noEmit` | exit 0 | 枚举/类型错会报 |
| 7 | 未越界 | `git status --short src` | 仅 settings-registry.ts | 所有权 |

## 验证脚本

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
npx tsx -e "
import {getSettingDefinition} from './src/lib/settings-registry';
const spec: [string,string,string,string][] = [
  ['fourCardsShowSection','cards','boolean','true'],
  ['fourCardsBgColor','cards','string',''],
  ['fourCardsBgImage','cards','image',''],
  ['fourCardsContainerAlign','cards','string','center'],
  ['topbarBgImage','topbar','image',''],
  ['statsBgImage','stats','image',''],
  ['bannerShowExtraBtn','banner','boolean','false'],
  ['bannerExtraBtnText','banner','string','了解更多'],
  ['bannerExtraBtnLink','banner','string','/courses'],
  ['wechatQrCode','contact','image',''],
  ['showImageOverlays','display','boolean','true'],
];
let bad=0;
for(const [k,g,t,dv] of spec){
  const d=getSettingDefinition(k);
  if(!d){console.log('MISSING',k);bad++;continue}
  const ok = d.group===g && d.type===t && d.defaultValue===dv;
  console.log((ok?'OK  ':'BAD ')+k.padEnd(26), d.group.padEnd(10), d.type.padEnd(8), JSON.stringify(d.defaultValue));
  if(!ok)bad++;
}
console.log(bad?('FAIL '+bad):'ALL 11 OK');
"
```

## 未跑项及原因

| 项 | 为什么不跑 |
|---|---|
| `npm test` | 新增的是纯数据条目；registry 无单测覆盖（`grep -rn "settings-registry" src/lib/__tests__/` 为空） |
| `build` | tsc 已过；build 留 E1 |
| `test:visual` | 不碰渲染 |

## 自我质疑

**质疑：新增键但没有组件消费，A2 单独完成算不算"半成品"？**
→ **算**。A2 完成后这 11 个键是"死配置"——管理端能看到，但前台不读。

**这是有意的**：A3（props）+ A4（接线）才让它们生效。分三阶段是为了让每阶段可独立验收（A2 验"键注册正确"，A3 验"props 类型正确"，A4 验"生效"）。

**如果你要的是"一步到位"**，可以把 A2+A3+A4 合并成一个大阶段（约 5h）。但那样单阶段验收条目会超过 10 条，不符合最小原子化原则。

## 产出

`docs/design/06_validation/evidence/V18/A2/execution.md`：
- 5W1H
- 11 键注册表（含 group/type/default）
- 体检 7 项结果
- UNKNOWN：**11 个键尚无消费方**（A3/A4 补齐）
