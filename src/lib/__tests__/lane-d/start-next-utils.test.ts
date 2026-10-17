/**
 * D-02 start-next-utils 纯函数测试：needsRebuild 构建判定。
 * 纯函数（标量输入），无需真实 fs；"touch dev.db 不触发 / 改 schema 触发"的语义在此验证。
 */
import { describe, expect, it } from "vitest";
import { needsRebuild } from "../../../../scripts/start-next-utils.mjs";

const BUILD_ID = 1_000_000;

describe("D-02 needsRebuild（start-next 构建判定纯函数）", () => {
  it("构建缺失（buildIdExists=false）→ 必须重建", () => {
    expect(needsRebuild({ buildIdExists: false, buildIdMtimeMs: 0, latestWatchedMtimeMs: 0 })).toBe(true);
  });

  it("监视面（含 schema/migrations）比构建新 → 重建", () => {
    expect(
      needsRebuild({ buildIdExists: true, buildIdMtimeMs: BUILD_ID, latestWatchedMtimeMs: BUILD_ID + 1 })
    ).toBe(true);
  });

  it("数据库写入（prisma/dev.db）不触发重建——D-02 核心语义", () => {
    // dev.db 不在监视面内：只有 .cache 写入/dev.db touch 时，监视面 mtime 不变 → 不重建
    expect(
      needsRebuild({ buildIdExists: true, buildIdMtimeMs: BUILD_ID, latestWatchedMtimeMs: BUILD_ID })
    ).toBe(false);
  });

  it("源码旧于构建 → 不重建（幂等启动）", () => {
    expect(
      needsRebuild({ buildIdExists: true, buildIdMtimeMs: BUILD_ID, latestWatchedMtimeMs: BUILD_ID - 500 })
    ).toBe(false);
  });

  it("migrations 新增迁移 → 触发重建（迁移面在监视清单内）", () => {
    expect(
      needsRebuild({ buildIdExists: true, buildIdMtimeMs: BUILD_ID, latestWatchedMtimeMs: BUILD_ID + 100 })
    ).toBe(true);
  });
});
