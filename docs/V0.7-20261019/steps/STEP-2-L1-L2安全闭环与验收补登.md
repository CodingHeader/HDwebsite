# STEP-2-L1-L2安全闭环与验收补登

> 执行者：Hark / P1 / P2 / P3　前置：STEP-1-L0第一刀并行　分支：upgrade（单主线）

## 动作
1. Hark：V7-SEC-02 → V7-UI-02
2. P2：V7-SEC-03 → V7-V-A → V7-V-E → V7-V-BD
3. P1：V7-V-C → B-02（必须在 SEC-02 合入后）
4. P3：D-04 → D-05 → D-08 → D-09 → D-06 → D-13

## 本步完成判据
E1~E5 黑盒全拒；W1 各卡有 verify.md；Linux e2e/visual 有首轮结果

## 验证命令
```bash
npx vitest run src/lib/__tests__/security && npm run test:e2e
```

## 规则
- 每张卡开工前 `git pull --ff-only origin upgrade`；完工小提交 → 推送；推送被拒只 rebase，禁止 force。
- 推送凭据不得写入 remote URL/文件/日志；临时凭据文件 600 权限，用完删除。
- 同一卡 2 次验收失败即熔断。
