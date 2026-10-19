# STEP-3-发布闭环与存储

> 执行者：P1 / P3 / Hark　前置：STEP-2-L1-L2安全闭环与验收补登　分支：upgrade（单主线）

## 动作
1. P1：B-03 → B-04 → W2-02 → B-05 → B-06 → B-07 → W2-08
2. P3：D-10 → D-11 → D-12 → D-14 → W2-09
3. Hark：V7-UI-01（B-07 合入后）

## 本步完成判据
一篇内容双渠道发布并回写外链/失败原因；恢复演练记录

## 验证命令
```bash
npm run test:e2e -- e-content-hub
```

## 规则
- 每张卡开工前 `git pull --ff-only origin upgrade`；完工小提交 → 推送；推送被拒只 rebase，禁止 force。
- 推送凭据不得写入 remote URL/文件/日志；临时凭据文件 600 权限，用完删除。
- 同一卡 2 次验收失败即熔断。
