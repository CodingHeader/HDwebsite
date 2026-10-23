# V9-REL-02 执行证据（2026-10-24）

## 5W1H 简版

- **What**：V0.8+V0.9 终审交付——changelog、parity 复核、zip 打包、双端同步。
- **Why**：连续执行协议 §6 收尾条件已满足（全部卡 ∈ {done}，blocked 清零，唯一 UNKNOWN 是外部凭证）。
- **Where**：`docs/design/07_release/changelog.md`、`docs/design/02_requirements/parity-matrix.md`、`backups/release/`、`docs/V0.9-20261023/EXEC-round1.md`。
- **Who**：主代理执行；REL-02 的 verify 由独立验证者出具。
- **When**：2026-10-24。
- **How**：见下。

## 验收逐条结果

| 条目 | 结果 | 证据 |
|---|---|---|
| 汇总 verify 结论；FAIL 未清零则不得宣布完成 | **PASS** | verify.md 全集 0 FAIL：V8 15 张（SEC-03 返工后复审 PASS、REL-01 以 docker job PASS）+ V9 4 张（CI-01/VIS-03/T-05/E2E-01） |
| changelog 有 V0.8 与 V0.9 段 | **PASS** | `changelog.md` 新增「2026-10-22 ~ 10-24（V0.8 重建收尾 + V0.9 CI 真相轮）」整段 |
| parity 矩阵 missing=0 复核 | **PASS** | 主表 missing=0 / partial=0 维持；UNKNOWN 2→1：视觉像素回归闭环（V9-VIS-03，CI visual 45/45 + 阻断门禁），余真实联调凭证项 |
| 双端 0 0 | **PASS** | 终稿推送后 `git rev-list --left-right --count origin/upgrade...HEAD` = `0 0`（本文件随终稿提交，命令输出见 EXEC-round1 §9） |
| zip 生成且 SHA256 入证据 | **PASS** | `backups/release/HDwebsite-V0.9-20261023.zip`（gitignored）：127 files / 239,951 B / SHA256 `0385e4b1d11988fa3a7a79d41fa8af5b2bb826a8654697594b17e5ae5bf39c7c` |
| EXEC-round1 终稿完整 | **PASS** | 7 卡全记录、门禁终态、UNKNOWN 登记表、HALT 声明 |

## CI 终态取证

```bash
curl -s -H @~/.api-header "https://api.github.com/repos/CodingHeader/HDwebsite/actions/runs/39995499020/jobs"
# gate: success | visual: success | docker: success   （upgrade@ba4a0c9）
```

## 打包范围与复现

```bash
# 范围：docs/V0.8-20261022 + docs/V0.9-20261023 + evidence/V8 + evidence/V9（127 文件）
python - <<'EOF'
import zipfile, os
out = r'backups/release/HDwebsite-V0.9-20261023.zip'
roots = ['docs/V0.8-20261022', 'docs/V0.9-20261023',
         'docs/design/06_validation/evidence/V8', 'docs/design/06_validation/evidence/V9']
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for r in roots:
        for dp, _, fns in os.walk(r):
            for fn in fns:
                z.write(os.path.join(dp, fn), os.path.join(dp, fn))
EOF
```

## 备注

- zip 不入库（`backups/` 在 .gitignore 第 25 行），SHA256 作为完整性锚点记录于本文件。
- 临时凭据（`~/.api-header`、`~/.git-credentials`）在终稿推送并核验 0 0 后删除，全程 remote URL 无 token、无输出泄漏。
