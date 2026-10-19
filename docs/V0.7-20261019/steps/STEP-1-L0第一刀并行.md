# STEP-1-L0第一刀并行

> 执行者：Hark / P2 / P3　前置：STEP-0-同步与裁决　分支：upgrade（单主线）

## 动作
1. Hark：V7-SEC-01
2. P2：V7-T-01
3. P3：V7-G-01 → D-03 → D-07 → D-15（按拓扑串行）
4. P2（T-01 后）：W2-03

## 本步完成判据
SEC-01、T-01、G-01 各有 execution + verify

## 验证命令
```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## 规则
- 每张卡开工前 `git pull --ff-only origin upgrade`；完工小提交 → 推送；推送被拒只 rebase，禁止 force。
- 推送凭据不得写入 remote URL/文件/日志；临时凭据文件 600 权限，用完删除。
- 同一卡 2 次验收失败即熔断。
