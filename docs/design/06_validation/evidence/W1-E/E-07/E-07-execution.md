# E-07 执行证据：管理端规格从契约派生（resource-meta + derive），crud-specs ≤ 200 行

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=resource-meta/derive.ts（shape 键序 + ZodEnum options 派生 + required 推断 + type 映射）+ specs.ts（22 资源并列 meta）+ columns.ts（显示层列定义）+ derive.test.ts（73 用例含全资源防漂移）；crud-specs.tsx 635→166 行；When=2026-10-17（北京时间）；Why=S-E7 规格单源派生（P08 目标 1）；How=派生层为契约与 UI 唯一通道，meta 只剩 label/控件提示/枚举中文。

## 改动文件
- `src/components/manager/resource-meta/derive.ts`（新）：unwrap 链（Optional/Nullable/Default）+ deriveField（type 映射：ZodNumber→number、ZodBoolean→switch、ZodEnum→select+options、ZodString→text；meta.type 覆盖 image/json/richtext/textarea/tags）+ deriveFields（无 meta 的 shape 键不渲染）+ enumValues。
- `src/components/manager/resource-meta/specs.ts`（新）：22 个可派生资源的并列 meta（title/schema/labels——label、枚举中文、控件提示、sections/colSpan/rows）。
- `src/components/manager/resource-meta/columns.ts`（新）：列定义（显示层，不属表单契约）。
- `src/components/manager/resource-meta/__tests__/derive.test.ts`（新）：73 用例——机制（required 推断/枚举派生/meta 覆盖）+ 全资源防漂移（meta 键 ⊆ shape 键；手写 options 值 ∈ 契约枚举；spec 字段键 ⊆ shape 键）+ 组装完整性（26 资源；e2e getByLabel 锚点保真）。
- `src/components/manager/crud-specs.tsx`：635→**166 行**（≤200 验收）；只剩 helpers（runSource/testSource 逐字保留含 collect-test-result testid）、EXTRA（collect-sources defaults autoApprove:false + users relations）、READ_ONLY 4 资源、组装。

## 重构过程暴露并修复
- 首版 testSource 凭记忆简化（纯文本 description）丢失 `collect-test-result` testid → collect-publish 试抓预览步骤失败；与 5d5c4cb 原实现逐字对照后恢复（JSX description + testid + 原 title"试抓结果：解析到 N 条"）。
- alertDialog import 遗漏 → build 失败一次，补齐后过。
- 防自证循环说明：testSource 恢复后与原实现 diff 为零。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| crud-specs.tsx ≤ 200 行 | PASS | 166 行（`test $(wc -l) -le 200` 通过） |
| derive.test.ts 与 spec-drift.test.ts 全绿 | PASS | derive 73/73 + spec-drift 6/6（79 tests，848ms） |
| e2e 全量通过 | PASS | test:e2e 13 passed（1.4m）；1 次瞬时 seed 退出码非 0（重跑通过，已知 ESM 噪音） |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest 全过、build=0 |
| 越界检查 | PASS | resource-meta/** + crud-specs.tsx，越界 0 |

## 命令
```bash
npx vitest run src/components/manager/resource-meta  # 79 passed
npm run lint && npm run typecheck && npm test && npm run build  # 全 exit 0
npm run test:e2e                                     # 13 passed
```

## 派生口径说明（一周后复现）
- 字段键：zod schema `.shape` 键序 = 表单序；无 meta 键 = 有意省略（id/createdAt/slug 自动生成等不渲染）。
- 枚举：ZodEnum `.options` 值派生；中文 label 在 specs.ts 手写；derive.test 的"手写 options 值 ⊆ 契约枚举"护栏保证契约改枚举立即红。
- required：schema 中非 optional（unwrap 后仍必有值）→ 必填；default/nullable → 非必填。
- 新资源纳入：blocks/kb 的自定义页（home-blocks/knowledge-bases）不走 crud-specs；其契约（blockRegistryItem/homeBlocksResetRequest/kb*）已由 E-03/E-04 消费。

## UNKNOWN 及原因
- 无。

## 后续方向待办
- E-08（依赖本卡 Blocks，A 线尾卡前置）；E 线剩余：E-08 清单核对、E-09/E-10/E-11。
