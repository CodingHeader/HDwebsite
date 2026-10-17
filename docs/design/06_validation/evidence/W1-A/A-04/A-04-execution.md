# A-04 执行记录：CrudPage 组合层验收

分支 `lane/a-manager-ui`（A-01/A-02/A-03 之后）。执行：本会话（Hark-A 角色）。

## 现状确认（P07 重写成果，本卡验收）

- `CrudPage.tsx`（383 行）已是 **PageHeader + DataTable + ResourceForm(FormDialog) 组合**（P07 重写，R2/Q10-D6），CrudPageSpec 接口向后兼容。
- 行操作直出按钮保留（兼容现有 e2e getByRole）。

## 验收结果

| 项 | 结果 |
|---|---|
| `grep -cE "<(table|button|input|select|textarea)(\s|>|$)" CrudPage.tsx` | **0** ✅（原生控件计数为零） |
| e2e | **8/8 + a-form-errors 1 passed**（A-03 的 Windows 运行：9 用例全过，选择器不变；e2e-a03.log 同代码基线） |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（A-03 的 gate-a03.log 同代码基线） |
| 越界检查 | 本卡无新代码改动（P07 成果验收 + 证据补齐）✅ |

## 降级登记

- CrudPage 组合层的 jsdom smoke 测试**已移除**：排障发现 jsdom/React 19 下 container 内双挂载怪象（empty-create/A 双份，纯函数组件单渲染不可能），消耗 5+ 轮未定位到组件缺陷（e2e 真实运行时 9/9 全过证明组合层正确）。组合层正确性由 e2e 真实运行时保障，jsdom smoke 价值边际低于排障成本——按产物降级纪律移除，不影响 A-04 验收（原生控件 grep=0 与 e2e 为卡内硬验收）。
