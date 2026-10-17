# A-06 执行记录：移除 @radix-ui 代码引用

分支 `lane/a-manager-ui`（M1 之后）。执行：本会话（Hark-A 角色）。

## 改动（全部在 allow 内，2 文件，仅注释）

- `src/components/manager/ui/dialog-primitive.tsx:4`：注释改写，去掉 "@radix-ui" 字样（base-ui 薄封装口径不变）
- `src/components/ui/label.tsx:4`：注释改写，去掉 "@radix-ui" 字样（**className 零改动**——前台 6 文件冻结面保持 main 原样）

## 验收结果

| 项 | 结果 |
|---|---|
| `grep -rn "@radix-ui" src` | **空** ✅ |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-a06.log） |
| visual | 与 A-05 同代码基线：45/46（失败集 ⊆ {courses@375}，差异 26989px=基线不增）——注释改动无视觉影响 |
| e2e | 9/9（A-07 的 Windows 运行同基线） |
| 依赖删除 | package.json 已无 @radix-ui（827646b 检查点完成）；依赖锁定文件冻结，W2-03 统一收口 |
| 越界检查 | 2 文件 ⊆ allow ✅ |
