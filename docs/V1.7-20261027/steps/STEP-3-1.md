# STEP-3-1：`localImageExists` 去重（WP3-ST1）

## 目标
把两处重复实现提取为一个共享模块，消除维护分叉风险。

## 卡
WP3-ST1（`sonnect`，约 1h）

## 问题事实

```bash
# 两处重复实现
src/app/(web)/gallery/page.tsx:19   async function localImageExists(url: string) {
src/components/web/data/home.ts:17  async function localImageExists(url: string) {

# 原版是单一实现
E:\Code\Demo\HDwebsite\hdwebsite_0429\src\lib\showcase.ts:84
  export async function localImageExists(url: string): Promise<boolean>
```

## 执行步骤

### 1. 先 diff 两处实现，确认是否等价

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
sed -n '19,35p' "src/app/(web)/gallery/page.tsx"
sed -n '17,33p' src/components/web/data/home.ts
```

**若两处实现有差异** → 先判定哪个是正确版本，在报告中说明，**不要盲目取其一**。

### 2. 新建共享模块

`src/lib/image-exists.ts`：

```ts
import path from "node:path";
import { stat } from "node:fs/promises";

/**
 * V17-REFACTOR：判断站内图片是否存在。
 * 原为 gallery/page.tsx 与 data/home.ts 各自实现一份（重复），
 * 提取至此避免「改一处漏一处」。
 *
 * 行为：非站内路径（不以 / 开头，如外链）一律视为存在（交给浏览器处理）。
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

### 3. 改两处调用为 import

- `(web)/gallery/page.tsx`：删本地函数，加 `import { localImageExists } from "@/lib/image-exists";`
- `components/web/data/home.ts`：同上

## 完成判据

- [ ] `grep -rc "async function localImageExists" src/` → 0
- [ ] `src/lib/image-exists.ts` 存在且导出该函数
- [ ] 两处调用改为 import
- [ ] `npx tsc --noEmit` exit 0
- [ ] 两处行为不变（同一实现）

## 验证命令

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -rn "localImageExists" src/ | head -10
grep -rc "async function localImageExists" src/ | grep -v ":0" || echo "无本地定义 ✓"
npx tsc --noEmit
```

## 常见坑

| 坑 | 防守 |
|---|---|
| 两处实现本不相同，强行合一改变行为 | 先 diff；有差异则判定后说明 |
| 建了模块但只改一处 | 两处都要改，验收检查 0 个本地定义 |
| 把 `startsWith("/")` 判定漏掉 | 外链必须视为存在（否则外链图全被标记 missing） |
