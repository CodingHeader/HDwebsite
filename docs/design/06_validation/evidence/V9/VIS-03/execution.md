# V9-VIS-03 执行证据（2026-10-23）

## 1. 分诊输入

- 数据源：CI run **39979767004**（f78cc1d）visual job——首次完整跑通的 visual 运行（此前所有 run 死在 Prepare DB / Clean build，由 V9-CI-01 迭代 1/2 修复）。
- 结果：**41 failed / 5 passed**（45 visual 案例 + 1 功能用例；通过 5 = 4 visual + 1 功能）。
- 产物：artifact `visual-results-39979767004`（24.9MB，results.json + 41 组 actual/expected/diff PNG），已下载至验证机并逐组核对。

## 2. 分诊表（路由 × 宽度 × 高度差 × 归类）

高度差 = actual − expected（px）。dh=0 但像素仍有小差的属渲染噪声，随基线重生成归零。

| 案例 | actual | expected | dh | 归类 | 处置 |
|---|---|---|---|---|---|
| home @1440 | 5532 | 5529 | +3 | 数据差（文本长度微差） | 基线重生成 |
| about @1440 | 1950 | 1950 | 0 | 渲染噪声 | 基线重生成 |
| apply @1440 | 1460 | 1460 | 0 | 渲染噪声 | 基线重生成 |
| article-detail @1440 | 1445 | 1445 | 0 | 渲染噪声 | 基线重生成 |
| learning/party @1440、768；apply @768 | 同 | 同 | 0 | 渲染噪声 | 基线重生成 |
| **campus** ×3 宽 | 3562/3602/5304 | 1506/1741/2086 | **+2056/+1861/+3218** | **数据差**：参照图生成库中 /campus 页为**空态**（"暂无校区信息"，见 expected 截图），upgrade 按动态数据渲染 4 校区+图集——**升级侧行为正确**（用户要求全动态数据；参照空态系基线生成库的过滤状态） | 基线重生成 |
| **articles** ×3 宽 | 2926/3528/5818 | 2696/3170/4062 | +230/+358/+1756 | 数据差：合成文本（"视觉回归文章 XX：专升本政策解读"）换行数与 main 真实标题不同；diff 图显示**版式结构逐块对齐**（列表卡/侧栏/分页位置一致），纯文本长度差 | 基线重生成 |
| **gallery** ×3 宽 | 2042/2527/4037 | 2454/2906/4776 | −412/−379/−739 | 数据差：图集条目文本/描述长度差 | 基线重生成 |
| **partners** ×3 宽 | 2138/3063/5383 | 1834/2735/4741 | +304/+328/+642 | 数据差：伙伴名称/描述文本长度差 | 基线重生成 |
| **contact** ×3 宽 | +110/+330/+110 | — | | 数据差：settings 文本项默认值 vs main 实值 | 基线重生成 |
| **home** @768/@375 | 5942/7620 | 6297/8924 | −355/**−1304** | **数据面缺口**：ServiceGuide 区块与 HotMajor 区块整段缺失（越窄越明显） | **seed 增量修复**（见 §3） |
| **service-detail** ×3 宽 | （无截图） | — | | **数据面缺口**：测试在首页找不到 `/^\/services\/[^/?#]+$/` 链接（ServiceGuide 空表 → 无链接） | **seed 增量修复** |
| courses / course-detail 各宽 | −40~−168 | — | | 数据差（文本） | 基线重生成 |
| about @768/@375 | −168/−336 | — | | 数据差：settings.companyIntro 默认值（~100 字）vs main 实值（292 字），窄屏换行放大差异 | 基线重生成（Setting 项不做种子：90 键属站点配置语义，超出 visual 数据集职责，收益低） |

**结论：0 例样式回归**。全部残差 = 数据差（合成文本 vs main 真实文本）或数据面缺口（补种解决）；版式结构（页头/页脚/导航/列表卡/分页/侧栏）与参照逐块对齐。REQ-F-014（前台冻结 main 风格）在结构层面得到证实。

## 3. 数据面增量（本轮代码修复，提交 6312746）

`prisma/seed-visual.ts` 新增两表（行数=main 参考库实测）：

- **ServiceGuide 6 行**：slug 用 `visual-` 前缀（避免与 seed.ts 示例行 baoming-liucheng/xuexi-xingshi 及 main 真实 slug 冲突），标题/图标对齐 main（报名流程 FileText、常见问题 HelpCircle、报名费用 DollarSign、考试时间 Calendar、联系我们 Phone、在线咨询 MessageSquare），`link=/services/<slug>` 使首页出现 /services/* 链接 → service-detail 导航修复。
- **HotMajor 10 行**：通用学科名集合（汉语言文学/学前教育/会计学/工商管理/计算机科学与技术/法学/心理学/金融学/护理学/行政管理），iconType=image 指向本地占位图，majorId=null（避免 FK 依赖）。
- `counts.json` 同步增补（12 表）；全新库验证 12/12 ✓ 且幂等。

## 4. 基线重生成机制（本轮新增，提交 643bebc）

参照图只能在与 CI 相同的 Linux 环境重生成（Windows 字体差异不可分离，V0.7 实测 19/26 假阳性）。CI 增加 `workflow_dispatch` 输入 `visual_update_ref`：勾选后 visual job 以 `--update-snapshots` 运行，新基线上传为 artifact `visual-reference-<run_id>`，由执行者核对后提交回仓库。

## 5. 待办（本轮后续）

1. 等 CI run（6312746）确认 service-detail 导航恢复、home 缺口补齐 → 仍余文本差类 fail（预期）。
2. 触发 workflow_dispatch 基线重生成 → 下载 artifact → 逐张核对 → 提交 `tests/visual/reference/**`。
3. 重推后 visual 全绿（45/45）→ `continue-on-error: false`（独立小提交）。
4. 每张更新的基线截图在 evidence 补一行理由（本表 + 重生成 run 记录即为理由源）。

## 6. 基线重生成结果与逐张理由（run 39983978470，提交 40a9331）

workflow_dispatch（visual_update_ref=true）run 39983978470：**visual job 全步成功**（Prepare DB / Clean build / Visual regression --update-snapshots / Upload baselines 均 success）。45 张新基线中 **41 张字节级变化**（4 张原通过案例未变），全部入下表理由（按路由归组，×3 宽度同因）：

| 基线（×1440/768/375） | 变化与理由（逐组一行） |
|---|---|
| home-1440/768/375 | 数据集补齐 ServiceGuide(6)/HotMajor(10) 后首页新区块入图；合成文本与 main 真实文本长度差（V9-Q1 方案 A：数据差以数据集口径为准） |
| about-1440/768/375 | settings.companyIntro 走默认值（不入种），窄屏换行差异随基线固定；结构 1440 高度与旧参照完全一致（1950） |
| apply-1440/768/375、learning、party、article-detail-1440 | dh=0 渲染噪声级差异（亚像素），随基线归零 |
| article-detail-375/768 | 文章正文/摘要合成文本换行差 |
| articles-1440/768/375 | 列表卡标题/摘要文本长度差；版式（分页/侧栏/卡片栅格）与参照逐块对齐（diff 图证实） |
| campus-1440/768/375 | **参照旧图为空态（"暂无校区信息"）**；升级按动态数据渲染 4 校区+图集，行为正确（全部动态数据要求），基线更正为有数据状态 |
| contact-1440/768/375 | settings 文本项默认值 vs main 实值 |
| courses-1440/768/375、course-detail-375/768 | 课程卡/详情合成文本差（course-detail-1440 原本即通过，基线未变） |
| gallery-1440/768/375 | 图集条目文本差（原 375 缺口 −739 属条目文本行数差） |
| partners-1440/768/375 | 伙伴名称/描述文本差 |
| service-detail-1440/768/375 | **新增可用**：ServiceGuide 入种后 /services/[slug] 首次能导航渲染（旧参照为导航失败无图） |

**基线口径声明**：新基线 = 「main 版式结构 + upgrade 确定性数据集」在 Linux CI 的渲染（与 CI 被测环境同源生成，消除 Windows 字体噪声）。此后 visual 门禁守护的是**该口径下的回归**；对照 main 结构一致性的证据 = 分诊表（0 样式回归）+ diff 图逐块对齐记录，见 §2。

## 复现命令

```bash
# 产物下载（run id 换成目标 run）
curl -sL -H @~/.api-header -o vr.zip "https://api.github.com/repos/CodingHeader/HDwebsite/actions/artifacts/<artifact_id>/zip"
# seed 增量验证（全新库）
rm -f prisma/v9-ci-check.db
DATABASE_URL="file:./prisma/v9-ci-check.db" npx prisma migrate deploy
DATABASE_URL="file:./prisma/v9-ci-check.db" npx tsx prisma/seed-visual.ts        # 12/12 ✓
DATABASE_URL="file:./prisma/v9-ci-check.db" npx tsx prisma/seed-visual.ts --check # 12/12 ✓
rm -f prisma/v9-ci-check.db
```
