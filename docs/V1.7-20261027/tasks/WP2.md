# TASK WP2：管理端断链修复

## 归属
- 所属工作包：WP2
- 来源需求：原版能力对等（`/manager/ai-config` 可达、`userPrompt` 可用）
- 来源方案：`docs/V1.7-20261027/02-能力退化清单与定级.md` P1-4 / P1-5

## 目标
1. 补 `/manager/ai-config` 页面级重定向（ST1）
2. 承接 `userPrompt` 能力（ST2，需先裁决 B1）

## 输入
- 文档：`02-能力退化清单与定级.md`（P1-4/P1-5）、`06-风险与待裁决.md`（B1）
- 契约：若选 schema 变更需走 CCR
- 前置任务：ST1 无前置；ST2 依赖 B1 裁决
- 前置状态：API 层已有 307（`api/ai-config/route.ts`）

## 输出
- 新增：`src/app/manager/ai-config/page.tsx`
- 视 B1 裁决：
  - A：`prisma/schema.prisma` + 新迁移 + `ChatScene` UI 字段
  - B：`LLMProvider.metadata` 承载 + UI 字段
- 新增：`docs/design/06_validation/evidence/V17/WP2/**`

## Execution Steps
1. [ ] `STEP-2-1` 新建兼容页 `redirect("/manager/llm-providers")`
2. [ ] 等 B1 裁决
3. [ ] ST2 按裁决实现（若 A 需 CCR + 迁移）

## 验收标准
- [ ] `/manager/ai-config` 跳转到 `/manager/llm-providers`（可自动化 curl）
- [ ] `next.config.ts` 无 ai-config 映射（可自动化）
- [ ] ST2：`userPrompt` 在管理端可编辑、在 chat 调用链被消费（人工）
- [ ] 若走 A：迁移可执行、`check-frozen` 在 CCR 前缀下放行
- [ ] 未新增依赖（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
ls -la src/app/manager/ai-config/page.tsx
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://127.0.0.1:6791/manager/ai-config
grep -n "ai-config" next.config.ts || echo "config 无映射 ✓"
grep -rn "userPrompt" src/ | head -5
```

## 证据路径
`docs/design/06_validation/evidence/V17/WP2/`

## 允许修改
- `src/app/manager/ai-config/page.tsx`（新增）
- 若 B1=A：`prisma/schema.prisma` + `prisma/migrations/**`（仅 1 个，CCR）
- 若 B1=A/B：`src/app/manager/llm-providers/**`、`src/app/manager/chat-scenes/**`、`src/lib/llm*`、`src/contracts/**`（CCR 范围）

## 禁止修改
- 不相关模块
- `tests/visual/reference/*.png`
- 不为「将来可能」预建字段

## 依赖与阻塞
- Depends on：ST2 依赖 B1 裁决
- Blocks：无
- 阻塞条件：B1 未裁决 → ST2 标 `blocked`，不得自行选 A 或 B

## 建议执行档位
ST1 `haiku`（新建 redirect 页）；ST2 `opus`（涉 schema/CCR 决策）

## 升级条件
若 B1 选 A 且 CCR 未获批 → 停手，ST2 记 blocked。

## 预估规模
ST1 小（0.5h）；ST2 中（A: 2~3h / B: 1h）
