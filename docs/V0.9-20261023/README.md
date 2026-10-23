# HDwebsite 规划 V0.9（2026-10-23）

**基线**：`upgrade@c9bebe3`（2026-10-23 拉取；本地=远端，双端 `0 0`）。V0.8 的 18 张卡已执行 14 done / 1 blocked / 3 pending（见 `docs/V0.8-20261022/EXEC-round2.md`）。
**本版定位**：**V0.8 的「CI 真相轮」+ 收尾轮**。V0.8 第 2 轮结束时所有剩余卡都指向同一个外部条件——"看 CI 的真实结果"。本轮拉取后核实：**CI 自 visual job 加入以来 9 次运行全部 failure**，且失败根因不在 V0.8 各卡声称的工作本身，而在两处此前无人验证过的环境假设。本轮规划 = 修复 CI（新卡 V9-CI-01）→ 完成 V0.8 收尾三卡（VIS-03 / V-01 / REL-02 承接）。

## 一、为什么需要 V0.9（一句话）

V0.8 剩余 4 张卡的全部阻塞都写着"等 CI 结果"；2026-10-23 核实结果是 **CI 从来没绿过**——
`gate` job 死在 `Build`（静态导出时查 `Setting` 表：`no such table: main.Setting`，CI 的 `ci-build.db` 从未 migrate），
`visual` job 死在 `Prepare DB`（`seed-visual.ts` 的 `article.createMany()` 报 P2003 外键违反：`authorId: 1` 依赖 `prisma/seed.ts` 造的 admin 用户，CI 全新库没有跑过常规 seed）。
不修这两个根因，VIS-03 / V-01 / REL-02 永远无法开工。

| 读这个 | 内容 |
|---|---|
| `00-事实基线.md` | **本轮最重要**：CI 9 连败的 job/step/错误堆栈证据链 + 本地复核结论 |
| `01-需求复核与辩证分析.md` | 5W1H + 两轮钢人论证（针对两个根因与承接卡范围） |
| `02-契约增量.md` | 本轮 0 契约改动、0 迁移；冻结面确认 |
| `03-剩余可执行大纲.md` | 3 级大纲（切片 → 原子任务 → 步骤） |
| `04-连续执行协议.md` | 承接 V0.8 协议，路径与状态机按 V0.9 改写 |
| `05-任务索引.md` + `tasks/` | 4 张卡（1 新 + 3 承接），每张 16 字段齐全 |
| `06-DAG-所有权-档位.md` | DAG、所有权矩阵、并行组 |
| `07-基线指标.md` | 承接 V0.8 实测门禁值，本轮不重测（无性能卡） |
| `08-风险与待裁决.md` | V9-Q1（visual 基线更新授权）默认方案 + 风险清单 |
| `09-自检与局限.md` | 对照规划自检；本轮未用 gen_tasks.py 的偏差声明 |
| `tasks/` | 任务卡 |
| `state.json` | 机器可读进度台账（执行者唯一可写的共享状态） |
| `EXEC-round1.md` | **执行记录（边执行边写）** |

## 二、卡片总览

| 卡 | 状态(初) | 一句话 | 来源 |
|---|---|---|---|
| **V9-CI-01** | ready | 修 gate Build（构建前 migrate ci-build.db）+ 修 seed-visual 外键自足 + 新增 docker job（顺带解锁 V8-REL-01） | 本轮新发现（00 §2） |
| **V9-VIS-03** | pending | 承接 V8-VIS-03：CI visual 产物分诊 → 修/换基线 → `continue-on-error=false` | V8-VIS-03 |
| **V9-V-01** | pending | 承接 V8-V-01：全部 V8 卡 + V9 卡逐张 verify.md（独立验证者=子代理） | V8-V-01 |
| **V9-REL-02** | pending | 承接 V8-REL-02：changelog、parity 复核、双端 0 0、zip 交付包 | V8-REL-02 |

**第一刀**：V9-CI-01。它推上去之后 CI 才可能绿，其余三卡全部排在它后面（V-01 的旧卡部分可并行先行）。

## 三、与 V0.8 的关系

- V0.8 目录（`docs/V0.8-20261022/`）**只读不回改**；其 3 张 pending 卡由本版同名承接卡接管，状态以本版 `state.json` 为准。
- V8-REL-01 的 blocked（本机 Docker 无 npm 网络）由 V9-CI-01 的 docker job 在 CI 上解除；解除后其 verify 结论由 V9-V-01 一并出具。
- 前台风格冻结（REQ-F-014）、契约冻结面、`upgrade` 单主线、禁止新建分支——全部继续有效。
