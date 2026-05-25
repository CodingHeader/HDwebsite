import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  getLatestWatchedMtimeMs,
  shouldRunBuild,
} from "../start-next-utils.mjs";

test("shouldRunBuild returns true when production build is missing", () => {
  const tempDir = path.join(os.tmpdir(), `start-next-test-${Date.now()}-missing`);
  mkdirSync(path.join(tempDir, "src"), { recursive: true });
  writeFileSync(path.join(tempDir, "src", "app.ts"), "export {};\n", "utf8");

  assert.equal(
    shouldRunBuild({
      projectRoot: tempDir,
      buildIdPath: path.join(tempDir, ".next", "BUILD_ID"),
      watchEntries: ["src"],
    }),
    true,
  );

  rmSync(tempDir, { recursive: true, force: true });
});

test("shouldRunBuild returns true when watched sources are newer than BUILD_ID", async () => {
  const tempDir = path.join(os.tmpdir(), `start-next-test-${Date.now()}-stale`);
  mkdirSync(path.join(tempDir, ".next"), { recursive: true });
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(path.join(tempDir, ".next", "BUILD_ID"), "build-1\n", "utf8");
  writeFileSync(path.join(tempDir, "src", "app.ts"), "export const value = 1;\n", "utf8");

  const buildIdPath = path.join(tempDir, ".next", "BUILD_ID");
  const sourcePath = path.join(tempDir, "src", "app.ts");
  const oldDate = new Date("2026-05-06T08:00:00.000Z");
  const newDate = new Date("2026-05-06T08:05:00.000Z");
  const { utimesSync } = await import("node:fs");
  utimesSync(buildIdPath, oldDate, oldDate);
  utimesSync(sourcePath, newDate, newDate);

  assert.equal(
    shouldRunBuild({
      projectRoot: tempDir,
      buildIdPath,
      watchEntries: ["src"],
    }),
    true,
  );

  rmSync(tempDir, { recursive: true, force: true });
});

test("getLatestWatchedMtimeMs ignores missing watch entries and returns newest source time", async () => {
  const tempDir = path.join(os.tmpdir(), `start-next-test-${Date.now()}-mtime`);
  mkdirSync(path.join(tempDir, "src", "nested"), { recursive: true });
  const older = path.join(tempDir, "src", "app.ts");
  const newer = path.join(tempDir, "src", "nested", "page.tsx");
  writeFileSync(older, "export const older = true;\n", "utf8");
  writeFileSync(newer, "export const newer = true;\n", "utf8");

  const { utimesSync } = await import("node:fs");
  utimesSync(older, new Date("2026-05-06T08:00:00.000Z"), new Date("2026-05-06T08:00:00.000Z"));
  utimesSync(newer, new Date("2026-05-06T08:10:00.000Z"), new Date("2026-05-06T08:10:00.000Z"));

  assert.equal(
    getLatestWatchedMtimeMs(tempDir, ["src", "missing.txt"]),
    new Date("2026-05-06T08:10:00.000Z").getTime(),
  );

  rmSync(tempDir, { recursive: true, force: true });
});
