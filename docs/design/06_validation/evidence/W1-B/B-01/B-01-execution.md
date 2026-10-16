# B-01 执行记录：settings 读取单一语义

分支 `lane/b-api-platform`（自 w1-base-ccr-1 = f158501）。执行：本会话（P1 角色）。

## 改动（全部在 allow 内，3 文件）

- `src/lib/settings.ts`：新增 `getPublicSettings`（= 原公开集合实现，请求级缓存）；`getSettings` 改为 `getPublicSettings` 的 @deprecated 别名（P08 #5 同名不同义收敛；别名 W2-03 统一移除）；`getAllSettings` 语义不变（全量）。
- `src/app/api/wechat/callback/route.ts`：GET 与 POST 处理器的未用 `settings` 变量 + import 删除（P06-verify:93 遗留）。
- `src/lib/__tests__/lane-b/settings.test.ts`（新，4 用例）：公开读取不含 isPublic=false 键、全量读取包含（解密原值）、getSettings === getPublicSettings（同一引用）、公开集合不引入未注册键。

## 验收结果

| 项 | 结果 |
|---|---|
| lane-b/settings.test.ts | 4/4 PASS |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-b01.log；初跑 typecheck/build 失败系 POST 处理器漏删一处未用 getSettings，已修复复跑全过） |
| 前台 9 个文件零改动 | 前台 getSettings 引用实为 getWebSettings（不同模块），不在本卡范围，未动 ✅ |
| 越界检查 | 3 文件 ⊆ allow ✅ |

## 登记

- POST 处理器的未用变量初跑漏删（gate-b01.log 有失败记录），修复后复跑全过——无新增同类错误（root cause：同一文件两处相同模式，首次只按 grep 首条处理）。
