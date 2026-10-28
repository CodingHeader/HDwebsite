# STEP-S2-2：B 类 15 页五态逐页核

## 目标
15 个自定义页面，逐页独立判五态（不能复用 A 类判据），产出 75 格结论。

## 卡
`V15-UX-STATES-01`（main-agent，`opus`）

## 对应大纲
`03-执行单元分解.md` → L1-1 → L2-1.2 → L3-1.2.1 ~ 1.2.4

## 为什么必须逐页
这 15 页不用 `CrudPage`，五态各自实现，行为不同。

## 15 页清单与子批

### B1 内容域 5 页
`articles`、`media`、`knowledge-bases`、`content-hub`、`collect-items`

每页 5 态 + **1 个页面特有态**：
- `content-hub`：审核中/已发布 的渠道状态
- `knowledge-bases`：上传失败态
- `articles`：草稿/已发布切换
- `media`：批量选择态
- `collect-items`：待审核队列

### B2 配置域 4 页
`settings`、`llm-providers`、`notify-rules`、`wechat-accounts`

- `llm-providers` 额外验"无可用供应商时的兜底提示"
- `wechat-accounts` 额外验"token 失效提示"

### B3 特殊 3 页（预置 N-A，避免纠结）

| 页 | 特殊性 | 预置判据 |
|---|---|---|
| `manager`（仪表盘） | 只展示统计，无 CRUD | 成功态 N-A；错误态验统计接口失败降级 |
| `news` | 纯 `redirect("/manager/articles")` | **5 态全 N-A**，依据：文件仅 import + redirect |
| `login` | 登录页范式 | 空态/列表态 N-A；错误态=密码错误提示；成功态=跳转 |

### B4 图表/预览 2 页
`home-blocks`（区块排序）、`publish-jobs`（状态机）

- 额外验"空数据表现"

## 每页执行顺序

1. 先读该页源码（`head -40 <file>`），搞清它有哪些状态分支
2. 按分支设计触达方式（不能照搬 A 类的"筛选到 0 条"）
3. 逐态实测，记"做了什么 + 看到什么"
4. 落 matrix

## 完成判据

- [ ] 15 页 × 5 态 = 75 格全部有结论
- [ ] 每格判据具体（含该页特有的触达方式，不是模板话）
- [ ] `news` 5 态全 N-A 有依据
- [ ] `login` 空态/列表态 N-A 有依据
- [ ] 无"待核"
- [ ] `git status --short src` 为空

## 常见坑

| 坑 | 防守 |
|---|---|
| 把 A 类判据硬套到 B 类 | 必须先读源码搞清分支 |
| `news` 当普通页判 5 态 → 全 FAIL | 它只是 redirect，全 N-A |
| `login` 判"无列表" → FAIL | 登录页本就不是列表范式，N-A |
| 仪表盘判"无新建" → FAIL | 只读展示页，N-A |
