# V8-INT-01 执行证据：微信/SMTP/Coze 冒烟脚本与操作手册

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：`scripts/smoke/**`、`docs/design/07_release/真实联调手册.md`、`evidence/V8/INT-01/**`

## 1. 一个必须先讲清的设计前提

**本项目的第三方凭证不在 `.env` 里，而在数据库里。**

| 集成 | 存放位置 | 字段 | 代码证据 |
| --- | --- | --- | --- |
| 微信公众号 | `WechatAccount` | `appid` / `appSecret`（`v1:` = 加密） | `src/lib/wechat.ts:28` `getWechatAccountSecret()` |
| SMTP | `Setting` | `emailHost/Port/Secure/Username/Password` | `src/lib/notify-gateway.ts:26-36` |
| Coze | `LLMProvider`(kind=coze) | `endpoint` / `apiKey` / `botId` | `src/lib/kb-adapter.ts:94` |

```bash
grep -rhoE "process\.env\.[A-Z_]+" src/lib/wechat.ts src/lib/notify-gateway.ts src/lib/coze.ts
# → 只有 APP_ORIGIN，没有任何第三方凭证键
```

所以冒烟脚本**必须直连数据库**。如果图省事从 env 读，即使跑通也证明不了"线上能用"——
因为线上走的是 DB 这条路径。

## 2. 交付物

| 文件 | 说明 |
| --- | --- |
| `scripts/smoke/_shared.mjs` | 公共设施：`EXIT` 码常量、`isLive()`、`mask()`、`openDb()`、`exitMissingCreds()`、`pretend()` |
| `scripts/smoke/_png.mjs` | 最小 PNG 生成（零依赖，供 wechat 上传正文图用） |
| `scripts/smoke/wechat.mjs` | token → uploadimg → draft/add → freepublish/submit（4 步） |
| `scripts/smoke/smtp.mjs` | verify → sendMail（2 步） |
| `scripts/smoke/coze.mjs` | 建库 → 上传 .md → 检索（3 步） |
| `docs/design/07_release/真实联调手册.md` | 所需凭证、配置步骤、预期输出、**失败对照表** |

### 2.1 退出码约定（三脚本统一）

| 码 | 含义 |
| --- | --- |
| 0 | 成功 |
| 1 | 断言失败（连通但结果不符，如返回 errcode） |
| 2 | 网络/协议错误 |
| **3** | **缺凭证**（逐条列出缺哪些键 + 补齐路径，不抛栈） |

## 3. 验证

### 3.1 无凭证时 exit 3 且列出缺失键（卡定义验收 1）

```bash
node scripts/smoke/wechat.mjs; echo "exit=$?"
node scripts/smoke/smtp.mjs;   echo "exit=$?"
node scripts/smoke/coze.mjs;   echo "exit=$?"
```

实测输出（节选）：

```
=== wechat ===   exit=3
✗ 缺少必需凭证，无法执行（退出码 3）
  缺少：
    - WechatAccount（status=active 的公众号账号）
  补齐方式：
    · 在「管理后台 → 公众号账号」新增一条：名称 + AppID + AppSecret，状态设为启用
    · AppSecret 保存后由 crypto 加密存储（v1: 前缀），脚本会自动解密
    · 真实调用还需把本机公网 IP 加入微信后台的 IP 白名单

=== smtp ===     exit=3
  缺少：
    - Setting.emailHost
    - Setting.emailUsername
    - Setting.emailPassword
    - 环境变量 SMOKE_TO（测试收件人邮箱）

=== coze ===     exit=3
  缺少：
    - LLMProvider（kind="coze" 的供应商）
```

三个都是 **exit 3**，且**没有任何 stack trace**。

### 3.2 dry-run 输出请求摘要且不出网（卡定义验收 2）

临时插入一条测试公众号账号后跑 dry-run：

