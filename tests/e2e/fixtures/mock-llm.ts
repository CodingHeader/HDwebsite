/**
 * 本地 mock 上游（P05 E2E）：
 * - POST /v1/chat/completions：OpenAI 兼容；stream=true 时以 SSE 逐段返回 MOCK_REPLY，否则返回 JSON
 * - GET  /news/list.html：采集源列表页（默认解析规则 ul.list li > a）
 * - GET  /news/:n.html：采集正文页（.content）
 * 供 LLMProvider.endpoint 指向 http://127.0.0.1:<port>/v1、CollectSource.url 指向 /news/list.html。
 */
import http from "node:http";
import { MOCK_REPLY } from "./env";

export const MOCK_NEWS = [
  { id: 1, title: "E2E 采集新闻：2026 年自学考试报名通知" },
  { id: 2, title: "E2E 采集新闻：成人高考考前须知" },
];

function chunks(text: string, size = 6): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

export function startMockServer(port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    if (req.method === "POST" && url.pathname.endsWith("/chat/completions")) {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", async () => {
        let stream = false;
        try {
          stream = Boolean(JSON.parse(raw).stream);
        } catch {
          /* ignore */
        }
        if (!stream) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: "mock",
              object: "chat.completion",
              choices: [{ index: 0, message: { role: "assistant", content: MOCK_REPLY }, finish_reason: "stop" }],
              usage: { prompt_tokens: 10, completion_tokens: 20 },
            })
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
        for (const part of chunks(MOCK_REPLY)) {
          res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: part } }] })}\n\n`);
          await new Promise((r) => setTimeout(r, 40));
        }
        res.write("data: [DONE]\n\n");
        res.end();
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/news/list.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<!doctype html><html><body><ul class="list">${MOCK_NEWS.map(
          (n) => `<li><a href="/news/${n.id}.html" title="${n.title}">${n.title}</a><span>2026-10-01</span></li>`
        ).join("")}</ul></body></html>`
      );
      return;
    }
    const m = url.pathname.match(/^\/news\/(\d+)\.html$/);
    if (req.method === "GET" && m) {
      const n = MOCK_NEWS.find((x) => x.id === Number(m[1]));
      if (!n) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html><body><div class="content"><h2>${n.title}</h2><p>这是第 ${n.id} 条 E2E 采集正文，用于审核与发布流程测试。</p></div></body></html>`);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
