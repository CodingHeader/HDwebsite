# STEP-0-同步与裁决

> 执行者：Hark+用户　前置：无　分支：upgrade（单主线）

## 动作
1. git fetch && git checkout upgrade && git pull --ff-only（双端一致，HEAD ≥ 4cbd9c1）
2. 阅读 README → 00 → 01 → 10，回答 V7-Q1/Q6/Q7
3. 确认后把本规划包推送到 upgrade（docs(V0.7)）

## 本步完成判据
本规划包已在 upgrade；V7-Q1 有答案

## 验证命令
```bash
git log -1 --format=%H origin/upgrade
```

## 规则
- 每张卡开工前 `git pull --ff-only origin upgrade`；完工小提交 → 推送；推送被拒只 rebase，禁止 force。
- 推送凭据不得写入 remote URL/文件/日志；临时凭据文件 600 权限，用完删除。
- 同一卡 2 次验收失败即熔断。
