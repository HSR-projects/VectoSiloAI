"use client";

import { useEffect, useState } from "react";
import { useIncogniStore } from "@/lib/store";
import { AUTO_MODEL } from "@/lib/autoModel";

interface ModelsResponse {
  models: string[];
  default?: string;
  error?: string;
}

// Cache the network call at module scope so React Strict Mode's double-mount
// (and multiple components using the hook) share one request.
let modelsPromise: Promise<ModelsResponse> | null = null;

function fetchModels(): Promise<ModelsResponse> {
  const store = useIncogniStore.getState();
  const headers: Record<string, string> = {};
  if (store.openaiApiKey) headers["x-openai-key"] = store.openaiApiKey;
  if (store.anthropicApiKey) headers["x-anthropic-key"] = store.anthropicApiKey;
  if (store.geminiApiKey) headers["x-gemini-key"] = store.geminiApiKey;
  if (store.openrouterApiKey) headers["x-openrouter-key"] = store.openrouterApiKey;

  return fetch("/api/ollama/models", { headers })
    .then((r) => r.json())
    .catch((): ModelsResponse => ({
      models: [],
      error: "Could not reach Incogni AI server.",
    }));
}

/** Fetches the list of Ollama Cloud and Developer Provider models and hydrates the store. */
export function useModels() {
  const setAvailableModels = useIncogniStore((s) => s.setAvailableModels);
  const setSelectedModel = useIncogniStore((s) => s.setSelectedModel);
  const openaiApiKey = useIncogniStore((s) => s.openaiApiKey);
  const anthropicApiKey = useIncogniStore((s) => s.anthropicApiKey);
  const geminiApiKey = useIncogniStore((s) => s.geminiApiKey);
  const openrouterApiKey = useIncogniStore((s) => s.openrouterApiKey);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchModels().then((data) => {
      const models = data.models ?? [];
      setAvailableModels(models);

      const current = useIncogniStore.getState().selectedModel;
      // "Auto" is a valid selection even though it isn't a real model id.
      if (current !== AUTO_MODEL && (!current || !models.includes(current))) {
        const pick =
          (data.default && models.includes(data.default) && data.default) ||
          models[0] ||
          data.default ||
          current ||
          "";
        if (pick) setSelectedModel(pick);
      }

      if (active) {
        setError(data.error ?? (models.length ? null : "No models found."));
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [setAvailableModels, setSelectedModel, openaiApiKey, anthropicApiKey, geminiApiKey, openrouterApiKey]);

  return { loading, error };
}
