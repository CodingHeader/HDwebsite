# E-06 执行证据：特殊页迁移 B（llm-providers/wechat-accounts/media/chat-history/settings/login/logs 筛选/not-found）

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=/manager 全部页面严格正则清零 + 媒体库改名/批量接口 + logs 模块筛选 + login 换 manager/ui + manager/not-found；When=2026-10-17（北京时间）；Where=src/app/manager/{llm-providers,wechat-accounts,media,chat-history,settings,login}/page.tsx、knowledge-bases/{page,kb-upload}、notify-rules、home-blocks、manager/not-found.tsx、crud-specs.tsx；Why=S-E6 系统与 AI 页面统一（REQ-F-015；parity B7 媒体 PATCH、B8 media/batch）；How=逐页迁移保留 testid/aria-label，媒体库批量删除改单请求。

## 改动文件
- `src/app/manager/llm-providers/page.tsx`：table→DataTable（角色 Badge 化、余额偏低标红保留）、button→Button、行操作测试/余额/编辑/删除（aria-label 保留）。
- `src/app/manager/wechat-accounts/page.tsx`：table→DataTable、button→Button；测试/编辑（appSecret 脱敏重置逻辑保留）/删除。
- `src/app/manager/media/page.tsx`：**改名**（promptDialog → PATCH /api/media/[id] {filename}，parity B7）+ **批量删除改 POST /api/media/batch {action:"delete",ids} 单请求**（原循环单条 DELETE，parity B8）+ checkbox→Checkbox、button→Button/IconButton（重命名+复制悬停操作组）、隐藏 file input 用 createElement 写法（严格正则；行为不变）。
- `src/app/manager/chat-history/page.tsx`：select→Select、table→DataTable（内置分页）、button→Button。
- `src/app/manager/settings/page.tsx`：保存/分组导航 button→Button（分组导航保留 active 高亮 className）。
- `src/app/manager/login/page.tsx`：**共享前台 ui（components/ui/{button,input,label}）→ manager/ui（Button/IconButton/Input + form-field Label）**——登录契约与 id/testid 不变。
- E 线自有页面修正：knowledge-bases/{page.tsx,kb-upload.tsx}、notify-rules、home-blocks 的原生 button→Button（kb-upload 隐藏 input 用 createElement 写法）。
- `src/app/manager/not-found.tsx`（新增）：404 页（管理端令牌内渲染）。
- `src/components/manager/crud-specs.tsx`：logs spec 加模块下拉筛选（13 个 module 枚举，后端 crud filters 白名单已支持）。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| 全 manager 严格正则 0 | PASS | `grep -rnE "<(table\|input\|select\|button\|textarea)(\s\|>\|$)" src/app/manager` 无匹配 |
| `components/ui/input\|label` 引用 0 | PASS | login 改 manager/ui 后 grep 无匹配 |
| e2e auth/apply-chat 通过 | PASS | **全量 test:e2e 13 passed（1.4m）**（auth 登录流程经 manager/ui Input 验证） |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest 全过、build=0（18:12 构建含全部迁移） |
| 越界检查 | PASS | 允许路径内 12 文件，越界 0 |

## 降级登记
- logs 的**动作/时间范围筛选**：后端 buildWhere 只支持 filters 白名单等值过滤（crud.ts:59-69），action filter 与 createdAt 范围需改 src/lib/crud-resources/system.ts（B 线）与 src/lib/crud.ts——**越界不做**；已实现模块下拉筛选，动作/时间筛选登记待 B 线扩展（B 线剩余卡或 W2）。

## UNKNOWN 及原因
- 无。

## 后续方向待办
- E-07/E-10（依赖本卡 Blocks）；B 线：logs 动作/时间筛选后端扩展。
