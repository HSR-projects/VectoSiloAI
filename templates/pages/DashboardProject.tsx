// @ts-nocheck
// Template ID: page-dashboard-project
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users,
  FileText,
  Plus,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Circle,
  CheckCircle2,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "../components/Progress";
import { Stats } from "../components/Stats";
import { Timeline } from "../components/Timeline";
import { List } from "../components/List";
import { Badge } from "../components/Badge";

const sidebarItems = [
  { label: "Projects", href: "#", icon: LayoutDashboard, active: true },
  { label: "Tasks", href: "#", icon: CheckSquare },
  { label: "Calendar", href: "#", icon: Calendar },
  { label: "Team", href: "#", icon: Users },
  { label: "Files", href: "#", icon: FileText },
];

const projectMilestones = [
  {
    date: "2024-01-15",
    title: "Project Kickoff",
    description: "Initial planning and team assignment completed.",
    color: "bg-green-500",
  },
  {
    date: "2024-02-01",
    title: "Design Phase Complete",
    description: "UI/UX designs approved by stakeholders.",
    color: "bg-blue-500",
  },
  {
    date: "2024-02-28",
    title: "Sprint 1 Launch",
    description: "First development sprint initiated with core features.",
    color: "bg-koda-accent",
  },
  {
    date: "2024-03-15",
    title: "Beta Release",
    description: "Internal beta testing begins with select users.",
    color: "bg-purple-500",
  },
  {
    date: "2024-04-01",
    title: "Public Launch",
    description: "Full public release of the platform.",
    color: "bg-orange-500",
  },
];

const taskList = [
  { id: "1", icon: <CheckCircle2 size={16} className="text-green-500" />, title: "Set up CI/CD pipeline", description: "DevOps • High Priority", action: <Badge variant="error" size="sm">High</Badge> },
  { id: "2", icon: <Circle size={16} className="text-koda-muted" />, title: "Design landing page mockups", description: "Design • Medium Priority", action: <Badge variant="warning" size="sm">Medium</Badge> },
  { id: "3", icon: <Circle size={16} className="text-koda-muted" />, title: "Implement user authentication", description: "Backend • High Priority", action: <Badge variant="error" size="sm">High</Badge> },
  { id: "4", icon: <CheckCircle2 size={16} className="text-green-500" />, title: "Write API documentation", description: "Docs • Low Priority", action: <Badge variant="default" size="sm">Low</Badge> },
  { id: "5", icon: <Circle size={16} className="text-koda-muted" />, title: "Set up monitoring & alerts", description: "DevOps • Medium Priority", action: <Badge variant="warning" size="sm">Medium</Badge> },
];

const sprintStats = [
  { label: "Completed", value: 23, icon: <CheckCircle2 size={16} /> },
  { label: "In Progress", value: 12, icon: <Clock size={16} /> },
  { label: "Blocked", value: 3, icon: <AlertCircle size={16} /> },
  { label: "Total", value: 42, icon: <LayoutDashboard size={16} /> },
];

const teamMembers = [
  { initials: "AJ", name: "Alice Johnson", role: "Project Lead", color: "bg-blue-500" },
  { initials: "BS", name: "Bob Smith", role: "Developer", color: "bg-green-500" },
  { initials: "CW", name: "Carol Williams", role: "Designer", color: "bg-purple-500" },
  { initials: "DB", name: "David Brown", role: "Developer", color: "bg-orange-500" },
  { initials: "EM", name: "Eva Martinez", role: "QA", color: "bg-pink-500" },
  { initials: "FL", name: "Frank Lee", role: "Developer", color: "bg-teal-500" },
  { initials: "GK", name: "Grace Kim", role: "Designer", color: "bg-indigo-500" },
];

const kanbanData = {
  todo: [
    { id: "t1", title: "User onboarding flow", priority: "High", comments: 3, attachments: 2, assignee: "AJ" },
    { id: "t2", title: "Payment gateway integration", priority: "High", comments: 5, attachments: 1, assignee: "BS" },
    { id: "t3", title: "Email notification system", priority: "Medium", comments: 1, attachments: 0, assignee: "DB" },
  ],
  inProgress: [
    { id: "i1", title: "Dashboard analytics widgets", priority: "High", comments: 4, attachments: 3, assignee: "EM" },
    { id: "i2", title: "Search functionality", priority: "Medium", comments: 2, attachments: 1, assignee: "FL" },
    { id: "i3", title: "Mobile responsive layout", priority: "Low", comments: 1, attachments: 0, assignee: "CW" },
  ],
  done: [
    { id: "d1", title: "Project setup & structure", priority: "High", comments: 8, attachments: 2, assignee: "AJ" },
    { id: "d2", title: "Authentication pages", priority: "High", comments: 6, attachments: 4, assignee: "BS" },
    { id: "d3", title: "Database schema design", priority: "Medium", comments: 3, attachments: 1, assignee: "GK" },
  ],
};

