// @ts-nocheck
// Template ID: data-gallery
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

interface GalleryProps extends import("@/templates/utils/types").MotionDivProps {
  images: GalleryImage[];
  columns?: number;
}

const gridCols: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function Gallery({
  images,
  columns = 3,
  className,
  ...rest
}: GalleryProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const open = useCallback((idx: number) => setLightboxIdx(idx), []);
  const close = useCallback(() => setLightboxIdx(null), []);
  const goNext = useCallback(
    () => setLightboxIdx((prev) => (prev !== null ? (prev + 1) % images.length : null)),
    [images.length]
  );
  const goPrev = useCallback(
    () =>
      setLightboxIdx((prev) =>
        prev !== null ? (prev - 1 + images.length) % images.length : null
      ),
    [images.length]
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxIdx, close, goNext, goPrev]);

  return (
    <>
      <div
        className={cn(
          "grid gap-3",
          gridCols[Math.min(Math.max(columns, 1), 4)] ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          className
        )}
        {...rest}
      >
        {images.map((img, i) => (
          <motion.button
            key={i}
            layoutId={`gallery-${i}`}
            onClick={() => open(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.25 }}
          >
            <img
              src={img.src}
              alt={img.alt}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs text-white">{img.caption}</p>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={close}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <X className="h-5 w-5" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <motion.div
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex max-h-[85vh] max-w-[90vw] flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[lightboxIdx].src}
                alt={images[lightboxIdx].alt}
                className="max-h-[75vh] rounded-xl object-contain"
              />
              {images[lightboxIdx].caption && (
                <p className="mt-3 text-sm text-white/80">
                  {images[lightboxIdx].caption}
                </p>
              )}
              <p className="mt-2 text-xs text-white/40">
                {lightboxIdx + 1} / {images.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
