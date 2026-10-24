# V11-ENR-01 执行证据：招生同步与学费回写移植 + 唯一性防重

## 5W1H（简版）

- **What**：把 main（hdwebsite_0429）的招生同步（name 型 upsert：专业/院校/课程自动建）与最低学费回写（active 计划最低 totalTuition → Course.price/priceText）移植到 upgrade，并为唯一键空值重复写入加应用层防重。
- **Why**：V1.1 审计 §招生.1/2——upgrade 只有 id 型 CRUD，缺失 main 的同步链路与价格回写；`@@unique([sourceBatch,partnerId,majorId,educationType,level,majorCode])` 含可空列，SQLite 视 NULL 互异，重复推送可产生重复行。
- **Who/When**：P1 lane 执行代理，2026-10-23（对照库：`E:\Code\Demo\HDwebsite\hdwebsite_0429`，只读）。
- **Where**：新增 `src/lib/enrollment-pricing.ts`、`src/lib/enrollment-sync.ts`、`src/app/api/enrollment-offerings/sync/route.ts`、`src/app/api/enrollment-offerings/sync/[id]/route.ts`、`src/lib/__tests__/v11-enr-01.test.ts`。
- **How**：纯函数逐字移植；sync 模块加"空值归一 + 进程内串行链 + P2002 回退"三层防重；新建 sync 路由（不动冻结契约的 id 型 CRUD 路由）。

## 现状盘点（审计声明 vs 代码核实）

| 审计声明 | 代码核实 | 结论 |
| --- | --- | --- |
| upgrade 缺招生同步/学费回写 | upgrade 无任何 `enrollment*` lib 模块；`/api/enrollment-offerings` 是薄 CRUD（crudList/crudCreate，offeringCreateSchema 为 id 型）| **属实**（本次移植） |
| 唯一键含空值重复写入 | 两库 schema 均有 `@@unique([..., level, majorCode])`（可空列）；main 的 upsert 用 findFirst-then-create/update（Prisma `level: null` 匹配 IS NULL，但存在查后建竞态，且索引对 NULL 行不兜底）| **属实**（本次应用层防重） |
| main 同步逻辑存在 | `hdwebsite_0429/src/lib/enrollment-sync.ts`（209 行）+ `enrollment-pricing.ts`（107 行，纯函数）+ POST/PUT/DELETE 路由 | 属实（移植源） |

## 与 main 的对照表（验收 1）

| main（hdwebsite_0429） | upgrade（本次移植） | 对齐情况 |
| --- | --- | --- |
| `enrollment-pricing.ts` 纯函数：normalizeBlankLevel / inheritEnrollmentLevels / formatTotalTuitionPrice / getLowestTotalTuition | `src/lib/enrollment-pricing.ts` 同名同逻辑 | **逐字对齐**（单测对照：`/`、空串归一 null；同校层次继承、换校重置；最低价与 `¥x`/`--` 文案；计数） |
| `enrollment-sync.ts`：ensureCourseCategory（"招生专业"/enrollment-majors）/ ensureMajor（name 唯一，slug=encodeURIComponent 去%）/ ensurePartner（默认 logo）/ ensureCourseForMajor（majorId → title 收养 → 新建）/ refreshMajorCoursePricing（active 最低价回写 updateMany） | 同名模块同逻辑 | **对齐**（单测：分类 slug、收养分支不重复建课、回写 ¥2800/--） |
| `POST /api/enrollment-offerings`（name 型 upsert，201"保存成功"） | `POST /api/enrollment-offerings/sync`（同语义） | **对齐**；原路径已被 upgrade 冻结契约的 id 型 CRUD 占用，故同步入口挂 `/sync`（见"决策"） |
| `PUT /api/enrollment-offerings/[id]`（名称 ensure + hasPrice 推导 + 新旧专业都回写） | `PUT /api/enrollment-offerings/sync/[id]` | **对齐**（单测：部分更新不抹未传字段；显式 null → hasPrice=false → 回写 `--`） |
| `DELETE /api/enrollment-offerings/[id]`（删 + 回写所属专业） | `DELETE /api/enrollment-offerings/sync/[id]` | **对齐**（单测：删后行消失、课程回写 `--`） |
| upsert 键：findFirst（level/majorCode 原样，`|| null`） | upsert 键：normalizeBlankLevel 空值归一 + 进程内串行链 + 建行 P2002 回退更新 | **增强**（见下） |
| 无操作审计 | 路由写操作 logOperation（module=enrollment，upgrade 审计规范） | upgrade 规范适配 |
| status 枚举 `["active","inactive"]` | `["active","inactive","draft","archived"]`（超集：兼容 main 推送 + upgrade 契约词汇） | 超集兼容，登记 |
| zod 无长度上限 | 对齐 upgrade 冻结契约的 max 长度（防御性收紧；main 合法载荷不受影响） | 适配，登记 |

