# STEP-C1-1：核实关键词并实现守卫

## 第 1 步：核实关键词现状（**必做**）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011

# 1) 代码里是否有这些词
grep -rn "xgnedu\|新概念\|四川师范大学" src/ --include=*.ts --include=*.tsx | head -10

# 2) 数据库里是否有（用 e2e.db 抽样）
node -e "
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('prisma/e2e.db');
for(const t of ['Article','Campus','Gallery','Partner']){
  try{
    const rows=db.prepare(\`SELECT COUNT(*) c FROM \${t}\`).get();
    console.log(t, rows.c, '行');
  }catch(e){ console.log(t,'(表不存在或结构不同)'); }
}
db.close();
"
```

**判定**：
- 若 `xgnedu` 只在**业务话术**（如 `ApplyClient.tsx:277` 的"加微信 xgnedu 咨询"）→ **不能**把它加入毒文本列表
- 只在**内容字段**（`Article.title/content`、`Campus.caption`、`Gallery.title`）上过滤

## 第 2 步：写 `src/lib/showcase-guard.ts`

```ts
/**
 * V1.8/C1：首页与大图区块的脏数据守卫。
 *
 * 原版 showcase.ts 有 329 行（含种子生成等 14 个导出），
 * 本模块只提取 3 个纯守卫函数，不复制种子逻辑。
 */

/** 拦截已知脏图路径（原站残留 / 竞品图） */
const BLOCKED_IMAGE_SEGMENTS = ["xgnedu", "/images/xgnedu/"];

/**
 * 拦截已知毒文本（原站公司名 / 竞品名）。
 * ⚠️ 只用于「内容字段」（title/content/caption），
 * 不得用于全站文本 —— 否则会误伤业务话术（如"加微信 xgnedu 咨询"）。
 */
const TOXIC_TEXT_KEYWORDS = ["新概念教育", "四川师范大学"];

/** 拦截编码损坏文本（GBK 乱码典型特征） */
const BROKEN_TEXT_PATTERN = /[\uFFFD]|锟斤拷|烫烫烫|屯屯屯/;

export function isBlockedShowcaseImage(image?: string | null): boolean {
  if (!image) return false;
  return BLOCKED_IMAGE_SEGMENTS.some((s) => image.includes(s));
}

export function hasToxicShowcaseText(value?: string | null): boolean {
  if (!value) return false;
  return TOXIC_TEXT_KEYWORDS.some((k) => value.includes(k));
}

export function hasBrokenShowcaseText(value?: string | null): boolean {
  if (!value) return false;
  return BROKEN_TEXT_PATTERN.test(value);
}
```

## 第 3 步：接入（至少 1 处真实消费）

**优先接入点**：`src/components/web/data/home.ts`（首页数据装配处）

```ts
import { isBlockedShowcaseImage, hasBrokenShowcaseText } from "@/lib/showcase-guard";

// 在返回 gallery / campuses 时过滤
gallery: galleryRaw.filter(
  (g) => !isBlockedShowcaseImage(g.image) && !hasBrokenShowcaseText(g.title)
),
```

## 验收
- [ ] `src/lib/showcase-guard.ts` 存在，3 个导出
- [ ] 关键词核实记录写入 evidence（含"为什么排除 xgnedu"的理由）
- [ ] 至少 1 处真实接入（`grep -rn "showcase-guard" src/` 除自身外 ≥1）
- [ ] `npx tsc --noEmit` exit 0
- [ ] 未改任何 `className`

## 常见坑

| 坑 | 防守 |
|---|---|
| 把 `xgnedu` 当毒文本全站过滤 | 会误伤业务话术；只用于内容字段 |
| 复制原版 329 行 | 会引入重复的种子逻辑 |
| 写了守卫但无接入 | 死代码；验收要求 ≥1 处真实消费 |
