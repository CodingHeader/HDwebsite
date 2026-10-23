# V8-SEC-02 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924；被验证提交：391afc3
- **结论：PASS**

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| `npm audit --omit=dev` high=0 或 residual.md 逐条登记 | **PASS**（high=0，无需 residual.md） | 本验证者 2026-10-23 独立重跑 `npm audit --omit=dev --registry=https://registry.npmjs.org --json` → `{"critical":0,"high":0,"moderate":0,"low":0,"total":0}`（较执行时的 high 1→0（sharp 修复）、moderate 3→0 进一步清零）。3 个 moderate（argparse/mammoth/sprintf-js）的当时不动理由已在 execution.md §5.1 登记，现已随上游消失 |
| 上传 PNG 返回 image/png | **PASS**（间接+路径核验） | upload/route.ts 的 mimeType 取自上传文件本身（`file.type`，第 72 行），与 sharp 无关——sharp 仅生成缩略图，升级在结构上不可能影响该返回值；端到端旁证：本验证者在 HEAD（sharp 0.35.5）重跑 e2e，e-components 用例经真实 `POST /api/upload` 上传 PNG 得 201 且媒体出现在网格。执行者的缩略管线复刻实测（160/480/1080 三档 webp 字节正确）与 makeThumbnails 调用一致 |
| 门禁全绿 | **PASS** | HEAD=fad1924 当日全量门禁 lint/tsc/1712/build 全 exit 0（V9-CI-01 证据 + 协调方记录）；1712 单测由本验证者独立重跑复现 |

## 允许修改路径核对

`git show --name-status 391afc3`：
- 允许路径内：package.json（`"sharp": "^0.34.5"` → `"^0.35.5"`，单行）、package-lock.json、evidence/V8/SEC-02/**。
- `src/lib/storage/**` 在允许清单内但未改动（合规——无代码改动需求）。
- 允许清单外：`docs/V0.8-20261022/state.json`（协议强制协调文件，不计越界）。
- 版本核对：`node_modules/sharp/package.json` version=0.35.5；运行时 `require('sharp').versions` = sharp 0.35.5 / vips 8.18.7（Windows 本机原生模块实际加载成功）。

## 未重跑/受限项

- 未做真实 HTTP 上传的 Content-Type 逐字节断言（需起服务 + 抓响应体）；以路由代码路径核验 + e2e 上传 201 旁证替代。
- Linux（Docker/CI）上 sharp 0.35 原生二进制表现未在本机验证——执行者已登记归 V8-REL-01（该卡 Docker 冒烟结论见其证据，blocked 项属环境限制）。
- lint/tsc/build 未单独重跑，引用 HEAD 当日门禁记录。

## 备注

1. sharp 0.35.5 engines `>=20.9.0` 与 package.json engines `>=24` 一致，Node 18 不可装的风险已在 execution.md §7 登记。
2. 升级前先验证原生模块可加载、可编解码再改依赖的顺序（execution.md §2）符合「不盲升」，本验证认可。
3. Q1「只升不降」：diff 无降级操作；`require('sharp/package.json')` 抛 ERR_PACKAGE_PATH_NOT_EXPORTED 是 0.35 exports 收紧所致而非安装失败——本验证者以 grep package.json + 运行时 versions 双路核实版本，与执行者口径一致。
