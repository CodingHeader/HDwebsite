# STEP-S1：审计可信

## 目标
让审计矩阵可信：PageHeader 缺失从误报 29 修正为真实 0；2 处令牌例外登记为白名单。

## 卡（可并行）
- `V15-AUDIT-FIX-01`（外部助手，`sonnect`）
- `V15-TOKEN-01`（外部助手，`sonnect`）

## 为什么必须先于 S2

| 理由 | 证据 |
|---|---|
| 矩阵是 S2 的判定前提 | S2 三卡都以 `audit-matrix.md` 为输入 |
| 不先修会白干 | 若仍显示"29 页缺头部"，执行者会去补 27 个本已合规的页面 |
| 已实证是误判 | `CrudPage.tsx:370` 渲染 PageHeader；29 页中 27 页用 CrudPage（`00 §F5`） |

## 两卡为什么可并行

| 机械规则 | 满足 | 依据 |
|---|---|---|
| ① 无共享可变状态 | ✅ | 一改 `scripts/**`，一改 `evidence/V14/**` |
| ② 契约已冻结 | ✅ | 本轮 0 契约变更 |
| ③ 所有权不相交 | ✅ | 路径集合交集为空 |
| ④ 不共用迁移号 | ✅ | 0 迁移 |

## AUDIT-FIX-01 的关键约束

**必须保留负向能力**：修正不能把正则改成"什么都匹配"。

验证方法：
```bash
mkdir -p src/app/manager/__tmp_nohdr
cat > src/app/manager/__tmp_nohdr/page.tsx <<'EOF'
export default function Tmp() { return <div>no header</div>; }
EOF
node scripts/audit-manager-ui.mjs | grep "__tmp_nohdr"   # 必须命中（报 FAIL）
rm -rf src/app/manager/__tmp_nohdr
```

## TOKEN-01 的关键约束

**不得改任何 className**。这两处是"有理由的例外"：
1. `content-hub/page.tsx:531-534` —— 模拟微信阅读界面，必须用微信真实配色，否则预览失真
2. `login/page.tsx:63-77` —— 深色品牌渐变上的反白文字，`mgr-*` 无反色语义

## 完成判据
- [ ] `PageHeader 缺失 | 0`，且负向测试仍能报 FAIL
- [ ] `令牌作用域 FAIL | 2` 保持不变，但 `whitelist.md` 有 2 条五字段齐全的例外
- [ ] `git status --short src` 为空
