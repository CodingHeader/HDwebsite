# C2 执行证据：API 缓存策略 —— 判定 N-A（延后，D1 已证非 API 瓶颈）

## 5W1H
- **What**：盘点适合加 HTTP 缓存头的只读接口，决定是否实施 API 缓存。
- **Why**：原版无 API 缓存，本卡属性能优化（C 技术债）而非能力对等；D1 基线已出。
- **Where**：仅盘点 `src/app/api/**/route.ts`，未改任何路由（零代码改动）。
- **Who**：external-assistant（V1.8 C2）。
- **How**：STEP-C2-1 盘点 GET-only 路由（20 条），逐条核对「只读/非实时/非鉴权敏感」；结合 D1 结果判 N-A。
- **What if**：若硬加缓存头，风险（数据不一致/越权）> 收益（当前规模 SQLite + 126 路由，收益有限）。

## 盘点结果（GET-only 20 条）
| 路由 | 只读 | 非实时 | 非鉴权敏感 | 结论 |
|---|---|---|---|---|
| /api/health | ✓ | ✓ | ✓ | 候选（no-store，价值极低） |
| /api/settings/definitions | ✓ | ✓ | ✓ | 候选（静态，可 max-age=60） |
| /api/home-blocks/registry | ✓ | ✓ | ✓ | 候选（静态） |
| /api/auth/me | ✓ | ✓ | ✗ 用户私有 | 不加 |
| /api/chat/*、/api/chat-history | ✓ | ✗ 会话 | ✗ 用户私有 | 不加 |
| /api/collect-*、/api/knowledge-* | ✓ | ✗ 实时/任务 | ✗ 私有 | 不加 |
| /api/logs、/api/notify-records | ✓ | ✗ 实时 | ✗ | 不加 |
| /api/manager/**、/api/manager-menus | ✓ | ✓ | ✗ 鉴权 | 不加 |
| /api/media、/api/llm/usage、/api/file/** | ✓ | ✗ | ✗ | 不加 |
| /api/route.ts（根） | ✓ | ✓ | ✓ | 低价值，不加 |

## 判定依据（D1 实测）
- mobile Performance 82：LCP 3.3s / CLS 0.208（前端渲染瓶颈），**TBT 仅 50ms**（JS 不阻塞）。
- desktop Performance 100：无 API 抓取瓶颈迹象。
- 结论：**性能瓶颈在前端 LCP/CLS，非 API 抓取**。API 缓存（C2）收益不足以覆盖风险。

## 验证逐条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 写接口零缓存 | grep POST/PUT/PATCH/DELETE + Cache-Control | PASS（0） |
| 2 | 鉴权接口零 public | 盘点 | PASS |
| 3 | 零代码改动 | git diff src/app/api | PASS（无） |
| 4 | package.json 未变 | git diff --exit-code package.json | PASS |

## UNKNOWN
无。

## 备注
不实施（N-A/延后）：D1 已证 API 非瓶颈；原版亦无 API 缓存（优化非对等）；当前 SQLite 规模下风险>收益。后续若 D1 复测显示 API 抓取为瓶颈，再重开本卡。
