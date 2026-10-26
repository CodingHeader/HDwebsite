# V13-SEEDVIS-01：seed-visual 自检口径收敛

## 归属
- 切片：S1
- 缺口：**G3**
- 执行者：P2
- 档位：低｜规模：小

## 目标
让 `npx tsx prisma/seed-visual.ts --check` 只对**种子自己负责的数据**判定，避免本地人工残留把自检判成失败，同时保留对真实数据漂移的检出能力。

## 现状取证（本轮实测）
- `counts.json` 定义 `Article: 25`；种子按 `ID_BASE + 200 + i`（i=1..25）写 **9201~9225**。
- 本地 `prisma/dev.db`：visual id **26 条**，多出 `9226 = ('测试文章','draft')`（人工测试残留）。
- 种子 25 条**齐全、0 缺失** → `--check` 因总数 +1 而 exit 1，属**口径问题**，非数据缺陷。

## 输出
- `prisma/seed-visual.ts`（`--check` 统计方式调整）
- 证据

## Execution Steps
1. [ ] `--check` 改为按**种子 id 区间**统计（如 Article：`id BETWEEN 9201 AND 9225`），而非全表 `count(*)`
2. [ ] 额外列出"非种子行"清单（id + title + status），仅提示、**不判失败**
3. [ ] 保持"真实漂移"仍能失败：种子区间内多出/缺失行 → exit 1
4. [ ] 本地验证：脏 `dev.db` 上 `--check` → **exit 0**，且输出残留行提示
5. [ ] CI 一致性：全新库上 `--check` → exit 0（逻辑不变）
6. [ ] 证据：两条命令输出 + 残留行清单

## 验收标准
- [ ] 本地脏库 `--check` exit 0，并打印非种子行
- [ ] 种子区间内人为删 1 行 → `--check` exit 1（负向用例）
- [ ] 未改 `counts.json` 数值、未改种子数据内容
- [ ] 不影响 visual CI 的 `--check || seed` 逻辑

## 验证命令
```bash
npx tsx prisma/seed-visual.ts --check
# 负向：临时删一条种子行后再 --check，应 exit 1，然后恢复
```

## 证据路径
`docs/design/06_validation/evidence/V13/SEEDVIS-01/execution.md`

## 允许修改
- `prisma/seed-visual.ts`
- 证据目录

## 禁止修改
- `prisma/fixtures/visual/counts.json` 的数值
- `prisma/schema.prisma`、迁移、`tests/visual/reference/**`

## 依赖与阻塞
- Depends on：V13-BASE-01
- 与 V13-VIS-01 有潜在文件交集（都碰 `seed-visual.ts`）→ **须串行**：SEEDVIS-01 先于 VIS-01

## 升级条件
连续 2 次 FAIL → 熔断，仅记录问题不改脚本。
