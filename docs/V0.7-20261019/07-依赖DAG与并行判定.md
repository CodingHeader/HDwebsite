# 07 · 依赖 DAG 与并行判定

节点 38；**环检测：无环**（gen_tasks.py 拓扑排序成功，`evidence/gen-check.json`）；**所有权重叠：0**（`evidence/ownership-overlap.json`）。

## 1. 并行规则（机械判定）
可并行 ⟺ 无依赖关系 ∧ 允许修改路径前缀不相交 ∧ 不同执行者（同一执行者按拓扑序串行，规则 R-SERIAL）∧ 均不改 `src/contracts/**`、`prisma/**`（V0.7 全卡禁止）。gen_tasks.py 对所有无依赖关系、不同执行者的卡对做路径前缀相交检查，结果 0。

## 2. 层级（同层不同执行者可同时下发）

| 层 | 卡（执行者/档位） |
|---|---|
| L0 | D-03(P3/sonnect)、D-07(P3/sonnect)、D-15(P3/haiku)、V7-G-01(P3/haiku)、V7-SEC-01(Hark/opus)、V7-T-01(P2/sonnect)、W2-03(P2/opus) |
| L1 | D-04(P3/sonnect)、D-08(P3/sonnect)、D-09(P3/opus)、D-13(P3/sonnect)、V7-SEC-02(Hark/opus)、V7-V-A(P2/sonnect)、V7-V-C(P1/sonnect)、V7-V-E(P2/opus)、W2-09(P3/haiku) |
| L2 | B-02(P1/sonnect)、D-05(P3/haiku)、D-06(P3/opus)、D-10(P3/sonnect)、D-11(P3/sonnect)、D-12(P3/sonnect)、V7-SEC-03(P2/sonnect)、V7-UI-02(Hark/opus)、V7-V-BD(P2/sonnect) |
| L3 | B-03(P1/sonnect)、D-14(P3/sonnect) |
| L4 | B-04(P1/sonnect)、W2-02(P1/sonnect) |
| L5 | B-05(P1/opus)、B-06(P1/sonnect)、W2-08(P1/sonnect) |
| L6 | B-07(P1/opus) |
| L7 | V7-UI-01(Hark/opus) |
| L8 | W2-04(P3/sonnect)、W2-05(Hark/opus) |
| L9 | W2-06(Hark/opus) |
| L10 | W2-07(Hark/opus) |

## 3. 边列表（A -> B 表示 B 依赖 A）
```
V7-SEC-02 -> B-02
B-02 -> B-03
B-03 -> B-04
B-04 -> B-05
B-04 -> B-06
B-05 -> B-07
D-03 -> D-04
D-04 -> D-05
D-04 -> D-06
D-03 -> D-08
D-03 -> D-09
D-09 -> D-10
D-09 -> D-11
D-09 -> D-12
V7-T-01 -> D-13
D-08 -> D-14
D-10 -> D-14
V7-SEC-01 -> V7-SEC-02
V7-SEC-02 -> V7-SEC-03
B-07 -> V7-UI-01
V7-SEC-02 -> V7-UI-02
V7-T-01 -> V7-UI-02
V7-T-01 -> V7-V-A
V7-T-01 -> V7-V-BD
V7-V-A -> V7-V-BD
V7-T-01 -> V7-V-C
V7-T-01 -> V7-V-E
B-03 -> W2-02
D-06 -> W2-04
W2-03 -> W2-04
V7-UI-01 -> W2-04
V7-SEC-03 -> W2-05
B-07 -> W2-05
D-12 -> W2-05
V7-UI-02 -> W2-05
V7-UI-01 -> W2-05
W2-05 -> W2-06
V7-V-A -> W2-06
V7-V-C -> W2-06
V7-V-E -> W2-06
V7-V-BD -> W2-06
W2-06 -> W2-07
W2-08 -> W2-07
W2-09 -> W2-07
W2-04 -> W2-07
D-14 -> W2-07
V7-V-A -> W2-07
V7-V-C -> W2-07
V7-V-E -> W2-07
V7-V-BD -> W2-07
W2-02 -> W2-08
V7-T-01 -> W2-08
V7-SEC-03 -> W2-08
D-15 -> W2-08
D-12 -> W2-08
D-11 -> W2-08
D-10 -> W2-08
D-14 -> W2-08
D-07 -> W2-08
D-06 -> W2-08
W2-03 -> W2-09
```

## 4. 关键路径（依赖意义）
V7-SEC-01 → V7-SEC-02 → B-02 → B-03 → B-04 → B-05 → B-07 → V7-UI-01 → W2-05 → W2-06 → W2-07，权重和 11.0 人天（新卡 小0.5/中1，承接卡按 1）。

## 5. 资源意义的工期（更真实）
各执行者队列人天（haiku 卡按 0.5，其余按 1）：Hark 7.0；P1 9.0；P2 6.0；P3 14.0。
- P3 为资源瓶颈（14.0 人天），长于依赖关键路径。建议（V7-Q7）：P2 完成自身队列后接 D-12 与 D-15，届时由 Hark 把这两张卡挂到 P3 当前卡之后以保持所有权不相交。
- 日历工期估算：约 12~14 天（不调整）或约 10~11 天（P2 分担后）。无历史吞吐数据，属估算，按周校准。

## 6. 必须串行的链
- 所有权串行：V7-SEC-01 → V7-SEC-02 → B-02（同改 users/roles）。
- 发布链：B-04 → B-05 → B-07 → V7-UI-01 → W2-05 → W2-06 → W2-07。
- 存储链：D-03 → D-09 → D-10/D-11/D-12 → D-14。
- 测试目录全量所有权：W2-08 排在所有写测试的卡之后；W2-09 在 W2-03 之后（同改 package.json）。
