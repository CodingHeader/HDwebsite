# A6 · 管理端断链修复

## 归属
- 阶段编号：A6
- 所属分组：A 能力对等（承接 V1.7 WP2-ST1）
- 来源凭据：`V1.7/02-能力退化清单与定级.md §P1-4`

## 目标
新建 `/manager/ai-config` 兼容页，减少原版书签访问时出现 404 的情况。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// API 层已有 307（src/app/api/ai-config/route.ts:1-12）
 * 映射表（全量）：
 *   GET  /api/ai-config      → /api/llm/providers
 *   POST /api/ai-config      → /api/llm/providers
 *   GET  /api/ai-config/[id] → /api/llm/providers/[id]

// 但页面层无任何痕迹
```

### ② 实测证据
```bash
$ ls src/app/manager/ai-config 2>/dev/null || echo "不存在"
不存在

$ grep -n "ai-config" next.config.ts
（空）

$ grep -n "ai-config" src/middleware.ts
（文件可能不存在）

# 原版有该页面
$ wc -l "E:/Code/Demo/HDwebsite/hdwebsite_0429/src/app/manager/ai-config/page.tsx"
425
```

### ③ 规划落点
- API 能通、页面 404 → **不对称**
- 原版书签/文档链接会失败

## 输入
- 前置阶段：**无**（独立）
- 前置状态：任意

## 输出
- 新增：`src/app/manager/ai-config/page.tsx`（约 10 行）

## 执行步骤（STEP-A6-1）

```tsx
/**
 * V1.8-COMPAT：/manager/ai-config 兼容入口 —— 旧站路径重定向到模型供应商管理
 * （原版 AIConfig 已由 LLMProvider 取代，ADR-023/ADR-005；旧链接/收藏可达）
 *
 * API 层已有对称兼容：src/app/api/ai-config/route.ts 以 307 映射到 /api/llm/providers。
 * 本页补页面层，避免「API 能通但页面 404」的不对称。
 */
import { redirect } from "next/navigation";

export default function AiConfigCompatPage() {
  redirect("/manager/llm-providers");
}
```

**关键选择：`redirect` 而非 `permanentRedirect`**
- ① `permanentRedirect` = 308，浏览器强缓存，后续改回很难
- ② `redirect` = 307，不缓存，保留回退空间
- ③ 兼容入口可能未来恢复，用可逆的 307

**对照**：`manager/news/page.tsx` 用的是 `redirect("/manager/articles")` —— 同样 307，保持一致。

## 验收标准
- [ ] 文件存在（可自动化）
- [ ] 访问 `/manager/ai-config` → 307 跳转 `/manager/llm-providers`（可自动化 curl）
- [ ] `next.config.ts` 无 ai-config 映射（可自动化）
- [ ] 不新增依赖、不改 package.json（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
ls -la src/app/manager/ai-config/page.tsx
grep -n "redirect" src/app/manager/ai-config/page.tsx
grep -n "ai-config" next.config.ts || echo "config 无映射 ✓"

# 起服务后
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" http://127.0.0.1:6791/manager/ai-config
# 期望 307 → http://127.0.0.1:6791/manager/llm-providers
```

## 证据路径
`evidence/V18/A6/execution.md`

## 允许修改
- `src/app/manager/ai-config/page.tsx`（新增）

## 禁止修改
- `next.config.ts`
- 其他任何文件

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：若 `llm-providers` 页面不存在 → 停手（重定向会 404）

## 建议执行档位
`haiku`　理由：新建一个 redirect 页，模板化。

## 升级条件
若发现除 ai-config 外还有其他断链页面 → 一并列出，但不擅自扩范围。

## 预估规模
小（0.5h，约 15 分钟）

## 自我质疑

**质疑：为什么不做成 301 永久重定向，让搜索引擎也更新？**
→ 管理端页面不对外，无 SEO 需求。且 301 被浏览器永久缓存，未来若要恢复原路径会很麻烦。**用 307 更稳。**

**质疑：这个页面真的有人用吗？**
→ 无法证明有人用（无访问日志）。但成本 10 行，收益是「旧书签不 404」。**低成本高确定性，值得做。**
