import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function collectLatestMtimeMs(entryPath) {
  if (!existsSync(entryPath)) {
    return 0;
  }

  const stats = statSync(entryPath);
  if (stats.isFile()) {
    return stats.mtimeMs;
  }

  if (!stats.isDirectory()) {
    return 0;
  }

  let latest = stats.mtimeMs;
  for (const child of readdirSync(entryPath)) {
    latest = Math.max(latest, collectLatestMtimeMs(path.join(entryPath, child)));
  }

  return latest;
}

export function getLatestWatchedMtimeMs(projectRoot, watchEntries) {
  return watchEntries.reduce((latest, entry) => {
    const absolutePath = path.resolve(projectRoot, entry);
    return Math.max(latest, collectLatestMtimeMs(absolutePath));
  }, 0);
}

/**
 * 纯函数（D-02，可单测）：构建缺失或监视面比构建产物新时需要重建。
 * 输入全部为标量（文件系统读取与纯函数判定分离），单测无需真实 fs。
 */
export function needsRebuild({ buildIdExists, buildIdMtimeMs, latestWatchedMtimeMs }) {
  if (!buildIdExists) {
    return true;
  }
  return latestWatchedMtimeMs > buildIdMtimeMs;
}

export function shouldRunBuild({ projectRoot, buildIdPath, watchEntries }) {
  return needsRebuild({
    buildIdExists: existsSync(buildIdPath),
    buildIdMtimeMs: existsSync(buildIdPath) ? statSync(buildIdPath).mtimeMs : 0,
    latestWatchedMtimeMs: getLatestWatchedMtimeMs(projectRoot, watchEntries),
  });
}
