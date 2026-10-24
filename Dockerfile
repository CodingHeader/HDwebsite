# SRC https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# 适配 hdwebsite upgrade 分支（Next 16 standalone + Prisma 7 libsql/SQLite + sharp）
# 依据：D-08 卡要求——node 24、standalone、非 root、健康检查打 /api/health
# 说明：next.config.ts 在 win32 下关闭 standalone；本镜像基于 linux，自动产出 standalone。

# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================

# IMPORTANT: Node.js Version Maintenance
# 与 package.json engines ">=24" 对齐；Node 基线变更时同步更新 NODE_VERSION。
ARG NODE_VERSION=24.14.1-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

# 先 COPY 依赖声明以利用 Docker 层缓存；lockfile 必须存在（npm ci 强校验）。
# 注：Prisma 7 的 @prisma/client 已无 postinstall generate 脚本，
#     客户端生成统一由 builder 阶段的 `npx prisma generate` 完成。
# 注：不 COPY .npmrc——本机 .npmrc 可能含 registry token，镜像不应携带任何凭据。
COPY package.json package-lock.json* ./

# 冻结 lockfile 安装（--no-audit/--no-fund 避免每次构建联网审计）
RUN npm ci --no-audit --no-fund

# ============================================
# Stage 2: Build Next.js application in standalone mode
# ============================================

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

# 复制源码（.dockerignore 已排除 node_modules/.next/docs/scripts 等）
COPY . .

ENV NODE_ENV=production

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED=1

# 生成 Prisma 客户端：Prisma 7 的 @prisma/client 无 postinstall generate（node_modules/.prisma 需显式生成）
# 时机正确：此刻 schema.prisma 已在镜像内（COPY . . 已包含 prisma/）
RUN npx prisma generate

# V9-CI-01：构建期静态导出会真实查库（/about 等页 generateMetadata → Setting 表）。
# builder 阶段没有可用库（.env 被 .dockerignore 排除、运行时库在数据卷上）→
# 原样 build 必然 P2039 no such table（CI run 39979767004 docker job 取证）。
# 给 builder 一个一次性已迁移库（空表 → 页面走默认值），/tmp 不进最终镜像。
ENV DATABASE_URL="file:/tmp/build.db"
RUN npx prisma migrate deploy

# Build Next.js application
RUN npm run build

# ============================================
# Stage 3: Run Next.js application (standalone, non-root)
# ============================================

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=6789
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
# V11-COL-02：容器时区 Asia/Shanghai（调度 cron 判定、日志与业务时间口径一致；
# node:slim 自带 tzdata，TZ 生效无需额外安装）
ENV TZ=Asia/Shanghai

# 静态资源：Next standalone 不打包 public/.next/static，需单独复制
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Prisma schema/迁移保留在镜像内，供容器外 `npm run db:deploy` 使用
COPY --from=builder --chown=node:node /app/prisma ./prisma
# standalone 输出（含 server.js 与 traced node_modules）
COPY --from=builder --chown=node:node /app/.next/standalone ./
# 补 Prisma 生成客户端（tracing 偶发遗漏；覆盖为同一内容无副作用）
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma

# 运行时数据目录（D-09 起 DATA_DIR 生效；上传/切片/导出等落此）
# 预创建 db 子目录：DATABASE_URL 默认 file:/app/data/db/dev.db，SQLite 打开时父目录须存在
RUN mkdir -p /app/data/db && chown -R node:node /app/data

# prerender cache 目录归属
RUN mkdir -p .next && chown node:node .next

# 非 root 运行（安全最佳实践）
USER node

EXPOSE 6789

# 健康检查：打 /api/health（node:slim 无 wget，用内建 fetch）
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||6789)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]