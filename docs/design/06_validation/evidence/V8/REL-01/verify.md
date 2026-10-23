# V8-REL-01 独立验证报告（V9-V-01 补录）

- 验证者：子代理（与执行者上下文隔离；依据 diff + Dockerfile 亲读 + GitHub 无鉴权 API 取证）
- 验证日期：2026-10-24；代码基线：Dockerfile@ca5303a（a455143→163b100 均未触及 Dockerfile/.github，与 CI 验证版一致）
- **结论：PASS**（口径：Dockerfile 静态项 + CI 实际构建运行 + health 200，即 V9-CI-01 解除本卡 blocked 的验证范围）

## 逐条验收

| 验收项 | 结果 | 证据 |
|---|---|---|
| Dockerfile 静态核验（卡口径：多阶段/非 root/EXPOSE 6789/HEALTHCHECK/standalone 复制等） | **PASS** | 验证者亲读本仓库 Dockerfile 逐项复核：3 阶段（dependencies/builder/runner，L14/31/63）；Node 24.14.1-slim 对齐 engines>=24（L12）；npm ci 冻结 lockfile（L25）；不 COPY .npmrc 无凭据（L21-22）；standalone 五项复制 public/.next/static/prisma/standalone/.prisma（L73-80）；mkdir /app/data/db + chown（L84）；USER node（L90）；EXPOSE 6789 = ENV PORT（L68/92）；HEALTHCHECK 打 /api/health 用内建 fetch（L95-96）；CMD node server.js（L98）。与 execution.md §3 的 11 项结论一致 |
| 实际构建（docker build） | **PASS** | CI docker job「Build image」步 success：run 39982327648（6312746，首次）起连续 8 个 run 复现，含最终全绿 run 39995499020（ba4a0c9）与最新 run 39997169910 |
| 实际启动 + health 200 | **PASS** | run 39995499020 docker job（id 120557850778）「Run container + health check」步 success——步脚本 `curl -sf http://127.0.0.1:6789/api/health || (docker logs; exit 1)`，success ⇒ HTTP 200 且容器存活；JSON 明细因 job log 下载需鉴权（403）未读取，step 级结论即 CI 门禁自身断言 |
| 卡原验收「重启后数据仍在」 | **UNKNOWN（未覆盖）** | CI docker job 只做 build→run→探活→cleanup，无 compose restart 数据持久化演练；本机 blocked 后未补。不阻塞本结论（见口径声明），如实登记为遗留 |
| 卡原验收「restore 演练日志存在」 | **UNKNOWN（未覆盖）** | evidence/V8/REL-01/ 与 V9 证据目录 grep 无 restore 演练记录。同上登记为遗留 |

## 解除链口径（blocked → done）

1. 本机 blocked（V0.8 state.json：容器内 npm registry 全超时，环境限制非缺陷；静态 11 项全过，de4ad2f 记录）。
2. 代码前提（V9-CI-01，均亲读 diff）：643bebc Dockerfile builder 一次性已迁移库（修构建期静态导出查库 P2039）+ f78cc1d .dockerignore 取消 scripts 排除（修 TS2307）。
3. CI 化解：V9-CI-01 新增 docker job（fad1924）在 GitHub runner 完成 build+启动+探活（V0.8 执行证据 §4 预案的落地）；V0.9 state.json V8-REL-01 = done（commits de4ad2f、643bebc），本文件补齐 verify 缺口。

## CI 取证记录（无鉴权 API）

查询：`curl -s "https://api.github.com/repos/CodingHeader/HDwebsite/actions/runs?branch=upgrade&per_page=6"` 及 `runs/<id>/jobs`（2026-10-24 执行）。

| run | commit | docker job | 说明 |
|---|---|---|---|
| 39982327648 | 6312746 | **success**（首次全步过） | 643bebc 修复生效 |
| 39986975597 / 39983978470 / 39988219952 | 40a9331 / 6312746 / ca5303a | success | 连续复现 |
| **39995499020** | ba4a0c9 | **success** | 三 job 全绿（gate/visual/docker）——最终全绿取证点 |
| 39997169910 | 163b100 | success | docker/gate 绿；visual「Visual regression」步 failure——163b100 为 docs-only 提交（V9-REL-02 终审文档），疑渲染噪声/flake，需 VIS-03 口径复跑分诊，不属本卡 |

## 未重跑/受限项

1. job log 下载无鉴权返回 403，health JSON 响应体与「sharp 原生模块加载日志」未能直接读取（后者 execution.md §5 已列遗留，/api/health 不触发 sharp）。
2. docker-compose 编排、restart 持久化、restore.mjs 演练未在任何环境执行（卡原验收后两项，登记 UNKNOWN）。
3. 未本地重跑 docker build（本机容器网络限制即原始 blocked 根因，CI 已替代验证）。

## 备注

1. 本卡 verify=null 缺口由本文件补齐；建议 REL-02 收口时将 V0.8 state.json 的 blocked 条目同步翻 done（当前 V0.8 state.json 仍 blocked，V0.9 state.json 已 done——双账本并存以 V0.9 为准）。
2. 结论词 PASS 限定于上文口径；卡原验收的持久化/restore 两项保持 UNKNOWN，留待后续卡（如需，拆新卡）。
