"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, Palette } from "lucide-react";
import { useVectoSiloStore } from "@/lib/store";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Slide } from "@/types";
import { SLIDE_TEMPLATES, getTemplate, hex, type SlideTemplate } from "@/lib/slideTemplates";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "Professional", label: "Professional", emoji: "💼" },
  { key: "Creative", label: "Creative", emoji: "🎨" },
  { key: "Minimal", label: "Minimal", emoji: "◻️" },
  { key: "Dark", label: "Dark", emoji: "🌙" },
] as const;

export function SlidesArtifact() {
  const deck = useVectoSiloStore((s) => s.slides);
  const setComposerDraft = useVectoSiloStore((s) => s.setComposerDraft);
  const setSlidesTemplate = useVectoSiloStore((s) => s.setSlidesTemplate);
  const closeArtifact = useVectoSiloStore((s) => s.closeArtifact);
  const { caps } = useAuth();
  const maxSlides = caps.slidesMax;

  const slides = deck?.slides ?? [];
  const tpl = getTemplate(deck?.template);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(slides.length || 8);
  const [exporting, setExporting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<string | null>(null);

  useEffect(() => {
    if (slides.length) setCount(slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(Math.max(0, slides.length - 1));
  }, [slides.length, current]);

  if (!deck) return null;

  const exportPptx = async () => {
    if (!slides.length) return;
    setExporting(true);
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const p = new pptxgen();
      p.layout = "LAYOUT_WIDE";
      p.author = "VectoSilo AI";
      p.title = deck.title;

      const bg = tpl.bgGradient
        ? { gradient: { color1: tpl.bgGradient.colors[0], color2: tpl.bgGradient.colors[1], angle: tpl.bgGradient.angle } }
        : { color: tpl.bg };

      slides.forEach((sl, i) => {
        const s = p.addSlide();
        if (typeof bg === "object" && "gradient" in bg) {
          s.background = bg;
        } else {
          s.background = { color: tpl.bg };
        }

        const isFirst = i === 0;
        const titleY = isFirst ? 0.5 : 0.3;
        const titleSize = isFirst ? 40 : 28;

        if (isFirst && tpl.decorationColor) {
          s.addShape(p.ShapeType.ellipse, {
            x: 8.5, y: -0.8, w: 4, h: 4,
            fill: { color: tpl.decorationColor, transparency: 85 },
          });
        }

        if (tpl.decorationColor) {
          s.addShape(p.ShapeType.rect, {
            x: 0.5, y: titleY + 1.0, w: 1.5, h: 0.05,
            fill: { color: tpl.decorationColor },
          });
        }

        s.addText(sl.title, {
          x: 0.5, y: titleY, w: 12.3, h: 1.2,
          fontSize: titleSize, bold: true, color: tpl.title, align: "left", fontFace: tpl.font,
        });

        if (sl.bullets.length) {
          const bulletY = isFirst ? 2.0 : 1.6;
          s.addText(
            sl.bullets.map((b) => ({ text: b, options: { bullet: { code: "2022" }, breakLine: true } })),
            { x: 0.6, y: bulletY, w: 11.5, h: 5, fontSize: 18, color: tpl.text, valign: "top", lineSpacingMultiple: 1.3, fontFace: tpl.font }
          );
        }

        if (!isFirst && tpl.decorationColor) {
          s.addShape(p.ShapeType.rect, {
            x: 0, y: 0, w: 0.12, h: 5.63,
            fill: { color: tpl.decorationColor },
          });
        }

        if (sl.notes) s.addNotes(sl.notes);
      });

      await p.writeFile({ fileName: `${slug(deck.title)}.pptx` });
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  };

  const regenerate = () => {
    const n = Math.max(1, Math.min(maxSlides, count));
    setComposerDraft(`Recreate the presentation "${deck.title}" with exactly ${n} slides.`);
    closeArtifact();
  };

  const slide = slides[current];

  const filtered = pickerCategory
    ? SLIDE_TEMPLATES.filter((t) => t.category === pickerCategory)
    : SLIDE_TEMPLATES;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-vectosilo-border px-3 py-2">
        <span className="text-xs text-vectosilo-muted">
          {slides.length} slide{slides.length === 1 ? "" : "s"}
          {deck.status === "building" && " · generating…"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              title="Choose a template"
              className="inline-flex items-center gap-1.5 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-2.5 py-1.5 text-xs text-vectosilo-text transition-colors hover:bg-vectosilo-surface-2"
            >
              <span className="h-3 w-3 rounded-full" style={{ background: tpl.previewBg }} />
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tpl.name}</span>
            </button>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-vectosilo-border bg-vectosilo-surface p-2 shadow-xl">
                  <div className="mb-1.5 flex gap-1">
                    <button
                      onClick={() => setPickerCategory(null)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                        !pickerCategory ? "bg-vectosilo-accent/20 text-vectosilo-accent" : "text-vectosilo-muted hover:text-vectosilo-text"
                      )}
                    >
                      All
                    </button>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setPickerCategory(cat.key)}
                        className={cn(
                          "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                          pickerCategory === cat.key ? "bg-vectosilo-accent/20 text-vectosilo-accent" : "text-vectosilo-muted hover:text-vectosilo-text"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filtered.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSlidesTemplate(t.id);
                          setPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-vectosilo-surface-2",
                          t.id === tpl.id && "bg-vectosilo-surface-2"
                        )}
                      >
                        <span
                          className="h-6 w-8 shrink-0 rounded-md border border-white/10"
                          style={{ background: t.previewBg }}
                        />
                        <span className="flex-1 text-vectosilo-text">{t.name}</span>
                        <span className="text-[10px] text-vectosilo-muted">{t.category}</span>
                        {t.id === tpl.id && <span className="h-1.5 w-1.5 rounded-full bg-vectosilo-accent" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-2 py-1">
            <input
              type="number"
              min={1}
              max={maxSlides}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(maxSlides, Number(e.target.value) || 1)))}
              className="w-12 bg-transparent text-center text-xs text-vectosilo-text focus:outline-none"
              aria-label="Number of slides"
            />
            <span className="text-[10px] text-vectosilo-muted">/ {maxSlides}</span>
          </div>
          <button
            type="button"
            onClick={regenerate}
            title="Put a regenerate prompt in the composer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-2.5 py-1.5 text-xs text-vectosilo-text transition-colors hover:bg-vectosilo-surface-2"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </button>
          <button
            type="button"
            onClick={exportPptx}
            disabled={!slides.length || exporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-vectosilo-accent px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-vectosilo-accent-soft disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            .pptx
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {slide ? (
          <SlideCard slide={slide} index={current} tpl={tpl} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-vectosilo-muted">
            {deck.status === "building" ? "Generating slides…" : "No slides yet."}
          </div>
        )}

        {slide?.notes && (
          <div className="mt-3 rounded-lg border border-vectosilo-border bg-vectosilo-surface/50 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-vectosilo-muted">Speaker notes</p>
            <p className="text-xs text-vectosilo-text/80">{slide.notes}</p>
          </div>
        )}
      </div>

      {slides.length > 0 && (
        <div className="flex items-center gap-2 border-t border-vectosilo-border px-3 py-2">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            aria-label="Previous slide"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-vectosilo-muted hover:bg-vectosilo-surface-2 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 gap-1.5 overflow-x-auto [scrollbar-width:thin]">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                title={s.title}
                className={cn(
                  "h-7 shrink-0 rounded-md border px-2 text-[11px] transition-colors",
                  i === current
                    ? "border-vectosilo-accent bg-vectosilo-accent/15 text-vectosilo-accent-soft"
                    : "border-vectosilo-border text-vectosilo-muted hover:bg-vectosilo-surface-2"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-xs text-vectosilo-muted">
            {current + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
            disabled={current >= slides.length - 1}
            aria-label="Next slide"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-vectosilo-muted hover:bg-vectosilo-surface-2 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SlideCard({ slide, index, tpl }: { slide: Slide; index: number; tpl: SlideTemplate }) {
  return (
    <div
      className="relative mx-auto flex aspect-video w-full max-w-2xl flex-col justify-start gap-4 overflow-hidden rounded-xl border border-vectosilo-border p-7 shadow-xl"
      style={{ background: tpl.previewBg }}
    >
      {tpl.decorationColor && index === 0 && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-10"
          style={{ background: hex(tpl.decorationColor) }}
        />
      )}
      {tpl.decorationColor && index > 0 && (
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-1 opacity-60"
          style={{ background: hex(tpl.decorationColor) }}
        />
      )}
      <div className="relative z-10 flex flex-col gap-2">
        <h2
          className={cn("font-semibold leading-tight", index === 0 ? "text-3xl" : "text-2xl")}
          style={{ color: hex(tpl.title) }}
        >
          {slide.title}
        </h2>
        <span className="h-1 w-12 rounded-full" style={{ background: hex(tpl.accent) }} />
      </div>
      <ul className="relative z-10 space-y-2">
        {slide.bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-snug" style={{ color: hex(tpl.text) }}>
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: hex(tpl.accent) }}
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase().replace(/^-|-$/g, "") || "presentation";
}
