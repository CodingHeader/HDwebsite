# V8-VIS-02 执行证据：Linux CI visual 作业

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：`.github/workflows/**`、`evidence/V8/VIS-02/**`
- 前置：V8-VIS-01（done）、V8-SEC-04（done）

## 1. 为什么必须 Linux + 官方镜像

| 事实 | 证据 |
| --- | --- |
| 参照图生成于 Linux/CI | `tests/visual/reference/` 45 张，提交 `79b0f32`（2026-10-19，Linux 环境） |
| Windows 结果不可判 | V0.7 实测 19 pass / 26 fail，失败全是「期望 1440×5529 / 实得 1440×3389」这类高度差，根因是数据量 + 跨平台渲染差异叠加，无法分离 |
| 官方镜像预装匹配浏览器与字体 | 避免 `playwright install --with-deps` 在不同 runner 上漂移 |

## 2. 新增的 job

```yaml
visual:
  runs-on: ubuntu-latest
  timeout-minutes: 40
  continue-on-error: true          # V8-VIS-03 完成后改 false
  container:
    image: mcr.microsoft.com/playwright:v1.59.1-jammy
    options: --ipc=host
```

**镜像版本与 lock 严格对齐**（已校验）：

```bash
node -e "console.log(require('./package-lock.json').packages['node_modules/@playwright/test'].version)"
# 1.59.1
grep -o 'playwright:v[0-9.]*-jammy' .github/workflows/ci.yml
# playwright:v1.59.1-jammy
# → 一致 ✓
```

## 3. 步骤设计（关键在顺序）

| 步骤 | 作用 |
| --- | --- |
| Checkout / Setup Node 24 / `npm ci` | 基础 |
| `npx prisma generate` | 生成 client |
| `Prepare DB` | `prisma migrate deploy` + `tsx prisma/seed-visual.ts --check \|\| tsx prisma/seed-visual.ts`（已一致则跳过写入） |
| **`Clean build`** | **`rm -rf .next/cache/fetch-cache` 后 `npm run build`** ← 见 §3.1 |
| `Start server` | 后台起 `next start -p 6789`，轮询 `/api/health` 最多 120s，失败打印服务日志 |
| `Visual regression` | `VISUAL_BASE_URL=http://127.0.0.1:6789 npx playwright test -c playwright.config.ts` |
| `Upload visual diff artifacts` | `if: always()`，上传 `.cache/visual/` 与 `/tmp/visual-server.log`，保留 14 天 |

### 3.1 为什么必须 `rm -rf .next/cache/fetch-cache`

这是 V8-VIS-01 实测得到的硬结论，**不做这一步整条 visual 作业就没有意义**：

1. 首页是静态预渲染（`next build` 输出 `○ /`）；
2. `getHomeData` 的 `unstable_cache` 配置为 `revalidate: false`（只靠 tag 失效，不按时间过期）；
3. `seed-visual.ts` 直写 DB、不走 API，**不会触发** `invalidateWebContent(WEB_TAGS.home)`。

→ 在本机实测：seed 之后 `npm run build` 再 `npm run start`，首页仍是旧数据
（`curl /api/articles` 已返回新数据，但 `curl /` grep 不到）。
→ 把 `.next/cache/fetch-cache` 移走后重新 build，`index.rsc` 才出现「视觉回归文章」（命中 2 次），
首页高度从 3389 → **5532**（参照图 5529）。

## 4. 已做的静态验证

| 项 | 方法 | 结果 |
| --- | --- | --- |
| YAML 可解析 | Python `yaml.safe_load` | 顶层键 `name / on / concurrency / jobs`；jobs = `gate`, `visual` |
| 两个 job 结构完整 | 同上 | gate 14 steps；visual 9 steps，`continue-on-error=True` |
| 引用的文件都存在 | `test -e` | `prisma/seed-visual.ts` / `playwright.config.ts` / `tests/visual` / `prisma/migrations` 全部 ✓ |
| npm scripts 存在 | 读 package.json | `build` = `next build`；`test:visual` = `playwright test tests/visual` |
| 镜像版本与 lock 一致 | 比对 | 都是 1.59.1 ✓ |
| 无 tab 缩进 | 扫描 | 无 ✓ |

## 5. 未验证（如实登记）

| 项 | 状态 | 原因 |
| --- | --- | --- |
| **CI 实跑一次** | **未验证** | 本机为 Windows，无法运行 Linux 容器；作业要等下一次 push 到 `upgrade` 才真正执行 |
| 产物可下载 | 未验证 | 同上传产物，需等真实 run |
| 主门禁不受影响 | 静态判断为「不受影响」 | `visual` 是独立 job 且 `continue-on-error: true`，即使失败也不阻断 `gate`；但**未实跑确认** |

> 卡定义要求「CI 实跑一次有结果」。这条**当前做不到**——本机没有 Docker/Linux 环境。
> 按连续执行协议「缺环境就交给 CI」，作业本身已就绪，等 push 后由 CI 自己出结果。
> **不把"已配置"写成"已验证"。**

## 6. 遗留

1. `continue-on-error: true` 需在 V8-VIS-03 完成差异分诊后改 `false`（卡定义明确要求）。
2. 首次实跑很可能仍大量 fail（about/articles 页数据源未覆盖，见 VIS-01 §7），属预期，
   由 VIS-03 分诊。
3. `container` 模式下 `actions/checkout` 与 `npm ci` 的路径/权限在 self-hosted runner 上可能需微调，
   当前只按 GitHub 托管 runner 设计。
