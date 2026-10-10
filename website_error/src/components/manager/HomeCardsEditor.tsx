"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageField } from "@/components/manager/ImageField";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HomeCardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  gradient: string;
  hoverGradient: string;
  shadow: string;
  showIcon: boolean;
  showTitle: boolean;
  showSubtitle: boolean;
  showArrow: boolean;
  showDecoration: boolean;
  textAlign: "left" | "center" | "right";
  backgroundImage: string | null;
  backgroundType: "gradient" | "image";
  description: string | null;
  badge: string | null;
}

interface HomeCardsEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const iconOptions = [
  "BookOpen", "GraduationCap", "Globe", "Award", "FileText",
  "MessageSquare", "Shield", "UserCheck", "Clock", "Star",
];

const gradientOptions = [
  { value: "from-blue-500 to-blue-600", label: "蓝色" },
  { value: "from-green-500 to-green-600", label: "绿色" },
  { value: "from-orange-500 to-orange-600", label: "橙色" },
  { value: "from-purple-500 to-purple-600", label: "紫色" },
  { value: "from-red-500 to-red-600", label: "红色" },
  { value: "from-amber-500 to-amber-600", label: "琥珀" },
  { value: "from-cyan-500 to-cyan-600", label: "青色" },
  { value: "from-emerald-500 to-emerald-600", label: "翠绿" },
];

const defaultCard: HomeCardItem = {
  id: "",
  title: "新卡片",
  subtitle: "副标题",
  icon: "BookOpen",
  href: "/courses",
  gradient: "from-blue-500 to-blue-600",
  hoverGradient: "from-blue-400 to-blue-500",
  shadow: "shadow-blue-200",
  showIcon: true,
  showTitle: true,
  showSubtitle: true,
  showArrow: true,
  showDecoration: true,
  textAlign: "left",
  backgroundImage: null,
  backgroundType: "gradient",
  description: null,
  badge: null,
};

