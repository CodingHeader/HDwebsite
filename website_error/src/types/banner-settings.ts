// Banner 配置类型定义 — 支持字号级别等扩展配置

export type TitleSizeLevel = "normal" | "large" | "xlarge";
export type SubtitleSizeLevel = "normal" | "large" | "xlarge";

export interface BannerSizeSettings {
  titleSize?: TitleSizeLevel;
  subtitleSize?: SubtitleSizeLevel;
}

// 字号映射表
export const TITLE_SIZE_CLASSES: Record<TitleSizeLevel, string> = {
  normal: "text-3xl md:text-5xl",
  large: "text-4xl md:text-6xl",
  xlarge: "text-5xl md:text-7xl",
};

export const SUBTITLE_SIZE_CLASSES: Record<SubtitleSizeLevel, string> = {
  normal: "text-lg md:text-xl",
  large: "text-xl md:text-2xl",
  xlarge: "text-2xl md:text-3xl",
};
