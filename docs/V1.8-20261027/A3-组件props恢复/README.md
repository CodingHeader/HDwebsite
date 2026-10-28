# A3 · 组件 props 恢复

## 归属
- 阶段编号：A3
- 所属分组：A 能力对等（承接 V1.7 WP1-ST2）
- 来源凭据：`V1.7/03-剩余任务大纲.md §AT2.1~2.5`、`V1.7/02-能力退化清单与定级.md §P1-1`

## 目标
给 9 个区块组件恢复被裁撤的 props，默认值与原版一致，默认渲染零变化。

## 为什么需要它（三级凭据）

### ① 代码位置
```tsx
// 新版 NewsCenter.tsx:43 —— 只有 news，无 showOverlay
export function NewsCenter({ news }: NewsCenterProps)
// 原版 NewsCenter.tsx:44,63,104 —— 三处
export function NewsCenter({ news, showOverlay = true }: NewsCenterProps)
        {showOverlay && (
```

### ② 实测证据（逐组件 grep showOverlay 计数）
```bash
# 原版
NewsCenter:4  CampusSection:7  CourseSectionNew:5
CompanyIntro:4  CertificateGallery:4  PartnerUniversities:4
# 新版 —— 全部 0
```

**6 个组件全部丢失。** 另 TopBanner（原版 5 props→新版 2）、StatsBanner（5→3）、FourCards（6+10 卡片字段→2）、Banner（14→13）也不同程度丢失。

### ③ 规划落点
- A2 已注册 11 个键 → 本卡让组件能接收
- A4 负责从 `d.*` 取值传入
- 无本卡 → A4 传了也没处接

## 输入
- 前置阶段：**A2**（键已注册）
- 前置状态：11 键可查，`tsc` exit 0

## 输出
- 修改 10 个组件文件：
  - `src/components/web/{NewsCenter,CampusSection,CourseSectionNew,CompanyIntro,CertificateGallery,PartnerUniversities}.tsx`（各 +`showOverlay`）
  - `src/components/web/TopBanner.tsx`（+3 props）
  - `src/components/web/StatsBanner.tsx`（+2 props）
  - `src/components/web/FourCards.tsx`（+4 props +7 卡片字段）
  - `src/components/web/Banner.tsx`（+3 字段）

## 原子步骤

| 步骤 | 内容 | 文件 |
|---|---|---|
| STEP-A3-1 | 6 组件补 `showOverlay` | `steps/STEP-A3-1.md` |
| STEP-A3-2 | TopBanner 补 3 props | `steps/STEP-A3-2.md` |
| STEP-A3-3 | StatsBanner 补 2 props | `steps/STEP-A3-3.md` |
| STEP-A3-4 | FourCards 补 4 props + 7 字段 | `steps/STEP-A3-4.md` |
| STEP-A3-5 | Banner 补 3 字段 | `steps/STEP-A3-5.md` |
| STEP-A3-Z | 阶段体检 | `steps/STEP-A3-Z-体检.md` |

## 统一铁律

**只抄 props 与 `{cond && (...)}` 的包裹范围，不抄 className。**

凭据：
- ① `AGENTS.md §3` 前台风格冻结（类名须与 main 逐字一致）
- ② V1.4 实测：`grep -c className` 会因 `+`/`-` 复制产生假阳性
- ③ 故只搬结构与默认值，样式一字不动

## 验收标准
- [ ] 6 组件各含 `showOverlay` ≥3 处（interface + 解构默认 + JSX 消费）（可自动化）
- [ ] 所有 `showOverlay` 默认值均为 `true`（可自动化：grep `= true`）
- [ ] TopBanner 含 `showContent`/`bgImage`/`showOverlay`，`showContent=false` 时 `return null`（可自动化 + 人工）
- [ ] StatsBanner 含 `showContent`/`bgImage`
- [ ] FourCards 含 7 个 CardData 字段 + 4 个 Props 字段
- [ ] Banner 含 `showExtraBtn`/`extraBtnText`/`extraBtnLink`
- [ ] `npx tsc --noEmit` exit 0
- [ ] **className 值零变更**（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
for c in NewsCenter CampusSection CourseSectionNew CompanyIntro CertificateGallery PartnerUniversities; do
  echo -n "$c showOverlay="; grep -c "showOverlay" "src/components/web/$c.tsx"; done
grep -cE "showContent|bgImage|showOverlay" src/components/web/TopBanner.tsx
grep -cE "showContent|bgImage" src/components/web/StatsBanner.tsx
grep -cE "backgroundImage|showIcon|showTitle|showSubtitle|showArrow|showDecoration|textAlign" src/components/web/FourCards.tsx
grep -cE "showExtraBtn|extraBtnText|extraBtnLink" src/components/web/Banner.tsx
npx tsc --noEmit && echo "tsc PASS"
# className 值未变（应为空）
git diff -U0 -- src/components/web | grep -oE 'className="[^"]*"' | sort | uniq -c | awk '$1%2==1'
```

## 证据路径
`docs/design/06_validation/evidence/V18/A3/execution.md`

## 允许修改
- `src/components/web/*.tsx`（仅上述 10 个）

## 禁止修改
- 任何 `className` 的值
- `src/contracts/**`、`src/lib/**`、`prisma/**`
- `tests/visual/reference/*.png`

## 依赖与阻塞
- Depends on：A2
- Blocks：A4
- 阻塞条件：若某组件的原版条件包裹范围与新版结构差异过大（如已重构过）→ 停手，在证据里说明，不得硬套

## 建议执行档位
`opus`　理由：触及前台冻结面，条件包裹范围判断错会改变视觉。

## 升级条件
若 className 差值公式出现非空输出且无法解释 → 升级上报，先定位是否误抄样式。

## 预估规模
大（3h，10 个文件）

## 自我质疑

**质疑：加了 props 但 A4 没接线，这些 props 会是 undefined，会不会报错？**
→ 不会。全部有默认值（`= true` 或 `= ""`），未传时走默认，渲染与现在一致。**这正是默认值必须与原版一致的原因。**

**质疑：原版 6 组件的 showOverlay 是控制标题栏显隐，新版恒显——视觉上本来就一样，加它有什么价值？**
→ 价值在**可配置**。运营若想隐藏某区块标题栏（如四宫格上方已有大标题），现在改不了。加 props 后可通过管理端关闭。**这是能力恢复，不是视觉变更。**
