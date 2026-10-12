"use client";

/** 管理端本地偏好（侧栏折叠、表格密度）：localStorage + useSyncExternalStore，SSR 安全、跨标签页同步 */
import { useCallback, useSyncExternalStore } from "react";

const EVENT = "hd-mgr-pref";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function usePref<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const read = useCallback(() => {
    const v = window.localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  }, [key, fallback, allowed]);
  const value = useSyncExternalStore(subscribe, read, () => fallback);
  const set = useCallback(
    (v: T) => {
      window.localStorage.setItem(key, v);
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );
  return [value, set];
}
