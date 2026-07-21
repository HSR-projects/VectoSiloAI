"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Grid3X3, Layers, LayoutDashboard, UserCircle, FileText,
  ShoppingCart, CreditCard, Smartphone, Palette, ArrowRight,
  Code, Eye, Menu, X, ChevronDown
} from "lucide-react";

type TemplateInfo = {
  id: string;
  file: string;
  type: string;
  category: string;
  description: string;
};

type CategoryInfo = {
  label: string;
  description: string;
  templates: string[];
};

export default function TemplateGallery() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [categories, setCategories] = useState<Record<string, CategoryInfo>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TemplateInfo | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates);
        setCategories(d.categories);
        setLoading(false);
      });
  }, []);

  const filtered = templates.filter((t) => {
    const matchCat = !activeCategory || t.category === activeCategory;
    const matchSearch = !search || t.id.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    layout: <Layers className="w-4 h-4" />,
    navigation: <Menu className="w-4 h-4" />,
    hero: <Eye className="w-4 h-4" />,
    cards: <CreditCard className="w-4 h-4" />,
    forms: <FileText className="w-4 h-4" />,
    feedback: <Smartphone className="w-4 h-4" />,
    "data-display": <Grid3X3 className="w-4 h-4" />,
    marketing: <ShoppingCart className="w-4 h-4" />,
    "ui-elements": <Palette className="w-4 h-4" />,
    "pages-landing": <Layers className="w-4 h-4" />,
    "pages-dashboard": <LayoutDashboard className="w-4 h-4" />,
    "pages-auth": <UserCircle className="w-4 h-4" />,
    "pages-content": <FileText className="w-4 h-4" />,
    "pages-pricing": <CreditCard className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-vectosilo-bg text-vectosilo-text">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-vectosilo-border bg-vectosilo-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vectosilo-accent to-blue-500 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">VectoSiloAI Templates</span>
            <span className="px-2 py-0.5 rounded-full bg-vectosilo-accent/20 text-vectosilo-accent text-xs font-medium">
              {templates.length}
            </span>
          </div>
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="lg:hidden p-2 rounded-lg hover:bg-vectosilo-surface-2"
          >
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="hidden lg:flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vectosilo-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-64 pl-9 pr-4 h-9 rounded-lg bg-vectosilo-surface border border-vectosilo-border text-sm focus:outline-none focus:border-vectosilo-accent"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="space-y-1 sticky top-24">
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                !activeCategory ? "bg-vectosilo-accent/20 text-vectosilo-accent" : "text-vectosilo-muted hover:text-vectosilo-text hover:bg-vectosilo-surface-2"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              All Templates
            </button>
            {Object.entries(categories).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeCategory === key ? "bg-vectosilo-accent/20 text-vectosilo-accent" : "text-vectosilo-muted hover:text-vectosilo-text hover:bg-vectosilo-surface-2"
                }`}
              >
                {categoryIcons[key] || <Grid3X3 className="w-4 h-4" />}
                <div className="flex-1 text-left truncate">
                  <div>{cat.label}</div>
                  <div className="text-xs opacity-60">{cat.templates.length}</div>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile category menu */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden fixed inset-0 top-16 z-40 bg-vectosilo-bg/95 backdrop-blur-md p-4 overflow-auto"
            >
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vectosilo-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-4 h-10 rounded-lg bg-vectosilo-surface border border-vectosilo-border text-sm focus:outline-none focus:border-vectosilo-accent"
                />
              </div>
              <button
                onClick={() => { setActiveCategory(null); setMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                  !activeCategory ? "bg-vectosilo-accent/20 text-vectosilo-accent" : "text-vectosilo-muted"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                All Templates
              </button>
              {Object.entries(categories).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => { setActiveCategory(key); setMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                    activeCategory === key ? "bg-vectosilo-accent/20 text-vectosilo-accent" : "text-vectosilo-muted"
                  }`}
                >
                  {categoryIcons[key] || <Grid3X3 className="w-4 h-4" />}
                  <div className="flex-1 text-left truncate">
                    <div>{cat.label}</div>
                    <div className="text-xs opacity-60">{cat.templates.length}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-vectosilo-surface animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">
                  {activeCategory ? categories[activeCategory]?.label : "All Templates"}
                  <span className="text-vectosilo-muted text-sm ml-2">({filtered.length})</span>
                </h2>
                <div className="text-xs text-vectosilo-muted">
                  {templates.length} total templates
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filtered.map((t) => (
                    <motion.button
                      layout
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setSelected(t)}
                      className="group text-left p-5 rounded-xl bg-vectosilo-surface border border-vectosilo-border hover:border-vectosilo-accent/50 transition-all hover:shadow-glow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="px-2 py-0.5 rounded-md bg-vectosilo-surface-2 text-[10px] font-medium text-vectosilo-muted uppercase tracking-wider">
                          {t.type}
                        </div>
                        <Code className="w-4 h-4 text-vectosilo-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-medium text-sm mb-1.5 group-hover:text-vectosilo-accent transition-colors">
                        {t.id}
                      </h3>
                      <p className="text-xs text-vectosilo-muted line-clamp-2">
                        {t.description}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-vectosilo-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-3 h-3" />
                        View Details
                        <ArrowRight className="w-3 h-3 ml-auto" />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <Search className="w-12 h-12 text-vectosilo-muted mx-auto mb-4 opacity-40" />
                  <p className="text-vectosilo-muted">No templates found</p>
                  <button
                    onClick={() => { setSearch(""); setActiveCategory(null); }}
                    className="mt-3 text-sm text-vectosilo-accent hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-vectosilo-surface border border-vectosilo-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="px-2.5 py-1 rounded-md bg-vectosilo-surface-2 text-xs font-medium text-vectosilo-muted uppercase">
                  {selected.type}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-vectosilo-surface-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-semibold mb-2">{selected.id}</h3>
              <p className="text-sm text-vectosilo-muted mb-4">{selected.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 rounded-md bg-vectosilo-accent/20 text-vectosilo-accent text-xs">
                  {categories[selected.category]?.label || selected.category}
                </span>
                <span className="px-2 py-1 rounded-md bg-vectosilo-surface-2 text-vectosilo-muted text-xs">
                  {selected.file}
                </span>
              </div>
              <div className="rounded-xl bg-vectosilo-surface-2 p-4">
                <div className="flex items-center gap-2 text-xs text-vectosilo-muted mb-2">
                  <Code className="w-3.5 h-3.5" />
                  Usage
                </div>
                <code className="text-xs text-vectosilo-text block">
                  {`import { ${selected.id.split("-").map((s, i) => i ? s.charAt(0).toUpperCase() + s.slice(1) : s.charAt(0).toUpperCase() + s.slice(1)).join("")} } from "@/templates"`}
                </code>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
