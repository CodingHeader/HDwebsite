/**
 * 管理端菜单图标（P02 设计系统）：lucide 按名称显式导入的映射表。
 * 禁止对 lucide-react 做通配命名空间导入（会把整个图标库打进 /manager 包）。新增菜单图标须在此注册。
 */
import { createElement } from "react";
import {
  Activity,
  Award,
  BellRing,
  BookOpen,
  Bot,
  Building2,
  Circle,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  FolderEdit,
  FolderTree,
  Globe,
  GraduationCap,
  History,
  Image,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Library,
  Mail,
  MessageSquare,
  Navigation,
  Newspaper,
  PanelsTopLeft,
  Rss,
  School,
  ScrollText,
  Send,
  Settings,
  Shield,
  Sparkles,
  Tags,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export const MENU_ICONS: Readonly<Record<string, LucideIcon>> = {
  Activity,
  Award,
  BellRing,
  BookOpen,
  Bot,
  Building2,
  Circle,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  FolderEdit,
  FolderTree,
  Globe,
  GraduationCap,
  History,
  Image,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Library,
  Mail,
  MessageSquare,
  Navigation,
  Newspaper,
  PanelsTopLeft,
  Rss,
  School,
  ScrollText,
  Send,
  Settings,
  Shield,
  Sparkles,
  Tags,
  UserPlus,
  Users,
};

export function resolveMenuIcon(name: string | null | undefined): LucideIcon {
  return (name && MENU_ICONS[name]) || Circle;
}

export function MenuIcon({ name, className = "h-4 w-4" }: { name: string | null | undefined; className?: string }) {
  return createElement(resolveMenuIcon(name), { className, "aria-hidden": true });
}
