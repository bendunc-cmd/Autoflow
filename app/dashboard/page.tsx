import { createClient } from "@/lib/supabase-server";
import {
  Flame,
  Sun,
  Snowflake,
  TrendingUp,
  Users,
  Phone,
  PhoneMissed,
  Globe,
  MessageCircle,
  Voicemail,
  UserPlus,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Activity,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Fetch all leads ────────────────────────────────────────
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const allLeads = leads || [];

  // ── Fetch profile ──────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name")
    .eq("id", user?.id)
    .single();

  // ── Fetch recent activities ────────────────────────────────
  const { data: recentActivities } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(8);

  // ── Time calculations ──────────────────────────────────────
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // ── Stats ──────────────────────────────────────────────────
  const totalLeads = allLeads.length;
  const leadsToday = allLeads.filter((l) => new Date(l.created_at) >= startOfToday).length;
  const leadsThisWeek = allLeads.filter((l) => new Date(l.created_at) >= startOfWeek).length;
  const leadsThisMonth = allLeads.filter((l) => new Date(l.created_at) >= startOfMonth).length;
  const leadsLastMonth = allLeads.filter(
    (l) => new Date(l.created_at) >= startOfLastMonth && new Date(l.created_at) < startOfMonth
  ).length;

  // Growth percentage
  const monthGrowth =
    leadsLastMonth > 0
      ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)
      : leadsThisMonth > 0
      ? 100
      : 0;

  // Urgency breakdown
  const hotLeads = allLeads.filter((l) => l.urgency === "hot").length;
  const warmLeads = allLeads.filter((l) => l.urgency === "warm").length;
  const coldLeads = allLeads.filter((l) => l.urgency === "cold").length;

  // Status pipeline
  const newLeads = allLeads.filter((l) => l.status === "new").length;
  const contactedLeads = allLeads.filter((l) => l.status === "contacted").length;
  const qualifiedLeads = allLeads.filter((l) => l.status === "qualified").length;
  const convertedLeads = allLeads.filter((l) => l.status === "converted").length;
  const lostLeads = allLeads.filter((l) => l.status === "lost").length;

  // Source breakdown
  const sourceBreakdown = allLeads.reduce((acc, lead) => {
    const src = lead.source || "web";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Conversion rate
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // Recent 5 leads for quick view
  const recentLeads = allLeads.slice(0, 5);

  const sourceIcons: Record<string, { icon: any; label: string; color: string; bg: string }> = {
    web: { icon: Globe, label: "Web Form", color: "text-brand-400", bg: "bg-brand-500/10" },
    test: { icon: Globe, label: "Test", color: "text-brand-400", bg: "bg-brand-500/10" },
    missed_call: { icon: PhoneMissed, label: "Missed Call", color: "text-orange-400", bg: "bg-orange-500/10" },
    sms: { icon: MessageCircle, label: "SMS", color: "text-green-400", bg: "bg-green-500/10" },
    voicemail: { icon: Voicemail, label: "Voicemail", color: "text-purple-400", bg: "bg-purple-500/10" },
    manual: { icon: UserPlus, label: "Manual", color: "text-teal-400", bg: "bg-teal-500/10" },
  };

  const activityIcons: Record<string, { icon: any; color: string }> = {
    auto_reply: { icon: Sparkles, color: "text-brand-400" },
    email_sent: { icon: Sparkles, color: "text-brand-400" },
    status_change: { icon: Target, color: "text-amber-400" },
    follow_up: { icon: Clock, color: "text-orange-400" },
    note: { icon: Activity, color: "text-teal-400" },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Welcome Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Welcome back
          {profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Here&apos;s how your leads are performing.
        </p>
      </div>

      {/* ── Primary Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-brand-400" />
            </div>
            {monthGrowth !== 0 && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                monthGrowth > 0
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {monthGrowth > 0 ? "+" : ""}{monthGrowth}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{totalLeads}</p>
          <p className="text-xs text-surface-400 mt-0.5">Total Leads</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{leadsToday}</p>
          <p className="text-xs text-surface-400 mt-0.5">Today</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{leadsThisWeek}</p>
          <p className="text-xs text-surface-400 mt-0.5">This Week</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Target className="w-4.5 h-4.5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{conversionRate}%</p>
          <p className="text-xs text-surface-400 mt-0.5">Conversion Rate</p>
        </div>
      </div>

      {/* ── Two Column Layout ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Urgency Breakdown ──────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-medium text-white">Urgency Breakdown</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-sm text-surface-300">Hot</span>
                </div>
                <span className="text-sm font-medium text-white">{hotLeads}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-800/50">
                <div
                  className="h-2 rounded-full bg-red-500/60"
                  style={{ width: `${totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm text-surface-300">Warm</span>
                </div>
                <span className="text-sm font-medium text-white">{warmLeads}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-800/50">
                <div
                  className="h-2 rounded-full bg-amber-500/60"
                  style={{ width: `${totalLeads > 0 ? (warmLeads / totalLeads) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm text-surface-300">Cold</span>
                </div>
                <span className="text-sm font-medium text-white">{coldLeads}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-800/50">
                <div
                  className="h-2 rounded-full bg-blue-500/60"
                  style={{ width: `${totalLeads > 0 ? (coldLeads / totalLeads) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Lead Sources ───────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-medium text-white">Lead Sources</h2>
          </div>
          <div className="space-y-2.5">
           {Object.entries(sourceBreakdown as Record<string, number>)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => {
                const cfg = sourceIcons[source] || sourceIcons.web;
                const Icon = cfg.icon;
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={source} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-surface-300">{cfg.label}</span>
                        <span className="text-xs text-surface-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-800/50">
                        <div
                          className={`h-1.5 rounded-full ${cfg.bg.replace("/10", "/40")}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            {Object.keys(sourceBreakdown).length === 0 && (
              <p className="text-sm text-surface-500">No leads yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Pipeline & Recent Activity ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Status Pipeline ────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-surface-400" />
              <h2 className="text-sm font-medium text-white">Pipeline</h2>
            </div>
            <Link
              href="/dashboard/leads"
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "New", count: newLeads, color: "bg-blue-500/60", textColor: "text-blue-400" },
              { label: "Contacted", count: contactedLeads, color: "bg-amber-500/60", textColor: "text-amber-400" },
              { label: "Qualified", count: qualifiedLeads, color: "bg-emerald-500/60", textColor: "text-emerald-400" },
              { label: "Converted", count: convertedLeads, color: "bg-green-500/60", textColor: "text-green-400" },
              { label: "Lost", count: lostLeads, color: "bg-surface-500/60", textColor: "text-surface-400" },
            ].map((stage) => (
              <div key={stage.label} className="flex items-center gap-3">
                <span className={`text-sm w-20 ${stage.textColor}`}>{stage.label}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-800/50">
                  <div
                    className={`h-2 rounded-full ${stage.color}`}
                    style={{ width: `${totalLeads > 0 ? (stage.count / totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-white w-8 text-right">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-medium text-white">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {(recentActivities || []).length === 0 ? (
              <p className="text-sm text-surface-500">No activity yet</p>
            ) : (
              (recentActivities || []).map((act: any, i: number) => {
                const ac = activityIcons[act.type] || { icon: Activity, color: "text-surface-400" };
                const ActIcon = ac.icon;
                return (
                  <div key={act.id || i} className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-lg bg-surface-800/50 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <ActIcon className={`w-3 h-3 ${ac.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-300 leading-relaxed truncate">
                        {act.description}
                      </p>
                      <p className="text-xs text-surface-600">
                        {new Date(act.created_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Leads Quick View ────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-medium text-white">Latest Leads</h2>
          </div>
          <Link
            href="/dashboard/leads"
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {recentLeads.length === 0 ? (
            <p className="text-sm text-surface-500">No leads yet. They&apos;ll appear here when customers reach out.</p>
          ) : (
            recentLeads.map((lead: any) => {
              const src = sourceIcons[lead.source || "web"] || sourceIcons.web;
              const SrcIcon = src.icon;
              const urgColors: Record<string, string> = {
                hot: "text-red-400",
                warm: "text-amber-400",
                cold: "text-blue-400",
              };
              const urgLabels: Record<string, string> = {
                hot: "Hot",
                warm: "Warm",
                cold: "Cold",
              };
              return (
                <Link
                  key={lead.id}
                  href="/dashboard/leads"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-800/30 transition-colors -mx-1"
                >
                  <div className={`w-8 h-8 rounded-lg ${src.bg} flex items-center justify-center flex-shrink-0`}>
                    <SrcIcon className={`w-4 h-4 ${src.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {lead.name || lead.phone || "Unknown"}
                    </p>
                    <p className="text-xs text-surface-500 truncate">
                      {lead.ai_summary || lead.message || "No details"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium ${urgColors[lead.urgency] || "text-surface-400"}`}>
                      {urgLabels[lead.urgency] || "—"}
                    </span>
                    <span className="text-xs text-surface-600">
                      {new Date(lead.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
