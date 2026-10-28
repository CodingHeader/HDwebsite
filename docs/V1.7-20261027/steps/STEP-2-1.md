# STEP-2-1：`/manager/ai-config` 兼容重定向（WP2-ST1）

## 目标
补上页面层断链，使原版书签 `/manager/ai-config` 不再 404。

## 卡
WP2-ST1（`haiku`，约 0.5h）

## 问题事实

| 层 | 原版 | 新版现状 |
|---|---|---|
| 页面 | `src/app/manager/ai-config/page.tsx`（425 行） | **不存在** |
| API | `/api/ai-config` | **有 307 重定向** → `/api/llm/providers`（`api/ai-config/route.ts:1-30`） |
| next.config 重定向 | — | 无 |
| middleware 重定向 | — | 无 |

**不对称**：API 层做了兼容，页面层没做。

## 执行步骤

1. 新建 `src/app/manager/ai-config/page.tsx`
2. 内容照 `src/app/manager/news/page.tsx` 的模式：

```tsx
/**
 * V17-COMPAT：/manager/ai-config 兼容入口 —— 旧站路径重定向到模型供应商管理
 * （原版 AIConfig 已由 LLMProvider 取代，ADR-023/ADR-005；旧链接/收藏可达）
 *
 * API 层已有对称兼容：src/app/api/ai-config/route.ts 以 307 映射到 /api/llm/providers
 * 本页补页面层，避免 API 能通但页面 404 的不对称。
 */
import { redirect } from "next/navigation";

export default function AiConfigCompatPage() {
  redirect("/manager/llm-providers");
}
```

3. **不改** `next.config.ts`（页面级重定向足够，不引入配置级复杂度）

## 完成判据

- [ ] 文件存在
- [ ] 访问 `/manager/ai-config` → 跳转 `/manager/llm-providers`
- [ ] `grep -n "ai-config" next.config.ts` 仍为空
- [ ] 不新增依赖、不改 package.json

## 验证命令

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
ls -la src/app/manager/ai-config/page.tsx
grep -n "redirect" src/app/manager/ai-config/page.tsx
grep -n "ai-config" next.config.ts || echo "config 无映射（符合预期）"
# 起服务后
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://127.0.0.1:6791/manager/ai-config
```

## 常见坑

| 坑 | 防守 |
|---|---|
| 用 `permanentRedirect` 而非 `redirect` | 用 `redirect`（兼容入口可能后续恢复，不永久固化） |
| 顺带去 next.config 加重定向 | 不必，页面级够了 |
| 忘了注释说明「API 层已对称」 | 注释要写清，否则后人不知道为什么有这个页 |
