# STEP-C2-1：盘点白名单并加缓存头

## 第 1 步：盘点（决定做或 N-A）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011

# 所有 GET-only 路由
for f in $(find src/app/api -name route.ts); do
  if grep -q "export const GET" "$f" && ! grep -qE "export const (POST|PUT|PATCH|DELETE)" "$f"; then
    echo "$f"
  fi
done | head -40
```

对每个候选，逐个核对三条标准：

| 标准 | 怎么核 |
|---|---|
| ① 只读 | 文件只有 `export const GET` |
| ② 非实时 | 数据变化频率低（如设置、静态内容） |
| ③ 非鉴权敏感 | 不含用户私有数据（不含 `session.id` 过滤） |

**若无一满足** → 整卡标 `N-A(无适用接口)`，**不硬加**。

## 第 2 步：加头（只改具体路由，不改全局）

```ts
// 在具体 route.ts 的响应上设置
return new NextResponse(JSON.stringify(body), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
  },
});
```

或用 `withApi` 的返回改造（若支持）。

**建议值**：
- 静态内容（设置、区块定义）：`public, max-age=60`
- 探活：`no-store`（或不设）

## 第 3 步：抽样验证

```bash
for p in /api/health /api/settings/definitions; do
  echo "--- $p"
  curl -sI "http://127.0.0.1:6791$p" | grep -i "cache-control"
done
```

## 第 4 步：确认写接口零缓存

```bash
grep -rn "Cache-Control" src/app/api --include=route.ts | grep -E "POST|PUT|PATCH|DELETE"
# 期望：空
```

## 验收
- [ ] 每个加缓存的路由都有三条标准的核实记录（写入 evidence）
- [ ] 写接口零缓存头（可自动化）
- [ ] 鉴权接口零 public 缓存（可自动化）
- [ ] 抽样 5 个路由 `curl -I` 可见预期头
- [ ] `npm test` 通过（**api-handler 有单测**）
- [ ] `npx tsc --noEmit` exit 0

## 为什么必须跑 `npm test`

**② 凭据**：
```bash
ls src/lib/__tests__/ | grep -i api
# api-handler 若有单测，改响应头可能破坏断言
```

**③**：本阶段是 B/C 组里唯一改 API 层核心的，必须跑单测。

## 常见坑

| 坑 | 防守 |
|---|---|
| 改 `withApi` 全局默认 | 影响 52 路由，风险大；只改具体路由 |
| 给写接口加缓存 | 数据不一致，最严重 |
| 给鉴权接口加 public | 越权泄漏 |
| 缓存实时数据（logs） | 用户看到旧数据 |
| 不跑单测 | api-handler 有覆盖，必须跑 |
