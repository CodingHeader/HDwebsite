/**
 * 环境变量集中校验（D-03）
 *
 * 目标（对照 D-03 卡）：JWT_SECRET/ENCRYPTION_KEY ≥32、DATABASE_URL、APP_ORIGIN、DATA_DIR、
 * HOSTNAME/PORT 由校验；生产缺失即退出并打印键名（**不打印值**）；CRON_SECRET 从 .env.example
 * 移除（ADR-031：无调用方）。
 *
 * 设计约束：
 * - import 时**不抛错**（测试与构建期安全，与 vitest.config.ts / jest-like env 注入兼容）；
 *   校验动作由 instrumentation.ts 显式调用 `assertProductionEnv()`。
 * - 校验为**纯函数** `collectEnvIssues(env)`，便于单测；不触 IO、不读文件。
 * - 只在 `NODE_ENV === "production"` 时执行 `process.exit(1)`；其他环境返回问题列表供日志。
 * - 契约（src/contracts/**）冻结，不依赖。
 */

/** 生产必需键与校验规则；值不会出现在错误信息中，只打印键名 */
const PROD_REQUIRED = {
  JWT_SECRET: (v: string) => v.length >= 32,
  ENCRYPTION_KEY: (v: string) => v.length >= 32,
  DATABASE_URL: (v: string) => v.startsWith("file:") || v.startsWith("http") || v.startsWith("libsql:"),
  APP_ORIGIN: (v: string) => /^https?:\/\//.test(v),
} as const;

/** 可选项：提供时校验（HOSTNAME/PORT 有默认值，非必需） */
const PROD_OPTIONAL = {
  HOSTNAME: (v: string) => v.length > 0,
  PORT: (v: string) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535,
  DATA_DIR: (v: string) => v.length > 0,
} as const;

type EnvLike = Record<string, string | undefined>;

/**
 * 纯函数：返回缺失/不合法的键名列表（不返回值）。
 * @param env 传入 process.env 或测试用字典；`NODE_ENV !== production` 时只校验 JWT/ENC 基础项。
 */
export function collectEnvIssues(env: EnvLike): string[] {
  const issues: string[] = [];
  const isProd = env.NODE_ENV === "production";

  // JWT_SECRET / ENCRYPTION_KEY：任何环境都要求（jwt.ts/crypto.ts 首用时也会 FATAL，这里前置到启动期）
  for (const key of ["JWT_SECRET", "ENCRYPTION_KEY"] as const) {
    const v = env[key];
    if (!v) {
      issues.push(key);
    } else if (v.length < 32) {
      issues.push(`${key}(长度<32)`);
    }
  }

  // 仅生产要求其余键
  if (!isProd) return issues;

  for (const [key, test] of Object.entries(PROD_REQUIRED)) {
    if (key === "JWT_SECRET" || key === "ENCRYPTION_KEY") continue;
    const v = env[key];
    if (!v) {
      issues.push(key);
    } else if (!test(v)) {
      issues.push(`${key}(格式非法)`);
    }
  }

  for (const [key, test] of Object.entries(PROD_OPTIONAL)) {
    const v = env[key];
    if (v === undefined || v === "") continue;
    if (!test(v)) issues.push(`${key}(格式非法)`);
  }

  return issues;
}

/**
 * 生产环境启动校验。缺失键 → console.error 打印键名（不打印值）→ process.exit(1)。
 * 非生产环境只记录 warning，不退出（测试/构建期安全）。
 */
export function assertProductionEnv(env: EnvLike = process.env): void {
  const issues = collectEnvIssues(env);
  if (issues.length === 0) return;

  const isProd = env.NODE_ENV === "production";
  if (isProd) {
    // 只打印键名，绝不打印值（安全铁律 §1）
    console.error(
      `[env] FATAL: 以下环境变量缺失或不符合要求，拒绝生产启动（只列键名，不显示值）：\n` +
        issues.map((i) => `  - ${i}`).join("\n")
    );
    process.exit(1);
  }

  // 非生产：仅提示（不退出，测试/构建仍可继续）
  console.warn(
    `[env] WARN: 以下环境变量不符合要求（仅提示，不阻止运行）：${issues.join(", ")}`
  );
}

/** 生产端口（默认 6789；宝塔 80 反代 → 127.0.0.1:6789）。供 start-next.mjs 或代码侧引用 */
export function productionPort(env: EnvLike = process.env): number {
  const p = Number(env.PORT);
  return Number.isInteger(p) && p >= 1 && p <= 65535 ? p : 6789;
}

/** 生产数据目录（D-09 起生效；缺省 `./data`） */
export function dataDir(env: EnvLike = process.env): string {
  return env.DATA_DIR && env.DATA_DIR.length > 0 ? env.DATA_DIR : "./data";
}