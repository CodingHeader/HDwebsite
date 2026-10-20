# non-json-routes.md — 协议例外清单（B-03 交付）

> 目的：登记 `src/app/api` 下**故意不走 `withApi`/`crud*` 工厂**的 route handler，并写明理由。
> 消费方：W2-02 将依据本清单在 `tests/contract/rules.ts` 写入守卫规则（这些文件在守卫中豁免「必须 withApi」检查）。

## 例外清单（截至 B-03）

| 文件 | 原因（为什么豁免 withApi） | 所有权 |
|---|---|---|
| `src/app/api/file/[...path]/route.ts` | 静态资源字节流服务：以 `ReadableStream`/`fs` 流式返回，响应体非 JSON 信封；withApi 的 `success()/error()` 工厂只输出 JSON | D 线（D-09 storage DATA_DIR） |
| `src/app/api/upload/route.ts` | multipart/form-data 上传端点：需直接读 `FormData` 与文件流，响应可能带原始字节（错误时仍用契约 JSON 信封，但主路径是文件存储） | D 线（D-11 媒体清理） |
| `src/app/api/wechat/callback/route.ts` | 微信回调协议：请求体是 **XML**（`<xml>…</xml>`），响应需按微信 spec 返回 `text/xml` 或 `echostr` 明文；`parseBody` 走 `request.json()` 会抛 400 | B 线（wechat 归属） |
| `src/app/api/health/route.ts` | 健康检查：返回 `{status, db, time}`，语义上不属于业务契约信封（运维探活）；保留裸 `success()` 但走独立探活路径，不纳入 withApi 的 system_error 邮件告警（避免健康检查失败刷邮件） | B 线（B-03 明示） |
| `src/app/api/route.ts`（api 根） | 探活：B-03 已改走 `success()` 契约信封；无 withApi 的必要（无鉴权、无业务数据、无 system_error 需求） | B 线 |

## W2-02 守卫规则建议

```ts
// tests/contract/rules.ts（W2-02 写入）
// 白名单：协议例外文件（不得走 withApi / crud* 工厂）
export const NON_JSON_ROUTE_ALLOWLIST = new Set([
  "src/app/api/file/[...path]/route.ts",
  "src/app/api/upload/route.ts",
  "src/app/api/wechat/callback/route.ts",
  "src/app/api/health/route.ts",
  "src/app/api/route.ts",
  // D/C 线负责，见其卡：
  "src/app/api/llm/providers/route.ts", // 由 C 线迁移
]);

export function isNonJsonRoute(path: string): boolean {
  return NON_JSON_ROUTE_ALLOWLIST.has(path);
}
```

> 注意：白名单路径必须与 `git` 中实际路径逐字一致（Windows 路径分隔符 `/`）。W2-02 实现时应从本文件 `git ls-files` 校验，避免路径大小写/转义不一致导致误判。

## 更新规则

- 任何后续卡**不得**新增白名单条目；如需豁免，必须写 ADR 并在本文件追加理由。
- 某例外文件若日后可以迁移到 withApi（如 health 改为纳入告警），先在证据中登记，再更新本文件与白名单。