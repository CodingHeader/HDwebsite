# STEP-B1-2：B 类 15 页逐页核 + 体检

## 15 页清单

### B1 内容域 5 页
`articles`、`media`、`knowledge-bases`、`content-hub`、`collect-items`

每页 5 态 + **1 个页面特有态**：
- `content-hub`：审核中/已发布 渠道状态
- `knowledge-bases`：上传失败态
- `articles`：草稿/已发布切换
- `media`：批量选择态
- `collect-items`：待审核队列

### B2 配置域 4 页
`settings`、`llm-providers`、`notify-rules`、`wechat-accounts`

- `llm-providers` 额外验"无可用供应商时的兜底"
- `wechat-accounts` 额外验"token 失效提示"

### B3 特殊 3 页（预置 N-A）

| 页 | 特殊性 | 预置判据 |
|---|---|---|
| `manager`（仪表盘） | 只展示统计 | 成功态 N-A |
| `news` | 纯 `redirect("/manager/articles")` | **5 态全 N-A**，依据：文件仅 import + redirect |
| `login` | 登录页范式 | 空态/加载态 N-A |

### B4 图表/预览 2 页
`home-blocks`（区块排序）、`publish-jobs`（状态机）

额外验"空数据表现"。

## 每页执行顺序

1. **先读源码**（`head -40 <file>`），搞清它有哪些状态分支
2. 按分支设计触达方式（不能照搬 A 类的"筛选到 0 条"）
3. 逐态实测，记"做了什么 + 看到什么"
4. 落 matrix

## 体检

| # | 项 | 命令 | 期望 |
|---|---|---|---|
| 1 | 总行数 | `grep -c "^| src/app/manager" matrix.md` | 42 |
| 2 | 无待核 | `grep -c "待核" matrix.md` | 0 |
| 3 | 计数自洽 | PASS+FAIL+N-A | 210 |
| 4 | news 全 N-A | `grep "manager/news" matrix.md \| grep -c N-A` | 5 |
| 5 | 未改 src | `git status --short src` | 空 |

## 常见坑

| 坑 | 防守 |
|---|---|
| 把 A 类判据硬套 B 类 | 必须先读源码 |
| `news` 判 5 态 → 全 FAIL | 它只是 redirect，全 N-A |
| `login` 判"无列表" → FAIL | 登录页本非列表范式 |
