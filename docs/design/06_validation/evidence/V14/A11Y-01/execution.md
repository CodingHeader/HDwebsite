# V14-A11Y-01 执行证据：a11y 门禁接入 CI（消灭孤儿测试）

> 执行时间：2026-10-27
> 执行者：main-agent（核心/高难度：涉及 CI 策略与前台冻结冲突裁决）
> 起点：`upgrade@a814cd9`

## 5W1H 简版

- **What**：把只在本机跑的 `tests/a11y/**` 接入 CI，并为前台补 5 页 axe 扫描。
- **Why**：`REQ-F-015 §5` 验收条目写"axe 扫描为门禁"，但 `.github/workflows/ci.yml` **无该步骤**、`package.json` **无 script** → 12 个用例全绿却不在任何流水线，属"孤儿测试"（V14 缺口 G4）；前台 a11y 覆盖率 = 0（G5）。
- **Where**：`.github/workflows/ci.yml`、`tests/a11y/web.spec.ts`（新增）、`src/app/(web)/apply/ApplyClient.tsx`（仅 aria）。
- **Who**：main-agent。
- **How**：CI 里写全命令（不改冻结的 `package.json`）；前台用例逐节点判定，main 基线遗留的低对比度按色对登记。
- **What if**：若强行要求前台 0 违规，只能改 className → 违反 REQ-F-014。故按 B2 处置：只改 aria，其余登记上服。

## 一、改动内容

### 1.1 CI 新增 a11y 步骤（`.github/workflows/ci.yml`）

插在 `E2E (Linux)` 之后、`Upload E2E artifacts` 之前：

```yaml
      # V14-A11Y-01：a11y 门禁（REQ-F-015 §5 / REQ-NF-003）。
      # 此前 tests/a11y/** 只在本机跑，CI 无该步骤 → 属"孤儿测试"，回归无人拦。
      # 复用上面已安装的 chromium，不额外 install；不改 package.json（冻结面），此处写全命令。
      # 阻断式（非 continue-on-error）：管理端 11 页 + 前台 5 页 serious/critical 必须为 0。
      - name: A11y (axe, manager + web)
        run: npx playwright test -c tests/a11y/playwright.config.ts

      - name: Upload A11y artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a11y-results-${{ github.run_id }}
          path: .cache/a11y/
          if-no-files-found: ignore
          retention-days: 7
```

**为什么不加 `npm run test:a11y`**：`package.json` 是冻结面（AGENTS.md §4）。CI 直接写全命令即可达成同等效果，避免触碰冻结文件。

### 1.2 新增 `tests/a11y/web.spec.ts`（前台 5 页）

覆盖：`/`、`/articles`、`/courses`、`/apply`、`/contact`。
判定：`serious` / `critical` 必须为 0，**但 `color-contrast` 规则中"main 基线色对"除外**（下详）。

### 1.3 前台唯一代码修复（仅 aria，符合冻结）

```diff
   <Button
     onClick={handleSendMessage}
     className="bg-[#da251d] hover:bg-[#b91d1d]"
     disabled={!inputMessage.trim() || isTyping}
+    aria-label="发送消息"
   >
-    <Send className="w-4 h-4" />
+    <Send className="w-4 h-4" aria-hidden="true" />
   </Button>
```

**依据**：`button-name [critical]`（图标按钮无可读名称）。
**为什么合规**：只增 `aria-label` 与 `aria-hidden`，**未改 className / JSX 结构** → 不违 REQ-F-014。
`git diff -- "src/app/(web)" "src/components/web"` 的输出仅此 3 行（见 §四）。

## 二、发现的真实冲突（必须上报，不得自行裁决）

### 2.1 冲突事实

| 项 | 内容 |
|---|---|
| 违规规则 | 仅 `color-contrast` 一条 |
| 修复方式 | **只有改 className**（如 `text-white/90`→`text-white`），或改品牌红背景 |
| 与谁冲突 | REQ-F-014「组件 JSX/className 与 main 逐字一致」 |
| 是否 upgrade 回归 | **否**。证据见 2.2 |

### 2.2 为什么不是 upgrade 引入的回归（逐条取证）

```
$ git show origin/main:src/components/web/Footer.tsx | grep 'footer className'
<footer className="bg-[#da251d] text-white/80">     ← main 与 upgrade 逐字一致

$ git grep -l -- "text-white/90" origin/main -- "src/app/(web)" "src/components/web" | wc -l
5                                                    ← main Navbar/Navigation 共 5 文件

$ git grep -l -- "text-gray-400" origin/main -- "src/app/(web)" "src/components/web" | wc -l
14

$ git show origin/main:src/components/web/FloatingContact.tsx | grep f5a623
className="... bg-[#f5a623] ... text-white ..."      ← 校长电话按钮，与 upgrade 一致
```

→ 低对比度是 **main 基线自身不满足 WCAG AA**，不是 upgrade 的债。

### 2.3 实测色对与对比度（axe 计算值）

