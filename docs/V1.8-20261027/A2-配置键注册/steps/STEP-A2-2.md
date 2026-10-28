# STEP-A2-2：topbar / stats 各 1 键

## 目标
两个背景图键。

## 插入位置
- `topbar` 分组末尾：`src/lib/settings-registry.ts:52`（`topNoticePhone`）之后
- `stats` 分组末尾：`src/lib/settings-registry.ts:72`（`statsText`）之后

## topbar 插入

```ts
  // 默认空：原版该键值为 /uploads/202605/1778048088558-ne0f5b.png，
  // 但该文件在原版中已不存在（test -f 失败）→ 恢复失效路径会破图（V1.7 裁决 2）
  def("topbarBgImage", "顶栏背景图", "topbar", "", { type: "image" }),
```

## stats 插入

```ts
  def("statsBgImage", "统计横幅背景图", "stats", "", { type: "image" }),
```

## ⚠️ topbarBgImage 是本阶段唯一有争议的一处

**三次凭据**：
1. ① 原版 DB：`SELECT value FROM Setting WHERE key='topbarBgImage'` → `/uploads/202605/1778048088558-ne0f5b.png`
2. ② `test -f public/uploads/202605/1778048088558-ne0f5b.png` → **不存在**（该目录只有 `1778033453871-fihimr.png` 等两张）
3. ③ 故默认置 `""`，不迁移该失效值

**若照抄原值会怎样**：前台顶栏 `style={{backgroundImage:url(/uploads/202605/...png)}}` → 浏览器请求 404 → 背景空白或破图 → 用户以为重构引入 bug。

## 验收
- [ ] 两键存在，group 分别 `topbar` / `stats`
- [ ] 两者 type 均为 `image`
- [ ] `topbarBgImage` 默认值为 `""`（**不是** `/uploads/202605/...`）
