# C1 · showcase 过滤

## 归属
- 阶段编号：C1
- 所属分组：C 技术债（V1.7 P2-1）
- 来源凭据：`V1.7/02-能力退化清单与定级.md §P2-1`

## 目标
恢复图片/文本的脏数据守卫（毒文本、破图、乱码），但**只做最小可用集**，不完整复原原版 329 行模块。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// 原版有 3 组守卫（hdwebsite_0429/src/lib/showcase.ts）
:99   export function isBlockedShowcaseImage(image?: string | null): boolean
:110  export function hasToxicShowcaseText(value?: string | null): boolean
:120  export function hasBrokenShowcaseText(value?: string | null): boolean

// 新版：文件不存在
```

### ② 实测证据
```bash
$ ls src/lib/showcase.ts
（不存在）

$ grep -rc "hasToxicShowcaseText\|isBlockedShowcaseImage\|hasBrokenShowcaseText" src/
（全 0）

# 但原版也只有测试在引用（说明它早已边缘化）
$ grep -rn "hasToxicShowcaseText" hdwebsite_0429/src/ | grep -v showcase.ts
src/lib/__tests__/continuation-utils.test.ts:17,96    ← 仅测试
```

### ③ 规划落点
- 本卡是 P2（低优先），**但成本低（1.5h）**
- 不做则首页可能显示脏图/乱码文本

## 输入
- 前置阶段：**无**（独立）
- 前置状态：任意

## 输出
- 新增：`src/lib/showcase-guard.ts`（约 60 行，只含 3 个纯函数）
- 可能修改：`src/app/(web)/page.tsx` 或 `data/home.ts`（接入过滤）

## 三个守卫的最小实现

```ts
/** 拦截已知脏图路径（原站残留 / 竞品图） */
const BLOCKED_IMAGE_SEGMENTS = ["/images/gallery/", "/images/campus/", "xgnedu"];

/** 拦截已知毒文本（原站公司名 / 竞品名） */
const TOXIC_TEXT_KEYWORDS = ["xgnedu", "新概念", "四川师范大学", "西华师范大学"];

/** 拦截 GBK 乱码（典型特征：连续非常用汉字） */
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

## ⚠️ 关键：必须核实关键词是否还适用

**② 凭据**：
```bash
# 新版数据里是否还有这些词？
$ grep -rn "xgnedu" src/
src/app/(web)/apply/ApplyClient.tsx:277   ← 业务话术文案（"加微信 xgnedu 咨询"）

$ grep -rn "新概念\|四川师范大学" src/ prisma/
（需核实 DB）
```

**③ 处置**：
- 若 `xgnedu` 只出现在**业务话术**（如二维码引导语），则**不能**把 `xgnedu` 加入毒文本列表——会误伤正常文案
- 必须针对**内容字段**（`Article.title/content`、`Campus.caption`、`Gallery.title`）过滤，不是全站文本

## 执行步骤

| 步骤 | 内容 |
|---|---|
| STEP-C1-1 | 核实关键词现状（DB 查询 + 代码 grep） |
| STEP-C1-2 | 写 `src/lib/showcase-guard.ts` |
| STEP-C1-3 | 接入 3 处（首页/校区/图集） |
| STEP-C1-Z | 体检 |

## 验收标准
- [ ] `src/lib/showcase-guard.ts` 存在，含 3 个导出（可自动化）
- [ ] 每个函数有单测或可复现的验证（可自动化/人工）
- [ ] **关键词列表已核实**（不误伤业务文案）（人工）
- [ ] 接入点明确（至少 1 处真实消费）（可自动化 grep）
- [ ] `npx tsc --noEmit` exit 0（可自动化）
- [ ] 未改任何 `className`（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
ls src/lib/showcase-guard.ts
grep -cE "^export function" src/lib/showcase-guard.ts        # 期望 3
grep -rn "isBlockedShowcaseImage\|hasToxicShowcaseText" src/ | grep -v "showcase-guard.ts"
npx tsc --noEmit
```

## 证据路径
`evidence/V18/C1/execution.md`

## 允许修改
- `src/lib/showcase-guard.ts`（新增）
- 接入点（`data/home.ts` 或 `(web)/page.tsx` 或 campus/gallery 页）

## 禁止修改
- 任何 `className`
- `src/lib/showcase.ts`（不存在，不要新建整模块）
- `prisma/**`

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：若核实发现关键词已不适用（数据已洁净）→ 可只做破图守卫，毒文本守卫记 `N-A(数据已洁净)` 并说明

## 建议执行档位
`sonnect`　理由：3 个纯函数 + 接入，但需先核实关键词

## 升级条件
若发现脏数据已存在于生产 DB → 升级 `opus`，需评估数据清洗

## 预估规模
小（1.5h）

## 自我质疑

**质疑：这是 P2，原版也只在测试里用，值得做吗？**
→ 值得做**最小集**，理由：
- ① 成本 1.5h，很低
- ② 原版虽有代码但未接入（说明是"准备了没用"），新版连代码都没有
- ③ 若将来导入旧数据（如从 main 迁移内容），守卫能拦住脏数据

**质疑：为什么不完整复原 329 行的 showcase.ts？**
→ 那 329 行里只有 3 个函数是守卫，其余 11 个导出是种子数据生成（`ensureShowcaseSeedData` 等），新版已有自己的 seed 逻辑。**复原整模块会带来重复的种子逻辑。**
