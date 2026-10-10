"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}>({ value: "", onChange: () => {}, isOpen: false, setIsOpen: () => {} });

export function Select({ value = "", onValueChange, children, placeholder }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange || (() => {}), isOpen, setIsOpen }}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isOpen, setIsOpen, value } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-white/[0.15] bg-white/[0.04] px-3 py-2 text-sm text-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 hover:border-white/[0.25] hover:bg-white/[0.06]",
        className
      )}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span className={cn(!value && "text-gray-500")}>{value || placeholder}</span>;
}

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isOpen } = React.useContext(SelectContext);
  if (!isOpen) return null;
  return (
    <div
      className={cn(
        "absolute z-50 w-full rounded-md border border-white/[0.15] bg-[#161922] text-gray-300 shadow-md mt-1",
        className
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

export function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { value: selectedValue, onChange, setIsOpen } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      onClick={() => {
        onChange(value);
        setIsOpen(false);
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none text-gray-300 hover:bg-white/[0.08] hover:text-white",
        isSelected && "bg-white/[0.12] text-white",
        className
      )}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          ✓
        </span>
      )}
      {children}
    </div>
  );
}
