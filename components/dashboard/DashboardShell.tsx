"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import {
  Zap,
  LayoutDashboard,
  GitBranch,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
} from "lucide-react";

interface DashboardShellProps {
  user: User;
  profile: Profile | null;
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/workflows", label: "Workflows", icon: GitBranch },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardShell({
  user,
  profile,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const businessName = profile?.business_name || "My Business";
  const plan = profile?.plan || "free";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-0 h-screen w-64 flex flex-col
          bg-surface-900/95 backdrop-blur-xl border-r border-surface-800/60
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-surface-800/60">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-base font-bold text-white">
              AutoFlow<span className="text-brand-400"> AI</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-surface-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                      : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/60"
                  }`}
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Plan badge */}
        <div className="p-4 border-t border-surface-800/60">
          <div className="px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-surface-400 uppercase tracking-wide">
                Current Plan
              </span>
              <span
                className={`badge ${
                  plan === "pro"
                    ? "badge-blue"
                    : plan === "starter"
                    ? "badge-green"
                    : "bg-surface-700/60 text-surface-400 border border-surface-600/40"
                }`}
              >
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>
            </div>
            {plan === "free" && (
              <p className="text-xs text-surface-500 mt-1">
                Upgrade for more workflows
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/60">
          <div className="flex items-center justify-between px-6 py-3.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-surface-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden lg:block">
              <h2 className="text-sm font-medium text-surface-300">
                {businessName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 text-surface-400 hover:text-white hover:bg-surface-800/60 rounded-xl transition-colors">
                <Bell className="w-4.5 h-4.5" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-surface-800/60 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-surface-300 hidden sm:block">
                    {displayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 z-50 glass-card p-2 shadow-xl shadow-black/20">
                      <div className="px-3 py-2 border-b border-surface-700/50 mb-1">
                        <p className="text-sm font-medium text-white">{displayName}</p>
                        <p className="text-xs text-surface-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/60 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
