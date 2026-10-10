"use client";

import { useEffect, useState } from "react";
import { getDefaultValues } from "@/lib/settings-registry";

interface Settings {
  [key: string]: string | null;
}

interface UseSettingsReturn {
  settings: Settings;
  isLoading: boolean;
  getSetting: (key: string, defaultValue?: string) => string;
}

// 从Registry获取默认值（SSOT）
const DEFAULT_SETTINGS: Record<string, string> = getDefaultValues();

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        // 优先尝试 v2 API（带分组和元数据）
        let response = await fetch("/api/v2/settings");
        if (response.ok) {
          const result = await response.json();
          if (result.code === 200 && result.data?.flat) {
            // v2 格式：{ groups: [...], flat: { key: value } }
            setSettings((prev) => ({ ...prev, ...result.data.flat }));
            setIsLoading(false);
            return;
          }
        }

        // 回退到 v1 API
        response = await fetch("/api/settings");
        if (response.ok) {
          const result = await response.json();
          if (result.code === 200) {
            // 兼容两种格式：数组 [{key, value}] 或对象 {key: value}
            let settingsMap: Settings = {};
            if (Array.isArray(result.data)) {
              settingsMap = result.data.reduce(
                (acc: Settings, item: { key: string; value: string | null }) => {
                  acc[item.key] = item.value;
                  return acc;
                },
                {}
              );
            } else if (typeof result.data === "object" && result.data !== null) {
              settingsMap = result.data as Settings;
            }
            setSettings((prev) => ({ ...prev, ...settingsMap }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const getSetting = (key: string, defaultValue: string = ""): string => {
    return settings[key] ?? DEFAULT_SETTINGS[key] ?? defaultValue;
  };

  return { settings, isLoading, getSetting };
}
