# V11-G-01 执行证据（2026-10-24）

## 基线五连（0728c46）

```
npm run lint          exit 0（--max-warnings 0，无输出）
npx tsc --noEmit      exit 0
npm test              1712 passed / 72 files
npm run check:root    PASS（51 条白名单）
npm run check:assets  PASS（8 引用全部存在）
npm run build         exit 0
```

## 沙箱三项声明本机复核

| 声明 | 结论 | 证据 |
|---|---|---|
| publish-jobs 500 已修（crud.ts refine 降级） | **属实** | `src/lib/crud.ts:74-96` F-01 修复逻辑在树（zod4 `.partial()` 不兼容 refine → safeExtend 降级） |
| zz-dbg 调试测试已删 | **属实** | find 无命中 |
| check-root 通过 | **属实** | 51 条全白名单 |

## 环境差异说明

沙箱（node22/Linux）build 报 `no such table` 系其库未 migrate——环境问题；本机 dev.db 已迁移，build 全绿。与 CI（visual job 先 migrate 再 build）口径一致。

## UNKNOWN

无。基线确立，可开工。
