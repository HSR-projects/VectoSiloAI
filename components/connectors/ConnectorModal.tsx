import { X, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolSetting {
  id: string;
  name: string;
  description: string;
  type: "read" | "write";
}

interface ConnectorModalProps {
  connector: {
    id: string;
    name: string;
    logoUrl: string;
    overview: string[];
    developer: string;
    links: { label: string; url: string }[];
    tools: ToolSetting[];
    connected?: boolean;
  };
  onClose: () => void;
  onConnect: () => void;
}

export function ConnectorModal({ connector, onClose, onConnect }: ConnectorModalProps) {
  const readTools = connector.tools.filter((t) => t.type === "read");
  const writeTools = connector.tools.filter((t) => t.type === "write");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-incogni-border bg-incogni-surface shadow-2xl md:flex-row">
        
        {/* Header - Mobile Only */}
        <div className="flex items-center justify-between border-b border-incogni-border p-4 md:hidden">
          <div className="flex items-center gap-2">
            <img src={connector.logoUrl} alt={connector.name} className="h-6 w-6 object-contain" />
            <span className="font-semibold text-incogni-text">{connector.name}</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-incogni-surface-2">
            <X className="h-5 w-5 text-incogni-muted" />
          </button>
        </div>

        {/* Left Sidebar */}
        <div className="flex w-full flex-col overflow-y-auto border-r border-incogni-border bg-incogni-surface/50 p-6 md:w-80">
          
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2 shadow-sm border border-incogni-border/50">
              <img src={connector.logoUrl} alt={connector.name} className="h-full w-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-incogni-text flex items-center gap-1.5">
                {connector.name}
                <ShieldCheck className="h-4 w-4 text-zinc-400" />
              </h2>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-incogni-text">Overview</h3>
              <ul className="space-y-3">
                {connector.overview.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-incogni-muted leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-incogni-muted/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 pt-4 border-t border-incogni-border/50">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-incogni-muted">Links</h3>
                <ul className="space-y-2 text-sm">
                  {connector.links.map((link, i) => (
                    <li key={i}>
                      <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-incogni-accent hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-incogni-muted">Developed by</h3>
                <p className="text-sm font-medium text-incogni-text">{connector.developer}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-incogni-surface">
          {/* Desktop Header Actions */}
          <div className="hidden items-center justify-end gap-3 border-b border-incogni-border p-4 md:flex">
            {!connector.connected && (
              <button
                onClick={onConnect}
                className="rounded-lg bg-incogni-text px-4 py-1.5 text-sm font-medium text-incogni-surface transition-transform hover:scale-[1.02] active:scale-95"
              >
                + Add connector
              </button>
            )}
            {connector.connected && (
              <div className="rounded-lg bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-500">
                Connected
              </div>
            )}
            <button onClick={onClose} className="rounded-lg border border-incogni-border p-1.5 text-incogni-muted hover:bg-incogni-surface-2 hover:text-incogni-text">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tools List */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="mb-6 text-lg font-semibold text-incogni-text">Tools</h3>
            
            <div className="space-y-8">
              {readTools.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-medium text-incogni-muted border-b border-incogni-border pb-2">
                    Read-only tools
                  </h4>
                  <div className="space-y-4">
                    {readTools.map(tool => (
                      <ToolRow key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              )}

              {writeTools.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-medium text-incogni-muted border-b border-incogni-border pb-2">
                    Write / delete tools
                  </h4>
                  <div className="space-y-4">
                    {writeTools.map(tool => (
                      <ToolRow key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Actions Footer */}
          <div className="border-t border-incogni-border p-4 md:hidden">
            {!connector.connected ? (
              <button
                onClick={onConnect}
                className="w-full rounded-lg bg-incogni-text py-2.5 text-sm font-medium text-incogni-surface"
              >
                + Add connector
              </button>
            ) : (
              <div className="w-full rounded-lg bg-green-500/10 py-2.5 text-center text-sm font-medium text-green-500">
                Connected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolRow({ tool }: { tool: ToolSetting }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-incogni-text">{tool.name}</p>
        <p className="text-xs text-incogni-muted">{tool.description}</p>
      </div>
      <div className="flex shrink-0 items-center rounded-lg border border-incogni-border bg-incogni-surface-2 p-0.5 text-xs font-medium">
        <button className="rounded px-3 py-1 text-incogni-muted hover:text-incogni-text">Disable</button>
        <button className="rounded px-3 py-1 text-incogni-muted hover:text-incogni-text">Always ask</button>
        <button className="rounded bg-white shadow-sm px-3 py-1 text-black">Allow</button>
      </div>
    </div>
  );
}
