/**
 * 跨平台进程树结束与启动分支（E-12 / REQ：门禁可复现）
 * - POSIX：`process.kill(-pid)` 结束进程组（detached:true 创建的进程组）——与 827646b 行为字节级一致
 * - win32：进程组语义不存在（负 PID 抛 ESRCH/EINVAL），用 `taskkill /pid <pid> /T /F` 结束进程树
 * 不改 next.config.ts 与 scripts/start-next.mjs（E-12 禁改面）。
 */
import { spawnSync } from "node:child_process";

/** 结束 pid 及其子进程树；win32 走 taskkill /T /F，其余平台保持 process.kill(-pid, signal) */
export function killTree(pid: number, signal: NodeJS.Signals = "SIGTERM"): void {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    /* 已退出（ESRCH） */
  }
}

/**
 * 被测应用启动命令的平台分支：
 * - standalone 环境（serverJs 非空）：返回 [node, server.js]（与 827646b 字节级一致）
 * - win32 回退（serverJs 为 null）：`node node_modules/next/dist/bin/next start -p <port> -H 127.0.0.1`
 *   （等价 `npm start` 在 win32 的行为；next.config.ts 有意在 win32 关闭 standalone）
 */
export function appSpawnArgs(root: string, serverJs: string | null, port: number): { cmd: string; args: string[] } {
  if (serverJs) return { cmd: process.execPath, args: [serverJs] };
  if (process.platform === "win32") {
    return {
      cmd: process.execPath,
      args: [root + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
    };
  }
  throw new Error("非 win32 平台必须提供 standalone server.js");
}
