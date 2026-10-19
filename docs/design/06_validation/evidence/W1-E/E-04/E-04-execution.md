# E-04 执行证据：知识库管理页 + AI 场景表单分区 + 菜单

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=knowledge-bases 页（库列表/新建绑定 Coze/详情：文件拖拽上传/进度/条目/检索测试）+ chat-scenes 表单分区 + knowledge 页入口 + 菜单；When=2026-10-17（北京时间）；Where=src/app/manager/knowledge-bases/**、src/components/manager/crud-specs.tsx、src/app/manager/knowledge/page.tsx、prisma/seed.ts、tests/e2e/e-knowledge.spec.ts；Why=S-E4 知识库可管理（REQ-F-007/ADR-025）；How=按契约冻结包 §W0-05 端点表开发；C-06 未合并前核心逻辑由组件测试 mock 覆盖。

## 改动文件
- `src/app/manager/knowledge-bases/page.tsx`（新增）：库列表（新建/编辑/删除，knowledgeBaseCreateSchema 字段；cozeDatasetId 留空=新建并同步）→ 详情视图（stats 五指标 + 文件 DataTable + 重解析/删除 + 检索测试 POST /api/kb/test 扩 baseIds/topK）。
- `src/app/manager/knowledge-bases/kb-upload.tsx`（新增）：拖拽 + 选择；白名单前端拦截（.pdf/.png 不发请求 + KB_REJECT_MESSAGE）；≤10MB/≤10 个前端拦截；multipart 原生 fetch（managerFetch 默认 JSON Content-Type 会破坏 boundary）。
- `src/app/manager/knowledge-bases/__tests__/kb-upload.test.tsx`（新增）：6 用例（jsdom + fetch mock）。
- `src/components/manager/crud-specs.tsx`：chat-scenes fields 加 section（基础/模型与参数/知识库；SchemaForm section 机制）。
- `src/app/manager/knowledge/page.tsx`：顶部加入口（Link 到 /manager/knowledge-bases）+ 保留 CrudPage。
- `prisma/seed.ts`：group-ai 下新增 knowledge-bases 菜单（sort 2，permission kb:list）。
- `tests/e2e/e-knowledge.spec.ts`（新增）：2 用例 skip 依赖 C-06。
- **E-03 契约偏差顺手修正（同线同分支）**：`src/app/api/home-blocks/reset/route.ts` 响应 `{reset}` → `{templateCode, blocks}`（契约冻结包 §home-blocks/reset）。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| 组件测试：选择 .pdf/.png → 不发请求并显示 KB_REJECT_MESSAGE | PASS | kb-upload.test.tsx 6/6：pdf/png 各 1 用例（fetchSpy 0 次 + KB_REJECT_MESSAGE）、混合/超量/超大小拦截、.md 发起 KB_UPLOAD_FIELD multipart |
| W2-05：e2e e-knowledge.spec.ts 通过 | **待其他员工完成**（skip） | C-06 未合并前端点 404；2 用例已写并 skip，W2-05 复跑（上传 .md → 条目>0；.pdf → 400 提示） |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest 372 passed（28→? files）、build=0 |
| 越界检查 | PASS | 允许路径内 8 文件（含 E-03 修正 1 文件），越界 0 |

## 命令
```bash
npx vitest run src/app/manager/knowledge-bases  # 6 passed
npx vitest run src/components/manager           # 23 passed（既有 + spec-drift）
npm run lint && npm run typecheck && npm test && npm run build  # 全 exit 0
```

## UNKNOWN 及原因
- Coze 真实联调（dataset 凭证缺失）：ADR 裁决 UNKNOWN，完整实现用 mock。
- 上传端点路径 `/api/knowledge-bases/{id}/files`：按契约冻结包端点表；C-06 合并后 e2e 复跑确认。

## 后续方向待办
- W2-05：C-06 合并后取消 `tests/e2e/e-knowledge.spec.ts` 的 skip 并复跑。
- E 线下一张：E-05（M1 w1-ui-kit 已解锁）。
