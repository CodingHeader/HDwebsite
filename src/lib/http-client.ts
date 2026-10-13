/**
 * 统一 HTTP 客户端（`src/lib/http-client.ts`，W0-03 冻结签名）—— 超时、有限重试、统一错误类型 `HttpError`。
 *
 * W0 默认实现仅**新增**能力，不替换任何现有调用方（替换由 B-04 / C 线 / D 线在各自文件内完成）。
 * 语义要点（冻结面，改动需走《契约变更请求》）：
 * - 默认超时 10s、重试 0 次；重试仅覆盖**传输层失败**与 `retryStatuses` 内的状态码。
 * - 非 2xx 默认抛 `HttpError`（`throwOnHttpError: false` 可退回原生 `Response`）。
 * - 传输层失败（超时/网络）抛 `HttpError`，其 `status === 0`。
 */

/** 统一 HTTP 错误：`status === 0` 表示传输层失败（超时/网络），>0 表示 HTTP 状态码 */
export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  /** 非 2xx 时响应体前 2000 字符（已截断，供排障；失败时原 Response 已被消费） */
  readonly bodyText?: string;

  constructor(status: number, message: string, opts: { url?: string; bodyText?: string; cause?: unknown } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = opts.url ?? "";
    this.bodyText = opts.bodyText;
    if (opts.cause !== undefined) (this as { cause?: unknown }).cause = opts.cause;
  }

  /** 是否为传输层失败（超时/网络） */
  get isTransportError(): boolean {
    return this.status === 0;
  }
}

export interface HttpFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  /** 单次请求超时（ms），默认 10000 */
  timeoutMs?: number;
  /** 失败后的**额外**重试次数（不含首次），默认 0 */
  retries?: number;
  /** 重试退避基数（ms）；第 n 次重试等待 `retryDelayMs * 2^n`，置 0 可关闭等待（测试用）。默认 200 */
  retryDelayMs?: number;
  /** 调用方信号，与超时信号合并 */
  signal?: AbortSignal;
  /** 日志前缀（重试与失败时 `console.warn`） */
  logTag?: string;
  /** 非 2xx 是否抛 `HttpError`，默认 true */
  throwOnHttpError?: boolean;
  /** 视为可重试的 HTTP 状态码，默认 [408, 429, 500, 502, 503, 504] */
  retryStatuses?: number[];
}

const DEFAULT_RETRY_STATUSES = [408, 429, 500, 502, 503, 504];

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function warn(logTag: string | undefined, message: string): void {
  console.warn(`[${logTag ?? "http"}] ${message}`);
}

/** 合并外部信号与超时信号（Node 20.3+ 提供 AbortSignal.any，缺失时退化为仅超时） */
function combineSignals(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!external) return timeout;
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  return typeof anyFn === "function" ? anyFn([timeout, external]) : timeout;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * 带超时与有限重试的 fetch。成功（含 `throwOnHttpError: false` 时的任意状态码）返回原生 `Response`。
 * @throws {HttpError} 非 2xx（默认）或传输层失败用尽重试后
 */
export async function httpFetch(url: string, options: HttpFetchOptions = {}): Promise<Response> {
  const {
    method = "GET",
    headers,
    body = null,
    timeoutMs = 10_000,
    retries = 0,
    retryDelayMs = 200,
    signal,
    logTag,
    throwOnHttpError = true,
    retryStatuses = DEFAULT_RETRY_STATUSES,
  } = options;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new HttpError(0, `非法超时值：${timeoutMs}`, { url });
  if (!Number.isInteger(retries) || retries < 0) throw new HttpError(0, `非法重试次数：${retries}`, { url });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { method, headers, body, signal: combineSignals(timeoutMs, signal) });
      if (!res.ok && throwOnHttpError) {
        const bodyText = await res.text().catch(() => "");
        const err = new HttpError(res.status, `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`, {
          url,
          bodyText: bodyText.slice(0, 2000),
        });
        if (attempt < retries && retryStatuses.includes(res.status)) {
          warn(logTag, `${err.message}，第 ${attempt + 1} 次重试 → ${url}`);
          await delay(retryDelayMs * 2 ** attempt);
          continue;
        }
        throw err;
      }
      return res;
    } catch (err) {
      if (err instanceof HttpError) throw err; // 已定型的 HTTP 错误，不再包一层
      if (attempt < retries) {
        warn(logTag, `${describe(err)}，第 ${attempt + 1} 次重试 → ${url}`);
        await delay(retryDelayMs * 2 ** attempt);
        continue;
      }
      throw new HttpError(0, `请求失败（${timeoutMs}ms 超时或网络错误）：${describe(err)}`, { url, cause: err });
    }
  }
  /* istanbul ignore next —— 循环必然在内部 return 或 throw */
  throw new HttpError(0, "请求失败：重试次数已用尽", { url });
}
