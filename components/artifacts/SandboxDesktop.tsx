"use client";

import { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc";
import { Loader2 } from "lucide-react";

interface Props {
  containerId: string;
}

export function SandboxDesktop({ containerId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [status, setStatus] = useState("Connecting…");

  useEffect(() => {
    if (!ref.current || !containerId) return;

    const isLocalhost = window.location.hostname === "localhost" ||
                        window.location.hostname === "127.0.0.1" ||
                        window.location.hostname === "::1";
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || (isLocalhost ? `${window.location.hostname}:3003` : window.location.hostname);
    const protocol = (window.location.protocol === "https:" && !isLocalhost) ? "wss:" : "ws:";
    const url = `${protocol}//${wsHost}/vnc/${encodeURIComponent(containerId)}`;

    const rfb = new RFB(ref.current, url, {
      credentials: { password: "" },
    });
    rfb.viewOnly = false;
    rfb.scaleViewport = true;
    rfb.resizeSession = true;

    rfb.addEventListener("connect", () => setStatus("Connected"));
    rfb.addEventListener("disconnect", () => setStatus("Disconnected"));
    rfb.addEventListener("securityfailure", (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setStatus(`Auth failed: ${detail?.reason || "unknown"}`);
    });

    rfbRef.current = rfb;

    return () => {
      rfb.disconnect();
      rfbRef.current = null;
    };
  }, [containerId]);

  return (
    <div className="relative h-full w-full">
      {status !== "Connected" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/60">
          <Loader2 className="h-8 w-8 animate-spin text-vectosilo-accent" />
          <p className="text-sm text-vectosilo-muted">{status}</p>
        </div>
      )}
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
