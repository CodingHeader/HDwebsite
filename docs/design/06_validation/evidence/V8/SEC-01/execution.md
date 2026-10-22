# V8-SEC-01 执行记录（Hark，2026-10-22，Linux 沙箱 Node 22）

- 依据：V8-Q1 裁决 A（2026-10-22 15:04，用户授权 Hark 按其判断裁决）。V8-G-01 仅涉及文档入口，不是技术前置，本卡先行执行，已在 state.json 注明。
- 改动：`next` 16.2.1→**16.4.2**，`eslint-config-next` 16.2.1→**16.4.2**（--save-exact，官方源）；`next.config.ts` 移除 `experimental.cssChunking:false`。原因：next 16.4 的 Turbopack 构建报错 `cssChunking: false is only supported with webpack`。该项来自 18999db 步行骨架，没有留下理由记录。

| 验收 | 结果 |
|---|---|
| 官方源 audit --omit=dev 中 next 为 0 critical | ✅ critical 1→**0**；high 2→1（仅剩 sharp，交 SEC-02）；postcss 随 next 一起修复 |
| lint / typecheck / test / build / check | ✅ 全部 exit 0；test 1705/1705 |
| lint warning | 54→55。新增的 1 条是 eslint-config-next 16.4 新规则 `no-location-assign-relative-destination` 命中既有代码，不是本卡引入的代码，交 T-03 |
| test:e2e ≥ 升级前 | **UNKNOWN**：沙箱没有浏览器，交 CI / V8-V-01 |
| /manager/articles gzip ≤105% | **UNKNOWN**：未复测，交 PERF-01 第一步 |
| CSS 顺序 | 风险：移除 cssChunking:false 后 Turbopack 默认分块，交 VIS-03 用 Linux visual 核验 |

全依赖 audit：critical 3→2（剩 vitest、tinypool → SEC-03），high 7→6。
