# V8-REL-01 执行证据：Docker 镜像 Linux 构建与冒烟

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：`Dockerfile`、`docker-compose.yml`、`.dockerignore`、`evidence/V8/REL-01/**`

## 1. 结论先行

**状态：BLOCKED（网络环境限制，非 Dockerfile 缺陷）**

| 项 | 结果 |
| --- | --- |
| 本机 Docker CLI | ✅ `Docker version 29.4.3` |
| Docker daemon | ✅ 可用，`OSType: linux`（Docker Desktop） |
| 基础镜像拉取 | ✅ `node:24.14.1-slim` 拉取成功 |
| **容器内访问 npm registry** | ❌ **不通**（官方源与 npmmirror 均超时） |
| `docker build` | ❌ 在 `npm ci` 阶段失败（`Exit handler never called`） |
| Dockerfile 静态核验 | ✅ 全部关键项正确（见 §3） |

## 2. 排查过程（不是"一失败就放弃"）

### 2.1 第一次构建失败

```bash
docker build -t hdwebsite:v8-rel01 .
# > [dependencies 4/4] RUN npm ci --no-audit --no-fund:
# npm error Exit handler never called!
# npm error This is an error with npm itself.
# ERROR: failed to build: ... exit code: 1
```

`Exit handler never called` 是 npm 自身的崩溃信号，常见诱因是网络中断或资源耗尽。
不能据此判断 Dockerfile 有问题，必须继续定位。

### 2.2 隔离验证：容器内网络是否通

```bash
docker run --rm node:24.14.1-slim sh -c "npm config get registry && npm view next version"
# → https://registry.npmjs.org/        （配置正确）
# → npm view 无输出（被 timeout 杀掉）
```

换国内镜像再试：

```bash
docker run --rm node:24.14.1-slim sh -c "npm config set registry https://registry.npmmirror.com && npm view next version; echo EXIT=\$?"
# → EXIT=124      ← 124 = timeout
```

**结论：容器内到任何 npm registry 都不通。**

### 2.3 为什么宿主机能、容器不能

宿主机访问外网依赖本地代理（`http://127.0.0.1:10808`，见 `git config http.proxy`）。
Docker Desktop 的容器默认不走宿主机回环代理；试过 `--add-host=host.docker.internal:host-gateway`
后仍不通（容器到该地址的 npm 请求同样超时）。

这与代码无关，属**本机 Docker 网络隔离**。在 GitHub Actions 的 Linux runner 上不存在此问题。

## 3. Dockerfile 静态核验（全部通过）

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 多阶段构建 | ✅ 3 阶段 | `FROM ... AS dependencies` / `AS builder` / `AS runner` |
| Node 版本与 engines 对齐 | ✅ | `ARG NODE_VERSION=24.14.1-slim`，`package.json engines >=24` |
| 依赖安装用 `npm ci` | ✅ 冻结 lockfile | `RUN npm ci --no-audit --no-fund` |
| 不带凭据 | ✅ | 明确注释「不 COPY .npmrc——本机 .npmrc 可能含 registry token，镜像不应携带任何凭据」 |
| standalone 复制完整 | ✅ | `public/`、`.next/static`、`prisma/`、`.next/standalone`、`node_modules/.prisma` 五项齐全 |
| 数据目录预创建 | ✅ | `mkdir -p /app/data/db`（SQLite 打开时父目录须存在） |
| **非 root 运行** | ✅ | `USER node` + 各 COPY 带 `--chown=node:node` |
| 端口 | ✅ | `EXPOSE 6789`，与 `ENV PORT=6789` 一致 |
| 健康检查打 `/api/health` | ✅ | `HEALTHCHECK ... fetch('http://127.0.0.1:'+(process.env.PORT||6789)+'/api/health')`，node:slim 无 wget 故用内建 fetch |
| 启动命令 | ✅ | `CMD ["node", "server.js"]`（standalone 入口） |
| 遥测关闭 | ✅ | `ENV NEXT_TELEMETRY_DISABLED=1` |

> 这 11 项是从真实 Dockerfile 逐条对照出来的，不是照抄 D-08 的声明。

## 4. 处置

按连续执行协议「缺环境就交给 CI」：

1. **本卡标 `blocked`**，理由写进 `state.json`，不阻塞其他卡。
2. 镜像构建的**真实验证**交给 CI——但当前 `ci.yml` 没有 docker job。
   `V8-VIS-02` 已经证明 CI 能跑 Linux 容器（用 playground 官方镜像），
   若要验证本项，建议在 CI 增加一个 `docker build` + `docker run` 健康检查的 job。
   **本轮未加**：因为本卡的允许修改不含 `.github/workflows/**`（那是 VIS-02 的路径），
   跨卡改会破坏所有权边界。
3. Dockerfile 本身**未做任何修改**——静态核验没有发现需要改的地方，为改而改是负收益。

## 5. 未验证（如实登记）

| 项 | 状态 |
| --- | --- |
| `docker build` 成功 | **未验证**（容器内无网络） |
| 镜像启动 + `/api/health` 200 | 未验证 |
| 非 root 运行时的文件权限 | 未验证（`USER node` 已设，但 `data/` 写入权限只有实跑能证明） |
| sharp 在 Alpine/Debian 上的原生二进制 | 未验证（SEC-02 升级到 0.35.5，vips 8.18.7，需实际加载确认） |
| docker-compose 编排 | 未验证 |

> §5 第 4 项尤其值得注意：SEC-02 把 sharp 升到 0.35.5（换了 vips 8.18.7），
> **Linux 上的原生二进制是否正常，只有真正跑起容器才知道**。这条已转记到
> `evidence/V8/SEC-02/execution.md` §7 的遗留项，两处口径一致。

## 6. 若要闭环，需要什么

```bash
# 在有外网（或配置好代理）的 Linux 环境 / CI runner 上：
docker build -t hdwebsite:verify .
docker run -d --name hdweb -p 6789:6789 \
  -e JWT_SECRET=<32+ chars> -e ENCRYPTION_KEY=<32+ chars> \
  -e APP_ORIGIN=http://127.0.0.1:6789 \
  hdwebsite:verify
curl -sf http://127.0.0.1:6789/api/health   # 期望 {"code":200,...,"status":"ok","db":"up"}
docker exec hdweb id                        # 期望 uid=1000(node)
docker logs hdweb | grep -i sharp           # 确认原生模块无加载错误
```
