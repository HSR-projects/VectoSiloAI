"use client";

import { useState } from "react";
import { Share2, Check, Link2, Loader2, Download, Printer, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useKodaStore } from "@/lib/store";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export function ShareButton({ threadId }: { threadId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const createShare = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      const data = await res.json();
      if (res.ok) {
        setUrl(data.url);
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
    setBusy(false);
  };

  const exportPDF = async () => {
    const thread = useKodaStore.getState().getThread(threadId);
    if (!thread) return;

    // Dynamically import pdfmake to avoid SSR issues and keep the initial bundle small
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
    
    // Check if the module has a default export or if it is the module itself
    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    const pdfFonts = pdfFontsModule.default || pdfFontsModule;
    
    // Assign virtual file system fonts
    if (pdfMake.vfs === undefined) {
       pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;
    }

    const content: any[] = [
      { text: `Thread: ${thread.title || "Koda AI Chat"}`, style: "header" },
      { text: `Generated on: ${new Date().toLocaleString()}`, style: "subheader", margin: [0, 0, 0, 20] }
    ];

    thread.messages.forEach(msg => {
      const isUser = msg.role === "user";
      content.push({
        text: isUser ? "You" : "Koda AI",
        style: isUser ? "userLabel" : "aiLabel",
        margin: [0, 10, 0, 2]
      });
      content.push({
        text: msg.content,
        style: "messageBody",
        margin: [0, 0, 0, 10]
      });
    });

    const docDefinition = {
      content,
      styles: {
        header: { fontSize: 22, bold: true, color: "#10B981" },
        subheader: { fontSize: 10, color: "#666666", italics: true },
        userLabel: { fontSize: 12, bold: true, color: "#000000" },
        aiLabel: { fontSize: 12, bold: true, color: "#10B981" },
        messageBody: { fontSize: 11, lineHeight: 1.4, color: "#333333" }
      },
      defaultStyle: {
        font: "Roboto"
      }
    };

    pdfMake.createPdf(docDefinition).download(`koda-chat-${threadId.slice(0, 8)}.pdf`);
  };

  const exportRTF = () => {
    const thread = useKodaStore.getState().getThread(threadId);
    if (!thread) return;

    let rtf = "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\n";
    rtf += "{\\*\\generator KodaAI Export;}\\viewkind4\\uc1\n";
    rtf += "\\pard\\sa200\\sl276\\slmult1\\b\\f0\\fs28 Koda AI Chat Export\\b0\\fs22\\par\n";
    
    thread.messages.forEach((msg) => {
      const role = msg.role === "user" ? "You" : "Koda AI";
      const cleanContent = msg.content.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\par\n");
      rtf += `\\b ${role}:\\b0\\par\n${cleanContent}\\par\\par\n`;
    });
    rtf += "}";

    const blob = new Blob([rtf], { type: "application/rtf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koda-chat-${threadId.slice(0, 8)}.rtf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border px-2.5 py-1.5 text-xs font-medium text-koda-text hover:bg-koda-surface-2 transition-colors disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={createShare}>
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Link2 className="h-4 w-4" />}
          <span>{copied ? "Link Copied!" : "Copy Share Link"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF}>
          <Download className="h-4 w-4" />
          <span>Download PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportRTF}>
          <FileText className="h-4 w-4" />
          <span>Download RTF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          <span>Print Chat</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
