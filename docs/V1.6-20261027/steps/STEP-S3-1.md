# STEP-S3-1：台账终态

## 目标
7 卡全部 done，台账与真实提交一致。

## 卡
`V15-CLOSE-01`（外部助手，`haiku`）

## 对应大纲
`03-执行单元分解.md` → L1-4 → L2-4.1

## 前置
三张验收卡（UX-STATES / KEYBOARD / MOBILE-375）全部 done。

## 执行步骤

1. 读 `docs/V1.5-20261027/state.json`
2. 对三张验收卡：
   - `status: ready → done`
   - `commits`: 填入实际提交 hash（`git log --grep`）
   - `verify`: 一句可复现的判定（如"42 页 × 5 态全有判据，PASS x / FAIL y / N-A z"）
   - `note`: 关键结论 + UNKNOWN
3. 回填 `docs/V1.4-20261027/state.json` 中 2 条流程类 UNKNOWN：
   - "独立验证者抽查≥10 行未执行" → `已由 V15 S2 执行，见 evidence/V15/REQ-LEDGER-...`
   - "独立验证者逐页人工核对未执行" → 同上
   - **只改 note/verify 字段，不改需求文档 checkbox**

## 完成判据

- [ ] 7 卡全 done（`node -e` 验证）
- [ ] 每个 commits 里 hash 能 `git cat-file -e` 通过
- [ ] 每卡有 verify 与 note（非空）
- [ ] V1.4 两条 UNKNOWN 已引用 V15 证据且路径存在
- [ ] 未改 `depends_on`/`owner`/`tier`/`size`

## 验证命令

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node -e "const d=require('./docs/V1.5-20261027/state.json');
const bad=Object.entries(d).filter(([k,v])=>v.status!=='done');
console.log(bad.length?bad.map(x=>x[0]):'7卡全done')"
git diff docs/V1.5-20261027/state.json
```

## 常见坑

| 坑 | 防守 |
|---|---|
| commits 填空数组 | JSON 合法但验收不过，逐 hash 校验 |
| 顺手改了 depends_on | `git diff` 逐字段检查 |
| 改需求文档正文 | 只允许改 state.json |
