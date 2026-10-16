# STEP-00 · V0.5 · W0-08 门禁裁决与续跑

1. **P1（本机）立即**：不选 C、不选“等效像素”。把 17 号文档 §3 的裁决作为回复发给本机执行者（paste-ready 文本见 README §V0.5）。
2. **P1**：检查 `git diff --name-only 827646b..HEAD -- tests/visual/reference/`。courses-375.png 若不是 main@94dbbbb 重新生成的 → `git checkout 827646b -- tests/visual/reference/courses-375.png`，并重跑 courses@375 找真实差异。
3. **P1**：参照机按 §4 排查挂起，拿到官方 `npm run test:visual` 46/46。
4. **用户**：`git push origin HEAD:w0/staging`（D17，只读分支，不动 upgrade）。
5. **Hark**：沙箱对同一 SHA 跑 `npm ci && npm run build && npm run test:e2e`，回传 8/8 日志 → P1 写入 W0-verify.md。
6. 独立验证 PASS → `git tag w1-base` → 推送 upgrade 与 tag → 各线开工；Hark 首张 E 卡为 E-12，P3 首批含 D-13。
