# W0-07 证据：一次性加入 W1 全部新依赖并配置测试收集

> 执行线：Wave 0（Agent-Contract）　分支：`upgrade`　起点提交：`d977e94`（W0-06）
> 工作副本：`E:\Code\Demo\HDwebsite\hdwebsite_1011`　本卡**未推送**（按 D8，W0-08 PASS 后才推）
> 权威依据：`docs/任务规划V0.2.0/tasks/W0-07.md`

## 1. 改动文件（全部落在「允许修改」面内）

| 路径 | 变更 | 内容 |
|---|---|---|
| `package.json` | `+4/-0` | deps +`mammoth@^1.13.0`；devDeps +`jsdom@^26.1.0`、`@testing-library/react@^16.3.3`、`@testing-library/dom@^10.4.2`。**TipTap 8 包（^3.31.4）与 `@axe-core/playwright@^4.13.0` 已在 P07/827646b 就位，本卡未回退版本** |
| `package-lock.json` | 同步 | `npm install --include=dev` 生成 |
| `vitest.config.ts` | 重写 | 顶部 `Object.assign(process.env, { NODE_ENV: "test" })`；include 扩至 `src/**/__tests__/**/*.test.tsx` 与 `tests/contract/**/*.test.ts`；env 增 `ENCRYPTION_KEY` |
| `src/lib/__tests__/w0-jsdom-smoke.test.tsx` | 新增 | jsdom 冒烟（2 用例：render+DOM 查询、jsdom 环境） |
| `tests/contract/w0-placeholder.test.ts` | 新增 | tests/contract 收集占位（1 用例） |
| `docs/design/06_validation/evidence/W0/W0-07/README.md` | 本文件 | 证据 |

## 2. 执行阻塞与根因（重要）

**现象**：`npm i` 后 `node_modules` 中 `vitest`、`jsdom`、`@testing-library/*`、`@axe-core/playwright` 全部缺失，但 `package-lock.json` 已记录这些包；`npm install` 重复跑仍 "up to date"。

**根因**：环境变量 **`NODE_ENV=production`**（宿主 runtime 注入）。npm 视同 `--omit=dev`，跳过全部 devDependencies（vitest/jsdom/@testing-library/@axe-core 均在 devDeps）。

**证据**：
```
$ npm config get omit
dev
$ echo "NODE_ENV=$NODE_ENV"
NODE_ENV=production
$ npm config list | grep -iE 'omit|production'
（global npmrc 无 omit/production —— omit=dev 完全来自 NODE_ENV）
```

**修复**：`npm install --include=dev` 显式覆盖。
```
$ npm install --include=dev
added 422 packages in 5s
$ ls node_modules | wc -l   # 337 → 637
$ npx vitest --version
vitest/3.2.7 win32-x64 node-v24.15.0
```

**次级问题**：修复依赖后 jsdom 冒烟测试报 `React.act is not a function`。
**根因**：同一 `NODE_ENV=production` 使 React 加载**生产构建**，而 React 19 的 `act` 只在开发构建导出（`react-dom-test-utils.production.js` 的 `act` 内部调用 `React.act`，而 `require('react')` 在生产构建下 `act === undefined`）。
**修复**：`vitest.config.ts` 顶部强制 `process.env.NODE_ENV = "test"`（用 `Object.assign` 绕开 `@types/node` 对 `process.env.NODE_ENV` 的 readonly 声明，避免 TS2540）。

## 3. 验收标准逐条结果

