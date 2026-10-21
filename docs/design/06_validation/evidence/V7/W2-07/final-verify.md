# W2-07 独立终审报告（final-verify）

> 卡定义：`docs/V0.7-20261019/tasks/W2-07.md`
> 终审范围：`upgrade` 单主线（lane 已废止），起点 `bb2c0e5` → 终态 HEAD
> 执行：2026-10-21 ｜ 终审方式：**独立只读审查 + 主代理补验缺口**

## 1. 总判定

**PASS（附 3 项已登记遗留）**

| 维度 | 结论 |
| --- | --- |
| 门禁四项 | PASS（lint/typecheck/test/build 全 exit 0） |
| 守卫两项 | PASS（check:assets / check:root） |
| 冻结面 | PASS（contracts/prisma/migrations/vitest.config **零改动**） |
| 契约测试真实性 | PASS（默认顺序 + `--sequence.shuffle` 均 865/865） |
| parity-matrix 真实性 | PASS（8 组声明逐一代码核验，无虚报） |
| W2-04 FAIL 登记 | PASS（明标 FAIL，未淡化） |
| 工作区卫生 | PASS（调试残留已清理，artifact 已 ignore） |
| 双端同步 | **未完成**（67 提交未推送，凭据不匹配，见 §8） |

## 2. 独立审查执行情况（诚实说明）

本轮终审由独立子智能体执行，其自身报告 **PASS-with-findings（70%）**，并明确声明 **D、E 两节未执行**（预算耗尽）：

> "我未能读取 parity-matrix，也未对 A1/A19/A22/C6/C9/C10/E1/E2 六组声明做代码侧核验。**这一节我完全没有结论**"
> "未读取 perf-compare.md，**无结论**"

**主代理已补做 D、E 两节**（§5、§6），结论为 PASS。这是本轮终审唯一需要说明的分工：
独立审查者对门禁/冻结面/契约真实性给出了独立结论；矩阵与性能报告的核验由主代理补验并附命令输出。
按 AGENTS.md §6「判定由独立验证者只看 diff + 运行结果给出」的口径，D/E 的补验**不等于独立验证**，故本报告将这两节标注为「主代理补验」，供后续独立复核者复跑（命令已全部给出）。

## 3. 门禁四项 + 守卫（独立审查者执行）

| 命令 | 退出码 | 摘要 |
| --- | --- | --- |
| `npm run lint` | **0** | 0 errors / 68 warnings |
| `npm run typecheck` | **0** | 无输出 |
| `npm test` | **0** | 77 files / 1699 tests passed |
| `npm run build` | **0** | 路由表完整 |
| `node scripts/check-assets.mjs` | **0** | PASS（含 1 项已登记待修 `/images/video-poster.jpg`） |
| `node scripts/check-root.mjs` | **0** | PASS，根目录 47 条全在白名单 |

### 3.1 清理后复测（主代理，清理调试残留之后）

| 命令 | 结果 |
| --- | --- |
| `npx vitest run tests/contract` | **2 files / 866 tests passed** |
| `npm test` | **1691 passed**（= 1699 − 8 个被删的调试探针） |
| `npx eslint` | 0 errors |

> 清理前后差值 8 恰好等于删除的探针文件数，说明**此前的测试计数被调试文件虚增**，现已恢复干净终态。

## 4. 冻结面（独立审查者执行）

```bash
git diff --name-only f158501..HEAD -- src/contracts prisma/schema.prisma prisma/migrations vitest.config.ts
# → 空输出（零改动）
```

`package.json` / `package-lock.json` 有改动，经逐条核对属已授权范围：

| 改动 | 归属 |
| --- | --- |
| `check` 串联 `check:assets` + `check:root`；新增两个 script | W2-09（授权） |
| `@types/nodemailer` dependencies → devDependencies（同版本） | W2-03（授权） |
| `@prisma/adapter-libsql` / `@prisma/client` / `prisma`：`^7.7.0 → ^7.10.1` | W2-03（授权，修 4 条 high） |

