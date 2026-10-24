# V1.0 执行记录 · 第 1 轮（2026-10-24）

> 起点 `upgrade@65e8b99`。本轮 = 收尾后打磨：三项遗留逐项处理。

## 1. V10-Q1 取证（375 溢出，用户裁决项）

- 8 页 375 视口实测：scrollWidth 全部 595；唯一溢出源 = Navbar 移动端导航行（9 项 `px-6` 横排）。
- 旧基线（main@94dbbbb 口径）同为 667px 宽 → **main 自带行为，upgrade 逐字复现**。
- Navbar 移动端段与 hdwebsite_0429@main(c6ff40b) diff = 零内容差。
- 修复方案已备（1 处 className），因 REQ-F-014 冻结面上报待授权；state.json 标 blocked(owner=user)。

## 2. V10-T-06（flake 保险）

- 复现实验：单文件 10 连跑全绿；全量 shuffle 4 轮全绿（该文件 0 失败；累计 10+ 轮绿）。
- 处置：3 个涉子进程用例超时 20s→40s（注释说明依据；断言与被测 busy_timeout 无关，零放松）。

## 3. V10-REL-03（发布记录）

- 创建 `docs/design/07_release/release-records/REL-001-重建里程碑.md`（changelog 头注预留机制首次启用）。

## 4. 门禁

（终态推送前回填）

## 5. 收尾

（待 V10-Q1 裁决后回填）
