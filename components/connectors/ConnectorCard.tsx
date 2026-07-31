import { Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConnectorProps {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  verified: boolean;
  connected?: boolean;
  onClick: () => void;
}

export function ConnectorCard({
  name,
  description,
  logoUrl,
  verified,
  connected,
  onClick,
}: ConnectorProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-all hover:shadow-md",
        connected
          ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
          : "border-incogni-border bg-incogni-surface hover:border-incogni-text/30"
      )}
    >
      <div className="flex flex-1 items-center gap-4 overflow-hidden">
        {/* Logo */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm border border-incogni-border/50">
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Text */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-medium text-incogni-text">{name}</h3>
            {verified && (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            )}
          </div>
          <p className="truncate text-xs text-incogni-muted">{description}</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="shrink-0 pl-2">
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            connected
              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
              : "text-incogni-muted hover:bg-incogni-surface-2 hover:text-incogni-text"
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
