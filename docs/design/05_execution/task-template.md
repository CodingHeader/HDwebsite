---
id: TASK-TEMPLATE
type: execution
title: 任务模板
status: active
created: 2026-10-10
updated: 2026-10-10
---

# 任务模板（复制本文件后改写，勿直接编辑本模板）

文件名：`05_execution/tasks/TASK-<里程碑>-<序号>.md`（如 TASK-M1-001）

```markdown
---
id: TASK-M?-???
type: task
title: <一句话任务名>
status: todo        # todo / in-progress / review / done / cancelled
plan-ref: current-plan.md 对应条目
milestone: M?       # 所属里程碑
requires: [REQ-?, SOL-?]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# TASK-M?-???：<任务名>

## 1. 目标
<这个任务完成后，什么变为可能？>

## 2. 范围
- 做：<具体改动点（文件/模型/页面）>
- 不做：<明确排除项>

## 3. 实施要点
1. <步骤>
2. <步骤>

## 4. 完成定义（DoD，§40）
- [ ] Implementation：代码完成，`npm run check` 通过（lint+typecheck+build）
- [ ] Acceptance：满足关联 REQ 验收条件中的对应项
- [ ] Verification：按 validation-plan 对应小节执行通过
- [ ] Evidence：证据留存路径（06_validation/evidence/EVD-M?-???/）

## 5. 关联
- 上游：<依赖的任务/方案>
- 下游：<被本任务解锁的任务>
```

## 状态规则

- todo → in-progress：开始实施时
- in-progress → review：DoD 前三项自检通过
- review → done：验证证据留存后
- 变更/放弃：更新本文档说明原因，不删文件