const priorityColors: Record<string, string> = {
  High: "bg-red-500/20 text-red-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Low: "bg-green-500/20 text-green-400",
};

function KanbanCard({ item }: { item: any }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-koda-border bg-koda-surface p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="default" size="sm" className={cn("border-0", priorityColors[item.priority])}>
          {item.priority}
        </Badge>
        <button className="text-koda-muted hover:text-koda-text">
          <MoreHorizontal size={14} />
        </button>
      </div>
      <p className="mb-3 text-sm font-medium text-koda-text">{item.title}</p>
      <div className="flex items-center justify-between text-xs text-koda-muted">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <MessageSquare size={12} /> {item.comments}
          </span>
          <span className="flex items-center gap-1">
            <Paperclip size={12} /> {item.attachments}
          </span>
        </div>
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-koda-accent/20 text-[10px] font-medium text-koda-accent">
          {item.assignee}
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardProject() {
  const [activeTab, setActiveTab] = useState("kanban");

  return (
    <div className="flex min-h-screen bg-koda-bg">
      <aside className="hidden w-60 flex-col border-r border-koda-border bg-koda-surface/50 lg:flex">
        <div className="flex items-center gap-2 border-b border-koda-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-koda-accent text-sm font-bold text-white">K</div>
          <span className="text-lg font-bold text-koda-text">KodaAI</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {sidebarItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-koda-accent/10 text-koda-accent"
                  : "text-koda-muted hover:bg-koda-surface hover:text-koda-text"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="border-t border-koda-border p-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <Progress value={68} size="sm" className="flex-1" />
            <span className="text-xs text-koda-muted">68%</span>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-koda-border bg-koda-surface/50 px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-koda-text">Project Phoenix</h1>
            <p className="text-xs text-koda-muted">Q1 2024 Release • v2.0.0</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 5).map((member) => (
                <div
                  key={member.initials}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 border-koda-bg text-[10px] font-medium text-white",
                    member.color
                  )}
                  title={member.name}
                >
                  {member.initials}
                </div>
              ))}
              {teamMembers.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-koda-bg bg-koda-surface-2 text-[10px] font-medium text-koda-muted">
                  +{teamMembers.length - 5}
                </div>
              )}
            </div>
            <button className="flex items-center gap-1.5 rounded-lg bg-koda-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90">
              <Plus size={14} />
              New Task
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-xl border border-koda-border bg-koda-surface p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-koda-text">Project Progress</h3>
                <span className="text-xs text-koda-muted">42 of 62 tasks</span>
              </div>
              <Progress value={68} variant="default" size="md" showValue />
            </div>

            <div className="rounded-xl border border-koda-border bg-koda-surface p-5">
              <h3 className="mb-4 text-sm font-semibold text-koda-text">Sprint Metrics</h3>
              <Stats items={sprintStats} columns={4} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-koda-border bg-koda-surface p-5">
                <h3 className="mb-4 text-sm font-semibold text-koda-text">Project Timeline</h3>
                <Timeline items={projectMilestones} />
              </div>

              <div className="rounded-xl border border-koda-border bg-koda-surface p-5">
                <h3 className="mb-4 text-sm font-semibold text-koda-text">Recent Tasks</h3>
                <List items={taskList} variant="compact" />
              </div>

              <div className="rounded-xl border border-koda-border bg-koda-surface p-5">
                <h3 className="mb-4 text-sm font-semibold text-koda-text">Team Members</h3>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.initials} className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium text-white", member.color)}>
                        {member.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-koda-text">{member.name}</p>
                        <p className="text-xs text-koda-muted">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("kanban")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "kanban" ? "bg-koda-accent text-white" : "text-koda-muted hover:text-koda-text"
                  )}
                >
                  Kanban Board
                </button>
                <button
                  onClick={() => setActiveTab("list")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "list" ? "bg-koda-accent text-white" : "text-koda-muted hover:text-koda-text"
                  )}
                >
                  List View
                </button>
              </div>

              {activeTab === "kanban" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    { title: "To Do", items: kanbanData.todo, color: "border-t-blue-500" },
                    { title: "In Progress", items: kanbanData.inProgress, color: "border-t-yellow-500" },
                    { title: "Done", items: kanbanData.done, color: "border-t-green-500" },
                  ].map((col) => (
                    <div
                      key={col.title}
                      className={cn("rounded-xl border border-koda-border border-t-2 bg-koda-surface/50 p-4", col.color)}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-koda-text">{col.title}</h4>
                        <Badge variant="default" size="sm">{col.items.length}</Badge>
                      </div>
                      <div className="space-y-3">
                        {col.items.map((item) => (
                          <KanbanCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
