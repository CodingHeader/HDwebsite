"use client";

/**
 * useManagerQuery（P05）：后台数据加载的统一五态来源
 * - loading：首次加载（无数据且无错误）；refreshing：已有数据时的再次加载（保留旧数据避免闪烁）
 * - error：ApiError / ForbiddenError（isForbidden(error) → 渲染 <Forbidden/>）
 * - 竞态保护：只采纳最后一次请求的结果
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";

export interface ManagerQuery<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

export function useManagerQuery<T>(path: string | null): ManagerQuery<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const seqRef = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const seq = ++seqRef.current;
    setPending(true);
    try {
      const res = await managerFetch<T>(path);
      if (seq !== seqRef.current) return;
      setDataState(res);
      setError(null);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(e instanceof Error ? e : new Error("加载失败"));
    } finally {
      if (seq === seqRef.current) setPending(false);
    }
  }, [path]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据加载（外部系统同步），状态在 await 前后更新
    void load();
  }, [load]);

  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater));
  }, []);

  return {
    data,
    error,
    loading: data === undefined && !error,
    refreshing: pending && data !== undefined,
    reload: load,
    setData,
  };
}
