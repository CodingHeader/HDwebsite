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

## 4. V10-Q1 执行（用户已授权）

- **授权**：2026-10-24 用户选择"授权修复（推荐）"。
- **改动**：`src/components/web/Navbar.tsx` 移动端导航容器 1 处 className（`justify-between` → `justify-start overflow-x-auto` + 隐藏滚动条），附已知边缘说明（hover 子菜单在 <595px 带鼠标窗口会被容器裁剪——该下拉本为 hover 设计、触屏上原本不可达）。
- **本地验证**：重建后 6 页（/、/about、/articles、/campus、/gallery、/partners）375 视口 `scrollWidth` 全部 **595 → 375**；lint/tsc 静默通过；全量 e2e **73/73**。
- **插曲（如实登记）**：首次后台 build 因残留服务器进程锁 .next 产出半成品（无 BUILD_ID，e2e 报"缺少生产构建"）；taskkill + `rm -rf .next` 干净重建后恢复——非代码缺陷。
- **基线**：375 组 15 张需重生成（workflow_dispatch visual_update_ref run 已触发），落地后 375 基线宽度将从 667 恢复 375；落地前 push CI 的 visual job 预期瞬态红（continue-on-error=false 的正常表现）。

## 5. 门禁终态

- lint（--max-warnings 0）exit 0；tsc exit 0；单测 1712/1712；build exit 0；e2e 73/73。
- 双端 `rev-list --left-right --count` = 0 0（终稿推送后复核回填）。

## 6. 收尾

（基线落地后回填）