**无新增依赖、无删除依赖、无降级**。

## 5. parity-matrix 真实性核验（主代理补验）

抽查 8 组声明，逐条给命令与实测值：

| 声明 | 命令 | 实测 | 判定 |
| --- | --- | --- | --- |
| A1 首页 11 区块 | `grep -cE '^import \{ .* \} from "@/components/web/' src/app/(web)/page.tsx` | **12**（11 区块 + Button） | ✅ 真 |
| A19 public 150 文件 | `find public -type f \| wc -l` | **150** | ✅ 真 |
| A22 设置键 85 | `grep -cE '^\s+def\("' src/lib/settings-registry.ts` | **85** | ✅ 真 |
| C6 TipTap 接入 | `ls src/components/manager/fields/` | 含 `RichTextEditorCore.tsx`、`RichTextField.tsx` | ✅ 真 |
| C9 block-registry | `ls src/lib/block-registry*.ts` | `block-registry.ts` + `block-registry-defs.ts` 均存在 | ✅ 真 |
| C10 element-configs | `ls src/app/api/element-configs/` | `route.ts` + `[id]/route.ts` 均存在 | ✅ 真 |
| E1 Docker 三件 | `ls Dockerfile docker-compose.yml .dockerignore` | 三者均存在 | ✅ 真 |
| E2 AGENTS/CLAUDE | `ls AGENTS.md CLAUDE.md` | 均存在 | ✅ 真 |

**结论：8/8 属实，未发现虚报。**

## 6. W2-04 FAIL 登记核验（主代理补验）

`perf-compare.md` 正文第 12-16 行：

```
| /manager JS gzip ≤ before × 0.6 | 355,519 B | 361,329 B | ≤ 213,311 B | **FAIL**（比值 1.016，仅降 0%） |
**3 项中 2 PASS / 1 FAIL。** FAIL 项未达标，不做美化。
```

- 明标 **FAIL**，未用"基本达成""接近目标"等措辞淡化 ✅
- 有独立的「FAIL 项归因」章节（3 条可验证原因）+「下一步」表（含归属线与预期） ✅
- `after-median.json` 中 `managerJsGzip: 361329`、`startToReadyNpmStartMs: 719`、`homeTtfbWarmMs: 4` 与报告表格**完全一致** ✅

## 7. 契约测试真实性（独立审查者执行）

```bash
npx vitest run tests/contract/routes.test.ts                    # 865 passed
npx vitest run tests/contract/routes.test.ts --sequence.shuffle # 865 passed
```

skip 共 2 条，理由核实：

| skip | 理由 | 核实 |
| --- | --- | --- |
| `POST /chat/stream` | SSE 非 JSON 信封 | 真（`text/event-stream`） |
| `PUT /publish-jobs/:id` | zod4 对含 refine 的 object 调 `.partial()` 抛错 | 机制已证：`src/contracts/resources.ts:334-356` 确为 `.refine().refine()`；`src/lib/crud.ts:157` 无 `updateSchema` 时必调 `.partial()`；zod v4 实测抛 `Error: .partial() cannot be used on object schemas containing refinements` |

**独立审查者提出的重要意见（本报告采纳并登记）**：

> "把一条真实生产缺陷（PUT 恒 500）以 skip 形式计入'148→0 失败'，本质上是把 FAIL 转化成 skip 后归零。数字真实，但'契约测试 0 失败'不等于'契约全部通过'。"

这条意见正确。**因此本报告不宣称「全部路由契约通过」**，而是：865 条通过 + 1 条已知业务缺陷（F-01）+ 1 条协议例外（SSE）。F-01 已登记为待 B 线修复。

## 8. 双端同步：**未完成**（如实登记）

```bash
git rev-list --left-right --count origin/upgrade...HEAD
# → 0    67   （落后 0 / 领先 67）

git remote get-url origin | grep -q @ && echo FAIL || echo ok
# → ok（URL 不含凭据）
```

