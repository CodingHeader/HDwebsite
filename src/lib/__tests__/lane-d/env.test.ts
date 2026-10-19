/**
 * D-03 env.ts 单测：环境变量集中校验纯函数。
 * 重点：缺键 → 列出键名；**值不出现在错误信息**；生产缺失退出；非生产仅提示。
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { collectEnvIssues, assertProductionEnv, productionPort, dataDir } from "@/lib/env";

const GOOD_PROD: Record<string, string> = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(40),
  ENCRYPTION_KEY: "b".repeat(40),
  DATABASE_URL: "file:./prisma/dev.db",
  APP_ORIGIN: "https://www.hd1994.com",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("collectEnvIssues", () => {
  it("完整生产配置 → 无问题", () => {
    expect(collectEnvIssues(GOOD_PROD)).toEqual([]);
  });

  it("缺 JWT_SECRET / ENCRYPTION_KEY → 列出键名", () => {
    const issues = collectEnvIssues({ ...GOOD_PROD, JWT_SECRET: undefined, ENCRYPTION_KEY: undefined });
    expect(issues).toContain("JWT_SECRET");
    expect(issues).toContain("ENCRYPTION_KEY");
  });

  it("JWT_SECRET 长度 <32 → 列出键名+标记，不返回值", () => {
    const issues = collectEnvIssues({ ...GOOD_PROD, JWT_SECRET: "short" });
    expect(issues).toContain("JWT_SECRET(长度<32)");
    // 值不出现在错误信息
    expect(JSON.stringify(issues)).not.toContain("short");
  });

  it("生产缺 DATABASE_URL / APP_ORIGIN → 列出键名", () => {
    const issues = collectEnvIssues({ ...GOOD_PROD, DATABASE_URL: undefined, APP_ORIGIN: undefined });
    expect(issues).toContain("DATABASE_URL");
    expect(issues).toContain("APP_ORIGIN");
  });

  it("非生产环境不要求 DATABASE_URL / APP_ORIGIN（构建/测试期安全）", () => {
    const issues = collectEnvIssues({
      NODE_ENV: "test",
      JWT_SECRET: "a".repeat(40),
      ENCRYPTION_KEY: "b".repeat(40),
      // 无 DATABASE_URL / APP_ORIGIN
    });
    expect(issues).toEqual([]);
  });

  it("非法 PORT（如 'abc'）→ 报错", () => {
    const issues = collectEnvIssues({ ...GOOD_PROD, PORT: "abc" });
    expect(issues).toContain("PORT(格式非法)");
  });

  it("合法 PORT / HOSTNAME / DATA_DIR → 不报错", () => {
    const issues = collectEnvIssues({ ...GOOD_PROD, PORT: "6789", HOSTNAME: "0.0.0.0", DATA_DIR: "/data" });
    expect(issues).toEqual([]);
  });

  it("短 JWT_SECRET 值不出现在错误信息（安全）", () => {
    const issues = collectEnvIssues({ ...GOOD_PROD, JWT_SECRET: "secret1234" });
    const msg = JSON.stringify(issues);
    expect(msg).not.toContain("secret1234");
  });
});

describe("assertProductionEnv", () => {
  it("生产缺失 → console.error 打印键名且 process.exit(1)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as unknown as (code?: string | number | null) => never);
    expect(() =>
      assertProductionEnv({ NODE_ENV: "production", JWT_SECRET: "short" } as Record<string, string>)
    ).toThrow("process.exit called");
    expect(errSpy).toHaveBeenCalled();
    const msg = errSpy.mock.calls[0][0] as string;
    expect(msg).toContain("JWT_SECRET");
    expect(msg).not.toContain("short"); // 值不出现在错误
  });

  it("非生产缺失 → 只 console.warn，不 exit", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertProductionEnv({ NODE_ENV: "test" } as Record<string, string>);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("生产完整 → 不报错不退出", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    assertProductionEnv(GOOD_PROD);
    expect(errSpy).not.toHaveBeenCalled();
  });
});

describe("productionPort / dataDir", () => {
  it("productionPort 默认 6789，可用 PORT 覆盖", () => {
    expect(productionPort({})).toBe(6789);
    expect(productionPort({ PORT: "8080" })).toBe(8080);
    expect(productionPort({ PORT: "abc" })).toBe(6789); // 非法回退
  });

  it("dataDir 默认 ./data，可用 DATA_DIR 覆盖", () => {
    expect(dataDir({})).toBe("./data");
    expect(dataDir({ DATA_DIR: "/opt/hdw/data" })).toBe("/opt/hdw/data");
  });
});