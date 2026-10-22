# V8-SEC-04 执行证据：CI 安全审计门禁（官方源，防镜像假阴性）

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：`scripts/**`、`package.json`(scripts)、`.github/workflows/ci.yml`、`evidence/V8/SEC-04/**`

## 1. 为什么需要独立门禁脚本（三个真实坑）

### 坑 1：镜像返回假阴性（V0.7 差点误判）

```bash
npm audit --json
# npm warn audit 404 Not Found - POST https://registry.npmmirror.com/-/npm/v1/security/advisories/bulk
# [NOT_IMPLEMENTED] /-/npm/v1/security/*
```

本机 registry 指向 npmmirror；它**不实现审计接口**，返回 404。
而 `npm audit --json` 在接口 404 时**退出码与输出都不可靠**，容易把「查不到」读成「没漏洞」。
→ 门禁必须**强制官方 registry**，且**显式检查返回体结构**。

### 坑 2：`fixAvailable.version` 对传递依赖给的是**父包**版本

实测（`npm audit --registry=https://registry.npmjs.org`）：

```
high braces            | fix: 14.2.35   ← braces 实际装的是 3.0.3
high fast-glob         | fix: 14.2.35   ← 实际 3.3.1
high micromatch        | fix: 14.2.35   ← 实际 4.0.8
```

依赖链：`eslint-config-next@16.4.2 → @next/eslint-plugin-next@16.4.2 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`

audit 的 `fixAvailable` 是 `{ name: "eslint-config-next", version: "14.2.35" }`，
即「把 eslint-config-next 降到 14.2.35」。**拿 14.2.35 去和 braces 的 3.0.3 比大小毫无意义**。
第一版脚本就是在这里判错的（把 3 个包误列为「需升级」）。

修正：判定要看 `fixAvailable.name`——若给的是**另一个包**，就用那个包的当前版本来比较。

### 坑 3：Windows 上 npm 子进程调用

- `spawn("npm")` → `EINVAL`（.cmd 不许裸调用，Node ≥18.20.2）
- 加 `shell: true` 能跑，但 Node 打 `DEP0190`（参数不转义，有注入面）
- 直接 spawn `npm.cmd` → **仍 EINVAL**（.cmd 本质需 cmd.exe 解析）

最终方案（`scripts/_npm-exec.mjs`）：**用 `process.execPath` 直接执行 `npm-cli.js`**，
完全绕开 shell。`npm_execpath` 由 npm 注入，直接可用。

## 2. 交付物

| 文件 | 说明 |
| --- | --- |
| `scripts/audit-gate.mjs` | 审计门禁主脚本 |
| `scripts/_npm-exec.mjs` | 跨平台 npm 调用（无 shell、无注入面） |
| `package.json` | 新增 `check:audit`，并串进 `check` |
| `.github/workflows/ci.yml` | 新增 `Security audit gate` 步骤 |

### 2.1 门禁判定逻辑

```
1. 用官方 registry 跑 npm audit --json
2. 解析失败 或 返回体无 metadata.vulnerabilities  → exit 1（明确报「假阴性」）
3. 逐条看 critical/high：
   - fixAvailable 指向**别的包**且该包建议版本 < 当前版本 → 归入「降级建议」，不计失败
   - 其余 critical/high → 计入失败，exit 1
4. 无失败 → exit 0
```

## 3. 负向验证（证明门禁不是空壳）

### 3.1 镜像假阴性必须被拦住

把脚本里的 REGISTRY 临时改成 `https://registry.npmmirror.com`：

```
== 安全审计门禁（registry: https://registry.npmmirror.com）==
✗ 审计结果缺少 metadata.vulnerabilities —— registry 未返回审计数据（假阴性）。
  原始 JSON 顶层键：message, method, uri, headers, statusCode, body, error
exit=1
```

**结果正确**：不是 exit 0，而是明确指出「假阴性」并失败。验证后已还原官方源。

### 3.2 正向（当前真实状态）

```bash
npm run check:audit
# 统计：critical 0 / high 5 / moderate 3 / low 0 / total 8
# -- 降级建议（按 Q1「只升不降」拒绝，不计入失败）--
#   high @next/eslint-plugin-next: 建议 14.2.35 < 当前安装版本 → 拒绝降级
#   high braces: ...
#   high eslint-config-next: ...
#   high fast-glob: ...
#   high micromatch: ...
# ✓ 审计门禁通过：无「可升级修复」的 critical/high
exit=0
```

## 4. 接入

```json
"check": "npm run lint && npm run typecheck && npm run build && npm run check:assets && npm run check:root && npm run check:audit",
"check:audit": "node scripts/audit-gate.mjs"
```

CI（`.github/workflows/ci.yml`）在 `Asset / root guards` 之后新增：

```yaml
- name: Security audit gate
  run: npm run check:audit
```

## 5. 验证

| 命令 | 结果 |
| --- | --- |
| `node scripts/audit-gate.mjs` | exit 0（无 DEP0190 警告） |
| `npm run check:audit` | exit 0 |
| `npx eslint scripts/audit-gate.mjs scripts/_npm-exec.mjs` | 无输出（通过） |
| 负向：改用镜像 registry | **exit 1 + 明确报假阴性** ✅ |
| `npx tsc --noEmit` / `npm test` / `npm run build` | 见提交前门禁 |

## 6. 遗留与注意

1. **5 个 high 仍是 high**：全部为降级建议，按 Q1 拒绝。门禁会持续把它们列为「降级建议」而不是失败——
   这是**有意设计**，避免门禁因「按策略必须忽略的项」而永久红。
   若将来上游在 16.x 线修复，会自然消失。
2. **门禁依赖网络**：CI 需能访问 `registry.npmjs.org`。若 CI 走内网镜像，需确保该步骤能直连官方源；
   否则会按「假阴性」失败——这是刻意的（宁可红，不要假绿）。
3. 未加 `--audit-level` 过滤：脚本自己按 severity 分类，比 npm 内建过滤更可控（内建无法表达「降级建议」）。
