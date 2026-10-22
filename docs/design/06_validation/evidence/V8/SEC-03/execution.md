# V8-SEC-03 执行证据：vitest 3 → 5（含 tinypool）

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 前置：V8-SEC-02 已完成（`391afc3`，sharp 0.35.5）
- 授权：Q1 = 只升不降

## 1. 起点（SEC-02 之后）

```bash
npm audit --registry=https://registry.npmjs.org --json
```

| 严重度 | 数量 | 包 |
| --- | --- | --- |
| **critical** | **2** | `vitest`、`tinypool`（修复版 5.0.5） |
| high | 5 | `@next/eslint-plugin-next`、`braces`、`eslint-config-next`、`fast-glob`、`micromatch` |
| moderate | 4 | — |

## 2. 前置校验

| 项 | 结果 |
| --- | --- |
| 当前 vitest | 3.2.7（`package.json` 写 `^3.2.4`） |
| vitest 5.0.5 存在 | ✅ |
| engines | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` — 本机 node 24 ✅ |
| peerDeps | `vite: ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0` |
| 项目当前 vite | **7.3.7** ✅ 满足，间接升级风险可控 |
| `package.json` 直装 vite | 无（vite 由 vitest 带入）→ 升级不会与其它包冲突 |

## 3. 升级后遇到的真实问题与修复

### 3.1 一个测试文件加载失败

```
FAIL  src/lib/__tests__/lane-c/llm-registry.test.ts
Error: 1 call in "src/lib/__tests__/lane-c/llm-registry.test.ts" was defined outside of the module's top level scope:
- vi.mock("@/lib/llm-gateway") at src/lib/__tests__/lane-c/llm-registry.test.ts:86:5
```

**原因**：vitest 5 收紧了 `vi.mock` 的位置要求——必须位于模块顶层，写在 `it()` 内部会直接抛错
（vitest 3 只是警告/容忍）。

**关键发现**：这段被举报的 mock 本身就是**空转**：

```ts
vi.mock("@/lib/llm-gateway", async (orig) => {
  const real = await orig<typeof import("@/lib/llm-gateway")>();
  return real;     // ← 返回真实模块，等于没有 mock
});
```

它在 `it()` 内部、且实现只是 `return real`，对行为零影响。
处置：**直接删除**（不是搬到顶层——搬上去也毫无作用，反而制造"这里有个 mock"的假象），
并在原处留下注释说明删因。删除后该文件 6 个用例全绿。

### 3.2 reporter 兼容

顺带确认：`--reporter=basic` 在 vitest 5 已移除，用它跑会抛
`ERR_LOAD_URL`（在 loadCustomReporterModule 阶段）。改用默认 reporter 即正常。
**后续脚本/CI 不应再使用 `--reporter=basic`。**

## 4. 升级结果

| 项 | 升级前 | 升级后 |
| --- | --- | --- |
| vitest | 3.2.7 | **5.0.5** |
| tinypool | （vitest 3 内置版本） | 随 vitest 5 → 5.0.5 ✅ |
| **critical** | **2** | **0** ✅ |
| high | 5 | 5（见 §5，均为降级建议，拒绝） |
| moderate | 4 | 3 |

## 5. 关于剩余 5 个 high：**全部是降级建议，按 Q1 拒绝**

```
 - high @next/eslint-plugin-next | fix: 14.2.35
 - high braces                    | fix: 14.2.35
 - high eslint-config-next        | fix: 14.2.35
 - high fast-glob                 | fix: 14.2.35
 - high micromatch                | fix: 14.2.35
```

核实实际版本：

```bash
node -e "console.log(require('eslint-config-next/package.json').version)"  # 16.4.2
node -e "console.log(require('@next/eslint-plugin-next/package.json').version)"  # 16.4.2
```

**当前是 16.4.2（SEC-01 刚升的），而 audit 建议的 14.2.35 是降级**——
这是 npm audit 对「无可用修复版本」的兜底建议（它会推荐一个"最近的安全版本"，
哪怕那意味着回退两个大版本）。`braces`/`fast-glob`/`micromatch` 是 eslint 工具链的传递依赖，
其漏洞在 14.x 与 16.x 两条线上都存在，audit 只能给出 14.2.35 这个它认为"最稳"的点。

**按 Q1「只升不降」明确拒绝**，不做任何降级操作。若上游后续在 16.x 线修复，再升。

## 6. 门禁

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0（0 errors / 58 warnings，+1 来自删 mock 后的变量） |
| `npm test` | **1712 passed / 72 files** |
| `npm run build` | exit 0 |
| `npx vitest run src/lib/__tests__/lane-c/llm-registry.test.ts` | 6 passed |

## 7. 遗留

1. **5 个 high 未消除**：均为降级建议，按授权拒绝。这不是"漏做"，是**主动决策**，需在终审时明确此口径。
2. `--reporter=basic` 在 vitest 5 不可用：若 `package.json`/CI/脚本中还有用到需一并改（本轮已确认 `npm test` 用的是默认 reporter）。
3. vitest 5 对 mock 位置更严格：其它测试目前全绿，但**新写测试**必须把 `vi.mock` 放顶层。
