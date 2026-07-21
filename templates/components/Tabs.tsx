// @ts-nocheck
// Template ID: nav-tabs
"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps extends import("@/templates/utils/types").MotionDivProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange, className, ...rest }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    const children = containerRef.current.children;
    if (children[activeIndex]) {
      const el = children[activeIndex] as HTMLElement;
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab, tabs]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex gap-1", className)}
      role="tablist"
      {...rest}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "text-vectosilo-text"
              : "text-vectosilo-muted hover:text-vectosilo-text"
          )}
        >
          {tab.label}
        </button>
      ))}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="absolute bottom-0 h-0.5 rounded-full bg-vectosilo-accent"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
    </div>
  );
}
