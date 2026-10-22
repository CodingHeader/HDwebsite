# V0.8 执行记录（2026-10-22）

> 分支 `upgrade` 单主线（未新建分支）。开工前已 `git fetch` 并 `git pull --ff-only`，
> 起点 `b911666`（SEC-01，用户已亲自推送），终态 `6d4c53a`，**双端 `0 0`**。
> 规划入口：`docs/V0.8-20261022/README.md`；状态机：同目录 `state.json`。

## 1. 本轮完成：用户点名的 6 张「可并行开工」卡 + SEC-01 已由用户完成

| 卡 | 提交 | 结果 |
| --- | --- | --- |
| V8-SEC-01 | `b911666`（用户） | next 16.4.2；运行时 critical 1→0；移除 Turbopack 不支持的 `cssChunking:false` |
| **V8-T-04** | `4810e55` | 5 条非 withApi 路由**全部迁入**，ADR-037 豁免清单为空 |
| **V8-T-01** | `13b8b07` | 3 条过期 skip 撤除，**并修复其掩盖的生产缺陷** |
| **V8-T-02** | `6e87c61` | SSE 契约测试；契约 skip **清零** |
| **V8-SEC-02** | `391afc3` | sharp 0.34.5→0.35.5；运行时 critical+high **双清零** |
| **V8-SEC-03** | `49a2052` | vitest 3.2.7→5.0.5；critical 2→0 |
| **V8-SEC-04** | `698bb33` | CI 审计门禁（官方源 + 假阴性拦截 + 降级建议拒绝） |
| **V8-T-03** | `6d4c53a` | lint warning **58→0**，锁 `--max-warnings 0`；顺带补 3 个空壳测试 |

## 2. 三个"比任务本身更重要"的发现

### 2.1 T-01 撤 skip 后暴露：知识库上传功能 100% 不可用

- 前端 `kb-upload.tsx:61` 请求 `/api/knowledge-bases/{id}/files` —— **该端点不存在**
  （`[id]` 下只有 export/rebuild/stats），真实端点是 `/api/knowledge-files?baseId=N`。
- **更严重**：单测 `kb-upload.test.tsx:73` 断言的正是那个不存在的端点。
  不是漏测，是**把 bug 固化成了「期望」** → 所以 `npm test` 一直绿，缺陷一直活着。
- 处置：端点改正 + 单测断言同步改正 + e2e 真实上传验证。

> 这是本轮最有价值的产出：**"skip" 与"空壳测试"合起来能长期掩盖一个完全不可用的功能。**

### 2.2 T-02 撤 skip 后暴露：契约套件的适配器 mock 缺 `stream()`

`POST /chat/stream` 撤掉 skip 后立刻 502：
`getAdapter(...).stream is not a function`。因为该路径从未被执行过，mock 缺口一直没暴露。

### 2.3 T-03 发现：`e-kb-manage.spec.ts` 有 3 个**空壳测试**

```ts
test("删除 → 回收站 → 恢复闭环（待 C-12：W2-05 复跑）", async ({ page }) => {
  // 前置：库 + 文件条目（C-06/C-12 合并后可用）
});   // ← 只有注释，没有一条断言
```

与 T-01 撤掉的 skip 同类。已改写成真实断言（上传→删除→回收站→恢复闭环；彻底删除必须弹确认框；来源链接跳转）。

## 3. 每张卡的门禁（命令原始结果摘要）

| 卡 | lint | tsc | test | build | 其他 |
| --- | --- | --- | --- | --- | --- |
| T-04 | 0 | 0 | 1705 | 0 | routes-public 14 passed |
| T-01 | 0 | 0 | 1705 | 0 | e2e 10 passed ×2 |
| T-02 | 0 | 0 | 1712 | 0 | contract 876 passed（默认+shuffle） |
| SEC-02 | 0 | 0 | 1712 | 0 | sharp 实跑缩略图三档 |
| SEC-03 | 0 | 0 | 1712 | 0 | lane-c 6 passed |
| SEC-04 | 0 | 0 | 1712 | 0 | 负向验证 exit 1 |
| T-03 | **0 warning** | 0 | 1712 | 0 | check-root/assets/audit 全 PASS |

终态：`eslint --max-warnings 0` exit 0；`npm test` 1712 passed / 72 files；contract 876 passed。

## 4. 裁决执行情况（按用户 Q1~Q4）

| 裁决 | 用户口径 | 本轮执行 |
| --- | --- | --- |
| Q1 依赖升级 | **授权，但只升不降** | 已升 sharp/vitest；**拒绝** audit 对 5 个 eslint 系包建议的 `14.2.35`（当前 16.4.2，属降级） |
| Q2 凭证 | 默认继续 UNKNOWN | 微信/SMTP/Coze 仍未联调，标 UNKNOWN |
| Q3 减包目标 | 改为「不回涨」 | 未动（属 V8-PERF-01，本轮未做） |
| Q4 visual 种子 | 默认不用 main 真实数据 | 未动（属 V8-VIS-01） |

## 5. 未完成（9 张，均未到可做条件或需外部环境）

| 卡 | 阻塞原因 |
| --- | --- |
| V8-G-01 | state 仍为 ready；其「入口对齐」内容已被本轮各卡间接落实，但**未单独执行验证** |
| V8-PERF-01 | 依赖 SEC-01（已满足），本轮未排入 |
| V8-VIS-01 | 需构造与 main 等量种子数据（用户 Q4 说默认不用真实数据，需自建） |
| V8-VIS-02 / VIS-03 | 需 **Linux CI** 跑 visual；本机 Windows 不可判 |
| V8-UI-01 | 依赖 PERF-01 + T-01（后者已 done） |
| V8-INT-01 | 需微信/SMTP/Coze **凭证**（Q2 默认继续 UNKNOWN） |
| V8-REL-01 | 需 **Docker/Linux** 环境 |
| V8-V-01 / REL-02 | 终审与打包，依赖上述全部 |

## 6. 风险与遗留

1. **SEC-01 移除 `cssChunking:false` 后 CSS 顺序未验证**（用户已指出）：需 Linux visual 确认，归 V8-VIS-02/03。
2. **5 个 high 仍存在**（eslint 系包），全部是降级建议按 Q1 拒绝；这是主动决策，终审需按此口径判定。
3. **`nul` 文件**：Windows 保留设备名，`del` 无效，最终用 `node fs.unlinkSync` 删除（已记入 T-03 证据）。
4. **临时 askpass 文件**：已覆写为无害内容（原本也不含 token，token 仅经环境变量传递）。
