"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Server, Cloud } from "lucide-react";
import { useVectoSiloStore } from "@/lib/store";
import { modelLabel } from "@/lib/utils";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PrivacyModal() {
  const { selectedModel, externalCalls } = useVectoSiloStore();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label="Privacy details"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-vectosilo-border bg-vectosilo-surface text-vectosilo-accent transition-colors hover:bg-vectosilo-surface-2"
        >
          <Lock className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 sm:mx-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vectosilo-accent/15 text-vectosilo-accent"
            >
              <ShieldCheck className="h-6 w-6" />
            </motion.div>
          </div>
          <DialogTitle>Privacy & data</DialogTitle>
          <DialogDescription>
            VectoSilo AI runs on its own <strong className="text-vectosilo-text">private inference cloud</strong>.
            No OpenAI, no Anthropic, no third-party trackers — your queries go only
            to VectoSilo AI over an encrypted connection.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <Row
            icon={<Cloud className="h-4 w-4 text-vectosilo-accent" />}
            label="Inference"
            value="VectoSilo AI private cloud"
          />
          <Row
            icon={<Server className="h-4 w-4 text-vectosilo-accent" />}
            label="Active model"
            value={selectedModel ? modelLabel(selectedModel) : "—"}
          />
          <Row
            icon={<ShieldCheck className="h-4 w-4 text-vectosilo-accent" />}
            label="Third-party AI calls"
            value={`${externalCalls} (OpenAI / Anthropic / etc.)`}
          />
        </div>

        <p className="mt-2 text-xs text-vectosilo-muted">
          Web search (when enabled) runs through VectoSilo AI&apos;s own search service —
          no third-party search vendor.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-vectosilo-border bg-vectosilo-surface-2 px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-vectosilo-muted">
        {icon}
        {label}
      </span>
      <span className="font-medium text-vectosilo-text">{value}</span>
    </div>
  );
}
