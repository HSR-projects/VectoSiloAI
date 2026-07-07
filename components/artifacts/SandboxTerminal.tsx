"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface Props {
  containerId: string;
  onConnecting?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (err: string) => void;
}

export function SandboxTerminal({ containerId, onConnecting, onConnected, onDisconnected, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 13,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      allowTransparency: true,
      theme: { background: "#0c0c0f", foreground: "#e0e0e0" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    requestAnimationFrame(() => fit.fit());
    termRef.current = term;
    fitRef.current = fit;

    let mounted = true;

    async function getToken(): Promise<string | null> {
      try {
        const res = await fetch("/api/ws-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ containerId }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.token || null;
      } catch {
        return null;
      }
    }

    function connect(token: string | null) {
      if (!mounted) return;
      onConnecting?.();
      setLastError(null);

      const isLocalhost = window.location.hostname === "localhost" ||
                          window.location.hostname === "127.0.0.1" ||
                          window.location.hostname === "::1";
      const wsHost = process.env.NEXT_PUBLIC_WS_HOST || (isLocalhost ? `${window.location.hostname}:3003` : window.location.hostname);
      const protocol = (window.location.protocol === "https:" && !isLocalhost) ? "wss:" : "ws:";
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
      const url = `${protocol}//${wsHost}/shell${tokenParam}`;

      console.log("[SandboxTerminal] Connecting to:", url);

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        const msg = `Failed to create WebSocket: ${(e as Error).message}`;
        setLastError(msg);
        onError?.(msg);
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted) { ws.close(); return; }
        onConnected?.();
        term.focus();
        // Send initial terminal size
        requestAnimationFrame(() => {
          fit.fit();
          const { cols, rows } = term;
          if (cols && rows) {
            ws.send(JSON.stringify({ type: "resize", cols, rows }));
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "output") {
            term.write(msg.data);
          } else if (msg.type === "error") {
            const err = `Server error: ${msg.data}`;
            setLastError(err);
            term.write(`\r\n\x1b[31m${err}\x1b[0m\r\n`);
            onError?.(err);
          } else if (msg.type === "exit") {
            if (mounted) {
              term.write(`\r\n[Shell exited${msg.code !== undefined ? ` (code ${msg.code})` : ""}]\r\n`);
              scheduleReconnect(token);
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!mounted) return;
        onDisconnected?.();
        if (!lastError) {
          term.write("\r\n[Connection closed]\r\n");
        }
        scheduleReconnect(token);
      };

      ws.onerror = (e) => {
        if (!mounted) return;
        const msg = `WebSocket error: ${e.type || "connection failed"}`;
        setLastError(msg);
        term.write(`\r\n\x1b[31m${msg}\x1b[0m\r\n`);
        onError?.(msg);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      // Send terminal resize events
      term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      });
    }

    function scheduleReconnect(token: string | null) {
      if (!mounted) return;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mounted) {
          if (token) {
            getToken().then((newToken) => connect(newToken));
          } else {
            connect(null);
          }
        }
      }, 2000);
    }

    getToken().then((token) => connect(token));

    const onResize = () => requestAnimationFrame(() => fit.fit());
    window.addEventListener("resize", onResize);

    const ro = new ResizeObserver(() => requestAnimationFrame(() => fit.fit()));
    ro.observe(ref.current);

    return () => {
      mounted = false;
      clearTimeout(reconnectTimeoutRef.current);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, [containerId, onConnecting, onConnected, onDisconnected, onError]);

  return <div ref={ref} className="h-full w-full" />;
}