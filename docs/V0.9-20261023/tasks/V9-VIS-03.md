# V9-VIS-03：visual 差异分诊与前台修复（承接 V8-VIS-03）

## 归属
- 所属切片：S2
- 来源需求/证据：REQ-F-014（前台冻结 main 风格）；D1 裁决；V8-VIS-03 原卡（`docs/V0.8-20261022/tasks/V8-VIS-03.md`）
- 执行者：主代理（分诊结论经子代理复核）

## 目标
CI visual 45 张全部通过，或每条残差有已裁决的豁免；最终 `continue-on-error=false`

## 输入
- 文档：00-事实基线.md §3、08-风险（V9-Q1 默认方案）、04-连续执行协议.md
- 产物：CI visual-results artifact（diff 截图 + results.json，run id 由 V9-CI-01 记录）
- 代码：src/app/(web)/**、src/components/web/**、prisma/seed-visual.ts（数据面增量）

## 输出
- 分诊表（路由 × 宽度 × 差异类型 × 处置）入 evidence
- （若样式回归）src/app/(web)/**、src/components/web/**、src/styles/** 修复
- （若数据差）prisma/seed-visual.ts 数据面增量 + 对应 counts.json 更新
- （若合理演进）tests/visual/reference/** 基线更新，每张一行理由
- continue-on-error: false（独立小提交）

## Execution Steps
1. [ ] 下载 visual-results artifact，按路由×宽度建 diff 表：样式回归 / 数据差 / 合理演进 三类
2. [ ] 样式回归：在 (web) 内修复，保持 main 外观；修完本地 build 冒烟（高度合理）后推送
3. [ ] 数据差：补 seed-visual 确定性数据（候选：HotMajor / ServiceGuide / Setting 文本项 / Navigation），同步更新 counts.json 与 `--check` 基线
4. [ ] 合理演进：更新基线截图并在证据中逐张说明（V9-Q1 默认方案 A）
5. [ ] 重推直至 visual 全绿；把 VIS-02 的 continue-on-error 改 false（本卡证据中声明，独立小提交）

## 验收标准
- [ ] CI visual 全绿（45/45）
- [ ] 每张更新的基线截图有一行理由
- [ ] 每条残差可归入三类之一且有处置记录
- [ ] 首页 1440/768/375 三宽度高度互不相同（证明内容渲染）
- [ ] continue-on-error=false 且后续 CI run 中 visual 失败会阻断

## 验证命令
```bash
npm run test:visual   # 本地仅冒烟（Windows 字体差异，不作门禁）；门禁=CI visual job
curl -s -H @~/.api-header "https://api.github.com/repos/CodingHeader/HDwebsite/actions/runs?branch=upgrade&per_page=1"
```

## 证据路径
docs/design/06_validation/evidence/V9/VIS-03/（execution.md + 分诊表 + artifact 摘录；verify.md 由独立验证者写）

## 允许修改
- src/app/(web)/**
- src/components/web/**
- src/styles/**
- prisma/seed-visual.ts（仅数据面增量；外键自足段归 CI-01）
- prisma/fixtures/visual/counts.json
- tests/visual/reference/**
- docs/design/06_validation/evidence/V9/VIS-03/**

## 禁止修改
- .github/workflows/ci.yml 除 continue-on-error 翻转一处外
- prisma/schema.prisma 与迁移、src/contracts/**、package.json（冻结）
- docs/V0.7-20261019/**、docs/V0.8-20261022/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V9-CI-01（visual job 能产出 artifact）
- Blocks：V9-REL-02、V9-V-01 收口
- 阻塞条件：CI 无法产出 artifact（遇阻塞：标 blocked + 原因，转下一张就绪卡）

## 建议执行档位
高（类 opus）　理由：判别样式回归 vs 合理演进，涉及冻结面

## 升级条件
残差需改 manager 设计系统组件 → 拆卡；同卡连续 2 次验收 FAIL → 熔断

## 预估规模
大　约 1 人天（取决于 fail 张数）
