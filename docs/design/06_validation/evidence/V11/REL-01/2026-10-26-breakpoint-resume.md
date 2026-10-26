# 断点恢复证据（2026-10-26）

## 1. 断点结论

- 验收子代理中断后，`docs/design/06_validation/evidence/V11/**/verify.md` 计数仍为 0；V11 尚未完成独立验收。
- `ApplyClient` lint 修复已提交为 `77ee1be`，并已推送到 `origin/upgrade`。
- 当前远端同步状态：`git rev-list --left-right --count origin/upgrade...HEAD` = `0 0`。
- `npm run lint` 已本地通过，exit 0。
- `npm run typecheck` 已本地通过，exit 0。
- 独立子代理核验 `77ee1be` 结论：PASS；只移除失效 `eslint-disable` 注释，无运行时逻辑变更。

## 2. 已推送修复

```text
77ee1be fix(V11): ApplyClient 移除 V11-SEC-04 服务端会话改造后失效的 eslint-disable 注释
origin/upgrade f178ec8..77ee1be
```

推送后复核：

```text
git status --short --branch
## upgrade...origin/upgrade

git rev-list --left-right --count origin/upgrade...HEAD
0 0
```

## 3. Visual 失败归因

数据源：本地 `.cache/visual/results.json`，运行时间 `2026-10-26T04:49:39.969Z`，Playwright `1.59.1`，1 worker。

总览：

| 项 | 结果 |
|---|---|
| expected | 10 |
| unexpected | 36 |
| flaky | 0 |
| total | 46 |

失败不是“仅 home-1440 的局部图片 flake”。失败跨路由、跨宽度、跨 1440/768/375 三组宽度；36 个失败中大多数 diff ratio 约 2%，另有部分高度/布局差明显更大的失败。归因应记为系统性视觉基线漂移，而不是单例图片解码抖动。

重点失败：

| 案例 | diff pixels | ratio | 高度/布局信号 | 初步归类 |
|---|---:|---:|---|---|
| about / apply / article-detail / courses / course-detail / learning / party / service-detail @1440 | 15590~34549 | 0.02 | 多数无高度差 | 渲染噪声或轻微内容/字体差，需视觉复核 |
| articles @1440 | 665086 | 0.16 | 2926 → 2805，-121 | 高度与列表内容明显变化 |
| articles @768 | 548388 | 0.21 | 3528 → 3371，-157 | 列表内容/布局明显变化 |
| articles @375 | 1073157 | 0.50 | 5818 → 5182，-636 | 严重内容/布局变化，需优先定位 |
| courses @768 | 286827 | 0.17 | 2274 → 2318，+44 | 列表高度变化 |
| service-detail @768 | 250537 | 0.18 | 1741 → 1883，+142 | 详情内容高度变化 |
| courses @375 | 248606 | 0.17 | 3880 → 3924，+44 | 列表高度变化 |
| service-detail @375 | 119896 | 0.14 | 2233 → 2351，+118 | 详情内容高度变化 |

未失败/通过的代表：home 三个宽度均通过，但存在小像素 diff 或高度 +1px 信号：home @768 ratio 0.02，home @375 expected 9179 → actual 9180、ratio 0.03。因此“只修 home-1440”不是正确恢复路径。

## 4. 下一步恢复点

1. 从 `articles` 三宽度开始定位：这是最大 diff 来源，且包含明确高度差。
2. 再处理 `courses` 与 `service-detail` 的 768/375 高度差。
3. 对 0.02 ratio 的 1440 失败，用 diff 图判断是否属于可接受渲染噪声或需要基线更新。
4. 完成独立验收后补 `verify.md`，再执行 V11-REL-01 收口。

## 5. 命令证据摘要

```text
npm run lint
eslint --max-warnings 0
exit 0

npm run typecheck
tsc --noEmit
exit 0

npm run test:visual
10 passed, 36 failed, 0 flaky
exit 1
```