```
== 微信公众号冒烟 ==
模式：dry-run（不出网）
  账号：冒烟测试号（appid=wx_s****0001（len=16））
  appSecret：plai****1234（len=21）

[1/4] 获取 access_token
  [dry-run] GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=...&secret=***
[2/4] 上传正文图（uploadimg）
  [dry-run] POST https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=***
  [dry-run] body: (multipart: 1 张 16x16 PNG)
[3/4] 创建草稿（draft/add）
  [dry-run] POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=***
  [dry-run] body: {"articles":[{"title":"【冒烟测试】请忽略",...}]}
[4/4] 提交发布（freepublish/submit）
  [dry-run] POST https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=***
  [dry-run] body: {"media_id":"<上一步的 media_id>"}

✓ 冒烟完成
exit=0
```

**密钥已掩码**（`plai****1234（len=21）`），URL 里 secret/token 一律 `***`。

验证方式：统计 `isLive()` 守卫与 `fetch` 调用数，确认**每个 fetch 都有守卫**：

```bash
for s in wechat smtp coze; do
  printf "%-8s isLive=%s fetch=%s\n" "$s" \
    "$(grep -c 'if (isLive())' scripts/smoke/$s.mjs)" \
    "$(grep -c 'await fetch(' scripts/smoke/$s.mjs)"
done
# wechat   isLive=4 fetch=4     ← 4 个 fetch 全在 isLive 内
# smtp     isLive=1 fetch=0     ← 用 nodemailer，无 fetch
# coze     isLive=3 fetch=3     ← 3 个 fetch 全在 isLive 内
```

> 测试用的 `WechatAccount(id=9901)` 已删除，`select count(*) = 0` 复核。

### 3.3 无硬编码密钥（卡定义验收 3）

```bash
git grep -nE '(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})' \
  -- ':!docs/**' ':!.github/workflows/**'
# exit=1（无命中）→ 与 CI 的 Secret scan 步骤同规则
```

另查「像密钥的长字符串字面量」也无命中。

### 3.4 门禁

| 命令 | 结果 |
| --- | --- |
| `npm run lint`（--max-warnings 0） | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `node scripts/check-root.mjs` | PASS |
| `node scripts/check-assets.mjs` | PASS |

## 4. 手册要点（`docs/design/07_release/真实联调手册.md`）

- **一句话速查**：6 条命令覆盖三套集成的 dry-run 与 live
- **为什么凭证在 DB 不在 env**：附代码位置，避免后来人改错方向
- **三张失败对照表**：
  - 微信：`40164`（IP 白名单，最常见）/ `40125`（AppSecret 错）/ `48001`（账号类型不对）等 6 条
  - SMTP：`535 Invalid login`（要用授权码）/ `ETIMEDOUT`（端口不通）/ 证书问题
  - Coze：权限不足 / endpoint 写错 / **检索 0 条是正常现象（异步解析）**
- **加密凭证的解密前提**：`v1:` 前缀需用 `npx tsx` 运行，否则加载不了 TS 解密模块

## 5. 这项交付改变了什么

| | 交付前 | 交付后 |
| --- | --- | --- |
| 状态 | UNKNOWN（无法验证） | **UNKNOWN（可 10 分钟内验证）** |
| 缺什么 | 凭证 + 验证手段 | **只缺凭证** |

按 AGENTS.md §2 的用户裁决（凭证不提供），UNKNOWN 本身不变；
但**验证手段从"要写脚本"变成"跑一条命令"**，这是本卡的实际价值。

## 6. 未验证（如实登记）

| 项 | 状态 | 原因 |
| --- | --- | --- |
| 三个脚本的 `--live` 路径 | **未验证** | 无真实凭证（用户裁决不提供） |
| Coze 的 API 路径 `/v1/datasets/.../retrieve` | **未验证** | 按 Coze 公开文档编写，未经真实调用确认；若线上路径不同，需按 §4 的失败对照表调整 |
| 微信 freepublish 的真实配额与限制 | 未验证 | 同上 |

> 这正是本卡定义为「凭证到位即测」的原因：脚本已就绪，但**"能跑"这件事只有凭证到位才能证明**。
> 不把「脚本写好了」写成「联调通过了」。
