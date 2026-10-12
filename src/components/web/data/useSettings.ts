"use client";

/**
 * 前台客户端设置 Hook（移植自 main `src/hooks/useSettings.ts`，P02）
 * 差异：默认值取自前台快照 WEB_SETTING_DEFAULTS（main 口径）；/api/settings 返回对象形态（upgrade 契约）。
 */
import { useEffect, useState } from "react";
import { WEB_SETTING_DEFAULTS } from "./setting-defaults";

interface Settings {
  [key: string]: string | null;
}

interface UseSettingsReturn {
  settings: Settings;
  isLoading: boolean;
  getSetting: (key: string, defaultValue?: string) => string;
}

const DEFAULT_SETTINGS: Record<string, string> = { ...WEB_SETTING_DEFAULTS };

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const result = await response.json();
          if (result.code === 200) {
            // 兼容两种格式：数组 [{key, value}] 或对象 {key: value}
            let settingsMap: Settings = {};
            if (Array.isArray(result.data)) {
              settingsMap = result.data.reduce(
                (acc: Settings, item: { key: string; value: string | null }): Settings => {
                  acc[item.key] = item.value;
                  return acc;
                },
                {} as Settings
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
