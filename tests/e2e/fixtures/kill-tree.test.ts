/**
 * kill-tree 单测（E-12）：平台分支的进程树结束函数与启动命令分支。
 * 说明：vitest.config.ts 的 include（冻结）不含 tests/e2e/**，本文件以
 * `npx vitest run --include tests/e2e/fixtures/kill-tree.test.ts` 显式运行（不改冻结配置）。
 */
import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import { appSpawnArgs, killTree } from "./kill-tree";

describe("killTree（E-12 跨平台进程树结束）", () => {
  it("对不存在的 PID 调用不抛错（幂等容错）", () => {
    expect(() => killTree(999_999_999)).not.toThrow();
  });

  it("win32 分支走 taskkill、POSIX 分支走 process.kill(-pid)——当前平台可执行不抛错", () => {
    // 启动一个短命子进程再结束，验证真实路径
    const child = spawn(process.execPath, ["-e", "setTimeout(()=>{}, 30000)"], { detached: process.platform !== "win32", stdio: "ignore" });
    expect(() => killTree(child.pid!)).not.toThrow();
  });
});

describe("appSpawnArgs（E-12 启动命令平台分支）", () => {
  it("standalone 环境：返回 [node, server.js]（与 827646b 字节级一致）", () => {
    const { cmd, args } = appSpawnArgs("/root", "/root/.next/standalone/server.js", 6791);
    expect(args).toEqual(["/root/.next/standalone/server.js"]);
    expect(cmd).toBe(process.execPath);
  });

  it("serverJs 为 null 且非 win32：抛错（standalone 平台必须提供产物）", () => {
    if (process.platform === "win32") return; // win32 回退合法
    expect(() => appSpawnArgs("/root", null, 6791)).toThrow(/standalone/);
  });

  it("win32 回退分支：next start 命令形态正确（仅 win32 断言）", () => {
    if (process.platform !== "win32") return;
    const { args } = appSpawnArgs("C:/root", null, 6791);
    expect(args[0]).toContain("next/dist/bin/next");
    expect(args.slice(1)).toEqual(["start", "-p", "6791", "-H", "127.0.0.1"]);
  });
});