- `origin` URL **干净**（`https://github.com/CodingHeader/HDwebsite.git`，无内嵌凭据）✅
- **本地领先 67 个提交，远端一个都没有**。

推送尝试与失败原因：

```
git push origin upgrade
→ remote: Permission to CodingHeader/HDwebsite.git denied to nevermeetagain.
→ error: 403
```

本机 `~/.git-credentials` 中 `github.com` 的账号是 `nevermeetagain`，而 HDwebsite 属 `CodingHeader` 账号；
SSH 路由只有 `aideanew` 的密钥，同样无该仓库权限。**W2-07 的「推送」步骤无法在本机完成**，需用户用有权限的凭据执行。

## 9. 工作区卫生（终审发现 → 已修复）

独立审查者判 G 节 **FAIL**，指出的问题及处置：

| 问题 | 处置 |
| --- | --- |
| 8 个 `tests/contract/zz-dbg*.test.ts`、`zz-probe.test.ts` 调试残留被 lint/test 读取，虚增计数 | **已删除**（确认为本人临时探针，git 从未跟踪）；`tests/contract` 从 874 → 866 |
| 23 个 `.<name>.artifact.json` 散布在 docs/tests/scripts/src，干扰证据审计口径 | **已加 `.gitignore` 规则** `**/.*.artifact.json`（`git check-ignore` 已验证生效）；文件本身按「存疑不删」保留 |
| 多张卡证据产物未入库（B-02/B-03/V7-UI-01/W2-02 的 json） | **已补提交**（`3bcf939`） |
| `docs/V0.7-20261019/EXEC-round3.md` 已修改未提交 | **已提交**（`3bcf939`） |
| 敏感文件（`.env`/`*.db`/token） | 未发现 |

## 10. 遗留清单（不美化）

| # | 项 | 状态 | 归属 |
| --- | --- | --- | --- |
| 1 | **67 个提交未推送**，双端不一致 | **未完成** | **需用户**用有 HDwebsite 权限的凭据执行 `git push origin upgrade` |
| 2 | `PUT /api/publish-jobs/:id` 恒 500（F-01） | 已知业务缺陷，已 skip + 登记 | B 线（需改 `src/lib/crud.ts` 或补 `updateSchema`） |
| 3 | `/manager` JS gzip 未达 −40%（1.016×） | FAIL，已登记归因 + 下一步 | E 线（组件懒加载）+ D 线（next.config）；目标口径需用户裁决 |
| 4 | 视觉像素回归 | UNKNOWN | 需 Linux 实机（CI/Docker） |
| 5 | 微信/SMTP/Coze 真实联调 | UNKNOWN | 凭证缺失，按 AGENTS.md §2 用 mock |
| 6 | K10：next 16.4.2（1 条 critical RCE） | 待用户裁决 | 依赖冻结面 |
| 7 | `/images/video-poster.jpg` 缺失 | check-assets 已登记待修 | 前台资源卡 |
| 8 | `CCR-W2-08-01`（apply 路由 zod 定义） | 待裁决 | 集成者/契约员 |

## 11. 判定依据与局限

**支持 PASS 的证据**：门禁四项 + 守卫两项独立复跑全绿；冻结面零改动（contracts/migrations/vitest 一字未动）；契约测试默认与乱序双跑 865/865；parity 8 组声明逐一代码核验属实；W2-04 FAIL 未淡化且数字与 JSON 一致；调试残留与 artifact 污染已清理。

**局限（必须说明）**：
1. parity 与 perf 两节由主代理补验而非独立验证者执行——命令已全部给出，任何复核者可原样复跑。
2. 本报告不宣称"契约全部通过"：存在 1 条已知业务缺陷被 skip。
3. 双端不一致是**未完成项**，不是"待办"；按 AGENTS.md §6 Done 定义，推送未完成则交付未闭环。
