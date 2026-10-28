# A7 · 复用去重

## 归属
- 阶段编号：A7
- 所属分组：A 能力对等（承接 V1.7 WP3-ST1）
- 来源凭据：`V1.7/02-能力退化清单与定级.md §P1-7`

## 目标
把两处重复的 `localImageExists` 提取为共享模块，消除「改一处漏一处」风险。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// 新版：两处各自实现
src/app/(web)/gallery/page.tsx:19   async function localImageExists(url: string) {
src/components/web/data/home.ts:17  async function localImageExists(url: string) {

// 原版：单一实现
hdwebsite_0429/src/lib/showcase.ts:84  export async function localImageExists(url: string): Promise<boolean>
```

### ② 实测证据
```bash
$ grep -rn "async function localImageExists" src/
src/app/(web)/gallery/page.tsx:19:async function localImageExists(url: string) {
src/components/web/data/home.ts:17:async function localImageExists(url: string) {

$ grep -c "async function localImageExists" src/ 
2 处重复
```

### ③ 规划落点
- 两处实现并存 → 未来改逻辑（如加 CDN 判定）易漏改一处
- 行为不一致会导致：首页图片「缺失」但图集页「存在」

## 输入
- 前置阶段：**无**（独立）
- 前置状态：`upgrade@b307479`

## 输出
- 新增：`src/lib/image-exists.ts`
- 修改：`src/app/(web)/gallery/page.tsx`（删本地函数，改 import）
- 修改：`src/components/web/data/home.ts`（同上）

## 原子步骤

### STEP-A7-1 · 先 diff 两处实现

**必须先做，不能跳过。**

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
echo "=== gallery 版 ==="; sed -n '19,40p' "src/app/(web)/gallery/page.tsx"
echo "=== home.ts 版 ==="; sed -n '17,38p' src/components/web/data/home.ts
```

**判定**：
- 若两处**完全相同** → 直接提取
- 若两处**有差异** → 先判定哪个正确，在证据中说明，**不得盲目取其一**

### STEP-A7-2 · 新建共享模块

`src/lib/image-exists.ts`：

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

### STEP-A7-3 · 改两处调用

```ts
// gallery/page.tsx
- async function localImageExists(url: string) { ... }
+ import { localImageExists } from "@/lib/image-exists";

// data/home.ts
- async function localImageExists(url: string) { ... }
+ import { localImageExists } from "@/lib/image-exists";
```

### STEP-A7-Z · 体检

| # | 项 | 命令 | 期望 |
|---|---|---|---|
| 1 | 无本地定义 | `grep -rc "async function localImageExists" src/ \| grep -v ":0"` | 空 |
| 2 | 共享模块存在 | `ls src/lib/image-exists.ts` | 存在 |
| 3 | 两处已 import | `grep -rn "from \"@/lib/image-exists\"" src/` | 2 处 |
| 4 | 类型检查 | `npx tsc --noEmit` | exit 0 |
| 5 | 行为不变 | 外链 URL 仍返回 true | 人工/单测 |
| 6 | 未越界 | `git status --short src` | 仅 3 个文件 |

## 验收标准
- [ ] `grep -rc "async function localImageExists" src/` 全为 0（可自动化）
- [ ] `src/lib/image-exists.ts` 存在且导出该函数（可自动化）
- [ ] 两处改为 import（可自动化）
- [ ] `npx tsc --noEmit` exit 0（可自动化）
- [ ] 行为不变：外链返回 `true`、不存在的站内路径返回 `false`（人工/单测）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -rn "localImageExists" src/ | head -10
grep -rc "async function localImageExists" src/ | grep -v ":0" || echo "无本地定义 ✓"
npx tsc --noEmit && echo "tsc PASS"
```

## 证据路径
`evidence/V18/A7/execution.md`

## 允许修改
- `src/lib/image-exists.ts`（新增）
- `src/app/(web)/gallery/page.tsx`
- `src/components/web/data/home.ts`

## 禁止修改
- 两处调用的业务逻辑（只换 import，不改行为）
- 其他任何 `src/**`

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：若两处实现本不等价且无法判定哪个正确 → 停手上报

## 建议执行档位
`sonnect`　理由：提取函数 + 改 import，规则明确。

## 升级条件
若发现第三处、第四处重复实现 → 一并纳入并重新评估

## 预估规模
小（1h）

## 自我质疑

**质疑：两处重复代码只有 20 行，值得单列一个阶段吗？**
→ 值得。**问题不在行数，在于「同一逻辑两份实现」这个结构**。
- ① 未来加 CDN 判定，容易只改一处
- ② 两处行为不一致时，用户会看到「首页图缺失但图集页正常」
- ③ 提取成本 1h，避免的是未来每次改动的双倍成本

**质疑：为什么不直接用原版的 `showcase.ts`？**
→ 原版 `showcase.ts` 有 329 行，包含毒文本过滤等 14 个导出。新版只需要 `localImageExists` 一个。**引入整个文件会带来不必要的依赖。** 单函数模块更干净。
