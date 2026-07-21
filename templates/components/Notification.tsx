// @ts-nocheck
// Template ID: ui-notification
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
  type?: "info" | "success" | "warning" | "error";
}

interface NotificationProps {
  items?: NotificationItem[];
  className?: string;
}

const typeIcons = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors = {
  info: "text-blue-400 bg-blue-400/10",
  success: "text-vectosilo-accent bg-vectosilo-accent/10",
  warning: "text-yellow-400 bg-yellow-400/10",
  error: "text-red-400 bg-red-400/10",
};

export function Notification({ items = [], className }: NotificationProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(items);
  const unread = notifications.filter((n) => !n.read).length;

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-vectosilo-muted transition-colors hover:bg-vectosilo-surface hover:text-vectosilo-text"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-vectosilo-border bg-vectosilo-surface shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-vectosilo-border px-4 py-3">
                <span className="text-sm font-semibold text-vectosilo-text">Notifications</span>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-medium text-vectosilo-accent hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-vectosilo-muted">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = typeIcons[n.type || "info"];
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "flex gap-3 border-b border-vectosilo-border/50 px-4 py-3 transition-colors hover:bg-vectosilo-surface-2",
                          !n.read && "bg-vectosilo-accent/5"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                            typeColors[n.type || "info"]
                          )}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-vectosilo-text truncate">{n.title}</p>
                          <p className="text-xs text-vectosilo-muted mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-vectosilo-muted/60 mt-1">{n.time}</p>
                        </div>
                        <button
                          onClick={() => dismiss(n.id)}
                          className="flex-shrink-0 rounded p-0.5 text-vectosilo-muted/40 hover:text-vectosilo-text"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
