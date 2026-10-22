# V8-REL-01：Docker 镜像 Linux 构建与冒烟（验证 D-08 声明）

## 归属
- 所属切片：S6
- 来源需求/证据：D-08 提交 023ab68；部署与恢复手册
- 执行者：P3

## 目标
CI 中 docker build 成功，容器内 /api/health 200，数据卷重启后数据保留

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-SEC-01, V8-VIS-02
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- .github/workflows/**
- Dockerfile
- docker-compose.yml
- docs/design/06_validation/evidence/V8/REL-01/**

## Execution Steps
1. [ ] CI 加 job docker：build → compose up → curl /api/health → 写 1 条文章 → compose restart → 再读
2. [ ] 按手册执行一次 restore.mjs 还原演练

## 验收标准
- [ ] health 200
- [ ] 重启后数据仍在
- [ ] restore 演练日志存在

## 验证命令
```bash
docker compose up -d --build && curl -fsS http://localhost:3000/api/health && docker compose restart && curl -fsS http://localhost:3000/api/health
```

## 证据路径
docs/design/06_validation/evidence/V8/REL-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- .github/workflows/**
- Dockerfile
- docker-compose.yml
- docs/design/06_validation/evidence/V8/REL-01/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-SEC-01, V8-VIS-02
- Blocks：V8-V-01
- 阻塞条件：无 Docker 环境 → 只在 CI 跑（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
sonnect　理由：原子实现，规则已在本卡写明

## 升级条件
镜像构建需要改业务代码；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
小　约 0.5 人天　≥ 2 小时
