"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { ConnectorCard } from "@/components/connectors/ConnectorCard";
import { ConnectorModal } from "@/components/connectors/ConnectorModal";
import { cn } from "@/lib/utils";

const CONNECTORS_DATA = [
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Search, read, and create documents directly from your Google Drive.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
    verified: true,
    overview: [
      "Search across your Google Drive files and folders",
      "Read documents, spreadsheets, and presentations to ground answers",
      "Create and update documents directly from chats",
    ],
    developer: "Google",
    links: [
      { label: "Website", url: "https://drive.google.com" },
      { label: "Documentation", url: "https://developers.google.com/drive" },
      { label: "Support", url: "https://support.google.com/drive" },
    ],
    tools: [
      { id: "search_drive", name: "Search Drive files", description: "Search Google Drive files.", type: "read" },
      { id: "read_doc", name: "Read documents", description: "Read contents of Google Docs and sheets.", type: "read" },
      { id: "create_doc", name: "Create document", description: "Create a new Google Doc.", type: "write" },
    ] as any[],
  },
  {
    id: "gmail",
    name: "Gmail with Calendar",
    description: "Search, create, and manage your emails and calendar events",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
    verified: true,
    overview: [
      "Search across your Gmail inbox, threads, and labels",
      "Read messages and attachments to ground answers in your email history",
      "Search calendar events, find availability, and view meeting details",
      "Create, update, and cancel calendar events with attendees and conferencing",
      "Send emails and replies, manage drafts, and organize labels"
    ],
    developer: "Google",
    links: [
      { label: "Website", url: "https://mail.google.com" },
      { label: "Documentation", url: "https://developers.google.com/gmail/api" },
      { label: "Support", url: "https://support.google.com/mail" },
    ],
    tools: [
      { id: "search_events", name: "Search calendar events", description: "Search Google Calendar events.", type: "read" },
      { id: "search_emails", name: "Search emails", description: "Search and read emails in Gmail.", type: "read" },
      { id: "draft_reply", name: "Draft a reply", description: "Draft a reply to an email thread.", type: "write" },
      { id: "send_email", name: "Send an email", description: "Send or forward an email.", type: "write" },
      { id: "update_events", name: "Update calendar events", description: "Create, update, or delete Google Calendar events.", type: "write" },
    ] as any[],
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Search your emails and calendar events",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg",
    verified: true,
    overview: ["Search your Outlook emails and calendar events"],
    developer: "Microsoft",
    links: [{ label: "Website", url: "https://outlook.com" }],
    tools: [],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Retrieve, create, and update CRM objects; manage contacts, companies, deals",
    logoUrl: "https://cdn.worldvectorlogo.com/logos/hubspot.svg",
    verified: true,
    overview: ["Manage your HubSpot CRM data directly from chats"],
    developer: "HubSpot",
    links: [{ label: "Website", url: "https://hubspot.com" }],
    tools: [],
  },
  {
    id: "monday",
    name: "Monday.com",
    description: "Manage boards, items, and groups; create updates and sub-items",
    logoUrl: "https://cdn.worldvectorlogo.com/logos/monday-1.svg",
    verified: true,
    overview: ["Manage your monday.com boards and items"],
    developer: "Monday.com",
    links: [{ label: "Website", url: "https://monday.com" }],
    tools: [],
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Build and manage your app's database, auth, and storage",
    logoUrl: "https://cdn.worldvectorlogo.com/logos/supabase.svg",
    verified: true,
    overview: ["Manage your Supabase projects"],
    developer: "Supabase",
    links: [{ label: "Website", url: "https://supabase.com" }],
    tools: [],
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Manage teams, projects, and deployments; search documentation",
    logoUrl: "https://cdn.worldvectorlogo.com/logos/vercel.svg",
    verified: true,
    overview: ["Manage your Vercel deployments"],
    developer: "Vercel",
    links: [{ label: "Website", url: "https://vercel.com" }],
    tools: [],
  },
  {
    id: "figma",
    name: "Figma",
    description: "Comprehensive Figma connector for managing files, projects, teams",
    logoUrl: "https://cdn.worldvectorlogo.com/logos/figma-5.svg",
    verified: true,
    overview: ["Read Figma files and components"],
    developer: "Figma",
    links: [{ label: "Website", url: "https://figma.com" }],
    tools: [],
  },
];

export function ConnectorsClient({ isGoogleConnected }: { isGoogleConnected: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("connectors");
  const [subTab, setSubTab] = useState("discover");
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  const handleConnect = async (id: string) => {
    if (id === "google-drive") {
      // Trigger OAuth flow via our API
      const res = await fetch("/api/oauth/google", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        alert("Failed to start Google OAuth flow");
      }
    } else {
      alert("This connector is coming soon.");
    }
  };

  const selectedConnector = CONNECTORS_DATA.find((c) => c.id === selectedConnectorId);

  return (
    <div className="flex h-screen flex-col bg-incogni-background">
      {/* Top Nav */}
      <div className="flex items-center gap-6 border-b border-incogni-border px-6 pt-4">
        <button onClick={() => router.push("/")} className="mb-2 mr-2 rounded p-1 hover:bg-incogni-surface-2 md:hidden">
          <ArrowLeft className="h-5 w-5 text-incogni-text" />
        </button>
        {["Connectors", "Skills", "Workflows", "Memory"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={cn(
              "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              activeTab === tab.toLowerCase()
                ? "border-incogni-text text-incogni-text"
                : "border-transparent text-incogni-muted hover:text-incogni-text"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-incogni-text">Connectors</h1>
              <p className="mt-1 text-sm text-incogni-muted">
                Connect services so IncogniAI can access and act on your data
              </p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-incogni-muted" />
              <input
                type="text"
                placeholder="Search all connectors"
                className="w-full rounded-full border border-incogni-border bg-transparent py-2 pl-9 pr-4 text-sm text-incogni-text outline-none focus:border-incogni-accent md:w-64"
              />
            </div>
          </div>

          <div className="mb-8 flex items-center justify-between">
            <div className="flex gap-2">
              {["Discover", "All", "Connected", "Available"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab.toLowerCase())}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    subTab === tab.toLowerCase()
                      ? "bg-incogni-text text-incogni-background"
                      : "border border-incogni-border text-incogni-text hover:bg-incogni-surface"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-2 rounded-full border border-incogni-border px-4 py-1.5 text-sm font-medium text-incogni-text hover:bg-incogni-surface">
              All categories
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Connectors Grid */}
          <div className="space-y-10">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-incogni-muted">
                  <span className="text-lg">📈</span> Popular
                </h2>
                <button className="text-sm text-incogni-muted hover:text-incogni-text">View all &gt;</button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {CONNECTORS_DATA.slice(0, 6).map((c) => (
                  <ConnectorCard
                    key={c.id}
                    {...c}
                    connected={c.id === "google-drive" ? isGoogleConnected : false}
                    onClick={() => setSelectedConnectorId(c.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-incogni-muted">
                  <span className="text-lg">✨</span> New
                </h2>
                <button className="text-sm text-incogni-muted hover:text-incogni-text">View all &gt;</button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {CONNECTORS_DATA.slice(6).map((c) => (
                  <ConnectorCard
                    key={c.id}
                    {...c}
                    onClick={() => setSelectedConnectorId(c.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {selectedConnector && (
        <ConnectorModal
          connector={{
            ...selectedConnector,
            connected: selectedConnector.id === "google-drive" ? isGoogleConnected : false
          }}
          onClose={() => setSelectedConnectorId(null)}
          onConnect={() => handleConnect(selectedConnector.id)}
        />
      )}
    </div>
  );
}
