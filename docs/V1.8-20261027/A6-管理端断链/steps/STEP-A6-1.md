# STEP-A6-1：新建 ai-config 兼容页

## 执行

1. 新建目录与文件：`src/app/manager/ai-config/page.tsx`
2. 写入：

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

3. 不改 `next.config.ts`

## 验收
- [ ] 文件存在
- [ ] `grep -c 'redirect("/manager/llm-providers")'` → 1
- [ ] `grep -n "ai-config" next.config.ts` → 空
- [ ] 起服务后 `curl -s -o /dev/null -w "%{http_code}" .../manager/ai-config` → 307

## 常见坑

| 坑 | 防守 |
|---|---|
| 用 `permanentRedirect`（308） | 会被浏览器永久缓存，未来难回退；用 307 |
| 去 `next.config.ts` 加重定向 | 页面级已够，不引入配置复杂度 |
| 顺便改了 `llm-providers` 页 | 本卡只加一个 redirect 页 |
