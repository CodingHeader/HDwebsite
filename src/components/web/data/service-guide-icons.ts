import type { LucideIcon } from "lucide-react";
import {
  FileText,
  HelpCircle,
  DollarSign,
  Calendar,
  BookOpen,
  Award,
  Phone,
  MessageSquare,
  MessageCircle,
  MapPin,
  Laptop,
  Newspaper,
} from "lucide-react";

/**
 * 服务指南图标目录 - 前后台共享的单一 source of truth
 *
 * 前台 TopEntranceSection 与后台 manager/service-guides 均引用此目录，
 * 任何时候需要新增图标必须在此处同时注册，避免前后不一致。
 *
 * value: 存入数据库的图标标识（与 lucide 导出名保持一致，便于扩展）
 * label: 后台选项展示的中文名
 * icon:  对应的 lucide 图标组件
 */
export interface ServiceGuideIcon {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const SERVICE_GUIDE_ICONS: readonly ServiceGuideIcon[] = [
  { value: "FileText", label: "文件", icon: FileText },
  { value: "HelpCircle", label: "帮助", icon: HelpCircle },
  { value: "DollarSign", label: "费用", icon: DollarSign },
  { value: "Calendar", label: "日历", icon: Calendar },
  { value: "BookOpen", label: "书本", icon: BookOpen },
  { value: "Award", label: "奖章", icon: Award },
  { value: "Phone", label: "电话", icon: Phone },
  { value: "MessageSquare", label: "咨询", icon: MessageSquare },
  { value: "MessageCircle", label: "对话", icon: MessageCircle },
  { value: "MapPin", label: "位置", icon: MapPin },
  { value: "Laptop", label: "电脑", icon: Laptop },
  { value: "Newspaper", label: "资讯", icon: Newspaper },
] as const;

/** 查表：根据 value 返回 lucide 组件，未找到则回退到 FileText */
export function resolveServiceGuideIcon(value: string): LucideIcon {
  const found = SERVICE_GUIDE_ICONS.find((i) => i.value === value);
  return found?.icon ?? FileText;
}
