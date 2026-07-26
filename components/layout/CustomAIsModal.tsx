"use client";

import { useState, useEffect } from "react";
import { Plus, X, Edit2, Trash2, Bot, Play, Globe, Save, UploadCloud, ChevronLeft, ImagePlus, Lock } from "lucide-react";
import { useIncogniStore } from "@/lib/store";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { PublicCustomAI, CustomAI } from "@/types";
import { PreviewChat } from "@/components/custom-ais/PreviewChat";
import { BuilderChat } from "@/components/custom-ais/BuilderChat";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function CustomAIsModal() {
  const { user } = useAuth();
  const { customAIs, customAIsOpen, setCustomAIsOpen, createCustomAI, updateCustomAI, deleteCustomAI, setActiveCustomAIId, activeCustomAIId } = useIncogniStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", instructions: "", promptStarters: ["", "", "", ""], avatarUrl: "" });
  const [builderTab, setBuilderTab] = useState<"create" | "configure">("create");
  
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
    const existing = customAIs.find(a => a.id === publicAI.id);
    if (!existing) {
      useIncogniStore.setState((s) => ({
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
    setFormData({ name: "", description: "", instructions: "", promptStarters: ["", "", "", ""], avatarUrl: "" });
    setBuilderTab("create");
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.instructions.trim()) return;
    
    const cleanStarters = formData.promptStarters.map(s => s.trim()).filter(Boolean);
    
    if (isCreating) {
      createCustomAI(formData.name, formData.description, formData.instructions, cleanStarters, formData.avatarUrl);
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
      promptStarters: ai.promptStarters?.length ? [...ai.promptStarters, "", "", "", ""].slice(0, 4) : ["", "", "", ""],
      avatarUrl: ai.avatarUrl || ""
    });
    setEditingId(ai.id);
    setIsCreating(false);
    setBuilderTab("configure");
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
    setBuilderTab("create");
  };

  const handleSelect = (id: string | null) => {
    setActiveCustomAIId(id);
    setCustomAIsOpen(false);
  };

  const activeAI = (Array.isArray(customAIs) ? customAIs : []).find(ai => ai.id === activeCustomAIId);
  const viewingPublicAI = (Array.isArray(publicAIs) ? publicAIs : []).find(ai => ai.id === viewingPublicId);

  const isEditingView = isCreating || editingId !== null;

  // Free User Block for Creation
  const isFreeUser = user?.plan === "free";

  return (
    <Dialog open={customAIsOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden bg-incogni-bg border-incogni-border text-incogni-text flex",
        isEditingView ? "max-w-7xl w-[95vw] h-[90vh] flex-col" : "max-w-4xl w-[95vw] md:w-full flex-col md:flex-row h-[80vh] max-h-[850px]"
      )}>
        <DialogTitle className="sr-only">Custom AIs</DialogTitle>
        {!isEditingView ? (
          // --- Standard List View (My AIs / Discover) ---
          <>
            <div className="w-full md:w-[35%] border-r border-incogni-border bg-incogni-surface flex flex-col">
              <div className="p-4 border-b border-incogni-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Custom AIs</h2>
                  <button onClick={handleCreateNew} className="text-incogni-accent hover:text-incogni-text transition-colors" title="Create New">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex bg-incogni-bg rounded-lg p-1">
                  <button 
                    onClick={() => { setTab("my-ais"); resetForm(); setViewingPublicId(null); }}
                    className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", tab === "my-ais" ? "bg-incogni-surface text-incogni-text shadow-sm" : "text-incogni-muted hover:text-incogni-text")}
                  >
                    My AIs
                  </button>
                  <button 
                    onClick={() => { setTab("discover"); resetForm(); }}
                    className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", tab === "discover" ? "bg-incogni-surface text-incogni-text shadow-sm" : "text-incogni-muted hover:text-incogni-text")}
                  >
                    Discover
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
                {tab === "my-ais" ? (
                  <>
                    <button
                       onClick={() => handleSelect(null)}
                       className={cn(
                         "w-full flex items-center gap-2 p-2 text-sm rounded-lg transition-colors text-left",
                         !activeCustomAIId ? "bg-incogni-accent/10 text-incogni-accent" : "hover:bg-incogni-surface-2 text-incogni-text"
                       )}
                    >
                      <Bot className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">Standard IncogniAI</span>
                      {!activeCustomAIId && <Play className="h-3 w-3" />}
                    </button>
                    {(Array.isArray(customAIs) ? customAIs : []).map((ai) => (
                      <div
                        key={ai.id}
                        className={cn(
                          "group relative w-full flex items-center gap-2 p-2 text-sm rounded-lg transition-colors text-left",
                          activeCustomAIId === ai.id ? "bg-incogni-accent/10 text-incogni-accent" : "hover:bg-incogni-surface-2 text-incogni-text"
                        )}
                      >
                        {ai.avatarUrl ? (
                          <img src={ai.avatarUrl} alt={ai.name} className="h-4 w-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <Bot className="h-4 w-4 shrink-0 opacity-70" />
                        )}
                        <button 
                          onClick={() => handleSelect(ai.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="truncate">{ai.name}</p>
                          {ai.authorName && ai.authorId !== user?.id && (
                            <p className="truncate text-[10px] text-incogni-muted">by {ai.authorName}</p>
                          )}
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(!ai.authorId || ai.authorId === user?.id) && (
                            <>
                              <button onClick={() => publishAI(ai)} className="p-1 hover:text-blue-400" title="Publish to Discover">
                                <UploadCloud className="h-3 w-3" />
                              </button>
                              <button onClick={() => handleEdit(ai)} className="p-1 hover:text-incogni-accent" title="Edit">
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          <button onClick={() => deleteCustomAI(ai.id)} className="p-1 hover:text-red-400" title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(Array.isArray(customAIs) ? customAIs : []).length === 0 && (
                      <p className="p-4 text-xs text-center text-incogni-muted">No custom AIs created yet.</p>
                    )}
                  </>
                ) : (
                  <>
                    {isLoadingPublic ? (
                      <p className="p-4 text-xs text-center text-incogni-muted">Loading...</p>
                    ) : (Array.isArray(publicAIs) ? publicAIs : []).length === 0 ? (
                      <p className="p-4 text-xs text-center text-incogni-muted">No public AIs found.</p>
                    ) : (
                      (Array.isArray(publicAIs) ? publicAIs : []).map((ai) => (
                        <button
                          key={ai.id}
                          onClick={() => setViewingPublicId(ai.id)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 text-sm rounded-lg transition-colors text-left",
                            viewingPublicId === ai.id ? "bg-incogni-accent/10 text-incogni-accent" : "hover:bg-incogni-surface-2 text-incogni-text"
                          )}
                        >
                          {ai.avatarUrl ? (
                            <img src={ai.avatarUrl} alt={ai.name} className="h-4 w-4 rounded-full object-cover shrink-0" />
                          ) : (
                            <Globe className="h-4 w-4 shrink-0 opacity-70" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm">{ai.name}</p>
                            <p className="truncate text-[10px] text-incogni-muted">by {ai.authorName || "Unknown"}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="w-full md:w-[65%] flex flex-col h-full bg-incogni-bg">
              <div className="flex justify-end p-4 border-b border-incogni-border">
                <button onClick={() => handleOpenChange(false)} className="text-incogni-muted hover:text-incogni-text md:hidden">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                {tab === "discover" && viewingPublicAI ? (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      {viewingPublicAI.avatarUrl ? (
                         <img src={viewingPublicAI.avatarUrl} alt={viewingPublicAI.name} className="h-16 w-16 rounded-full object-cover border border-incogni-border" />
                      ) : (
                        <div className="p-4 bg-incogni-surface rounded-full border border-incogni-border">
                          <Globe className="h-8 w-8 text-incogni-accent" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h1 className="text-xl font-semibold">{viewingPublicAI.name}</h1>
                        <p className="text-xs text-incogni-muted mt-1">Created by {viewingPublicAI.authorName || "Unknown"}</p>
                      </div>
                    </div>
                    {viewingPublicAI.description && (
                      <div>
                        <h3 className="text-xs font-semibold text-incogni-muted uppercase tracking-wider mb-2">Description</h3>
                        <p className="text-sm text-incogni-text bg-incogni-surface p-3 rounded-xl border border-incogni-border">
                          {viewingPublicAI.description}
                        </p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs font-semibold text-incogni-muted uppercase tracking-wider mb-2">System Instructions</h3>
                      <p className="text-sm text-incogni-text bg-incogni-surface p-3 rounded-xl border border-incogni-border whitespace-pre-wrap font-mono text-[11px]">
                        {viewingPublicAI.instructions}
                      </p>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => savePublicAIToLocal(viewingPublicAI)}
                        className="rounded-xl bg-incogni-accent px-4 py-2 text-sm font-medium text-white flex items-center gap-2 hover:bg-incogni-accent/90 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        Save to My AIs & Use
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Bot className="h-12 w-12 text-incogni-muted opacity-50" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-incogni-text">
                        {activeAI ? activeAI.name : "Standard IncogniAI"} is active
                      </h3>
                      <p className="text-xs text-incogni-muted max-w-[250px] mx-auto">
                        {activeAI ? activeAI.description || "Custom AI behavior applied to all new chats." : "Default IncogniAI behavior without custom instructions."}
                      </p>
                    </div>
                    <button 
                      onClick={handleCreateNew}
                      className="mt-4 rounded-xl bg-incogni-surface border border-incogni-border px-4 py-2 text-xs font-medium hover:border-incogni-accent transition-colors text-incogni-text flex items-center gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      Create Custom AI
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // --- Full Screen Builder View (Create GPTs Layout) ---
          <div className="flex flex-col h-full w-full relative">
            {/* Free User Block Overlay */}
            {isCreating && isFreeUser && (
              <div className="absolute inset-0 z-50 bg-incogni-bg/80 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-incogni-surface border border-incogni-border rounded-2xl p-8 max-w-md w-full shadow-xl flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Pro Feature</h2>
                  <p className="text-sm text-incogni-muted mb-6">
                    Creating Custom AIs is available for Go, Pro, Max, and Ultra users. Upgrade your plan to build personalized assistants.
                  </p>
                  <div className="flex w-full gap-3">
                    <button 
                      onClick={resetForm}
                      className="flex-1 py-2 rounded-xl text-sm font-medium bg-incogni-bg hover:bg-incogni-surface-2 transition-colors border border-incogni-border"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => { setCustomAIsOpen(false); window.location.href = '/pricing'; }}
                      className="flex-1 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      View Plans
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Top Bar */}
            <div className="flex items-center justify-between p-3 border-b border-incogni-border bg-incogni-bg shrink-0">
              <button 
                onClick={resetForm}
                className="flex items-center gap-2 text-sm font-medium text-incogni-muted hover:text-incogni-text transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to My AIs
              </button>
              
              <div className="font-medium text-sm">
                {formData.name || "New AI"}
                <span className="text-incogni-muted ml-2 text-xs font-normal">• Draft</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={() => setCustomAIsOpen(false)} className="p-2 hover:bg-incogni-surface rounded-md text-incogni-muted">
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name.trim() || !formData.instructions.trim()}
                  className="rounded-lg bg-incogni-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-incogni-accent/90 transition-colors"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>

            {/* Main Dual Pane Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Pane (Builder/Config) */}
              <div className="w-1/2 border-r border-incogni-border bg-incogni-bg flex flex-col h-full">
                <div className="flex p-4 pb-0 shrink-0">
                  <div className="flex bg-incogni-surface rounded-xl p-1 w-full max-w-sm mx-auto shadow-sm">
                    <button 
                      onClick={() => setBuilderTab("create")}
                      className={cn("flex-1 text-sm py-2 rounded-lg font-medium transition-colors", builderTab === "create" ? "bg-incogni-bg text-incogni-text shadow-sm" : "text-incogni-muted hover:text-incogni-text")}
                    >
                      Create
                    </button>
                    <button 
                      onClick={() => setBuilderTab("configure")}
                      className={cn("flex-1 text-sm py-2 rounded-lg font-medium transition-colors", builderTab === "configure" ? "bg-incogni-bg text-incogni-text shadow-sm" : "text-incogni-muted hover:text-incogni-text")}
                    >
                      Configure
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden pt-4">
                  {builderTab === "create" ? (
                    <BuilderChat onUpdate={(updates) => setFormData(prev => ({ ...prev, ...updates }))} />
                  ) : (
                    <div className="p-6 h-full overflow-y-auto space-y-6 max-w-2xl mx-auto">
                      
                      <div className="flex justify-center mb-2">
                        <div className="relative group cursor-pointer w-24 h-24 rounded-full bg-incogni-surface border-2 border-dashed border-incogni-border flex flex-col items-center justify-center overflow-hidden hover:border-incogni-accent transition-colors">
                          {formData.avatarUrl ? (
                            <>
                              <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Edit2 className="w-5 h-5 text-white" />
                              </div>
                            </>
                          ) : (
                            <>
                              <ImagePlus className="w-8 h-8 text-incogni-muted group-hover:text-incogni-accent transition-colors" />
                              <span className="text-[10px] text-incogni-muted mt-1 font-medium">Upload</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => setFormData(prev => ({ ...prev, avatarUrl: e.target?.result as string }));
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-incogni-text">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Name your AI"
                          className="w-full rounded-xl border border-incogni-border bg-incogni-surface px-4 py-3 text-[15px] text-incogni-text placeholder:text-incogni-muted focus:border-incogni-accent focus:outline-none shadow-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-incogni-text">Description</label>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="A short description of what this AI does"
                          className="w-full rounded-xl border border-incogni-border bg-incogni-surface px-4 py-3 text-[15px] text-incogni-text placeholder:text-incogni-muted focus:border-incogni-accent focus:outline-none shadow-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-incogni-text">Instructions</label>
                        <textarea
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          placeholder="What does this AI do? How does it behave? What should it avoid doing?"
                          rows={8}
                          className="w-full rounded-xl border border-incogni-border bg-incogni-surface px-4 py-3 text-sm text-incogni-text placeholder:text-incogni-muted focus:border-incogni-accent focus:outline-none resize-none shadow-sm font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-incogni-text">Conversation starters</label>
                        <div className="space-y-2">
                          {formData.promptStarters.map((starter, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                type="text"
                                value={starter}
                                onChange={(e) => {
                                  const newStarters = [...formData.promptStarters];
                                  newStarters[i] = e.target.value;
                                  setFormData({ ...formData, promptStarters: newStarters });
                                }}
                                placeholder={`Starter ${i + 1}`}
                                className="w-full rounded-xl border border-incogni-border bg-incogni-surface px-4 py-2 text-sm text-incogni-text placeholder:text-incogni-muted focus:border-incogni-accent focus:outline-none shadow-sm"
                              />
                              <button 
                                onClick={() => {
                                  const newStarters = [...formData.promptStarters];
                                  newStarters[i] = "";
                                  setFormData({ ...formData, promptStarters: newStarters });
                                }}
                                className="p-2 text-incogni-muted hover:text-red-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="h-12" /> {/* Bottom padding */}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane (Preview) */}
              <div className="w-1/2 bg-incogni-bg flex flex-col h-full">
                <div className="flex items-center justify-center p-4 border-b border-incogni-border shrink-0 font-medium text-sm">
                  Preview
                </div>
                <div className="flex-1 overflow-hidden">
                   <PreviewChat 
                     name={formData.name}
                     avatarUrl={formData.avatarUrl}
                     description={formData.description}
                     instructions={formData.instructions}
                     starters={formData.promptStarters}
                   />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