| fg | bg | 对比度 | AA 要求 | 对应 main 原生样式 |
|---|---|---|---|---|
| `#fbe9e8` | `#da251d` | 4.20:1 | 4.5 | `text-white/90` 叠品牌红 |
| `#f8d3d2` | `#da251d` | 3.57:1 | 4.5 | `text-white/80`（Footer 根节点） |
| `#f4bebb` | `#da251d` | 3.03:1 | 4.5 | `text-white/70` |
| `#99a1af` | `#ffffff` | 2.60:1 | 4.5 | `text-gray-400` |
| `#da251d` | `#fbe9e8` | 4.20:1 | 4.5 | 红字于 `bg-[#da251d]/10` 徽标 |
| `#da251d` | `#f6e5e5` | 4.04:1 | 4.5 | 红字于浅粉底 |
| `#ffffff` | `#5b9bd5` | 2.96:1 | 4.5 | 白字于蓝底 |
| `#ffffff` | `#7bc142` | 2.19:1 | 4.5 | 白字于绿底 |
| `#ffffff` | `#f5a623` | 2.02:1 | 4.5 | 校长电话浮动按钮 |

**若改为 `text-white`（纯白）**：`#ffffff` on `#da251d` = **4.93:1**，可过 AA —— 但这就是改 className。

## 三、判定口径的设计与迭代（含两次失败）

### 3.1 第一版：按节点 HTML 里的 class token 判定 → **失败**

```ts
nodeHtml.includes("text-white/90")
```

**为什么失败**：页脚是 `<footer class="text-white/80">` 内**裸 `<span>` 继承颜色**，节点自身 HTML 无色类。
修复后仍有 5 页失败，剩余 9~12 个节点（示例 `<span>成都市青羊区大石西路12号</span>`）。

### 3.2 第二版：按 axe 计算出的色对判定 → **缺一对**

改用 `node.any[].data.{fgColor,bgColor}`。首轮仍有 `#ffffff|#f5a623` 未覆盖。

**为什么**：我只登记了前 8 对，漏了校长电话橙色按钮。补入后 **17/17 全绿**。

### 3.3 最终实现要点

```ts
const MAIN_BASELINE_COLOR_PAIRS = new Set([
  "#fbe9e8|#da251d", "#f8d3d2|#da251d", "#f4bebb|#da251d",
  "#99a1af|#ffffff", "#da251d|#fbe9e8", "#da251d|#f6e5e5",
  "#ffffff|#5b9bd5", "#ffffff|#7bc142", "#ffffff|#f5a623",
]);

function isMainBaselineContrast(node) {
  const data = node.any?.[0]?.data;
  return data?.fgColor && data?.bgColor
    && MAIN_BASELINE_COLOR_PAIRS.has(`${data.fgColor}|${data.bgColor}`.toLowerCase());
}
```

**只有 `color-contrast` 规则受白名单影响**；其余任何规则（缺名、键盘、aria、label）照常阻断。

## 四、验收结果

| 验收条目 | 结果 | 证据 |
|---|---|---|
| `ci.yml` 含 a11y 步骤且非 `continue-on-error` | **PASS** | `grep -n "a11y" .github/workflows/ci.yml` → L104/105/109 |
| 本地用例 ≥17 且全绿 | **PASS** | **17 passed (43.2s)**（12 原有 + 5 新增） |
| `git diff --exit-code package.json` 通过 | **PASS** | 未改 package.json |
| 前台豁免项逐条附原因与依据 | **PASS** | 9 个色对 × main 原生位置，见 §2.3 |
| 前台只改 aria，未改 className | **PASS** | 见下 |

前台改动全量（只有 3 行）：
```
$ git diff -- "src/app/(web)" "src/components/web" | grep -E "^[+-]" | grep -vE "^[+-][+-]"
+                    aria-label="发送消息"
-                    <Send className="w-4 h-4" />
+                    <Send className="w-4 h-4" aria-hidden="true" />
```

## 五、17 例明细

```
ok  1-12  tests/a11y/manager.spec.ts（11 管理页）+ smoke.spec.ts（登录页）
ok 13     前台 a11y：首页
ok 14     前台 a11y：新闻资讯列表
ok 15     前台 a11y：课程中心
ok 16     前台 a11y：在线报名（含 AI 客服）
ok 17     前台 a11y：联系我们
→ 17 passed (43.2s)
```

每页均打印 `[a11y][main 基线遗留] <path>：N 个 color-contrast 节点属 main 原生低对比度色对，已登记待裁决`
（实测 5 页各 1 条告警，共 5 条）。

## 六、这条门禁的已知局限（如实声明，不隐瞒）

**按色对放行 → 无法区分"main 原有"与"upgrade 新增同色对用法"。**

具体后果：若未来某新页面也用 `text-gray-400` 于白底，该违规会被放行。

**为什么接受**：
| 替代方案 | 为什么不可行 |
|---|---|
| 要求前台 0 违规 | 只能改 className → 违反 REQ-F-014 |
| 让 a11y 永久红 | 门禁失效，等于没接 |
| 不接 a11y | 回到"孤儿测试"状态（本卡要解决的问题） |

**收敛路径**（待用户裁决 B2 后）：改为「对 `origin/main` 基线实跑 axe，做逐节点 diff 的 ratchet」，
即只阻断"upgrade 新增"的违规。此方案需前台可独立启动 main 版本，工作量较大，故本轮不做。

已同步登记于 `docs/V1.4-20261027/07-风险与待裁决.md` 与本次证据。

## 七、UNKNOWN

| 项 | 原因 |
|---|---|
| CI 上 a11y 步骤的实际耗时 | 本地 43s；CI 未跑（待推送后核对） |
| 前台是否还有未被 5 页覆盖的违规 | 只扫 5 个代表页；其余 11 个前台路由未扫 |
| 真实用户对低对比度的可读性影响 | 未做用户测试；数值上低于 AA 阈值 |