| # | 验收条目 | 结果 | 命令 / 关键输出 |
|---|---|---|---|
| 1 | 依赖存在性 | **PASS** | `node -e "...['@tiptap/react','mammoth','jsdom','@axe-core/playwright','@testing-library/react','@testing-library/dom'].forEach(...)"` → 6/6 `OK`，exit 0 |
| 2 | jsdom 冒烟被 vitest 收集并通过 | **PASS** | `npx vitest run src/lib/__tests__/w0-jsdom-smoke.test.tsx tests/contract/w0-placeholder.test.ts` → `Test Files 2 passed (2) / Tests 3 passed (3)`，exit 0 |
| 3 | build 通过；`/manager` 包体未变 | **PASS** | `npm run build` exit 0（新依赖尚未被业务代码引用，仅测试用；`/manager` 路由产物不变） |
| 4 | 通用门禁全绿 | **PASS（1 suite 环境性失败归 W0-09）** | `lint` exit 0（0 errors, 18 warnings，与 W0-06 持平）；`typecheck` exit 0；`build` exit 0；`test` → `Test Files 1 failed \| 22 passed (23)`、`Tests 303 passed (303)`（+3 冒烟）。唯一失败套件 `sqlite-busy-timeout.test.ts` 为 Windows 临时库 EPERM，归 W0-09，本卡不越界改它 |
| 5 | 越界检查 | **PASS** | 见 §5 |

## 4. 测试收集链路验证

```
$ npx vitest run src/lib/__tests__/w0-jsdom-smoke.test.tsx tests/contract/w0-placeholder.test.ts
✓ tests/contract/w0-placeholder.test.ts (1 test) 1ms
✓ src/lib/__tests__/w0-jsdom-smoke.test.tsx (2 tests) 13ms
Test Files 2 passed (2)
      Tests 3 passed (3)
```

两个收集链路均打通：`.tsx` 组件测试（文件头 `// @vitest-environment jsdom`）与 `tests/contract/**/*.test.ts`。

## 5. 越界检查

`git status --short` 变更面：`package.json`、`package-lock.json`、`vitest.config.ts`、`src/lib/__tests__/w0-jsdom-smoke.test.tsx`、`tests/contract/` + 本证据文件，全部落在 W0-07「允许修改」内。未触碰前台路径、契约、迁移、`tests/e2e/*`、`tests/visual/*`、`.env*`/`*.db`。

## 6. UNKNOWN 与偏差

- **未做（W0-07 Execution Steps 3 的后半）**：`tests/e2e/global-setup.ts` 与 `tests/e2e/fixtures/env.ts` 预置 `ENCRYPTION_KEY`/`APP_ORIGIN`/`DATA_DIR`/`HOSTNAME`，以及 `tests/a11y/playwright.config.ts` 的创建。理由：
  - 卡面依赖 D-03 的 `src/lib/env.ts` 校验键集合（D-03 尚未执行，属 Wave 1 lane D），此时预置键名会凭猜补全，违反硬约束「禁止根据猜测补全关键事实」。
  - `tests/a11y` 目录本卡允许面为"可新建"（`docs/design/04_planning/parallel-w1/07-所有权矩阵.md`），但卡面 Execution Step 1 明确把 a11y 配置列为"复用 e2e webServer 设置"，该设置依赖 e2e 的 env 变量；在 e2e env 未定稿前新建 a11y 配置会与后续 lane D/E 冲突。
  - **UNKNOWN 承接**：留给 D-03（env.ts 定稿）→ W0-08 前置补充。若 D-03 后仍缺，走契约变更请求。
- **环境性 UNKNOWN**：本机 `NODE_ENV=production` 由宿主注入，`npm test`/`npm run lint`/`npm run typecheck`/`npm run build` 在用户自己 shell 中运行时应为 dev；若在 CI 中 `NODE_ENV=production`，`vitest.config.ts` 顶部强制 test 已覆盖单测路径，但 `npm run build` 的 standalone 产物行为不受影响。
- **版本偏差**：`mammoth` 落地 `^1.13.0`（卡面写 `mammoth` 未指定版本），jsdom `^26.1.0`、TLaR `^16.3.3`、TLaD `^10.4.2` 均为当前最新稳定版，与 React 19.2.4 / vitest 3.2.7 peer 兼容（`@testing-library/react@16.3.3` peer 声明 `react: ^18 || ^19`）。
