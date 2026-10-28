# A1 · 契约补齐

## 归属
- 阶段编号：A1
- 所属分组：A 能力对等（承接 V1.7 WP1-ST1 前置缺口）
- 来源凭据：`docs/V1.7-20261027/09-执行方案总纲.md §1.2 G1/G2`

## 目标
在 `src/contracts/setting.ts` 补两处枚举：`settingGroups` 加 `display`、`settingDefinitionSchema.type` 加 `image`。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// src/contracts/setting.ts:18-36 —— 17 个分组，无 display
export const settingGroups = ["site","topbar","banner","stats","cards","footer",
  "company","contact","seo","other","email","wechat-mp","collect","kb","llm","notify","publish"] as const;

// src/contracts/setting.ts:43 —— 5 种 type，无 image
type: z.enum(["string", "number", "boolean", "json", "text"]),
```

### ② 实测证据
```bash
$ sed -n '/export const settingGroups/,/as const/p' src/contracts/setting.ts | grep -cE '^\s+"'
17

$ sed -n '43p' src/contracts/setting.ts
  type: z.enum(["string", "number", "boolean", "json", "text"]),

# 但原版该键的 group 就是 display
$ node -e "SELECT key,\"group\" FROM Setting WHERE key='showImageOverlays'"  (原版 dev.db)
showImageOverlays | display | boolean | public=1

# 且 SchemaForm 已实现 image 分支，只是契约挡着
$ grep -n 'case "image"' src/components/manager/SchemaForm.tsx
243:          case "image":
$ ls src/components/manager/fields/ImageField.tsx
src/components/manager/fields/ImageField.tsx   ← 含上传 + 媒体库选择
```

### ③ 规划落点
- 本卡 → A2 的 11 个键中，`showImageOverlays` 需 `display` 分组、4 个键需 `image` 类型
- 不补 → A2 无法注册，A3/A4 连锁阻塞

## 输入
- 前置阶段：**无**（本卡是 A 组起点）
- 前置状态：`upgrade@b307479`，双端 0 0

## 输出
- 修改：`src/contracts/setting.ts`（2 处，共 2 行）

## Execution Steps
见 `steps/STEP-A1-1.md`、`steps/STEP-A1-2.md`、`steps/STEP-A1-Z-体检.md`

## 验收标准
- [ ] `grep -c '"display"' src/contracts/setting.ts` → 1（可自动化）
- [ ] `grep -c '"image"' src/contracts/setting.ts` → 1（可自动化）
- [ ] `settingGroups` 数量从 17 → 18（可自动化）
- [ ] `type` 枚举从 5 → 6 个值（可自动化）
- [ ] `npx tsc --noEmit` exit 0（可自动化）
- [ ] 未改其他任何行（可自动化：`git diff --stat`）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
sed -n '/export const settingGroups/,/as const/p' src/contracts/setting.ts | grep -cE '^\s+"'   # 期望 18
sed -n '43p' src/contracts/setting.ts                                                            # 期望含 image
npx tsc --noEmit && echo "tsc PASS"
git diff --stat src/contracts/setting.ts                                                          # 期望 2 行变更
```

## 证据路径
`docs/design/06_validation/evidence/V18/A1/execution.md`

## 允许修改
- `src/contracts/setting.ts`

## 禁止修改
- 其他任何 `src/**`
- `prisma/**`、`package.json`、`tests/**`
- 不改 `settingGroups` 的**现有顺序**（只插入 `display`）

## 依赖与阻塞
- Depends on：无
- Blocks：A2（配置键注册）、A3、A4、A5、A8
- 阻塞条件：若 `tsc` 报 registry 中有非法 type → 停手上报（说明存在未发现的 type 值）

## 建议执行档位
`sonnect`　理由：改 2 行枚举，规则明确，但需理解 zod 枚举与 registry 的联动。

## 升级条件
若改完后 `tsc` 报出 >3 处连锁错误 → 升级 `opus`，评估是否有其他契约文件依赖该枚举。

## 预估规模
小（0.3h，约 20 分钟）

## 自我质疑

**质疑：补 `image` 类型会不会破坏现有代码？**
→ 现有 registry 的 type 只有 `boolean/number/string/text` 四种（实测 `grep -oE 'type: "[a-z]+"' | sort | uniq -c` → 7/14/2/3），全部在旧枚举内。补 `image` 是**扩大**枚举，不影响旧值。**安全。**

**质疑：为什么不一次性把原版的 10 种 type 全补上（text/textarea/url/image/email/phone/color/select）？**
→ 因为新版 `SchemaForm` 只实现了 `switch/multiselect/json/image/tags/markdown/richtext/secret/text` 这些分支（`SchemaForm.tsx:118-270`）。补了契约但组件不支持的 type 会变成死枚举。**只补 `image` 是因为它组件已实现。**
