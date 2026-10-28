# A4 · 首页接线

## 归属
- 阶段编号：A4
- 所属分组：A 能力对等（承接 V1.7 WP1-ST3）
- 来源凭据：`V1.7/03-剩余任务大纲.md §AT3.1~3.3`

## 目标
把 A2 注册的键、A3 恢复的 props 接起来，使配置真正生效。

## 为什么需要它（三级凭据）

### ① 代码位置（新版现状 —— 9 处调用均未传新参数）
```tsx
// src/app/(web)/page.tsx
:66   <FourCards cards={d.homeCards} showOverlay={d.cardShowOverlay} />
:75   <TopBanner noticeText={d.topNoticeText} noticePhone={d.topNoticePhone} />
:93   <StatsBanner years={d.years} graduates={d.graduates} advantages={d.advantages} />
:102  <PartnerUniversities partners={d.partners} />
:111  <CourseSectionNew hotMajors={d.hotMajors} />
:120  <CompanyIntro videoUrl={d.intro.videoUrl} introText={d.intro.introText} slogan={d.intro.slogan} />
:129  <NewsCenter news={d.centerNews} />
:138  <CertificateGallery items={d.gallery} placeholderImage={d.placeholderImage} />
:147  <CampusSection campuses={d.campuses} placeholderImage={d.placeholderImage} />
```

### ② 实测证据
```bash
$ grep -cE "showOverlay|showSection|bgImage|containerAlign|showContent" "src/app/(web)/page.tsx"
1     ← 只有 FourCards 那一处 cardShowOverlay（是旧键，非新键）

$ grep -n "FloatingContact" "src/app/(web)/layout.tsx"
93:      <FloatingContact phone={contactPhone1} />    ← 只传 phone，无 wechatQrCode

$ grep -n "微信二维码" src/components/web/FloatingContact.tsx
83:              <span className="text-xs text-gray-400">微信二维码</span>   ← 硬编码占位
```

### ③ 规划落点
- 无本卡 → A2 的键、A3 的 props 都是**死配置**（管理端可见，前台不生效）
- 本卡是 A5 回归验证的对象

## 输入
- 前置阶段：**A3**（props 已就位）
- 前置状态：`tsc` exit 0，className 值未变

## 输出
- 修改：`src/app/(web)/page.tsx`（9 处传参）
- 修改：`src/app/(web)/layout.tsx`（读 `wechatQrCode` 并传）
- 修改：`src/components/web/FloatingContact.tsx`（加 prop + 条件渲染）
- 修改：`src/app/(web)/campus/page.tsx`（`showImageOverlays` 包裹遮罩）
- 可能修改：`src/components/web/data/home.ts`（`HomeData` 接口 + 返回值加新字段）

## 关键前置：`data/home.ts` 必须先补字段

**① 代码位置**
```ts
// src/components/web/data/home.ts:39-67 —— HomeData 接口
:56  homeCards: {...}
:66  cardShowOverlay: boolean;
:67  topNoticeText: string;
```
**② 实测**：`grep -cE "fourCardsBgColor|topbarBgImage|statsBgImage|showImageOverlays|wechatQrCode" src/components/web/data/home.ts` → **0**

**③ 落点**：`page.tsx` 里的 `d` 就是 `HomeData`。不补字段，`d.xxx` 取不到值。

## 原子步骤

| 步骤 | 内容 |
|---|---|
| STEP-A4-1 | `data/home.ts` 补 11 字段到 `HomeData` + 返回值 |
| STEP-A4-2 | `page.tsx` 9 处传参 |
| STEP-A4-3 | `layout.tsx` + `FloatingContact.tsx` 接通二维码 |
| STEP-A4-4 | `campus/page.tsx` 接通遮罩开关 |
| STEP-A4-Z | 阶段体检 |

## 验收标准
- [ ] `HomeData` 含 11 个新字段（可自动化：grep）
- [ ] `page.tsx` 9 处调用均含新参数（可自动化：逐处 grep）
- [ ] `grep -c "showOverlay" "src/app/(web)/page.tsx"` ≥ 6
- [ ] `layout.tsx` 读取并传 `wechatQrCode`
- [ ] `FloatingContact` 含 prop 且**空值时仍显示占位**（不破版）
- [ ] `campus/page.tsx` 遮罩受 `showImageOverlays` 控制
- [ ] `npx tsc --noEmit` exit 0
- [ ] className 值未变

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -cE "fourCardsBgColor|topbarBgImage|statsBgImage|fourCardsShowSection|fourCardsContainerAlign|wechatQrCode|showImageOverlays" src/components/web/data/home.ts
grep -nE "showOverlay|showSection|bgImage|containerAlign|showContent" "src/app/(web)/page.tsx" | head -12
grep -n "wechatQrCode" "src/app/(web)/layout.tsx" src/components/web/FloatingContact.tsx
grep -n "showImageOverlays" "src/app/(web)/campus/page.tsx"
npx tsc --noEmit && echo "tsc PASS"
```

## 证据路径
`evidence/V18/A4/execution.md`

## 允许修改
- `src/app/(web)/page.tsx`
- `src/app/(web)/layout.tsx`
- `src/app/(web)/campus/page.tsx`
- `src/components/web/FloatingContact.tsx`
- `src/components/web/data/home.ts`

## 禁止修改
- 任何 `className` 值
- `src/contracts/**`、`src/lib/**`、`prisma/**`
- `src/components/web/{TopBanner,...}.tsx`（A3 已改，本卡不动组件）

## 依赖与阻塞
- Depends on：A3
- Blocks：A5
- 阻塞条件：若 `HomeData` 补字段后 `page.tsx` 出现 >5 处类型错误 → 停手，说明接口设计有耦合

## 建议执行档位
`opus`　理由：涉及 4 个入口文件 + 数据层接口，改动面广，且默认态不能变。

## 升级条件
若接线后某区块默认渲染变化（如标题栏消失）→ 升级，说明布尔转换写反了。

## 预估规模
中（1.5h）

## 自我质疑

**质疑：为什么 `data/home.ts` 要单独一步？不能直接在 `page.tsx` 里读 `settings`？**
→ 能，但会破坏现有架构。`page.tsx` 是 server component，通过 `getHomeData()` 一次性拿全部数据（`:248`）；若改成就地读 settings，会产生 N 次重复查询。**补字段是更小的改动。**

**质疑：11 个字段全要进 `HomeData` 吗？**
→ 是的，但只需 `page.tsx` 实际用到的：`fourCardsShowSection`、`fourCardsBgColor`、`fourCardsBgImage`、`fourCardsContainerAlign`、`topbarBgImage`、`statsBgImage`、`showImageOverlays`（7 个给 page.tsx）+ `wechatQrCode`（给 layout）+ `bannerShowExtraBtn/Text/Link`（给 Banner）= 11 个。
