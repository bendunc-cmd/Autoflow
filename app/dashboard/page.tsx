import { createClient } from "@/lib/supabase-server";
import {
  GitBranch,
  Play,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
  Plus,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user workflows
  const { data: workflows } = await supabase
    .from("user_workflows")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  // Fetch recent runs
  const { data: runs } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("user_id", user?.id)
    .order("started_at", { ascending: false })
    .limit(5);

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  const totalWorkflows = workflows?.length || 0;
  const activeWorkflows =
    workflows?.filter((w) => w.is_active).length || 0;
  const totalRuns = runs?.length || 0;
  const completedRuns =
    runs?.filter((r) => r.status === "completed").length || 0;
  const failedRuns =
    runs?.filter((r) => r.status === "failed").length || 0;

  const stats = [
    {
      label: "Active Workflows",
      value: activeWorkflows,
      total: totalWorkflows,
      icon: GitBranch,
      color: "text-brand-400",
      bgColor: "bg-brand-500/10 border-brand-500/20",
    },
    {
      label: "Runs This Month",
      value: totalRuns,
      icon: Play,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Completed",
      value: completedRuns,
      icon: CheckCircle,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      label: "Failed",
      value: failedRuns,
      icon: AlertTriangle,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-surface-400 mt-1">
          Here&apos;s what&apos;s happening with your automations.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl ${stat.bgColor} border flex items-center justify-center`}
              >
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              {stat.total !== undefined && (
                <span className="text-xs text-surface-500">
                  of {stat.total}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-surface-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent runs */}
        <div className="lg:col-span-2 glass-card">
          <div className="p-5 border-b border-surface-700/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-surface-400" />
              Recent Workflow Runs
            </h2>
          </div>
          <div className="p-5">
            {runs && runs.length > 0 ? (
              <div className="space-y-3">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 border border-surface-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          run.status === "completed"
                            ? "bg-emerald-400"
                            : run.status === "running"
                            ? "bg-brand-400 animate-pulse"
                            : run.status === "failed"
                            ? "bg-red-400"
                            : "bg-surface-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm text-surface-200">
                          Workflow Run
                        </p>
                        <p className="text-xs text-surface-500">
                          {new Date(run.started_at).toLocaleString("en-AU")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        run.status === "completed"
                          ? "badge-green"
                          : run.status === "running"
                          ? "badge-blue"
                          : run.status === "failed"
                          ? "badge-red"
                          : "badge-amber"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-surface-500" />
                </div>
                <p className="text-sm text-surface-400 mb-1">
                  No workflow runs yet
                </p>
                <p className="text-xs text-surface-500">
                  Create and activate a workflow to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="glass-card">
          <div className="p-5 border-b border-surface-700/50">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-surface-400" />
              Quick Actions
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <Link
              href="/dashboard/workflows"
              className="flex items-center justify-between p-4 rounded-xl bg-brand-500/5 border border-brand-500/15 hover:bg-brand-500/10 hover:border-brand-500/25 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-brand-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Create Workflow
                  </p>
                  <p className="text-xs text-surface-400">
                    Build a new automation
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-brand-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/dashboard/workflows"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-800/40 border border-surface-700/30 hover:bg-surface-800/60 hover:border-surface-700/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-surface-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Browse Templates
                  </p>
                  <p className="text-xs text-surface-400">
                    Start from a template
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-800/40 border border-surface-700/30 hover:bg-surface-800/60 hover:border-surface-700/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-surface-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    View Analytics
                  </p>
                  <p className="text-xs text-surface-400">
                    Check performance
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
