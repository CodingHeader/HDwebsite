# STEP-A7-1：diff 两处实现并提取

## 第 1 步：diff（必做，不可跳）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
echo "=== gallery 版 ==="; sed -n '19,40p' "src/app/(web)/gallery/page.tsx"
echo "=== home.ts 版 ==="; sed -n '17,38p' src/components/web/data/home.ts
```

**判定分支**：
- 两处**完全相同** → 直接提取
- 两处**有差异** → 先判定哪个正确，在 evidence 中写明差异点与选择理由，**不得盲目取其一**

## 第 2 步：新建 `src/lib/image-exists.ts`

```ts
import path from "node:path";
import { stat } from "node:fs/promises";

/**
 * V1.8-REFACTOR：判断站内图片是否存在。
 *
 * 原为 gallery/page.tsx 与 data/home.ts 各自实现一份（重复），
 * 提取至此避免「改一处漏一处」。
 *
 * 行为约定：非站内路径（不以 / 开头，如外链 https://）一律视为存在，
 * 交由浏览器处理 —— 否则外链图会被误判为 missing。
 */
export async function localImageExists(url: string): Promise<boolean> {
  if (!url.startsWith("/")) return true;
  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    const s = await stat(fullPath);
    return s.isFile();
  } catch {
    return false;
  }
}
```

## 第 3 步：改两处调用

```ts
// src/app/(web)/gallery/page.tsx
- async function localImageExists(url: string) { ...原实现... }
+ import { localImageExists } from "@/lib/image-exists";

// src/components/web/data/home.ts
- async function localImageExists(url: string) { ...原实现... }
+ import { localImageExists } from "@/lib/image-exists";
```

## 验收
- [ ] `grep -rc "async function localImageExists" src/ | grep -v ":0"` → 空
- [ ] `grep -rn "from \"@/lib/image-exists\"" src/` → 2 处
- [ ] `npx tsc --noEmit` exit 0
- [ ] 外链 URL 仍返回 `true`（抽 1 条手验）

## 常见坑

| 坑 | 防守 |
|---|---|
| 两处本有差异，强行合一 | 先 diff，有差异先判定 |
| 漏掉 `startsWith("/")` 判定 | 外链会被误判 missing，首页外链图全部消失 |
| 只改一处 | 验收检查 0 个本地定义 |
