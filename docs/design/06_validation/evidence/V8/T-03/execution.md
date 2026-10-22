# V8-T-03 执行证据：lint warning 清零并锁死 `--max-warnings 0`

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：全仓 lint 范围（`eslint.config.mjs`、源码、测试、`package.json` scripts）

## 1. 起点与结果

| 项 | 起点 | 终态 |
| --- | --- | --- |
| eslint warning | **58** | **0** |
| eslint error | 0 | 0 |
| `npm run lint` | `eslint`（无上限） | **`eslint --max-warnings 0`** |

```bash
npm run lint
# > eslint --max-warnings 0
# （无输出，exit 0）
```

## 2. 分类与处置原则

58 条 warning 里没有一条是"随手关掉规则"能正当解决的。按性质分四类：

| 类别 | 数量级 | 处置 |
| --- | --- | --- |
| `_` 前缀约定类（解构剥离字段、未用回调参数） | ~16 | **配置 `argsIgnorePattern/varsIgnorePattern ^_`**，而不是逐条删 |
| 真正的死代码（未使用导入/变量/函数） | ~35 | **删除**（逐条确认无引用后） |
| 失效的 `eslint-disable` 注释 | 3 | 删除注释 |
| 有意的例外（原生 `<img>`、整页跳转） | 2 | 定点豁免 + 写明理由 |

### 2.1 为什么 `_` 前缀要配置而不是删

项目里大量这种写法：

```ts
const { passwordHash: _ph, ...safe } = user;   // 剥离敏感字段后返回
```

`_ph` **天然不会被使用**（就是要丢掉它）。强制删除只能改成 `delete user.passwordHash`
或手工重建对象——前者有性能/可变性问题，后者更易错。这是 TypeScript 社区通行约定，
故在 `eslint.config.mjs` 配置：

```js
"@typescript-eslint/no-unused-vars": ["warn", {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  caughtErrorsIgnorePattern: "^_",
  destructuredArrayIgnorePattern: "^_",
  ignoreRestSiblings: true,
}]
```

这一条让 58 → 39，且**没有为消 warning 而降低代码质量**。

### 2.2 两处「有意的例外」及其理由

**① `src/components/web/ArticleContent.tsx` 的原生 `<img>`**

这是 Markdown 渲染器，渲染的是后台任意图片 URL（含采集来的、公众号的）。
`next/image` 需要固定 `width/height` 与 `remotePatterns` 白名单，换过去会导致外部图被挡或变形。
已加 `loading="lazy"` 缓解 LCP。→ 在 eslint 配置里对该**单文件**关掉 `@next/next/no-img-element`。

**② `src/lib/manager-fetch.ts` 的 `window.location.href`**

401 时 token 已失效，必须**丢弃整棵客户端状态**（进行中的请求、组件内状态），
`router.push` 只做客户端导航会留下脏状态。→ 该行加 `eslint-disable-next-line @next/next/no-location-assign-relative-destination` 并写明理由。

> 两处都是「删掉会引入真实缺陷」，不是「懒得改」。

## 3. 清零过程中发现的真实问题（比 warning 本身更重要）

### 3.1 `tests/e2e/e-kb-manage.spec.ts` 有 3 个**空壳测试**

```ts
test("删除 → 回收站 → 恢复闭环（待 C-12：W2-05 复跑）", async ({ page }) => {
  // 前置：库 + 文件条目（C-06/C-12 合并后可用）
});                       // ← 函数体只有注释，没有任何断言
```

与 V8-T-01 撤掉的那批 skip 是**同一类问题**：看起来"有测试覆盖"，实际什么都没验。
这正是 T-03 检查未使用参数（`page`）时顺带暴露的。

**处置**：全部改写成真实断言（新增 `openFirstBaseDetail` / `uploadMarkdown` 辅助）：

| 用例 | 真实断言 |
| --- | --- |
| 删除 → 回收站 → 恢复闭环 | 上传 .md → 文件行「删除」→ 确认 → 「已移入回收站」Toast → 回收站 Tab 含该文件名 → 「恢复」→ 回到文件 Tab 仍含该文件名 |
| 彻底删除需二次确认 | 移入回收站后点「彻底删除」→ **必须弹 confirmDialog** → 点「取消」→ 文件仍在回收站（证明确认框真的拦住了） |
| 采集来源跳转 | 有来源链接时断言 `href="/manager/collect-items"` 且点击后 URL 正确；无采集文件时断言目标页可达（并在报告标注该库无采集文件） |

### 3.2 一个 `eslint-disable` 规则名写错

首版给 `manager-fetch.ts` 写的是 `@next/next/no-location-href-assign`（**这条规则不存在**），
eslint 因此报 `Definition for rule ... was not found` —— **把 warning 变成了 error**。
查实际规则名后改为 `@next/next/no-location-assign-relative-destination`。

> 教训：写 `eslint-disable` 时必须核对真实规则名，写错比不写更糟。

### 3.3 删变量时两次删过头

- 删 `chat-scene.test.ts` 的 `ADMIN` 时，它其实有赋值与使用 → `tsc` 报 `Cannot find name 'ADMIN'`，已恢复
- 删 `routes-admin.test.ts` 的 `WECHAT` 时同理 → 已恢复
- 后又因 `WECHAT` 只声明不赋值触发 `prefer-const` **error**，最终连声明一起删除

两次都是靠 `npx tsc --noEmit` 立刻发现并回滚的。**这说明"删死代码"必须每步跑类型检查**。

## 4. 根目录污染（自查发现）

清理过程中我用 `> xxx.log` 做过几次重定向，产生了 `cr.log`/`cr2.log`/`tv5test.log`，
`check-root` 因此从 PASS 变 **FAIL（3 条不在白名单）**。

其中 `nul` 是 Windows 保留设备名，`del`/`cmd //c del` 都报"语法不正确"，
最终用 `node -e "fs.unlinkSync('nul')"` 删除成功。

处置后：`check-root PASS：根目录 49 条全部在白名单内`。
**这条记在这里**：根目录污染守卫是有效的，它真的抓住了我自己制造的垃圾。

## 5. 验证

| 命令 | 结果 |
| --- | --- |
| `npm run lint`（= `eslint --max-warnings 0`） | **exit 0，无输出** |
| `npx eslint`（不带上限，复核确实是 0 而非被截断） | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **1712 passed / 72 files** |
| `npm run build` | exit 0 |
| `node scripts/check-root.mjs` | 49 条全在白名单 |
| `node scripts/check-assets.mjs` | 全部存在 |
| `npm run check:audit` | exit 0 |

## 6. 遗留

1. `_` 前缀约定会让"真的忘记用某个变量"更难被发现——但它只在变量名**主动**以 `_` 开头时生效，
   属显式声明意图，可接受。
2. 两处定点豁免（`ArticleContent.tsx` 的 img、`manager-fetch.ts` 的整页跳转）已写明理由；
   若将来有多处同类需求，应改为规则级配置而非继续加文件级豁免。
3. `e-kb-manage` 的三个用例依赖真实上传/删除，运行时长比空壳时明显增加（属正常代价）。
