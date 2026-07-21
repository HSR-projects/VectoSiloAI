"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ProjectFile } from "@/types";
import { buildPreviewSrcDoc } from "@/lib/computerPreview";

interface PublishedData {
  slug: string;
  title: string;
  files: ProjectFile[];
  commands: string[];
  createdAt: number;
}

export default function ViewPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const [data, setData] = useState<PublishedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/published/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        setData(await res.json());
      })
      .catch(() => setError("Project not found."));
  }, [slug]);

  const srcDoc = useMemo(
    () => (data?.files ? buildPreviewSrcDoc(data.files) : ""),
    [data?.files]
  );

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0c0f] text-vectosilo-muted">
        <div className="text-center">
          <p className="text-lg font-medium text-vectosilo-text">404</p>
          <p className="mt-1 text-sm">{error}</p>
          <a href="/" className="mt-4 inline-block text-sm text-vectosilo-accent-soft hover:underline">
            Go to VectoSiloAI
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0c0f]">
        <Loader2 className="h-6 w-6 animate-spin text-vectosilo-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0c0c0f]">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2">
        <span className="text-sm font-semibold text-white/90">{data.title}</span>
        <span className="text-xs text-white/40">/view/{slug}</span>
        <span className="ml-auto text-[10px] text-white/30">Built with VectoSiloAI</span>
      </div>
      <iframe
        title={data.title}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
        className="flex-1 bg-white"
      />
    </div>
  );
}
