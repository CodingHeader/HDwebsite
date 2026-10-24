# V11-SEC-01 执行证据（2026-10-24）

## 5W1H 简版

- **What**：`sanitizeHtmlServer` 对"不闭合标签"（如 `<img onerror=alert(1)`，无 `>`）原样放行——标签正则 `/<\/?tag\b[^>]*>/` 要求闭合尖括号，畸形输入不匹配即原样进输出；浏览器解析时借用后续合法标签的 `>` 把它拼成真标签（借闭包 XSS）。影响链：文章详情、服务详情（sanitizeRichContent → sanitizeHtmlServer）、课程详情（直调 sanitizeHtmlServer）、管理端 SchemaForm richtext。
- **Why**：旧实现 `String.replace(tagRe, fn)` 只处理匹配项，对匹配之间的残余文本不做任何处理。
- **How**：TDD——先写 7 个缺陷暴露断言（4 红），后修复。
- **修复**（`src/lib/security/xss-filter.ts`）：`sanitizeHtmlServer` 改**主扫描**——逐个成形标签交 `sanitizeTag()`（原 replace 回调抽出，白名单重建逻辑不变）；**两次匹配之间的残余文本里一切 `<` 转义为 `&lt;`**。效果：输出中除白名单重建标签外不存在任何原始 `<`，浏览器无法从残余文本构造标签。

## 现状盘点（对审计声明的核实）

- 审计声明属实：`npx tsx` 复现 4 例畸形输入全部放行（TDD 红阶段 4 failed 记录）。
- 客户端净化 `sanitizeHtmlClient` 走 DOMParser，浏览器容错解析下无此缺陷，不需改。

## 验收逐条结果

| 条目 | 结果 | 证据 |
|---|---|---|
| 畸形不闭合标签经净化后不含可执行向量 | **PASS** | 7/7 新断言绿：`&lt;img onerror=…` 为纯文本；借闭包场景重建标签白名单剥除 onerror |
| 合法富文本不回归 | **PASS** | 既有净化能力（白名单属性/javascript:/实体编码 scheme 拦截）断言全绿 |
| 净化入口唯一 | **PASS** | articles/services 走 sanitizeRichContent（=sanitizeHtmlServer），courses 直调 sanitizeHtmlServer，SchemaForm 同入口——grep 证实无旁路 |
| 全量单测 | **PASS** | src/lib/__tests__ 732 passed |

## 改动文件

- `src/lib/security/xss-filter.ts`（主扫描 + sanitizeTag 抽出，净增注释说明借闭包原理）
- `src/lib/__tests__/v11-sec01-xss.test.ts`（新增 7 断言）

## 备注

- 已知排版级小瑕疵（非安全面）：`<img onerror=… <p>` 类输入会被正则整体当一个 img 标签消费，吞掉相邻 `<p>` 开标签（测试 3 注释说明）。
- 修复不引第三方依赖（自研扫描，规划总指令 §13）。
