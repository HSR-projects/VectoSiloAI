// @ts-nocheck
// Template ID: ui-treeview
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNode {
  label: string;
  icon?: ReactNode;
  children?: TreeNode[];
  defaultExpanded?: boolean;
}

interface TreeViewProps {
  nodes: TreeNode[];
  className?: string;
  onSelect?: (node: TreeNode, path: string[]) => void;
}

function TreeItem({
  node,
  depth = 0,
  onSelect,
  path,
}: {
  node: TreeNode;
  depth?: number;
  onSelect?: (node: TreeNode, path: string[]) => void;
  path: string[];
}) {
  const [expanded, setExpanded] = useState(node.defaultExpanded || false);
  const hasChildren = node.children && node.children.length > 0;
  const currentPath = [...path, node.label];

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(node, currentPath);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
          "text-vectosilo-muted hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            size={14}
            className={cn(
              "flex-shrink-0 transition-transform duration-200",
              expanded && "rotate-90"
            )}
          />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        {node.icon || (hasChildren ? <Folder size={14} className="flex-shrink-0 text-vectosilo-accent" /> : <File size={14} className="flex-shrink-0 text-vectosilo-muted" />)}
        <span className="truncate">{node.label}</span>
      </button>
      <AnimatePresence>
        {hasChildren && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children!.map((child, i) => (
              <TreeItem
                key={i}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                path={currentPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TreeView({ nodes, className, onSelect }: TreeViewProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-vectosilo-border bg-vectosilo-surface p-2",
        className
      )}
    >
      {nodes.map((node, i) => (
        <TreeItem key={i} node={node} onSelect={onSelect} path={[]} />
      ))}
    </div>
  );
}
