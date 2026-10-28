# A6 执行证据：管理端断链

## 5W1H
- **What**：新建 `src/app/manager/ai-config/page.tsx`，307 重定向到 `/manager/llm-providers`。
- **Why**：API 层已有 307 对称兼容（`src/app/api/ai-config/route.ts` → `/api/llm/providers`），但页面层缺失 → `/manager/ai-config` 404，原版书签/文档链接失败。补页面层消除「API 能通但页面 404」的不对称。
- **Where**：`src/app/manager/ai-config/page.tsx`（新建）。
- **Who**：external-assistant。
- **How**：`import { redirect } from "next/navigation"` + `redirect("/manager/llm-providers")`。用 `redirect`（307）而非 `permanentRedirect`（308），避免浏览器永久缓存导致未来难恢复。
- **What if**：若用 308，浏览器永久缓存，未来想恢复原路径很难；若 `llm-providers` 页不存在则重定向后 404（前置已核验存在）。

## 改动文件
- `src/app/manager/ai-config/page.tsx`（新增 12 行）

## 验证据条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 文件存在 | `ls -la src/app/manager/ai-config/page.tsx` | PASS |
| 2 | 307 跳转 llm-providers | `grep -c 'redirect("/manager/llm-providers")'`（1）+ `redirect()` 默认 307 代码级证据 | PASS（代码级） |
| 3 | 未改 next.config.ts | `grep -n "ai-config" next.config.ts`（0） | PASS |
| 4 | 前置 llm-providers 存在 | `ls src/app/manager/llm-providers/page.tsx` | PASS |

**307 代码级证据**：`node_modules/next/dist/client/components/redirect-status-code.js` 中 `RedirectStatusCode.TemporaryRedirect = 307`；`redirect.js` 的 `getRedirectError(url, type, statusCode = TemporaryRedirect)` 默认 307。故 `redirect()` 无第三参 → 307。

## UNKNOWN
- **live 307 实测**：本机 6791 无运行中服务（`Get-NetTCPConnection` 无监听），未做 HTTP curl。307 由 `redirect()` 框架默认保证（代码级确认），主控推送后 CI/联调可实测复核。