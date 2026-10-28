> 原始报告：`.cache/v18-d1/lighthouse-{mobile,desktop}.json`（15,684 行，按项目惯例不入库）。
> 关键数值已摘录于下表；需要复核时重跑 `npx -y lighthouse@12` 即可复现。

# D1 执行证据：Lighthouse 移动端性能基线（REQ-NF-001 条目 1）

## 5W1H
- **What**：测量官网首页 Performance 分数（mobile + desktop），建立首次基线。
- **Why**：`REQ-LEDGER` 将 Lighthouse 记为 UNKNOWN（无数据）；本卡补上实测值，关闭 UNKNOWN。
- **Where**：`evidence/V18/D1/lighthouse-{mobile,desktop}.json`（原始报告）。
- **Who**：external-assistant（V1.8 D1）。
- **How**：路径 A（npx -y lighthouse@12 临时下载，不改 package.json）；先 `npm run build`（DATABASE_URL=file:./prisma/e2e.db），再 `next start -p 6791`，lighthouse 对 `http://127.0.0.1:6791/` 跑 performance 类别。
- **What if**：本机 win32 测量与 Linux 有数量级一致差异，注明「CI 复核待定」；无历史基线，本卡为首次基线。

## 实测环境
- 服务器：`next start -p 6791`（NODE_ENV=production，DATABASE_URL=file:./prisma/e2e.db，JWT_SECRET/ENCRYPTION_KEY=e2e 值，APP_ORIGIN=http://127.0.0.1:6791）
- Chrome：`C:\Program Files\Google\Chrome\Application\chrome.exe`
- Lighthouse：`lighthouse@12`（npx 临时，未写 package.json）
- 首页 HTTP 200（内容 169689 字节）

## 结果
| 视口 | Performance | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| mobile | 82 | 1.2s | 3.3s | 50ms | 0.208 | 1.7s |
| desktop | 100 | 0.3s | 0.8s | 0ms | 0 | 0.5s |

## 判定
- mobile 82 → **PASS（可接受，记录数值；改进点：LCP 3.3s 偏长，CLS 0.208 需关注）**
- desktop 100 → **PASS（优秀）**
- 依据：≥90 优秀；50~89 可接受并记录；<50 需优化。
- 备注：本机 win32 测量，CI 复核待定；无历史基线，此为首次基线。

## 验证逐条
| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | 报告存在 | `ls evidence/V18/D1/lighthouse-*.json` | PASS（2 份） |
| 2 | 分数记录 | 提取脚本 | PASS（mobile 82 / desktop 100） |
| 3 | package.json 未改 | `git diff --exit-code package.json` | PASS（exit 0） |

## UNKNOWN
无（mobile/desktop 均实测成功）。
