// @ts-nocheck
// Template ID: page-dashboard-admin
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Shield,
  Activity,
  Settings,
  FileText,
  AlertTriangle,
  Search,
  MoreHorizontal,
  ChevronDown,
  Bell,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table } from "../components/Table";
import { DataGrid } from "../components/DataGrid";
import { Alert } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Stats } from "../components/Stats";

const sidebarItems = [
  { label: "Dashboard", href: "#", icon: Activity, active: true },
  { label: "Users", href: "#", icon: Users },
  { label: "Content", href: "#", icon: FileText },
  { label: "Analytics", href: "#", icon: Activity },
  { label: "Settings", href: "#", icon: Settings },
  { label: "Logs", href: "#", icon: AlertTriangle },
];

const adminStats = [
  { label: "Total Users", value: 45892 },
  { label: "Active Now", value: 231 },
  { label: "New Today", value: 89 },
  { label: "Reports", value: 12, trend: "down" as const },
];

const userManagementData = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "Active", joined: "2023-01-15" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor", status: "Active", joined: "2023-03-22" },
  { id: 3, name: "Carol Williams", email: "carol@example.com", role: "Viewer", status: "Inactive", joined: "2023-06-10" },
  { id: 4, name: "David Brown", email: "david@example.com", role: "Editor", status: "Suspended", joined: "2023-02-08" },
  { id: 5, name: "Eva Martinez", email: "eva@example.com", role: "Admin", status: "Active", joined: "2022-11-30" },
  { id: 6, name: "Frank Lee", email: "frank@example.com", role: "Viewer", status: "Active", joined: "2024-01-14" },
  { id: 7, name: "Grace Kim", email: "grace@example.com", role: "Editor", status: "Active", joined: "2023-09-05" },
  { id: 8, name: "Henry Wilson", email: "henry@example.com", role: "Viewer", status: "Inactive", joined: "2023-07-19" },
];

const userMgmtColumns = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (item: any) => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-incogni-accent/20 text-xs font-medium text-incogni-accent">
          {item.name.split(" ").map((n: string) => n[0]).join("")}
        </div>
        <div>
          <div className="text-sm font-medium text-incogni-text">{item.name}</div>
          <div className="text-xs text-incogni-muted">{item.email}</div>
        </div>
      </div>
    ),
  },
  { key: "email", label: "Email", sortable: true },
  {
    key: "role",
    label: "Role",
    render: (item: any) => (
      <Badge variant={item.role === "Admin" ? "info" : item.role === "Editor" ? "default" : "success"} size="sm">
        {item.role}
      </Badge>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (item: any) => {
      const variant: Record<string, "success" | "warning" | "error"> = {
        Active: "success",
        Inactive: "warning",
        Suspended: "error",
      };
      return <Badge variant={variant[item.status]} size="sm" dot>{item.status}</Badge>;
    },
  },
  { key: "joined", label: "Joined", sortable: true },
  {
    key: "actions",
    label: "",
    render: () => (
      <button className="rounded-lg p-1.5 text-incogni-muted transition-colors hover:bg-incogni-surface-2 hover:text-incogni-text">
        <MoreHorizontal size={16} />
      </button>
    ),
  },
];

const contentData = [
  { id: 1, title: "Getting Started Guide", type: "Document", author: "Alice J.", status: "Published", views: 12450, updated: "2 days ago" },
  { id: 2, title: "API Reference v2", type: "Document", author: "Bob S.", status: "Published", views: 8920, updated: "5 days ago" },
  { id: 3, title: "Community Guidelines", type: "Policy", author: "Carol W.", status: "Draft", views: 0, updated: "1 hour ago" },
  { id: 4, title: "Q4 Roadmap", type: "Internal", author: "David B.", status: "Review", views: 340, updated: "3 days ago" },
  { id: 5, title: "Security Best Practices", type: "Document", author: "Eva M.", status: "Published", views: 5620, updated: "1 week ago" },
  { id: 6, title: "User Feedback Summary", type: "Report", author: "Frank L.", status: "Draft", views: 0, updated: "6 hours ago" },
  { id: 7, title: "Feature Proposal: Dark Mode", type: "Proposal", author: "Grace K.", status: "Review", views: 210, updated: "4 days ago" },
  { id: 8, title: "Release Notes v3.1", type: "Document", author: "Henry W.", status: "Published", views: 3450, updated: "2 weeks ago" },
];

const contentColumns = [
  {
    key: "title",
    label: "Title",
    render: (item: any) => (
      <div>
        <div className="text-sm font-medium text-incogni-text">{item.title}</div>
        <div className="text-xs text-incogni-muted">{item.type} • by {item.author}</div>
      </div>
    ),
  },
  { key: "type", label: "Type" },
  {
    key: "status",
    label: "Status",
    render: (item: any) => {
      const variant: Record<string, "success" | "warning" | "info"> = {
        Published: "success",
        Draft: "warning",
        Review: "info",
      };
      return <Badge variant={variant[item.status] ?? "default"} size="sm">{item.status}</Badge>;
    },
  },
  {
    key: "views",
    label: "Views",
    sortable: true,
    render: (item: any) => <span className="font-medium">{item.views.toLocaleString()}</span>,
  },
  { key: "updated", label: "Updated", sortable: true },
];

export function DashboardAdmin() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex min-h-screen bg-incogni-bg">
      <aside className="hidden w-60 flex-col border-r border-incogni-border bg-incogni-surface/50 lg:flex">
        <div className="flex items-center gap-2 border-b border-incogni-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-incogni-accent text-sm font-bold text-white">K</div>
          <span className="text-lg font-bold text-incogni-text">IncogniAI</span>
          <Badge variant="info" size="sm">Admin</Badge>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {sidebarItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-incogni-accent/10 text-incogni-accent"
                  : "text-incogni-muted hover:bg-incogni-surface hover:text-incogni-text"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="border-t border-incogni-border p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-incogni-muted transition-colors hover:bg-incogni-surface hover:text-incogni-text">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-incogni-border bg-incogni-surface/50 px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-incogni-text">Admin Panel</h1>
            <Badge variant="info" size="sm">v3.2.1</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-incogni-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-lg border border-incogni-border bg-incogni-bg py-2 pl-9 pr-3 text-sm text-incogni-text placeholder-incogni-muted outline-none transition-colors focus:border-incogni-accent"
              />
            </div>
            <button className="relative rounded-lg p-2 text-incogni-muted transition-colors hover:bg-incogni-surface-2 hover:text-incogni-text">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-incogni-accent/20 text-sm font-medium text-incogni-accent">JD</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <Alert
              type="warning"
              title="System Notice"
              message="Scheduled maintenance is planned for March 20, 2024, 02:00-04:00 UTC. The platform may experience brief downtime."
              dismissible
            />

            <Stats items={adminStats} columns={4} />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-incogni-text">User Management</h3>
                <button className="rounded-lg bg-incogni-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">
                  Add User
                </button>
              </div>
              <Table columns={userMgmtColumns} data={userManagementData} />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-incogni-text">Content Library</h3>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-lg border border-incogni-border bg-incogni-surface px-3 py-1.5 text-xs text-incogni-muted transition-colors hover:text-incogni-text">
                    <ChevronDown size={12} />
                    Filter
                  </button>
                  <button className="rounded-lg bg-incogni-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">
                    New Content
                  </button>
                </div>
              </div>
              <DataGrid columns={contentColumns} data={contentData} pageSize={5} selectable />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
