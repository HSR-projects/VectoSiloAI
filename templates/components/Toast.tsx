// @ts-nocheck
// Template ID: feedback-toast
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: {
    message: string;
    type?: ToastType;
    duration?: number;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-[#10a37f]" />,
  error: <XCircle className="w-5 h-5 text-[#ef4444]" />,
  info: <Info className="w-5 h-5 text-[#3b82f6]" />,
  warning: <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />,
};

const borderColors: Record<ToastType, string> = {
  success: "border-l-[#10a37f]",
  error: "border-l-[#ef4444]",
  info: "border-l-[#3b82f6]",
  warning: "border-l-[#f59e0b]",
};

let toastCounter = 0;

export function toast(opts: {
  message: string;
  type?: ToastType;
  duration?: number;
}) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("vectosilo-toast", {
      detail: {
        id: ++toastCounter + "",
        message: opts.message,
        type: opts.type ?? "info",
        duration: opts.duration ?? 4000,
      },
    });
    window.dispatchEvent(event);
  }
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
      timersRef.current.delete(t.id);
    }, t.duration);
    timersRef.current.set(t.id, timer);
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Toast>).detail;
      addToast(detail);
    };
    window.addEventListener("vectosilo-toast", handler);
    return () => window.removeEventListener("vectosilo-toast", handler);
  }, [addToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-lg",
              "bg-[#2f2f2f] border border-[#424242] border-l-4",
              borderColors[t.type],
              "shadow-lg"
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
            <p className="flex-1 text-sm text-[#ececec]">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-[#8e8e93] hover:text-[#ececec] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
