# STEP-A8-1：改 A1 行判据 + 文件头说明

## 目标
把 `parity-matrix.md` 的 A1 行判据从「组件存在」改为「能力等价」，并在文件头加判据说明。

## 第 1 步：定位 A1 行

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
sed -n '48,52p' docs/design/02_requirements/parity-matrix.md
```

**当前内容**（`:50`）：
```
| A1 | 首页 11 区块（TopBanner/Banner 轮播/FourCards/...） | ... | **present** |
```
理由栏写的是：「11 个区块组件全部存在」

## 第 2 步：改 A1 行理由栏

把「11 个区块组件全部存在」替换为三项能力清单：

```markdown
- **组件存在**：11 个区块组件文件齐备
- **能力对等**：9 个组件的 props 与原版一致（`showOverlay`/`showContent`/`bgImage`/`bgColor`/`containerAlign` 等，A3 恢复）
- **配置可达**：8 组配置键已注册且前台可消费（A2 注册 + A4 接线；A5 已验证默认态零变化）
```

**注意**：只改理由栏文字，**不改 `present` 判定值**（能力确实已恢复）。

## 第 3 步：文件头加判据说明

在 `parity-matrix.md` 的状态口径段（`:17` 附近）追加：

```markdown
> **判据强化（V1.8 / A8）**：`present` 必须证明「**能力等价**」，不得以「文件存在」代证。
> 核对项：① 组件与 props 是否齐全 ② 配置项是否可注册可消费 ③ 行为是否可复现。
>
> 反例（V1.7 实证）：首页 9 个组件虽全部存在，但 8 个丢失 `showOverlay` 等 props，
> FourCards 丢 7 个卡片字段 —— 旧口径下仍判 `present`。这是判据缺陷，已修正。
```

## 验收

- [ ] `sed -n '50p' parity-matrix.md` 含「能力对等」或「props」
- [ ] 文件头含「不得以「文件存在」代证」
- [ ] `present` 判定值仍为 `present`（未误改成 partial）
- [ ] 其他 59 行未动（`git diff --stat` 只增不减）

## 常见坑

| 坑 | 防守 |
|---|---|
| 顺手把 A1 改成 `partial` | 能力已恢复，应保持 `present` |
| 改了其他行的判定 | `git diff` 只允许本行变化 |
| 判据说明写得太抽象 | 必须带反例（V1.7 的 9 组件） |
