# 06 DAG · 所有权 · 档位（V1.1）

## 1. DAG（主干）

```
V11-G-01 ─┬─→ SEC-01/02/03/04（S1，Hark+P2）
          ├─→ WX-01 → WX-02 → WX-03 → WX-04（S2，Hark）
          │              WX-01 → HUB-01 → HUB-02（S3，含 CCR-1）
          ├─→ COL-01、COL-02（S4，P1）
          ├─→ KB-02 → KB-01；KB-03；KB-04（S5，Hark）
          ├─→ LLM-01/02/03（S6，P2）
          ├─→ MAIL-01 → MAIL-02（S7，P1）
          ├─→ UI-01/02/03/04/05（S8，Hark）→ E2E-375
          ├─→ ENR-01 → ENR-02（S9，P1+Hark）
          ├─→ COMPAT-01、SEO-01（S10，P2）
          ├─→ OPS-01、PERF-01（S11，P1）
          └─→ （全部收口）→ V-01 → REL-01（S12）
```

## 2. 执行编排（本机单代理 + 2 并发子代理上限）

- **主代理 = Hark lane**：SEC-01、WX×4、HUB×2、KB×4、UI×5、ENR-02（核心+全部 UI，难度最高）。
- **子代理 lane P2**：SEC-02、SEC-03、SEC-04、LLM×3、COMPAT-01、SEO-01、E2E-375、G-01。
- **子代理 lane P1**：COL×2、MAIL×2、OPS-01、PERF-01、ENR-01。
- 并发上限 2（历史验证），lane 内串行、lane 间并行；每 lane 完成后由独立验证子代理出该 lane 的 verify.md。

## 3. 串行共享文件（禁止并行编辑，按序让渡）

| 文件 | 涉及卡 | 顺序 |
|---|---|---|
| `src/lib/collect-engine.ts` | SEC-04（SSRF）→ COL-01 → COL-02 | S1 完成后 S4 开工 |
| `src/lib/wechat.ts` | WX-01→02→03→04 → LLM-03（AES 段） | S2 完成后 LLM-03 |
| `src/app/api/media/**` | SEC-03（魔数）→ UI-02（能力） | 同上让渡 |
| `src/lib/__tests__/**`（共享测试目录） | 各卡只新增/修改**自己前缀**的测试文件 | 全程 |

## 4. 档位与预算

| 档 | 卡 |
|---|---|
| 高 | SEC-01、SEC-04、WX-01~03、HUB-01/02、KB-02/01、ENR-01、V-01 |
| 中 | SEC-02/03、WX-04、COL-01、KB-03/04、LLM-01/02/03、MAIL-01/02、UI-01/02/03、E2E-375、OPS-01、REL-01 |
| 低 | G-01、COL-02、UI-04/05、ENR-02、COMPAT-01、SEO-01、PERF-01 |

预估总规模 ≈ 8~10 人日（并行压缩至 ~4 个工作时段）。
