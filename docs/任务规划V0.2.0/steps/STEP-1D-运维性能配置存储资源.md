# STEP-1D-运维性能配置存储资源

- 执行线：执行线 D 运维·性能·配置·存储·资源　分支：`lane/d-ops`　所有者：Agent-Ops
- 下发提示词：`prompts/提示词-D-运维性能配置存储资源.md`
- 并行关系：可与其他四条执行线同时进行（07-所有权矩阵.md：零重叠）
- 计划：12 张卡 / 9.25 人天；线内关键链 D-01 → D-02 → D-03 → D-09 → D-10（3.5 人天）

## 进入条件
tag w1-base

## 退出条件（全部满足才算本步骤完成）
D 线全部卡 PASS；before.json 已入证据；git ls-files uploads = 0

## 任务
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | [D-01](../tasks/D-01.md) | scripts/measure-baseline.mjs + 在 w1-base 上测 before.json | W0-08 | sonnect | 0.5 |
| 2 | [D-02](../tasks/D-02.md) | start-next：不再因数据库写入重建；按优先级加载 env 文件 | D-01 | sonnect | 0.5 |
| 3 | [D-03](../tasks/D-03.md) | src/lib/env.ts 集中校验 + instrumentation 启动校验 + .env.example 对齐 | D-02 | sonnect | 0.5 |
| 4 | [D-04](../tasks/D-04.md) | 设置键对等 16 键 + 默认值单一来源 + 修正 3 个不存在的默认资源路径 | W0-08 | sonnect | 1.0 |
| 5 | [D-05](../tasks/D-05.md) | 前台电话/域名兜底统一读 BRAND_DEFAULTS（仅替换字面量） | D-04 | sonnect | 0.25 |
| 6 | [D-06](../tasks/D-06.md) | 前台缓存：去掉 (web) 的 force-dynamic，首页数据与区块配置 unstable_cache + 标签失效 | D-01 | sonnect | 2.0 |
| 7 | [D-07](../tasks/D-07.md) | next.config 清理（cssChunking、过期注释）+ redirects 回归测试 + jobs 注释 | D-02 | haiku | 0.25 |
| 8 | [D-08](../tasks/D-08.md) | Docker 部署件 + CLAUDE.md | D-03 | sonnect | 0.5 |
| 9 | [D-09](../tasks/D-09.md) | storage.ts 正式实现 DATA_DIR；upload/file/collect-engine/backup 改用；standalone 不再携带 uploads | D-03 | sonnect | 1.0 |
| 10 | [D-10](../tasks/D-10.md) | 备份含 uploads 与 kb；运行时文件迁出 git（导出→.gitignore→git rm --cached） | D-09 | sonnect | 1.0 |
| 11 | [D-11](../tasks/D-11.md) | 删除媒体清理文件（单删/批删含缩略图）+ 孤儿扫描脚本 | D-09 | sonnect | 0.75 |
| 12 | [D-12](../tasks/D-12.md) | CollectParser 注册表（html/rss）+ 采集图片流式限长、白名单单一来源 + http-client/json-field | D-09 | sonnect | 1.0 |

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 D 的条目。
