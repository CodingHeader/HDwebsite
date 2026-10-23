# V0.9 执行记录 · 第 1 轮（2026-10-23）

> 承接 `docs/V0.8-20261022/EXEC-round2.md`。分支 `upgrade` 单主线，起点 `c9bebe3`，双端 `0 0`。
> 本文件边执行边写；终稿在 V9-REL-02 收口时完成。

## 1. 开局取证（对应 00-事实基线）

- 拉取：`git fetch`（socks5://127.0.0.1:10808）后本地 HEAD == origin/upgrade == `c9bebe3`，双端一致。
- CI 取证：GitHub API（PAT 临时文件鉴权，600 权限，用后即删）→ **9 次运行全 failure**：
  - gate：`Build` 步 P2039 `no such table: main.Setting`（ci-build.db 未 migrate，静态导出 /about 时炸）。
  - visual：`Prepare DB` 步 `seed-visual.ts:359 article.createMany()` P2003 FK（`authorId:1` 依赖 seed.ts 的 admin，CI 全新库没有）。
- 由此确立 V0.9 的存在意义：V0.8 三张 pending 卡的"等 CI 结果"条件被证实为"CI 需要先修"。

## 2. 规划（已提交）

- 建立 `docs/V0.9-20261023/` 全套：README、00~09、tasks/×4、state.json、EXEC-log。
- 卡片：V9-CI-01（新）/ V9-VIS-03、V9-V-01、V9-REL-02（承接）+ V8-REL-01 承接跟踪。
- 提交：`docs(V0.9): ...`

## 3. V9-CI-01 执行

（执行中，待补）

## 4. V9-VIS-03 执行

（待补）

## 5. V9-V-01 执行

（待补）

## 6. V9-REL-02 执行

（待补）

## 7. 门禁终态

（待补）

## 8. UNKNOWN 与遗留

（待补）
