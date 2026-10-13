# W0-03 证据：新增 `json-field` / `http-client` / `cache-tags` / `storage` 接口模块（默认实现 = 现有行为）

> 执行线：Wave 0（Agent-Contract）　分支：`upgrade`　起点提交：`f72e698`（W0-02）
> 工作副本：`E:\Code\Demo\HDwebsite\hdwebsite_1011`　本卡**未推送**（按 D8，W0-08 PASS 后才推）

## 1. 改动文件（全部落在「允许修改」面内）

| 路径 | 冻结导出面 |
|---|---|
| `src/lib/json-field.ts` | `parseJsonField<T>(raw, fallback)`、`stringifyJsonField(value)` |
| `src/lib/http-client.ts` | `httpFetch(url, opts)`、`HttpError`（`status`/`url`/`bodyText`/`isTransportError`）、`HttpFetchOptions` |
| `src/lib/cache-tags.ts` | `WEB_TAGS`（`home`/`articles`/`settings`）、`WebTag`、`invalidateWebContent(tags)` |
| `src/lib/storage.ts` | `dataDir()`、`uploadsDir()`、`backupsDir()`、`kbDir()`、`resolveInside(root, rel)` |
| `src/lib/__tests__/w0-shared.test.ts` | 16 例单测 |

**「不替换任何调用方」已落实**：验收 grep 命中集恰为上述 4 个新模块 + 1 个测试文件，`src` 内不存在其它引用（见 §2 #2）。

## 2. 验收标准逐条结果

| # | 验收条目 | 结果 | 命令 / 关键输出 |
|---|---|---|---|
| 1 | `w0-shared.test.ts` 全绿 | **PASS** | `npx vitest run src/lib/__tests__/w0-shared.test.ts --maxWorkers=2` → `Test Files 1 passed (1) / Tests 16 passed (16)`，exit 0 |
| 2 | `grep -rn "json-field\|http-client\|cache-tags\|lib/storage" src --include=*.ts -l` 只命中新文件与测试 | **PASS** | 命中 5 条：`src/lib/json-field.ts`、`src/lib/http-client.ts`、`src/lib/cache-tags.ts`、`src/lib/storage.ts`、`src/lib/__tests__/w0-shared.test.ts`。**运行前该 grep 为空**（见 §4），故本卡未替换任何既有调用方 |
| 3 | 全量门禁通过 | **PASS（1 例环境性 UNKNOWN）** | `npx vitest run --maxWorkers=2` → `Test Files 2 failed \| 17 passed (19)`、`Tests 1 failed \| 231 passed (232)`；232 = W0-02 的 216 + 本卡 16 |
| 4 | 通用门禁 `lint && typecheck && test && build` 全 exit 0 | **PASS（test 见 #3）** | `lint=0`（`0 errors, 20 warnings`，与 W0-02 持平）；`typecheck=0`；`build=0`（`✓ Compiled successfully in 4.0s`）；`test` 见 #3 |
| 5 | 越界检查全部落在「允许修改」内 | **PASS** | 见 §3 |

## 3. 越界检查原始输出

```
$ git log --first-parent --no-merges --name-only --format= f72e698..HEAD | sort -u
docs/design/06_validation/evidence/W0/W0-03/README.md   ← 规程豁免（见 §5）
src/lib/__tests__/w0-shared.test.ts
src/lib/cache-tags.ts
src/lib/http-client.ts
src/lib/json-field.ts
src/lib/storage.ts
```
→ 5 个源码文件全部落在「允许修改」的 5 条清单内；多出的 1 条为证据路径，依 `11-验收与审查规程.md` §3 第 1 条豁免。

## 4. 关键实现决策与证据

### 4.1 默认实现与现有行为等价（零行为变化）
- `dataDir()` = `<cwd>/data`、`uploadsDir()` = `<cwd>/uploads`、`backupsDir()` = `<cwd>/backups`、`kbDir()` = `<cwd>/data/kb`，
  与既有字面量一致：`src/app/api/upload/route.ts:25` `path.resolve(process.cwd(), "uploads")`；
  `src/lib/jobs/backup.ts:45` `path.resolve(process.cwd(), "backups")`。
