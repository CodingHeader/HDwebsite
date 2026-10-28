# C1 执行证据：showcase 过滤

## 5W1H
- **What**：恢复脏数据守卫的最小可用集（3 个纯守卫函数）并接入真实消费。
- **Why**：原版 `showcase.ts` 有三组守卫（:99/:110/:120），新版文件不存在、引用全 0 → 若将来导入旧数据可能显示脏图/乱码文本。P2 低优先但成本低。
- **Where**：`src/lib/showcase-guard.ts`（新建）；`src/components/web/data/home.ts`（接入）。
- **Who**：external-assistant。
- **How**：STEP-C1-1 先核实关键词——`xgnedu` 仅 `src/app/(web)/apply/ApplyClient.tsx:277`（业务话术"加微信 xgnedu 咨询"），故**不列入毒文本**（TOXIC_TEXT_KEYWORDS 只有 新概念教育/四川师范大学）；`四川师范大学` 在 `nav-defaults.ts`（非内容字段，守卫不触碰）；`新概念` 0 处。STEP-C1-2 提取 3 个守卫函数（不复制原版 329 行种子逻辑）。STEP-C1-3 接入 `data/home.ts` gallery 过滤（map 前 filter，消费 isBlockedShowcaseImage + hasBrokenShowcaseText）。
- **What if**：若把 xgnedu 当毒文本全站过滤会误伤业务话术；守卫只用于内容字段（title/content/caption）。

## 改动文件
- `src/lib/showcase-guard.ts`（新增 30 行，3 个导出）
- `src/components/web/data/home.ts`（接入过滤 +1 import）

## 验证据条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 3 个守卫导出 | `grep -cE "^export function" src/lib/showcase-guard.ts` | PASS（3） |
| 2 | ≥1 处真实接入 | `grep -rn "showcase-guard" src/ | grep -v showcase-guard.ts` | PASS（home.ts:11 + gallery filter） |
| 3 | 关键词核实写入 evidence | 本文件 STEP-C1-1 结论 | PASS |
| 4 | 未改任何 className | `git diff` 无 className 变更 | PASS |
| 5 | tsc exit 0 | `npx tsc --noEmit` | PASS（0） |

## 关键词核实记录（STEP-C1-1）
| 关键词 | 现状 | 结论 |
|---|---|---|
| xgnedu | 仅 `src/app/(web)/apply/ApplyClient.tsx:277`（业务话术"加微信 xgnedu 咨询"） | 不列入 TOXIC_TEXT_KEYWORDS（防误伤）；仅用于 BLOCKED_IMAGE_SEGMENTS（图片路径） |
| 新概念 | src/ 内 0 处 | 列入 TOXIC_TEXT_KEYWORDS（无现状误伤风险） |
| 四川师范大学 | `src/components/web/data/nav-defaults.ts`（站点数据，非内容字段） | 列入 TOXIC_TEXT_KEYWORDS；守卫只作用内容字段，不触碰 nav-defaults |

## UNKNOWN
无。