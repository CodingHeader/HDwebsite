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

export function shouldRunBuild({ projectRoot, buildIdPath, watchEntries }) {
  if (!existsSync(buildIdPath)) {
    return true;
  }

  const buildIdMtimeMs = statSync(buildIdPath).mtimeMs;
  const latestWatchedMtimeMs = getLatestWatchedMtimeMs(projectRoot, watchEntries);
  return latestWatchedMtimeMs > buildIdMtimeMs;
}
