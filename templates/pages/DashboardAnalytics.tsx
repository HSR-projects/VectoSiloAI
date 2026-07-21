// @ts-nocheck
// Template ID: page-dashboard-analytics
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  ChevronDown,
  DollarSign,
  Users,
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "../components/Navbar";
import { Table } from "../components/Table";
import { Stats } from "../components/Stats";
import { DataGrid } from "../components/DataGrid";
import { Badge } from "../components/Badge";

const sidebarNav = [
  { label: "Dashboard", href: "#", active: true },
  { label: "Analytics", href: "#" },
  { label: "Reports", href: "#" },
  { label: "Settings", href: "#" },
  { label: "Team", href: "#" },
];

const statCards = [
  { label: "Revenue", value: 124500, prefix: "$", suffix: "", trend: "up" as const, change: "+12.5%" },
  { label: "Users", value: 2847, trend: "up" as const, change: "+8.2%" },
  { label: "Sessions", value: 14200, trend: "up" as const, change: "+18.3%" },
  { label: "Conversion", value: 324, prefix: "", suffix: "%", trend: "down" as const, change: "-2.1%" },
];

const conversionValue = 3.24;

const recentTransactions = [
  { id: "1", transaction: "INV-2024-001", customer: "Alice Johnson", amount: "$2,450.00", status: "Completed", date: "2024-03-15" },
  { id: "2", transaction: "INV-2024-002", customer: "Bob Smith", amount: "$850.00", status: "Pending", date: "2024-03-14" },
  { id: "3", transaction: "INV-2024-003", customer: "Carol Williams", amount: "$3,200.00", status: "Completed", date: "2024-03-14" },
  { id: "4", transaction: "INV-2024-004", customer: "David Brown", amount: "$1,100.00", status: "Failed", date: "2024-03-13" },
  { id: "5", transaction: "INV-2024-005", customer: "Eva Martinez", amount: "$5,600.00", status: "Completed", date: "2024-03-13" },
  { id: "6", transaction: "INV-2024-006", customer: "Frank Lee", amount: "$950.00", status: "Pending", date: "2024-03-12" },
];

const transactionColumns = [
  { key: "transaction", label: "Transaction", sortable: true },
  { key: "customer", label: "Customer", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (item: any) => <span className="font-medium">{item.amount}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (item: any) => {
      const variant: Record<string, "success" | "warning" | "error"> = {
        Completed: "success",
        Pending: "warning",
        Failed: "error",
      };
      return <Badge variant={variant[item.status] ?? "default"} size="sm">{item.status}</Badge>;
    },
  },
  { key: "date", label: "Date", sortable: true },
];

const weeklyData = [
  { day: "Mon", revenue: 12000, users: 320 },
  { day: "Tue", revenue: 18500, users: 480 },
  { day: "Wed", revenue: 14200, users: 410 },
  { day: "Thu", revenue: 22100, users: 560 },
  { day: "Fri", revenue: 19800, users: 520 },
  { day: "Sat", revenue: 16500, users: 390 },
  { day: "Sun", revenue: 13800, users: 340 },
];

const maxRevenue = Math.max(...weeklyData.map(d => d.revenue));
const maxUsers = Math.max(...weeklyData.map(d => d.users));

const userListData = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "Active", lastActive: "2 min ago" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor", status: "Active", lastActive: "15 min ago" },
  { id: 3, name: "Carol Williams", email: "carol@example.com", role: "Viewer", status: "Inactive", lastActive: "2 days ago" },
  { id: 4, name: "David Brown", email: "david@example.com", role: "Editor", status: "Active", lastActive: "1 hour ago" },
  { id: 5, name: "Eva Martinez", email: "eva@example.com", role: "Admin", status: "Active", lastActive: "5 min ago" },
  { id: 6, name: "Frank Lee", email: "frank@example.com", role: "Viewer", status: "Suspended", lastActive: "1 week ago" },
  { id: 7, name: "Grace Kim", email: "grace@example.com", role: "Editor", status: "Active", lastActive: "30 min ago" },
  { id: 8, name: "Henry Wilson", email: "henry@example.com", role: "Viewer", status: "Inactive", lastActive: "3 days ago" },
];