### 字段映射（同步输入 → EnrollmentOffering）

majorName→Major.name（无则建，slug 同 main）；partnerName/partnerLogo→Partner（无则建，默认 logo `/images/logo.png`）；sourceBatch 缺省"26春"；educationType 缺省"自考"；level/majorCode 空值归一后入库；totalTuition→hasPrice 推导 + 回写键；studyForm/yearTuition/feeDetail/extraFeeNote/status/sort 直传。与 main 逐一相同。

## 唯一性防重设计（验收 2 核心）

1. **空值归一**：键字段 level/majorCode 经 `normalizeBlankLevel`（""/"/"→null）——main 中 `level:"/"` 与不传 level 会被视为两行，本实现同键。
2. **进程内串行链**：`upsertChain` 串行化全部 upsert（与 notify-gateway 的 aggregateChain 同模式），关闭同进程"查后建"竞态（并发 Promise.all ×5 同键 → 1 行，单测覆盖）。
3. **P2002 回退**：create 撞唯一索引（非空键并发）→ findFirst 后改走 update，重复推送幂等（ADR-028 同款 code 检测）。
4. **残余风险（登记）**：SQLite 唯一索引视 NULL 互异，跨进程 + 全空键的理论重复无法由索引兜底；部分索引方案需改表（冻结面禁止）。应用层最强可达口径已达成，跨进程部署（多 Next 实例共库）时建议后续以部分索引收口。

## 决策与越界说明

- **sync 路由独立于 CRUD 路由**：`/api/enrollment-offerings` 的 POST/PUT/DELETE 是冻结契约（offeringCreateSchema，id 型）上的通用 CRUD，属共享物不可改；main 的 name 型同步语义挂到 `/api/enrollment-offerings/sync[/[id]]`（任务书允许路径 `src/app/api/enrollment*/**` 内）。
- **同步输入 DTO 定于 `src/lib/enrollment-sync.ts`**：冻结契约不可新增 DTO；既有 offeringCreateSchema 是 id 型 CRUD 输入，与本 name 型同步输入用途不同，非重复定义。若后续解冻契约，可平移至 contracts。
- 未修改：src/contracts/**、prisma/**、package.json、src/lib/collect-engine.ts、crud-resources（CRUD 路由零改动）。

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| 同步与回写行为与 main 对齐（对照表） | **PASS** | 上方对照表 + 纯函数/模块级单测逐项断言 |
| 重复推送不产生重复行（单测） | **PASS** | 4 用例：同键重复推送同 id；`/`/空串/不传归一同键；不同键各自成行；并发 ×5 同键 1 行 |

## 命令输出摘录

```
npx vitest run src/lib/__tests__/v11-enr-01.test.ts
 Test Files  1 passed (1)
      Tests  13 passed (13)

npm run typecheck   → exit 0（无错误）
npx eslint <本卡全部新改文件>  → 0 问题
```

## UNKNOWN 及原因

- main 线上真实推送方（外部系统）的行为差异（如批量继承行导入走 `inheritEnrollmentLevels` 的上游）：main 仓库内未见调用方（推送由站外触发），已按函数级对齐；真实外部载荷兼容性 UNKNOWN。
- 跨进程并发推送的防重（多实例共库）：应用层已尽力，SQLite 部分索引需改表（冻结），登记为后续收口项。
