# STEP-A1-Z：阶段体检

## 目标
A1 阶段的收尾体检。只跑本阶段改到的检查。

## 体检表

| # | 项 | 命令 | 期望 | 判据 |
|---|---|---|---|---|
| 1 | `display` 已加 | `grep -c '"display"' src/contracts/setting.ts` | 1 | 命中即存在 |
| 2 | `image` 已加 | `grep -c '"image"' src/contracts/setting.ts` | 1 | 同上 |
| 3 | 分组数 18 | `sed -n '/settingGroups/,/as const/p' src/contracts/setting.ts \| grep -cE '^\s+"'` | 18 | 17+1 |
| 4 | type 枚举 6 值 | `sed -n '43p' src/contracts/setting.ts \| grep -o '"' \| wc -l` | 12 | 6 值 × 2 引号 |
| 5 | 类型检查 | `npx tsc --noEmit` | exit 0 | 无类型错误 |
| 6 | 改动面 | `git diff --stat src/contracts/setting.ts` | 2 insertions | 只加 2 行 |
| 7 | 未越界 | `git status --short src` | 仅 setting.ts | 所有权内 |

## 未跑项及原因

| 项 | 为什么不跑 |
|---|---|
| `npm test` | 纯枚举扩展，不改变任何运行时逻辑；vitest 无覆盖该文件的用例 |
| `npm run build` | 类型检查已过；build 留到 E1 全量 |
| `test:visual` | 不碰前台渲染 |
| `test:e2e` | 不碰路由/接口 |

## 自我质疑

**质疑：只跑 tsc 够吗？**
→ 够。本阶段改的是 zod 枚举，唯一可能的错误就是类型错（枚举值不匹配）。`tsc` 是这类错误的完备检查手段。

**质疑：怎么确认没有"补了契约但没人用"？**
→ A2 会立刻用上：`showImageOverlays` 用 `display` 分组，4 个图片键用 `image` 类型。若 A2 无法注册，说明 A1 没生效。**A2 是 A1 的天然验证。**

## 产出

写入 `docs/design/06_validation/evidence/V18/A1/execution.md`：

```markdown
# A1 契约补齐 · 执行证据

## 5W1H
- What: settingGroups 加 display、type 加 image
- Why: A2 的 11 个键需要这两项，否则无法注册
- Where: src/contracts/setting.ts
- Who: <执行者>
- How: 2 行枚举追加
- What if: 若 tsc 报错说明有未发现的 type 值

## 改动
src/contracts/setting.ts: +2 行

## 体检结果
<粘贴上表 7 项>

## UNKNOWN
无
```
