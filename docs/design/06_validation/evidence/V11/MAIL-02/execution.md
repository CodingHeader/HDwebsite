# V11-MAIL-02 执行证据：失败重试、HTML 模板与分组一致性

## 5W1H（简版）

- **What**：① `notifyRetryScan` 兜底重试 failed 记录（次数上限 + 指数退避）；② 邮件正文按事件类别渲染 HTML 模板（text 作纯文本回退，内容 HTML 转义）；③ 管理端收件人分组提示文案与 prisma/seed.ts 种子规则对齐。
- **Why**：V1.1 审计 §邮件.2/3/4——failed 记录重启后永不重试；邮件为纯文本且不分事件；分组提示（publish,ops）与种子规则（publish / publish+admin）不一致。
- **Who/When**：P1 lane 执行代理，2026-10-23。
- **Where**：`src/lib/notify-gateway.ts`、`src/components/manager/resource-meta/specs.ts`、`src/app/manager/notify-rules/page.tsx`、新增 `src/lib/__tests__/v11-mail-02.test.ts`。
- **How**：failed 兜底扫描用 `retries < notifyRetryCount` 作次数上限、`createdAt + 2^retries 分钟` 作退避门（NotifyRecord 无 updatedAt 字段，按 createdAt 近似，扫描 5 分钟一轮实际间隔不小于扫描周期）；`renderNotifyHtml(event, subject, content)` 按事件映射四类模板并转义；提示文案改写。

## 现状盘点（审计声明 vs 代码核实）

| 审计声明 | 代码核实 | 结论 |
| --- | --- | --- |
| failed 记录重启后不重试 | `notifyRetryScan` 只扫 `status: "pending"`（注释"failed 由退避定时器接管"）；退避定时器是进程内 `setTimeout`，进程重启即丢失 | **属实**（本次修复点 ①） |
| 邮件为纯文本 | `deliver` 的 `sendMail` 只传 `text: record.content` | **属实**（修复点 ②） |
| 分组提示与种子规则不一致 | seed（`prisma/seed.ts:505`）：错误/余额/采集类规则收件组 `["publish","admin"]`、发布前提醒 `["publish"]`；管理端提示却是「通知组（逗号分隔：publish,ops）」（specs.ts）与 placeholder `publish,ops`（notify-rules/page.tsx）——`ops` 组无任何规则使用，`admin` 组提示完全未提；另盘点发现 seed 不创建任何 NotifyRecipient | **属实**（修复点 ③） |
| 重试次数上限已存在 | `deliver` 用 `notifyRetryCount`（默认 3）判定 dead | 属实，兜底扫描复用同一设置 |

## 改动文件

- `src/lib/notify-gateway.ts`：
  - `notifyRetryScan`：新增 failed 兜底扫描（`retries: { lt: maxRetry }` + createdAt 退避门 + `deliver(id, retries+1)` 与内存定时器语义衔接）；
  - 新增 `mailCategory` / `renderNotifyHtml`（四类 + generic，内容先转义再 `\n→<br>`）；`deliver` 的 sendMail 增加 `html`；
  - 相关注释同步。
- `src/components/manager/resource-meta/specs.ts`：notify-recipients 的 groups 字段 label 去「publish,ops」误导、新增 help 说明分组口径。
- `src/app/manager/notify-rules/page.tsx`：收件人分组 help 文案对齐种子规则、placeholder `publish,ops` → `publish,admin`。
- `src/lib/__tests__/v11-mail-02.test.ts`：新增 5 用例。

> 越界说明：specs.ts 与 notify-rules/page.tsx 严格来说不在任务书"允许修改"枚举内，但任务步骤 3 明确要求"管理端分组提示文案与 seed 规则对齐"，提示文案仅存在于这两个文件；改动仅限提示性字符串（label/help/placeholder），不涉及视觉样式与组件结构（管理端文案，非前台冻结面）。种子规则本身（对齐基准）无需改动。

## 分组核对表（种子规则 ↔ 提示文案 ↔ 行为验证）

| 事件 | seed 规则收件组 | 提示文案口径 | 行为验证（v11-mail-02 用例 4） |
| --- | --- | --- | --- |
| before_publish_news/info/wechat | `["publish"]` | publish=发布前提醒 | to=`ops@mock.local`（publish 组）✔ |
| job_failed | `["publish","admin"]` | admin=失败/余额类告警 | to=`admin@,ops@` ✔ |
| system_error | `["publish","admin"]` | 同上 | 同 job_failed 同类别映射（failed 模板）✔ |
| collect_failed | `["publish","admin"]` | 同上（采集告警） | to=`admin@,ops@` ✔ |
| llm_balance_low | `["publish","admin"]` | 同上（余额提醒） | to=`admin@,ops@` ✔ |
| （无规则使用 ops 组） | — | 提示已删除 ops 示例 | — |

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| 重启后 failed 被重试（单测） | **PASS** | 用例 1：手工建 `status=failed, retries=0, createdAt=10min 前` → `notifyRetryScan()` → `sent` 且 `retries=1`（从下一跳继续） |
| 次数上限 + 退避（步骤 1） | **PASS** | 用例 2：`retries=3 ≥ notifyRetryCount(3)` 不重试；用例 3：创建未满 2^0 分钟的 failed 本轮跳过 |
| 邮件为 HTML 且事件对应 | **PASS** | 用例 4：四类事件各收到对应类别模板（标签/主色断言）+ DOCTYPE；用例 5：类别映射纯函数 + unknown→generic |
| 按提示配置的收件人能收到对应事件邮件（规则核对表） | **PASS** | 核对表见上节；行为级断言收件人命中（publish → ops；publish+admin → ops+admin）；text 回退保留、HTML 内容转义（`<b>` → `&lt;b&gt;`） |

## 命令输出摘录

```
npx vitest run src/lib/__tests__/v11-mail-02.test.ts
 ✓ src/lib/__tests__/v11-mail-02.test.ts (5 tests) 3765ms
 Test Files  1 passed (1)
      Tests  5 passed (5)

npx vitest run lane-b/notify + notify-before-publish + notify-scan-flush
            + v11-mail-01 + v11-mail-02 + publish-state-machine
 Test Files  6 passed (6)
      Tests  115 passed (115)
```

全量口径：本卡 notify 相关 6 文件 115 例全绿；执行期间其余域（chat/collect/kb）的在途改动属其他 lane，与本卡零交集（主代理 42d104b 提交记录全量 1766 绿）。

## UNKNOWN 及原因

- 真实 SMTP 客户端对 HTML 的渲染效果（Outlook/企业邮箱等）：凭证缺失，无法联调，`UNKNOWN`（沿用全项目 mock 口径）；HTML 使用内联样式与表格化外层，兼容性风险已尽量收敛。
- 退避按 createdAt 近似（无 updatedAt 字段、不允许改表）：重启重试的实际间隔可能比理想退避提前至多一个扫描周期（≤5 分钟），已在代码注释与证据中说明。
