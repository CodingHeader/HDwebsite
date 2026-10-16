# STEP-00 · V0.4 重校准与续跑

1. 读 `16-V0.4-827646b检查点重校准.md`。
2. 用户本机（禁止 reset --hard）：
   ```bash
   git fetch origin
   git branch backup/w0-local-20261014
   git stash push -u -m w0-04-wip   # 如有 W0-04 未提交现场
   git rebase origin/upgrade        # 预期冲突：src/lib/block-registry.ts
   ```
3. 按 `tasks/W0-R0.md` 合并 block-defs、改 E2E 登录、复跑门禁，证据写 `docs/design/06_validation/evidence/W0/R0/`。
4. 续跑 W0-04 → W0-08；W0-08 PASS 后打 `w1-base`，三条线开工。
5. Hark 先做 A-05 返工（`/manager/articles` 首屏 ≤ 359,059 B）。
