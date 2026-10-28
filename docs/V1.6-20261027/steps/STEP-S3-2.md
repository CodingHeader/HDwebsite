# STEP-S3-2：全量门禁（本轮唯一一次）

## 目标
跑一次完整门禁，证明 V1.5 收口没有破坏构建与测试。

## 卡
`V15-CLOSE-01`（外部助手，`haiku`）

## 对应大纲
`03-执行单元分解.md` → L1-4 → L2-4.2

## 为什么只跑一次
用户指令："拒绝全量回归/门禁，按阶段体检"。本轮 4 卡中 3 卡不碰 `src/**`，唯一的 `tests/e2e/mobile-375.spec.ts` 改动不影响构建。全量跑一次足以证明收口安全。

## 必须串行（V1.3 教训 H2）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
npm run lint && npm run typecheck && npm test && npm run build
```

**禁止并行**：并行 `build` 与 `test` 会产 `Hook timed out in 10000ms`（V1.3 实测 2 文件假红）。

## 守卫三项

```bash
npm run check:assets && npm run check:root && npm run check:audit
node scripts/check-frozen.mjs
```

## 密钥扫描

```bash
git grep -nE '(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})' \
  -- ':!docs/**' ':!.github/workflows/**' && echo "有命中，FAIL" || echo "无命中，PASS"
```

## e2e（条件性）

```bash
# 仅当有卡改过 src/** 才跑；本轮预期不跑
git status --short src   # 若非空，说明有越界改动 → 立即 FAIL
```

**win32 限制**：`next.config.ts:7` 关闭 standalone，`npm run test:e2e` 本机不可跑。
- 若需要：记 `UNKNOWN(需 Linux CI)`，**不得假装通过**
- 已有 CI 会在 push 后自动跑

## BUILD_ID 新鲜度（e2e 证据必需）

```bash
stat -c '%y' .next/BUILD_ID
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -printf '%TY-%Tm-%Td %TH:%TM\n' | sort -r | head -1
```

判：BUILD_ID 时间 > src 最新 mtime → `fresh`；否则 `stale`（结论作废）。

## 完成判据

- [ ] 8 项串行全 exit 0（附当次输出到 evidence）
- [ ] 密钥扫描无命中
- [ ] `git status --short src` 为空
- [ ] BUILD_ID 关系已记录（fresh/stale）
- [ ] e2e 若未跑，写明原因与替代（CI）

## 记录格式

写进 `evidence/V15/CLOSE-01/execution.md`：

```markdown
## 门禁结果（2026-10-27）

| # | 门禁 | 命令 | 结果 |
|---|---|---|---|
| 1 | lint | npm run lint | exit 0 |
| 2 | typecheck | npm run typecheck | exit 0 |
| 3 | 单测 | npm test | x/x passed |
| 4 | build | npm run build | exit 0 |
| 5 | 资源守卫 | npm run check:assets | PASS |
| 6 | 根目录 | npm run check:root | PASS |
| 7 | 审计 | npm run check:audit | PASS |
| 8 | 冻结面 | node scripts/check-frozen.mjs | PASS |

BUILD_ID: <时间>
src 最新: <时间>
关系: fresh

e2e: UNKNOWN（win32 不可跑，依赖 push 后 CI）
```
