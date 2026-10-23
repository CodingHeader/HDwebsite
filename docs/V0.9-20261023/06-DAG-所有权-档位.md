# 06 DAG · 所有权 · 档位（V0.9）

## 1. DAG

```
V9-CI-01 ──→ V9-VIS-03 ──→ V9-REL-02
    │             │
    │             └──→ V9-V-01（收口依赖 VIS-03；旧卡 15 张部分可与 CI 并行）
    └──→ V8-REL-01（blocked → 由 CI-01 的 docker job 解除；verify 归 V9-V-01）
```

关键路径：V9-CI-01 → V9-VIS-03 → V9-REL-02（V9-V-01 并行段在关键路径之外）。

## 2. 所有权矩阵（允许修改路径，越界即 FAIL）

| 路径 | CI-01 | VIS-03 | V-01 | REL-02 |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | **✓** | 请求翻转 continue-on-error（T4 单独小提交，在 VIS-03 证据中声明） | ✗ | ✗ |
| `prisma/seed-visual.ts` | **✓**（外键自足） | **✓**（数据面增量，若分诊需要） | ✗ | ✗ |
| `tests/visual/reference/**` | ✗ | **✓**（更新基线，逐张理由） | ✗ | ✗ |
| `src/app/(web)/**`、`src/components/web/**`、`src/styles/**` | ✗ | **✓**（仅样式回归修复） | ✗ | ✗ |
| `docs/design/06_validation/evidence/V8/**/verify.md`、`evidence/V9/**` | 写自己目录 | 写自己目录 | **✓（仅 verify.md）** | ✗ |
| `docs/design/07_release/changelog.md`、`docs/design/02_requirements/parity-matrix.md` | ✗ | ✗ | ✗ | **✓** |
| `docs/V0.9-20261023/**`（state.json、EXEC-*.md） | 台账 | 台账 | 台账 | **✓ EXEC** |

**唯一共享物**：仍是 AGENTS.md §4 冻结面（契约/迁移/依赖/测试配置），本轮全员只读。

## 3. 档位

| 卡 | 档位 | 理由 |
|---|---|---|
| V9-CI-01 | 高（类 opus） | 改 CI 门禁与 seed 契约语义，错误会放大到每轮验证 |
| V9-VIS-03 | 高 | 涉及前台冻结面的判别（样式回归 vs 合理演进） |
| V9-V-01 | 高 | 独立验收，结论权威 |
| V9-REL-02 | 中 | 机械性收尾，但双端一致是硬验收 |

## 4. 成本与规模预估

| 卡 | 规模 | 说明 |
|---|---|---|
| V9-CI-01 | 中（~0.5 人天） | 两处 workflow + 一个函数；主要时间在等 CI |
| V9-VIS-03 | 大（~1 人天） | 取决于 fail 张数；分诊逐张要证据 |
| V9-V-01 | 中（~0.5 人天） | 子代理并行可压缩 |
| V9-REL-02 | 小（~2 小时） | 机械收尾 |
