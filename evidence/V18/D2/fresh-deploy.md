# 全新服务器部署演练记录（30 分钟目标）

| 项 | 值 |
|---|---|
| 方式 | 做法 A：Docker 模拟（docker build + docker run） |
| Docker | 29.4.3（daemon 正常） |
| 构建 | `docker build -t hdwebsite:drill .` — **FAIL** |
| 失败点 | Stage dependencies `RUN npm ci --no-audit --no-fund` → `npm error Exit handler never called!`（exit 1） |
| 重试 | `--no-cache` 重跑 1 次，同样失败（约 71s 处崩溃） |
| 结论 | **UNKNOWN（环境：容器内 npm ci 崩溃，疑似联网/registry 或 npm 与 lockfile 兼容问题）** |

**需要什么环境**：容器内 npm 可正常访问 registry 完成 `npm ci`；或改用本地已有 node_modules 挂载方式；或 CI 上跑 Docker build。

**备注**：本机 win32 + 已有 node_modules 缓存，不算「全新服务器」；本演练如实记录环境受限。
