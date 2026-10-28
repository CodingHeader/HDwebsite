# TASK WP3：复用去重与代码卫生

## 归属
- 所属工作包：WP3
- 来源需求：代码复用（同一逻辑单一实现）
- 来源方案：`docs/V1.7-20261027/02-能力退化清单与定级.md` P1-7 / P2-1

## 目标
1. 消除 `localImageExists` 重复实现（ST1）
2. 登记 P2 项为已知省略，不实作（ST2）

## 输入
- 文档：`02-能力退化清单与定级.md` P1-7
- 契约：无
- 前置任务：无
- 前置状态：两处重复实现已确认

## 输出
- 新增：`src/lib/image-exists.ts`
- 修改：`src/app/(web)/gallery/page.tsx`、`src/components/web/data/home.ts`
- 新增：`docs/design/06_validation/evidence/V17/WP3/**`

## Execution Steps
1. [ ] `STEP-3-1` diff 两处实现确认等价
2. [ ] 新建 `src/lib/image-exists.ts`
3. [ ] 两处改为 import，删本地定义
4. [ ] ST2：把 showcase 过滤缺失、API 无 HTTP 缓存登记进 06 文档

## 验收标准
- [ ] `grep -rc "async function localImageExists" src/` 全为 0（可自动化）
- [ ] 共享模块存在且被两处引用（可自动化）
- [ ] `npx tsc --noEmit` exit 0（可自动化）
- [ ] 行为不变：外链 URL 仍视为存在（人工）
- [ ] P2 项已在 06 登记（可自动化 grep）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -rn "localImageExists" src/ | head -8
grep -rc "async function localImageExists" src/ | grep -v ":0" || echo "无本地定义 ✓"
npx tsc --noEmit
grep -n "showcase" docs/V1.7-20261027/06-风险与待裁决.md | head -3
```

## 证据路径
`docs/design/06_validation/evidence/V17/WP3/`

## 允许修改
- `src/lib/image-exists.ts`（新增）
- `src/app/(web)/gallery/page.tsx`
- `src/components/web/data/home.ts`
- `docs/V1.7-20261027/06-风险与待裁决.md`（仅追加登记）

## 禁止修改
- 其他 `src/**`
- 两处调用的业务逻辑（只换 import，不改行为）

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：若两处实现本不等价 → 先判定正确版本并在证据说明，不得盲目取其一

## 建议执行档位
`sonnect`　理由：提取函数 + 改 import，规则明确。

## 升级条件
若发现除这两处外还有第三处实现 → 一并纳入，并核实是否还有其他重复。

## 预估规模
小（1 小时）
