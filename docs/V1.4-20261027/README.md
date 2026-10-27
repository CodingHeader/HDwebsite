# HDwebsite 规划 V1.4（2026-10-27）

**基线**：`upgrade@3e6a6b5`（本机实测，`origin/upgrade...HEAD = 0 0`，工作区干净）。
**上一轮**：`docs/V1.3-20261026/`（12 卡，其中 6 卡 done、6 卡 ready 转本轮承接）。
**本版定位**：**质量守卫闭环轮** —— V1.1 交付功能、V1.2 收敛 E2E、V1.3 审计出 12 条缺口并关掉 6 条。V1.4 只做剩下的 6 条，并把"守卫本身"补上（a11y 进 CI、冻结面自动拦、visual 稳定性证明）。

> 不新增业务功能。不动前台视觉。0 契约 / 0 迁移 / 0 新依赖。

## 一、本轮实测事实

| # | 门禁 | 结果 | 证据 |
|---|---|---|---|
| F1 | lint | **PASS** | `npm run lint` exit 0 |
| F2 | typecheck | **PASS** | `npm run typecheck` exit 0 |
| F3 | 单测 | **PASS 91 文件 / 1859 用例** | `npm test` |
| F4 | check:root | **PASS**（48 条白名单） | `npm run check:root` |
| F5 | e2e | 79/79（上轮末次实测） | `npm run test:e2e` |
| F6 | a11y | 12/12 绿，但**未接入 CI** | 孤儿测试 |
| F7 | visual（CI） | **PASS**（run `40436760024`，45/45） | GitHub Actions |
| F8 | 双端 | **0 0** | `git rev-list --left-right --count` |
| F9 | 前台风格 | `className` 变更 **0 行** | `git diff 0728c46..HEAD -- "src/app/(web)" "src/components/web"` |

## 二、为什么本轮不是"功能轮"

`parity-matrix.md` 对等主表 57 行 = present 50 + replaced 7，**missing 0 / partial 0**，本轮复核未发现无代码的功能项。

**真正的缺口在"实现正确性"与"需求可证明性"**：
- `REQ-F-015 §5` 声称"管理端无原生控件"，实测 `grep` **仍有 5 处命中**
- `REQ-F-015 §5` 声称"axe 为门禁"，实测 **CI 无该步骤**
- 16 个需求文档 **102 条验收未勾选**，其中含已实现项
- visual 门禁 **4 次普通 run 失败 1 次**，单次绿不足以证明可信

## 三、8 个切片 / 9 张卡

| 切片 | 卡 | 目标 | 执行者 | 档位 |
|---|---|---|---|---|
| S0 | V14-BASE-01 | 基线固化（含 BUILD_ID 口径） | P2 | haiku |
| S1 | V14-A11Y-01 | a11y 接入 CI + 前台 5 页 | **main-agent** | opus |
| S2 | V14-UI-HUB-01 | content-hub 5 处原生控件清零（**UI 设计与实现**） | **main-agent** | opus |
| S3 | V14-UI-CONSIST-01 | 12 页 × 8 项一致性矩阵 | P1 | sonnect |
| S4 | V14-VIS-STAB-01 | visual 连续 2 次普通 run 全绿 | **main-agent** | opus |
| S5 | V14-REQ-LEDGER-01 | 102 条验收逐条判定 | P2 | sonnect |
| S6 | V14-PERF-01 | REQ-NF-001 四条判定 | P1 | sonnect |
| S7 | V14-FROZEN-GUARD-01 | 冻结面自动守卫 | P1 | sonnect |
| S8 | V14-REL-01 | 台账收口 + 双端 0 0 | P1 | haiku |

**分工依据**（用户要求：核心/高难自做，中等/简单发布后交其他 Agent）：

- **我做**：`V14-UI-HUB-01`（唯一需设计判断，用户点名 UI）、`V14-A11Y-01`（CI 策略 + 前台冻结冲突裁决）、`V14-VIS-STAB-01`（flake 根因判断，V1.3 曾误判）
- **交其他 Agent**：基线跑数、一致性抽检、冻结守卫脚本、性能取数、需求反勾、收口

## 四、关键路径

```
V14-BASE-01 → V14-UI-HUB-01 → V14-UI-CONSIST-01 → V14-REQ-LEDGER-01 → V14-REL-01
```

UI-HUB-01 是不确定性最高的一刀（设计判断），且阻塞 CONSIST；CONSIST 结论被 LEDGER 引用。

## 五、读这个

| 文件 | 内容 |
|---|---|
| `00-规划快照与事实基线.md` | 快照 + 9 条实测 + **文档/代码不一致 7 条** |
| `01-需求基线复核.md` | MUST/SHOULD/COULD/MUST NOT + 冲突 5 条 + 未知登记（2 BLOCKING） |
| `02-契约冻结包.md` | **六份契约全量**（API/Errors/Identity/Resources/Events/UX States） |
| `03-数据模型基线.md` | 48 模型 + 116 索引 + 7 迁移 + 0 新迁移理由 |
| `04-垂直切片清单.md` | 8 刀 + 排序理由 + 可并行组（附机械依据） |
| `05-DAG-所有权-档位.md` | DAG + 所有权矩阵 + 档位 + 成本预算 + 熔断 |
| `06-验收体系.md` | 13 道门禁 + 三条口径纪律 + 顶级体验量化 8 条 |
| `07-风险与待裁决.md` | 2 BLOCKING + 4 未决 + 10 风险 + **历史 6 个坑** |
| `08-自检与局限.md` | 12 项自检 + 局限声明 |
| `09-落盘清单与执行协议.md` | 文件清单 + 取卡循环 + 铁律 |
| `tasks/` | 9 张卡（每张 16 项必填字段） |
| `steps/` | **STEP-S0 ~ S8，每步一个 md** |
| `state.json` | 状态机（9 卡，0 环） |

## 六、第一刀

`V14-BASE-01`（只读，快）→ 然后并行 `V14-UI-HUB-01`、`V14-A11Y-01`、`V14-PERF-01`、`V14-VIS-STAB-01`。
