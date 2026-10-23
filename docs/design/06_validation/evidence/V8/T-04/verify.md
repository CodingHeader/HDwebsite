# V8-T-04 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924
- 被验提交：4810e55（feat(V8-T-04): 5 条非 withApi 路由全部迁入统一包装，豁免清单为空）
- **结论：PASS**（附 findings：三条负向行为无专属自动化用例，见备注）

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| `grep -L 'withApi\|crud' $(find src/app/api -name route.ts)` 输出 ⊆ ADR-037 豁免清单 | PASS | 验证者亲跑该循环：**输出为空**（119 条 route.ts 全部含 withApi/crud）；ADR-037（`docs/design/03_solution/decisions/ADR-037-withApi豁免清单.md`）存在且明示「豁免清单当前为空」+ 未来豁免 3 准入条件。空集 ⊆ 空集成立 |
| file 路由 ../ 穿越返回 400/404 | PASS（代码审阅） | `src/app/api/file/[...path]/route.ts:29-35`：`parts.some(p => p === ".." \|\| p.includes("\\") \|\| p.startsWith("."))` → 404，另有 `abs.startsWith(uploadRoot + path.sep)` 二次校验 → 404 |
| upload 未登录 401 | PASS（代码审阅） | `src/app/api/upload/route.ts:95`：`withApi({ permission: "media:create", ... })`，withApi 鉴权档位未登录即 401（该语义由 lane-b 契约测试整体覆盖，如 routes-admin.test.ts「GET 无 token → 401」） |
| wechat 错误签名拒绝 | PASS（代码审阅） | `src/app/api/wechat/callback/route.ts:25-28、42-43`：`verifySignature` 失败 → `new Response("签名校验失败", { status: 403 })`，GET/POST 两分支齐备 |

## 允许修改路径核对

卡允许：5 条 route.ts + ADR-037 + 证据目录。实改（git show --stat 4810e55）：

| 文件 | 判定 |
| --- | --- |
| src/app/api/upload/route.ts、file/[...path]/route.ts、wechat/callback/route.ts、health/route.ts、api/route.ts | 全部允许（逐条 grep 确认 withApi 已接入，health/api 根为 0 参兼容包装） |
| docs/design/03_solution/decisions/ADR-037-withApi豁免清单.md | 允许（卡输出项） |
| docs/design/06_validation/evidence/V8/T-04/execution.md | 允许（证据） |
| docs/V0.8-20261022/state.json | 协议状态文件，按协议口径豁免 |

无越界，未触碰冻结面。响应形态审阅：file 保留原始字节流、wechat 保留纯文本/XML 与 403、health DB 故障在 handler 内捕获不回抛（避免探活端点触发邮件放大）——与提交说明及 ADR-037 §2/§3 一致。

## 未重跑/受限项

- 未起本地服务实测三条负向行为（404/401/403），以代码审阅 + 全量单测（验证者亲跑 1712 passed，含 routes-public.test.ts 14 条覆盖 health/api 根）为准。
- `npm run build`/tsc 未重跑；引用今日 HEAD=fad1924 门禁记录（全过）。

## 备注

1. 卡 Execution 第 3 步「**不可迁移的**各补 1 条负向用例」的前置条件不成立（5 条全部迁移、零豁免），故无新增负向单测；执行证据 §5 已按独立复核意见更正表述为「按条件未做，不记为完成」。三条负向验收项以代码审阅证实，建议后续在 file/upload/wechat 的所有权卡内各补 1 条路由级负向用例（当前无自动化防护，回归靠 review）。
2. ADR-037 §后果已登记取舍：withApi 异常路径对 file/wechat 返回 JSON 信封（非预期路径才触发，404 主分支不受影响）。
3. 执行证据与重跑结果无冲突。
