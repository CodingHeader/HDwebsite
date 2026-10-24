# V11-SEC-03 执行证据（2026-10-24）

## 5W1H 简版

- **What**：/api/user-actions 公开埋点加 IP+类型频控（超频 429）；媒体上传补文件头魔数**正向**校验（双向）；next.config.ts 全站安全响应头（nosniff / SAMEORIGIN / Referrer-Policy，HSTS 走可选 env）。**K2 决议：容量维持 20MB 不变。**
- **Why**：V1.1 审计 §安全.4/5——公开埋点无频控可无限刷；上传只信浏览器声明 Content-Type，改名伪装文件可入库；全站无安全响应头。
- **Who/Where**：P2 lane；`src/app/api/user-actions/route.ts`、`src/lib/storage.ts`（纯函数）、`src/app/api/upload/route.ts`（上传路径）、`next.config.ts`（headers 段）。
- **When**：2026-10-24，基线 0728c46 / HEAD d95e103。
- **How**：频控复用 V11-SEC-02 新建的 `src/lib/rate-limit.ts`（滑窗 + trustedClientIp）；魔数与既有伪装检测口径（`src/lib/kb/filetype.ts` 头字节嗅探）对齐，纯函数落 `storage.ts`（UPLOAD_MIME_EXT 同源）。

## 现状盘点（以代码为准，审计复核）

| 审计声明 | 复核结论 | 证据 |
|---|---|---|
| user-actions 公开写入无频控 | **属实** | `src/app/api/user-actions/route.ts` POST 公开（withApi 无 permission），直接 prisma.create |
| 上传缺魔数校验 | **属实** | `src/app/api/upload/route.ts` 仅 `ALLOWED_TYPES[file.type]`（声明 MIME 白名单）+ 20MB 上限，无头字节校验 |
| 现有响应头 | **属实（缺失）** | next.config.ts headers() 仅 /api CORS 三头；无 nosniff/XFO/Referrer-Policy/HSTS |
| **卡内路径偏差** | **记录** | 卡写"src/app/api/media/**（上传路径）"，实际媒体上传端点是 `src/app/api/upload/route.ts`（media/** 只有列表/批量/删除）。越界改 upload/route.ts 的理由：这是"上传路径"的唯一实体，不改则"伪造扩展名被拒"无法达成；属任务意图内的路径修正，非新增所有权 |

## 改动文件

1. **`src/lib/storage.ts`**（追加，不动 W0-03 冻结签名）：`UPLOAD_MAGIC`（JPEG FFD8FF / PNG 89504E470D0A1A0A / GIF "GIF8" / WebP RIFF+偏移8 "WEBP" / PDF %PDF / MP4 偏移4 ftyp）+ `detectUploadMagic()` + `validateUploadMagic()`（双向：声明类型必须匹配头字节；头字节识别出的实际类型必须等于声明）。UPLOAD_MAX_SIZE 注释追加 K2 决议，**数值不动（20MB）**。
2. **`src/app/api/upload/route.ts`**：MIME 白名单通过后、落盘前，读前 16 字节（`file.slice(0,16)`）做魔数校验，不符 → 400 `"文件内容与声明的类型不符"`。容量逻辑零改动。
3. **`src/app/api/user-actions/route.ts`**：parseBody 后、写库前 `checkRateLimit("ua:<trustedClientIp ?? unknown>:<actionType>", { limit:30, windowMs:60_000 })`；命中 → 429 + Retry-After。**落库 ipAddress 仍用 clientIp()**（审计字段保留原始上报值，仅限流键用可信 IP）。
4. **`next.config.ts`（仅 headers 段）**：全局 `/:path*` 追加 `X-Content-Type-Options: nosniff`、`X-Frame-Options: SAMEORIGIN`、`Referrer-Policy: strict-origin-when-cross-origin`；`ENABLE_HSTS=1` 时追加 `Strict-Transport-Security: max-age=31536000; includeSubDomains`（HTTP/本地反代下默认不发，避免浏览器拒后续 HTTP 访问）。原 /api CORS 头保留。

## 验收逐条

| 验收标准 | 结果 | 证据 |
|---|---|---|
| user-actions 超频返回 429 | **PASS** | 单测：30×201 → 第 31 次 429 + Retry-After（1≤RA≤60），`{"code":429}`；换 actionType（click）不受影响（键含类型）。**手工 curl**（dev :3456）：`201×30` 后第 31 次 `HTTP/1.1 429 Too Many Requests` + `retry-after: 59` |
| 伪造扩展名的非图片文件被拒（魔数断言） | **PASS** | 单测：文本字节声明 image/png 拒；真实 PNG 头声明 image/jpeg 拒（报实际类型）；WebP 仅 RIFF 缺 WEBP 标记拒；白名单 6 类型正向全过。**手工 curl**：文本改名 .png + `type=image/png` → `HTTP 400 {"code":400,"message":"文件内容与声明的类型不符"}`；真实 1×1 PNG → `201 上传成功`（缩略图正常） |
| 响应含全部目标安全头 | **PASS** | 单测断言三头存在且默认无 HSTS、ENABLE_HSTS=1 时有 HSTS、/api CORS 头保留。**手工 curl**（dev :3456）：`GET /` 与 `GET /api/health` 均返回 `X-Content-Type-Options: nosniff`、`X-Frame-Options: SAMEORIGIN`、`Referrer-Policy: strict-origin-when-cross-origin`（API 另有原 CORS 头） |
| K2 决议（保持 20MB）写入证据 | **PASS** | 本节开头明示；`storage.ts` 注释锚定；单测 `UPLOAD_MAX_SIZE === 20*1024*1024` 锚点防回归；白名单键集断言不变 |

## 验证命令输出摘录

```
npx vitest run src/lib/__tests__/v11-sec03-upload-security.test.ts
  ✓ 13 tests passed

npx vitest run src/lib/__tests__    761 passed | 12~18 failed（失败全部为 chat/collect 域，
  归属 d95e103 SEC-04，控制变量实验见 SEC-02 证据"非本卡失败归属"；本卡 22 个新用例全绿）
npm run lint                        exit 0
npx tsc --noEmit                    exit 0（0 errors）
npm run build                       exit 0（exit code 实测 BUILD_EXIT=0）
```

curl 证据原始输出（节选）见上文各验收行；完整命令为 `npx next dev -p 3456` + curl -sI / -X POST 循环（登录 admin 本地默认口令）。

## UNKNOWN

- 无本卡域 UNKNOWN。HSTS 生产启用需部署侧确认 HTTPS 后设 `ENABLE_HSTS=1`（属部署决策，代码侧已就绪）。

## 后续方向待办

1. `.env.example` 增补 `ENABLE_HSTS`（同 SEC-02 的 TRUST_PROXY，建议随部署配置卡一起补）。
2. `clientIp()`（log.ts）落库埋点 ipAddress 仍为原始上报值——伪造 XFF 会污染埋点审计字段；如需治理属新卡（本卡仅保证限流键不可伪造）。
3. 采集图片下载（collect-engine）复用 detectUploadMagic 做落盘前校验的可选项——collect-engine 本卡禁碰，留待该域卡评估。

## 附：本机 dev 环境痕迹

curl 证据在本地 dev server（:3456，dev.db）产生：31 条 user-actions probe、1 条真实 PNG media（id 695，uploads/202610/24/）均为本地 gitignored 运行时数据；probe 文件 uploads/sec03-fake.png 已删。