const userColumns = [
  {
    key: "name",
    label: "Name",
    render: (item: any) => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-vectosilo-accent/20 text-xs font-medium text-vectosilo-accent">
          {item.name.split(" ").map((n: string) => n[0]).join("")}
        </div>
        <span>{item.name}</span>
      </div>
    ),
  },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  {
    key: "status",
    label: "Status",
    render: (item: any) => {
      const variant: Record<string, "success" | "warning" | "error"> = {
        Active: "success",
        Inactive: "warning",
        Suspended: "error",
      };
      return <Badge variant={variant[item.status] ?? "default"} size="sm" dot>{item.status}</Badge>;
    },
  },
  { key: "lastActive", label: "Last Active" },
];

export function DashboardAnalytics() {
  const [dateRange, setDateRange] = useState("Last 7 days");

  return (
    <div className="flex min-h-screen flex-col bg-vectosilo-bg">
      <Navbar
        logo={
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vectosilo-accent text-sm font-bold text-white">K</div>
            <span className="text-lg font-bold text-vectosilo-text">VectoSiloAI</span>
          </div>
        }
        links={[
          { label: "Dashboard", href: "#" },
          { label: "Analytics", href: "#" },
          { label: "Reports", href: "#" },
          { label: "Settings", href: "#" },
        ]}
        cta={
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-vectosilo-muted transition-colors hover:bg-vectosilo-surface hover:text-vectosilo-text">
              <Search size={18} />
            </button>
            <button className="relative rounded-lg p-2 text-vectosilo-muted transition-colors hover:bg-vectosilo-surface hover:text-vectosilo-text">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-vectosilo-accent" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-vectosilo-accent/20 text-sm font-medium text-vectosilo-accent">JD</div>
          </div>
        }
      />

      <div className="flex flex-1">
        <aside className="hidden w-60 flex-col border-r border-vectosilo-border bg-vectosilo-surface/50 p-4 lg:flex">
          <nav className="flex flex-col gap-1">
            {sidebarNav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-vectosilo-accent/10 text-vectosilo-accent"
                    : "text-vectosilo-muted hover:bg-vectosilo-surface hover:text-vectosilo-text"
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-vectosilo-text">Analytics Dashboard</h1>
                <p className="text-sm text-vectosilo-muted">Track your performance metrics</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-3 py-2 text-sm text-vectosilo-muted transition-colors hover:text-vectosilo-text">
                  <Filter size={14} />
                  Filter
                </button>
                <button className="flex items-center gap-2 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-3 py-2 text-sm text-vectosilo-muted transition-colors hover:text-vectosilo-text">
                  <Download size={14} />
                  Export
                </button>
                <div className="relative">
                  <button className="flex items-center gap-2 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-3 py-2 text-sm text-vectosilo-text transition-colors hover:bg-vectosilo-surface-2">
                    {dateRange}
                    <ChevronDown size={14} className="text-vectosilo-muted" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="rounded-xl border border-vectosilo-border bg-vectosilo-surface p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-vectosilo-muted">{stat.label}</span>
                    {stat.trend === "up" ? (
                      <ArrowUpRight size={16} className="text-green-500" />
                    ) : (
                      <ArrowDownRight size={16} className="text-red-500" />
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-vectosilo-text">
                      {stat.prefix}
                      {stat.label === "Conversion" ? conversionValue : stat.value.toLocaleString()}
                      {stat.suffix}
                    </span>
                    <span className={cn("text-xs font-medium", stat.trend === "up" ? "text-green-500" : "text-red-500")}>
                      {stat.change}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface p-5">
              <h3 className="mb-4 text-sm font-semibold text-vectosilo-text">Revenue Overview</h3>
              <div className="flex items-end gap-2">
                {weeklyData.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.revenue / maxRevenue) * 180}px` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="w-full rounded-t-md bg-gradient-to-t from-vectosilo-accent/60 to-vectosilo-accent/20"
                      style={{ minHeight: 4 }}
                    />
                    <span className="text-[10px] text-vectosilo-muted">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-vectosilo-text">Recent Transactions</h3>
                <Table columns={transactionColumns} data={recentTransactions} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-vectosilo-text">Session Analytics</h3>
                <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface p-5">
                  <div className="flex items-end gap-2">
                    {weeklyData.map((d) => (
                      <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(d.users / maxUsers) * 180}px` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                          className="w-full rounded-t-md bg-gradient-to-t from-blue-500/60 to-blue-500/20"
                          style={{ minHeight: 4 }}
                        />
                        <span className="text-[10px] text-vectosilo-muted">{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-vectosilo-text">Users</h3>
                <button className="text-xs text-vectosilo-accent hover:underline">View All</button>
              </div>
              <DataGrid columns={userColumns} data={userListData} pageSize={5} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
