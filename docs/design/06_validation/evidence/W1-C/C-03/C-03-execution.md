# C-03 执行证据：知识库文件管线纯函数（三重校验 / docx 解析 / 切分）

- 5W1H 简版：Who=执行线 C（lane/c-ai-kb）；What=`src/lib/kb/{filetype,parse,chunk}.ts` 三个纯函数模块 + 19 条单测；When=2026-10-17（北京时间）；Where=src/lib/kb/**、src/lib/__tests__/lane-c/**；Why=S-C3 上传文件可解析（ADR-025 §2/§4；M-10）；How=扩展名+MIME+文件头魔数三重校验（伪装文件靠魔数拦下）、mammoth 抽 docx 文本、按句读边界切分 ≤800 字重叠 100 字。

## 改动文件
- `src/lib/kb/filetype.ts`（新）：`checkUploadFile(filename, mimeType, head)` 三重校验（① 扩展名白名单来自契约 `KB_FILE_EXTS`；② 文件头魔数 `sniffRejectedMagic` 覆盖 PDF `%PDF` / PNG / JPEG / GIF / WEBP（RIFF+WEBP 双段）/ BMP / TIFF；③ MIME 声明 `image/*`、`application/pdf` 拒绝）；拒绝文案一律契约 `KB_REJECT_MESSAGE`；附 `mimeForExt`、`isZipContainer`、`ALLOWED_EXTS`。
- `src/lib/kb/parse.ts`（新）：`parseDocx`（mammoth `extractRawText`，空文本 → failed，抛错 → failed 不冒泡）、`parseByExt`（docx→mammoth；md/markdown/txt→UTF-8 直读 + BOM/CRLF 归一化；**doc→skipped**（无纯 JS 解析，ADR-025）；其他→skipped）、`normalizeText`。
- `src/lib/kb/chunk.ts`（新）：`CHUNK_MAX_CHARS=800`、`CHUNK_OVERLAP_CHARS=100`；`chunkText` 逐片推进（`next = end - overlap`，含前进防御避免死循环）、句读回退（最多回退 40% 避免碎片）、代理对安全（不在 emoji 中间切断）、参数校验（overlap ≥ max 抛错）；`estimateChunkCount`。
- `src/lib/__tests__/lane-c/kb-file.test.ts`（新）：**19 用例**，fixtures 全部 Buffer 手构（含最小 docx：手写 zip local/central/EOCD + deflate + crc32）。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| 伪装文件全部被拒且返回 KB_REJECT_MESSAGE | PASS | 伪装 .txt 的 PDF（reason=magic/detected=PDF）、伪装 .md 的 PNG（magic/PNG）均拒且 `message === KB_REJECT_MESSAGE` |
| docx 抽出预期文本 | PASS | `parseDocx(DOCX).text` 含「这是一段 docx 正文」 |
| 切分边界与重叠正确 | PASS | 800 字=1 片；801 字=2 片且第 2 片首 100 字 = 第 1 片尾 100 字；1600 字逐片 ≤800；句读边界不切半句；emoji 不拆断；非法参数抛错 |
| `grep -rnE "pdf-parse\|pdfjs\|tesseract" package.json src/lib/kb` 为空 | PASS | 无命中（exit 1） |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0（清理分支切换残留 `.next/{dev,types}` 后）、vitest **363 passed**、build=0 |
| 越界检查 | PASS | 仅 `src/lib/kb/**`、`src/lib/__tests__/lane-c/**`，越界 0 |

## 命令
```bash
npx vitest run src/lib/__tests__/lane-c/kb-file.test.ts   # 19 passed
grep -rnE "pdf-parse|pdfjs|tesseract" package.json src/lib/kb  # 无命中
npm run lint && npm run typecheck && npm test && npm run build  # 全 exit 0
```

## UNKNOWN 及原因
- `.doc`（旧版 Word）：无纯 JS 解析方案 → `localParse="skipped"`（ADR-025 既定口径），仅走 Coze 同步；本地不入条目。
- 例外说明：`.text/plain` 声明但内容为二进制（非 PDF/图片魔数）的文件不会被拒——契约只要求拒绝 PDF 与图片，且此类文件的解析在 `parseByExt` 会因空/乱码内容判 failed。

## 执行方式说明
- 本卡首轮以子智能体隔离执行（write_scope 限 `src/lib/kb/`、`src/lib/__tests__/lane-c/`、证据目录），子智能体超时且零产出；核实无残留写入后，由主代理按同一 write_scope 直接完成（无越界）。

## 后续方向待办
- C-04（依赖本卡）：Coze 知识库客户端（建库/推文档/进度）。
- C-05 / C-06：本地检索与知识库 API（C-06 合并后 E-04/E-11 的 kb e2e 可复跑）。
