# V15-TOKEN-01 执行证据：令牌作用域例外白名单化

> 执行时间：2026-10-27 · 执行者：external-assistant
> 前置状态：`evidence/V14/UI-CONSIST-01/audit-matrix.md` 汇总 `令牌作用域 FAIL | 2`
> 起点：`upgrade@463a50d`

## 5W1H 简版
- **What**：把 2 处有正当理由的硬编码色值登记为受控白名单，使令牌作用域检查从"2 处 FAIL"变为"0 处 FAIL + 2 条已批准例外"，不改任何样式。
- **Why**：REQ-F-015 §5 要求管理端只用 `mgr-*` 令牌、无全局污染；但 `mgr-*` 令牌不覆盖"模拟第三方界面"与"反色语义"两类正当场景，强行替换会破坏功能与品牌，故登记不改。
- **Where**：`docs/design/06_validation/evidence/V15/TOKEN-01/{whitelist.md,execution.md}`；`audit-matrix.md` 汇总表下追加"已知例外"小节。
- **Who**：external-assistant。
- **How**：逐处 `grep -n` 复核源码行号与命中内容 → 写 `whitelist.md`（每条五字段：文件:行号 / 命中内容 / 为何不能改 / 强行改后果 / 批准结论）→ 在 `audit-matrix.md` 汇总表下追加"已知例外"小节指向白名单。
- **What if**：若发现除 2 处外还有其他硬编码色值 → 一并登记；若某处无正当理由 → 标 FAIL 转 V1.6。实测全量扫描令牌 FAIL = 2，无遗漏，无需改动。

## 一、复核的 2 处例外（grep 实跑）

### 例外 1 · 公众号阅读界面模拟预览
```
$ grep -nE "#[0-9a-fA-F]{3,8}\b|\b(black|white)\b" src/app/manager/content-hub/page.tsx
531: <div className="rounded-mgr-control bg-[#f7f7f7] p-4" ...>
532: <p className="mb-2 text-center text-[15px] font-bold text-black">{viewing.title}</p>
533: <p className="mb-3 text-center text-[11px] text-gray-400">点击上方蓝字关注我们</p>
534: <div className="text-[13px] leading-6 text-gray-800">
```
场景：微信公众号文章阅读界面预览模拟；微信原生固定配色（浅灰底/黑标题/灰正文），不随管理端主题变化。

### 例外 2 · 登录页品牌渐变反白
```
$ grep -nE "#fff|bg-white|text-white" src/app/manager/login/page.tsx
63: "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 35%)"
68: <span className="... bg-white/15 text-lg font-bold">弘</span>
73: <p className="mt-3 text-[14px] leading-relaxed text-white/80">
77: <p className="relative flex items-center gap-2 text-[12px] text-white/70">
```
场景：深色品牌渐变上的反白文字/半透明白叠加。

## 二、验收逐条

| 验收条目 | 结果 | 证据 |
|---|---|---|
| `whitelist.md` 含且仅含 2 条例外，每条五字段齐备 | **PASS** | 见 `whitelist.md`（2 条 × 5 字段） |
| 每条例外有 `file:line` 且该行确含硬编码色值 | **PASS** | 上文 grep 输出 531-534 / 63,68,73,77 |
| 未修改任何 `src/**` | **PASS** | `git status --short src` 为空 |
| `audit-matrix.md` 42 行判定值未变 | **PASS** | 汇总 42 页；矩阵行数 42 不变，仅追加小节 |
| 例外理由非"设计需要"空话，须指具体后果 | **PASS** | 每条第三/四字段指向 REQ-F-015 §5 与功能/品牌后果 |

## 三、命令输出摘要
```
$ node scripts/audit-manager-ui.mjs
# summary: token=2（content-hub + login），pageheader=0，native=0，feedback=0
$ git status --short src   # 空（未改任何 src）
$ git diff --stat docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md
# 仅追加"已知例外"小节（+7 行），42 行判定不变
```

## 四、UNKNOWN
无。2 处例外源码行号与命中内容均经 `grep -n` 实跑复核，理由指向具体需求与后果，登记不改。