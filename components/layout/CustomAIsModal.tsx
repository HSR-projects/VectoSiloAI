"use client";

import { useState, useEffect } from "react";
import { Plus, X, Edit2, Trash2, Bot, Play, Globe, Save, UploadCloud } from "lucide-react";
import { useKodaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PublicCustomAI, CustomAI } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function CustomAIsModal() {
  const { customAIs, customAIsOpen, setCustomAIsOpen, createCustomAI, updateCustomAI, deleteCustomAI, setActiveCustomAIId, activeCustomAIId } = useKodaStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", instructions: "", promptStarters: ["", "", "", ""] });
  
  const [tab, setTab] = useState<"my-ais" | "discover">("my-ais");
  const [publicAIs, setPublicAIs] = useState<PublicCustomAI[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [viewingPublicId, setViewingPublicId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "discover" && customAIsOpen) {
      fetchPublicAIs();
    }
  }, [tab, customAIsOpen]);

  const fetchPublicAIs = async () => {
    setIsLoadingPublic(true);
    try {
      const res = await fetch("/api/custom-ais");
      const data = await res.json();
      if (data.ais) {
        setPublicAIs(data.ais);
      }
    } catch (err) {
      console.error("Failed to fetch public AIs", err);
    } finally {
      setIsLoadingPublic(false);
    }
  };

  const publishAI = async (ai: CustomAI) => {
    setPublishingId(ai.id);
    try {
      const res = await fetch("/api/custom-ais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ai),
      });
      if (!res.ok) throw new Error("Failed to publish");
      alert("AI published to Discover successfully!");
    } catch (err) {
      console.error("Publish error", err);
      alert("Failed to publish AI.");
    } finally {
      setPublishingId(null);
    }
  };

  const savePublicAIToLocal = (publicAI: PublicCustomAI) => {
    // Check if we already have it
    const existing = customAIs.find(a => a.id === publicAI.id);
    if (!existing) {
      // Create it with the same ID so we know we have it
      useKodaStore.setState((s) => ({
        customAIs: [...s.customAIs, { ...publicAI }]
      }));
    }
    setActiveCustomAIId(publicAI.id);
    setCustomAIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setCustomAIsOpen(open);
    if (!open) {
      resetForm();
      setTab("my-ais");
      setViewingPublicId(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: "", description: "", instructions: "", promptStarters: ["", "", "", ""] });
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.instructions.trim()) return;
    
    const cleanStarters = formData.promptStarters.map(s => s.trim()).filter(Boolean);
    
    if (isCreating) {
      createCustomAI(formData.name, formData.description, formData.instructions, cleanStarters);
    } else if (editingId) {
      updateCustomAI(editingId, { ...formData, promptStarters: cleanStarters });
    }
    resetForm();
  };

  const handleEdit = (ai: any) => {
    setFormData({ 
      name: ai.name, 
      description: ai.description, 
      instructions: ai.instructions,
      promptStarters: ai.promptStarters?.length ? [...ai.promptStarters, "", "", "", ""].slice(0, 4) : ["", "", "", ""]
    });
    setEditingId(ai.id);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
    setTab("my-ais");
  };

  const handleSelect = (id: string | null) => {
    setActiveCustomAIId(id);
    setCustomAIsOpen(false);
  };

  const activeAI = customAIs.find(ai => ai.id === activeCustomAIId);
  const viewingPublicAI = publicAIs.find(ai => ai.id === viewingPublicId);

  return (
    <Dialog open={customAIsOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 overflow-hidden bg-koda-bg border-koda-border text-koda-text flex flex-col md:flex-row min-h-[65vh]">
        
        {/* Sidebar List */}
        <div className="w-full md:w-[35%] border-r border-koda-border bg-koda-surface flex flex-col">
          <div className="p-4 border-b border-koda-border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-semibold">Custom AIs</DialogTitle>
              <button onClick={handleCreateNew} className="text-koda-accent hover:text-koda-text transition-colors" title="Create New">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex bg-koda-bg rounded-lg p-1">
              <button 
                onClick={() => { setTab("my-ais"); resetForm(); setViewingPublicId(null); }}
                className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", tab === "my-ais" ? "bg-koda-surface text-koda-text shadow-sm" : "text-koda-muted hover:text-koda-text")}
              >
                My AIs
              </button>
              <button 
                onClick={() => { setTab("discover"); resetForm(); }}
                className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", tab === "discover" ? "bg-koda-surface text-koda-text shadow-sm" : "text-koda-muted hover:text-koda-text")}
              >
                Discover
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tab === "my-ais" ? (
              <>
                <button
                   onClick={() => handleSelect(null)}
                   className={cn(
                     "w-full flex items-center gap-2 p-2 text-sm rounded-lg transition-colors text-left",
                     !activeCustomAIId ? "bg-koda-accent/10 text-koda-accent" : "hover:bg-koda-surface-2 text-koda-text"
                   )}
                >
                  <Bot className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">Standard KodaAI</span>
                  {!activeCustomAIId && <Play className="h-3 w-3" />}
                </button>
                {customAIs.map((ai) => (
                  <div
                    key={ai.id}
                    className={cn(
                      "group relative w-full flex items-center gap-2 p-2 text-sm rounded-lg transition-colors text-left",
                      activeCustomAIId === ai.id ? "bg-koda-accent/10 text-koda-accent" : "hover:bg-koda-surface-2 text-koda-text",
                      (isCreating || editingId === ai.id) ? "opacity-50" : ""
                    )}
                  >
                    <Bot className="h-4 w-4 shrink-0 opacity-70" />
                    <button 
                      onClick={() => handleSelect(ai.id)}
                      className="flex-1 truncate text-left"
                    >
                      {ai.name}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => publishAI(ai)} className="p-1 hover:text-blue-400" title="Publish to Discover">
                        <UploadCloud className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleEdit(ai)} className="p-1 hover:text-koda-accent" title="Edit">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteCustomAI(ai.id)} className="p-1 hover:text-red-400" title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {customAIs.length === 0 && (
                  <p className="p-4 text-xs text-center text-koda-muted">No custom AIs created yet.</p>
                )}
              </>
            ) : (
              <>
                {isLoadingPublic ? (
                  <p className="p-4 text-xs text-center text-koda-muted">Loading...</p>
                ) : publicAIs.length === 0 ? (
                  <p className="p-4 text-xs text-center text-koda-muted">No public AIs found.</p>
                ) : (
                  publicAIs.map((ai) => (
                    <button
                      key={ai.id}
                      onClick={() => setViewingPublicId(ai.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 text-sm rounded-lg transition-colors text-left",
                        viewingPublicId === ai.id ? "bg-koda-accent/10 text-koda-accent" : "hover:bg-koda-surface-2 text-koda-text"
                      )}
                    >
                      <Globe className="h-4 w-4 shrink-0 opacity-70" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm">{ai.name}</p>
                        <p className="truncate text-[10px] text-koda-muted">by {ai.authorName || "Unknown"}</p>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Editor / Preview Form */}
        <div className="w-full md:w-[65%] flex flex-col h-full bg-koda-bg">
          <div className="flex items-center justify-between p-4 border-b border-koda-border">
            <h2 className="text-sm font-medium">
              {tab === "discover" && viewingPublicId ? "Discover AI" : isCreating ? "Create New AI" : editingId ? "Edit AI" : "Select an AI"}
            </h2>
            <button onClick={() => handleOpenChange(false)} className="text-koda-muted hover:text-koda-text md:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            {tab === "discover" && viewingPublicAI ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-koda-surface rounded-xl border border-koda-border">
                    <Globe className="h-8 w-8 text-koda-accent" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-semibold">{viewingPublicAI.name}</h1>
                    <p className="text-xs text-koda-muted mt-1">Created by {viewingPublicAI.authorName || "Unknown"}</p>
                  </div>
                </div>
                
                {viewingPublicAI.description && (
                  <div>
                    <h3 className="text-xs font-semibold text-koda-muted uppercase tracking-wider mb-2">Description</h3>
                    <p className="text-sm text-koda-text bg-koda-surface p-3 rounded-xl border border-koda-border">
                      {viewingPublicAI.description}
                    </p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-xs font-semibold text-koda-muted uppercase tracking-wider mb-2">System Instructions</h3>
                  <p className="text-sm text-koda-text bg-koda-surface p-3 rounded-xl border border-koda-border whitespace-pre-wrap font-mono text-[11px]">
                    {viewingPublicAI.instructions}
                  </p>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => savePublicAIToLocal(viewingPublicAI)}
                    className="rounded-xl bg-koda-accent px-4 py-2 text-sm font-medium text-white flex items-center gap-2 hover:bg-koda-accent/90 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save to My AIs & Use
                  </button>
                </div>
              </div>
            ) : isCreating || editingId ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-koda-muted">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pirate AI"
                    className="w-full rounded-xl border border-koda-border bg-koda-surface px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-koda-muted">Description (Optional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What does this AI do?"
                    className="w-full rounded-xl border border-koda-border bg-koda-surface px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-koda-muted">System Instructions</label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Provide specific instructions for how the AI should behave..."
                    rows={6}
                    className="w-full rounded-xl border border-koda-border bg-koda-surface px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent focus:outline-none resize-none font-mono text-[12px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-koda-muted">Prompt Starters (Up to 4)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.promptStarters.map((starter, i) => (
                      <input
                        key={i}
                        type="text"
                        value={starter}
                        onChange={(e) => {
                          const newStarters = [...formData.promptStarters];
                          newStarters[i] = e.target.value;
                          setFormData({ ...formData, promptStarters: newStarters });
                        }}
                        placeholder={`Starter ${i + 1}`}
                        className="w-full rounded-xl border border-koda-border bg-koda-surface px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent focus:outline-none"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={resetForm}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-koda-muted hover:text-koda-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formData.name.trim() || !formData.instructions.trim()}
                    className="rounded-xl bg-koda-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Save AI
                  </button>
                </div>
              </div>
            ) : tab === "discover" ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Globe className="h-12 w-12 text-koda-muted opacity-50" />
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-koda-text">Discover AIs</h3>
                  <p className="text-xs text-koda-muted max-w-[250px]">
                    Browse Custom AIs created by other users on this server.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-12 w-12 text-koda-muted opacity-50" />
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-koda-text">
                    {activeAI ? activeAI.name : "Standard KodaAI"} is active
                  </h3>
                  <p className="text-xs text-koda-muted max-w-[250px]">
                    {activeAI ? activeAI.description || "Custom AI behavior applied to all new chats." : "Default KodaAI behavior without custom instructions."}
                  </p>
                </div>
                <button 
                  onClick={handleCreateNew}
                  className="mt-4 rounded-xl bg-koda-surface border border-koda-border px-4 py-2 text-xs font-medium hover:border-koda-accent transition-colors text-koda-text flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  Create Custom AI
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