export function HomeCardsEditor({ value, onChange }: HomeCardsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Parse JSON value
  const cards: HomeCardItem[] = (() => {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const updateCards = useCallback((newCards: HomeCardItem[]) => {
    onChange(JSON.stringify(newCards));
  }, [onChange]);

  const handleAddCard = () => {
    const newCard: HomeCardItem = {
      ...defaultCard,
      id: `card_${Date.now()}`,
    };
    const newCards = [...cards, newCard];
    updateCards(newCards);
    setExpandedId(newCard.id);
  };

  const handleDeleteCard = (id: string) => {
    const newCards = cards.filter((c) => c.id !== id);
    updateCards(newCards);
  };

  const handleUpdateCard = (id: string, updates: Partial<HomeCardItem>) => {
    const newCards = cards.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    updateCards(newCards);
  };

  const handleMoveCard = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === cards.length - 1) return;
    const newCards = [...cards];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newCards[index], newCards[targetIndex]] = [newCards[targetIndex], newCards[index]];
    updateCards(newCards);
  };

  return (
    <div className="space-y-4">
      {/* Cards List */}
      <div className="space-y-3">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg overflow-hidden"
          >
            {/* Card Header - Always Visible */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.06]"
              onClick={() => setExpandedId(expandedId === card.id ? null : card.id)}
            >
              <GripVertical className="h-4 w-4 text-gray-500" />
              <div
                className={cn("w-4 h-4 rounded bg-gradient-to-br", card.gradient)}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{card.title}</p>
                <p className="text-xs text-gray-500">{card.subtitle}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveCard(index, "up");
                  }}
                  disabled={index === 0}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveCard(index, "down");
                  }}
                  disabled={index === cards.length - 1}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {expandedId === card.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCard(card.id);
                  }}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Expanded Editor */}
            {expandedId === card.id && (
              <div className="p-4 border-t border-white/[0.08] space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">标题</Label>
                    <Input
                      value={card.title}
                      onChange={(e) =>
                        handleUpdateCard(card.id, { title: e.target.value })
                      }
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">副标题</Label>
                    <Input
                      value={card.subtitle}
                      onChange={(e) =>
                        handleUpdateCard(card.id, { subtitle: e.target.value })
                      }
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                </div>

                {/* Icon & Link */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">图标</Label>
                    <select
                      value={card.icon}
                      onChange={(e) =>
                        handleUpdateCard(card.id, { icon: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm"
                    >
                      {iconOptions.map((icon) => (
                        <option key={icon} value={icon} className="bg-[#1a1d27]">
                          {icon}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">跳转链接</Label>
                    <Input
                      value={card.href}
                      onChange={(e) =>
                        handleUpdateCard(card.id, { href: e.target.value })
                      }
                      className="bg-white/[0.04] border-white/[0.08] text-white"
                    />
                  </div>
                </div>

                {/* Background Type */}
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">背景类型</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateCard(card.id, { backgroundType: "gradient" })
                      }
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg border transition-all text-sm",
                        card.backgroundType === "gradient"
                          ? "border-white/30 bg-white/[0.08] text-white"
                          : "border-white/[0.06] bg-white/[0.02] text-gray-400"
                      )}
                    >
                      渐变色
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateCard(card.id, { backgroundType: "image" })
                      }
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg border transition-all text-sm",
                        card.backgroundType === "image"
                          ? "border-white/30 bg-white/[0.08] text-white"
                          : "border-white/[0.06] bg-white/[0.02] text-gray-400"
                      )}
                    >
                      图片
                    </button>
                  </div>
                </div>

                {/* Gradient Selection */}
                {card.backgroundType === "gradient" && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">渐变颜色</Label>
                    <div className="flex gap-2 flex-wrap">
                      {gradientOptions.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() =>
                            handleUpdateCard(card.id, {
                              gradient: g.value,
                              hoverGradient: g.value.replace("500", "400").replace("600", "500"),
                              shadow: `shadow-${g.value.split("-")[1]}-200`,
                            })
                          }
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                            card.gradient === g.value
                              ? "border-white/30 bg-white/[0.08]"
                              : "border-white/[0.06] bg-white/[0.02]"
                          )}
                        >
                          <div className={cn("w-4 h-4 rounded bg-gradient-to-br", g.value)} />
                          <span className="text-xs text-gray-300">{g.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Background Image */}
                {card.backgroundType === "image" && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">背景图片</Label>
                    <ImageField
                      value={card.backgroundImage || ""}
                      onChange={(url) =>
                        handleUpdateCard(card.id, { backgroundImage: url })
                      }
                      placeholder="点击选择背景图片"
                    />
                  </div>
                )}

                {/* Text Align */}
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">文字对齐</Label>
                  <select
                    value={card.textAlign}
                    onChange={(e) =>
                      handleUpdateCard(card.id, {
                        textAlign: e.target.value as "left" | "center" | "right",
                      })
                    }
                    className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm"
                  >
                    <option value="left" className="bg-[#1a1d27]">居左</option>
                    <option value="center" className="bg-[#1a1d27]">居中</option>
                    <option value="right" className="bg-[#1a1d27]">居右</option>
                  </select>
                </div>

                {/* Toggle Switches */}
                <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                  <Label className="text-gray-300 text-sm">显示设置</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "showIcon", label: "显示图标" },
                      { key: "showTitle", label: "显示标题" },
                      { key: "showSubtitle", label: "显示副标题" },
                      { key: "showArrow", label: "显示箭头" },
                      { key: "showDecoration", label: "显示装饰" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Switch
                          checked={card[key as keyof HomeCardItem] as boolean}
                          onCheckedChange={(checked) =>
                            handleUpdateCard(card.id, { [key]: checked })
                          }
                        />
                        <Label className="text-gray-400 text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Button */}
      <Button
        type="button"
        onClick={handleAddCard}
        variant="outline"
        className="w-full border-white/[0.08] text-gray-300 hover:bg-white/[0.04] hover:text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        添加卡片
      </Button>

      {/* Hint */}
      <p className="text-xs text-gray-500">
        提示：拖动卡片可调整顺序，点击卡片展开编辑，关闭所有显示开关可只显示背景图
      </p>
    </div>
  );
}
