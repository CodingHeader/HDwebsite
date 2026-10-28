# STEP-A3-4：FourCards 补 4 props + 7 卡片字段

## 目标
这是 A3 里改动最大的一处。FourCards 原版有 6 个 Props + 10 个 CardData 字段，新版只剩 2 + 8。

## 三级凭据

### ① 代码位置

**原版（`hdwebsite_0429/src/components/web/FourCards.tsx`）**
```tsx
interface CardData {
  id, title, subtitle, icon, href, gradient, hoverGradient, shadow,   // 共 8
  backgroundImage?: string | null;   // :20
  showIcon?: boolean;                // :21
  showTitle?: boolean;               // :22
  showSubtitle?: boolean;            // :23
  showArrow?: boolean;               // :24
  showDecoration?: boolean;          // :24
  textAlign?: "left"|"center"|"right"; // :25
}

interface FourCardsProps {
  cards?: CardData[];
  showOverlay?: boolean;
  showSection?: boolean;             // :11
  bgColor?: string;                  // :12
  bgImage?: string;                  // :12
  containerAlign?: "left"|"center"|"right";  // :13
}

// :127  bgColor = "#f9fafb",
// :147  style={{ backgroundColor: bgColor }}
// :200  背景图渲染
```

**新版（`src/components/web/FourCards.tsx`，180 行）**
```tsx
interface CardData {
  id, title, subtitle, icon, href, gradient, hoverGradient, shadow  // 只有 8 个
}
interface FourCardsProps {
  cards?: CardData[];
  showOverlay?: boolean;   // 只有 2 个
}
```

### ② 实测
```bash
grep -cE "backgroundImage|showIcon|showTitle|showSubtitle|showArrow|showDecoration|textAlign" src/components/web/FourCards.tsx
→ 0（全部丢失）
grep -cE "showSection|bgColor|bgImage|containerAlign" src/components/web/FourCards.tsx
→ 0
```

### ③ 落点：A4 从 `d.fourCardsBgColor/BgImage/ShowSection/ContainerAlign` 传入

## 执行步骤

### 1. 扩 CardData 接口
在现有 8 个字段后追加 7 个（全部可选）。

### 2. 扩 FourCardsProps
追加 4 个（`showSection` 默认 true、`containerAlign` 默认 `"center"`）。

### 3. 渲染逻辑（照原版）

| 字段 | 渲染位置 | 原版参考 |
|---|---|---|
| `showSection=false` | 整个 section 返回 null | `if (!showSection) return null` |
| `bgColor` | section 的 `style.backgroundColor` | `:147` |
| `bgImage` | section 的 `style.backgroundImage` | `:147` |
| `containerAlign` | 内层 div 的 `justify-*` 类 | `:140-144` |
| `backgroundImage` | 卡片内背景图层 | `:200` |
| `showIcon` | 图标是否渲染 | — |
| `showTitle` / `showSubtitle` | 标题/副标题 | — |
| `showArrow` | 箭头 | — |
| `showDecoration` | 装饰圆点 | `:208` |
| `textAlign` | 文本对齐 | — |

## ⚠️ 与 bg-gray-50 的关系

新版 `:115` 是 `<section className="bg-gray-50 py-6">`。
原版 `:147` 是 `<section className="py-6" style={{backgroundColor: bgColor}}>`。

**处置**：
- `bgColor` 为空 → **不设 inline style**，沿用 `bg-gray-50`
- `bgColor` 有值 → 设 inline style 覆盖

**不要删掉 `bg-gray-50` 类名** —— 那会改变默认渲染。

## 验收
- [ ] CardData 的 7 个字段全部存在
- [ ] FourCardsProps 的 4 个字段全部存在
- [ ] `showSection` 默认 `true`、`containerAlign` 默认 `"center"`
- [ ] `grep -cE "backgroundImage|showIcon|showTitle|showSubtitle|showArrow|showDecoration|textAlign"` ≥ 7
- [ ] `bg-gray-50` 类名仍在
- [ ] `npx tsc --noEmit` exit 0
- [ ] className 值未变

## 常见坑

| 坑 | 防守 |
|---|---|
| 把 `bg-gray-50` 删了 | 默认渲染立即变化 |
| 7 个字段只加接口不用 | 成死字段；每个都要有渲染点 |
| `showSection` 默认 false | 整个四宫格会消失 |
| 直接抄原版 className | 原版可能与新版类名不一致，只抄结构 |