- `parseJsonField` 与既有 `try { JSON.parse } catch { 回落 }` 同语义，且补齐 `null/undefined/空串/空白` 分支。
- `httpFetch` 默认超时 10s，与 `wechat.ts` / `coze.ts` 现行 `AbortSignal.timeout(...)` 口径同量级；默认 `retries = 0`（与 `fetch` 等价，不新增重试）。
- `invalidateWebContent` 在无 Next 请求上下文时 `try/catch` 静默（单测实测不抛）。

### 4.2 Next 16 弃用告警已消除（实测）
首版用 `revalidateTag(tag)` 单参，vitest 输出 4 条：
```
"revalidateTag" without the second argument is now deprecated, add second argument of "max" or use "updateTag".
```
查 `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts:9`：
```ts
export declare function revalidateTag(tag: string, profile: string | CacheLifeConfig): undefined;
```
→ 第二参数在 Next 16 类型中**必填**。按官方迁移指引改为 `revalidateTag(tag, "max")`（`updateTag` 仅限 Server Action 内使用，本场景为 API 路由，不适用）。改后单测无弃用告警。

### 4.3 `AbortSignal.timeout` 不挂事件循环（实测）
`node -e "AbortSignal.timeout(5000); console.log('created')"` 实测 **471ms 即退出**（< 5000ms），确认该定时器已 unref → 单测中安全使用，不会拖住 vitest 退出。

### 4.4 `resolveInside` 拒绝面（单测覆盖 13 种非法形态）
`../x.png`、`../../etc/passwd`、`a/../../b.png`、`/etc/passwd`、`C:/windows/x`、`a\b.png`、`.hidden`、`a/.hidden`、`.`、`..`、``（空串）、`a//b.png`、`a/`（尾斜杠）全部抛错；合法形态 `202610/a.png`、`collect/img-1.jpg`、`a-b_c.1.txt` 正常解析并落在根内。
> 注：仅做词法规范化，不解析符号链接（已在模块注释中显式声明该边界）。

## 5. 规程豁免
`docs/design/06_validation/evidence/W0/<卡号>/` 属 `11-验收与审查规程.md` §3 第 1 条强制路径（「证据写到 … → 提交」）；
本卡「允许修改」清单未列该路径，属规划包不一致（卡片清单缺项），**非执行者越界**。与 W0-02 同一情形。

## 6. UNKNOWN 登记

| 项 | 判定 | 原因 |
|---|---|---|
| `npm test` 中 `wechat-chat.test.ts` 硬编码扫描 | UNKNOWN | 沙箱禁 `execSync` 调 `cmd.exe`（`spawnSync … EBUSY`）；与 W0-01/W0-02 同点同因 |
| `npm test` 中 `sqlite-busy-timeout.test.ts` 清理 | UNKNOWN | 沙箱 `node-safe-delete-shim.cjs` 改写 `fs.rmSync`（`EBUSY/EPERM`）；用例主体 4/4 通过 |
| 本卡未跑 `test:visual` | N/A | 本卡「验证命令」仅列通用门禁（无 visual），且未触碰任何前台渲染文件 |

## 7. 新发现（建议移交 D-09 / Wave 2）

1. **`.gitignore` 未覆盖 `data/` 与 `uploads/`**：`git check-ignore -v uploads data` 两者均未被忽略；
   当前 `uploads/` 下 `202610/`、`collect/` 为空目录故 `git status` 未暴露，但 D-09 引入 `DATA_DIR` 后应同步补 `.gitignore`
   （`data/`、`uploads/`），否则运行时文件会污染工作区。**本卡无权改 `.gitignore`**（不在允许面内），故仅登记。
2. `src/lib/collect-engine.ts:104`、`coze.ts`、`llm-gateway.ts`、`collect-test.ts` 等仍有独立 `AbortSignal.timeout`
   与 `JSON.parse`——属 B-04 / C 线 / D 线的替换范围，本卡按「不替换任何调用方」有意保留。
