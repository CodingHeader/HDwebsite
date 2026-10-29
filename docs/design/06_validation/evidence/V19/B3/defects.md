# B3 375px 验收 defects.md

> 实测于 2026-10-29 · 分支 `upgrade` · HEAD `87dd2c7`（B2）· 视口 375×812
> B3 判据 M1~M4 共 **172 格**：PASS 116 · FAIL 40 · N-A 16

## 结论

**B3 发现 1 个系统性缺陷：管理端核心控件命中区 <44px（I-B3-01），导致 40 页 M3 FAIL。** 其余判据（M1 无溢出、M2 核心操作可达、M4 卡片模式）全 PASS。

| 判据 | PASS | FAIL | N-A |
|---|---|---|---|
| M1 无横向溢出 | 41 | 0 | 2 |
| M2 核心操作可达 | 36 | 0 | 7 |
| M3 命中区 ≥44px | 1 | 40 | 2 |
| M4 卡片模式 | 38 | 0 | 5 |
| **合计** | **116** | **40** | **16** |

## 系统性缺陷 I-B3-01：管理端核心控件命中区 <44px

### 现象

- **40 页** M3 FAIL：`新建/保存/提交/登录/上传/编辑/审阅/恢复默认` 等核心按钮与搜索输入框的 `getBoundingClientRect()` 高度为 **32–40px**，均 <44×44。
- 典型尺寸（375×812 视口实测）：
  - `新建` 按钮：76×36（高 36px <44）
  - 搜索输入框：343×36（高 36px <44）
  - `content-hub 新建内容`：68×32、`notify-rules 编辑`：70×32、`collect-items 审阅`：52×32
  - `login` 输入框：293×40（高 40px <44）、`登录`按钮：293×40
- 仅 `/manager`（仪表盘）M3 PASS：`写文章` 快捷入口卡 343×73 ≥44×44。

### 根因（只读分析，不改代码）

- 管理端按钮/输入控件统一采用紧凑密度：`Button` 默认 `h-9`（36px）、搜索框/输入框 `h-9`（36px），`sm`/紧凑变体 32px，登录页 40px。
- 桌面端（1440）紧凑密度合理；但 375 移动端未切换到 ≥44px 触达区（无 `sm:`/移动媒体查询放大），违反 WCAG 2.5.8（目标尺寸 ≥44×44 建议值）。

### 影响

- 移动端触摸目标偏小，误触风险升高；属移动可用性（UX）缺陷，非功能故障（M2 已验证核心操作可达且生效）。

### 处置建议

- 本轮 **不改代码**（B3 是验收卡，仅登记缺陷）。
- 建议新增 FIX 卡：为管理端移动视口（≤640px）提供 ≥44×44 触达区（`Button`/`Input`/`SearchField` 在 `sm:` 下放大高度，或统一触达区 padding）。
- 登记至 V2.0 backlog（与 I-B1-01/02 同类 UX 优化），或按规划者裁决进入本轮 FIX 轮次。

## M1 无溢出（41 PASS）

- 43 页全部 `documentElement.scrollWidth` = **375**（恰好等于阈值，无横向溢出）。含 `ai-config`/`news`（redirect 后目标页同样 375）。
- M1 N-A：`ai-config`/`news`（纯 redirect 无自身 UI，同 B2 口径）。

## M2 核心操作可达（36 PASS / 7 N-A）

- **36 PASS**：29 页 `新建`/`新建文章`/`新建内容`/`新建知识库`/`新建供应商`/`新建任务`/`新建账号` Enter/click 触发弹窗；`home-blocks 恢复默认`、`collect-items 审阅`（375 click 弹窗 0→1）、`notify-rules 编辑`（375 click 弹窗 0→1）、`media 上传文件`（文件选择器）、`settings 保存`（修改后触发）、`dashboard 写文章`（导航）、`login 登录`（填凭据导航）。搜索框在列表页均可见可达。
- **7 N-A**：`collect-tasks`/`logs`/`notify-records`/`user-actions`/`chat-history`（纯只读页，无新建/行操作）+ `ai-config`/`news`（纯 redirect）。

## M4 卡片模式（38 PASS / 5 N-A）

- **38 PASS**：37 个表格页在 375 下 `hScroll=0`（无表格横向滚动，多数渲染移动端卡片 `ul[aria-label]`）+ `media` 网格渲染卡片、无横滚。
- **5 N-A**：`dashboard`/`login`/`settings`（表单/仪表盘页无数据列表）+ `ai-config`/`news`（纯 redirect）。

## 观察：375 下 Enter 触发细节

- `collect-items 审阅`、`notify-rules 编辑` 在 375 下 `keyboard.press("Enter")` 未触发弹窗，但 `click()` 触发成功（0→1）。此为卡片模式下焦点/触发细节（B2 K2 在 1440 下 Enter 已验证触发成功），**不构成 M2 FAIL**（M2 判据为可达且生效，click 已验证生效）。已记录供参考。

## 后续

- I-B3-01（触达区 <44px）入 backlog，建议 FIX 卡。
- 无其它缺陷。
