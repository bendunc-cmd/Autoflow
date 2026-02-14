"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { UserWorkflow, WorkflowTemplate } from "@/lib/types";
import {
  Plus,
  GitBranch,
  Power,
  PowerOff,
  Trash2,
  Clock,
  Play,
  Search,
  Mail,
  FileText,
  Users,
  BarChart3,
  MessageSquare,
  ShoppingCart,
  Loader2,
  X,
  Lock,
} from "lucide-react";

const templateIcons: Record<string, typeof Mail> = {
  mail: Mail,
  "file-text": FileText,
  users: Users,
  "bar-chart": BarChart3,
  "message-square": MessageSquare,
  "shopping-cart": ShoppingCart,
};

const defaultTemplates = [
  {
    id: "tpl-1",
    name: "Email Auto-Responder",
    description: "Automatically respond to customer enquiries with AI-generated replies.",
    category: "Communication",
    icon: "mail",
    steps: [
      { id: "s1", name: "Receive Email", type: "trigger", config: {} },
      { id: "s2", name: "AI Generate Reply", type: "ai_process", config: {} },
      { id: "s3", name: "Send Response", type: "action", config: {} },
    ],
    is_premium: false,
  },
  {
    id: "tpl-2",
    name: "Invoice Generator",
    description: "Generate professional invoices when a job is marked complete.",
    category: "Finance",
    icon: "file-text",
    steps: [
      { id: "s1", name: "Job Completed", type: "trigger", config: {} },
      { id: "s2", name: "Generate Invoice", type: "action", config: {} },
      { id: "s3", name: "Send to Customer", type: "action", config: {} },
    ],
    is_premium: false,
  },
  {
    id: "tpl-3",
    name: "Lead Follow-Up",
    description: "Nurture new leads with timed, personalised follow-up messages.",
    category: "Sales",
    icon: "users",
    steps: [
      { id: "s1", name: "New Lead Added", type: "trigger", config: {} },
      { id: "s2", name: "Wait 1 Day", type: "delay", config: {} },
      { id: "s3", name: "Send Follow-Up", type: "action", config: {} },
    ],
    is_premium: false,
  },
  {
    id: "tpl-4",
    name: "Social Media Scheduler",
    description: "Schedule and auto-post content across your social channels.",
    category: "Marketing",
    icon: "message-square",
    steps: [
      { id: "s1", name: "Schedule Trigger", type: "trigger", config: {} },
      { id: "s2", name: "AI Generate Post", type: "ai_process", config: {} },
      { id: "s3", name: "Publish", type: "action", config: {} },
    ],
    is_premium: true,
  },
  {
    id: "tpl-5",
    name: "Inventory Alert",
    description: "Get notified when stock levels drop below your threshold.",
    category: "Operations",
    icon: "shopping-cart",
    steps: [
      { id: "s1", name: "Stock Check", type: "trigger", config: {} },
      { id: "s2", name: "Check Threshold", type: "condition", config: {} },
      { id: "s3", name: "Send Alert", type: "action", config: {} },
    ],
    is_premium: false,
  },
  {
    id: "tpl-6",
    name: "Monthly Report",
    description: "Auto-compile and send monthly business performance reports.",
    category: "Finance",
    icon: "bar-chart",
    steps: [
      { id: "s1", name: "Monthly Trigger", type: "trigger", config: {} },
      { id: "s2", name: "Gather Data", type: "action", config: {} },
      { id: "s3", name: "AI Summarise", type: "ai_process", config: {} },
      { id: "s4", name: "Email Report", type: "action", config: {} },
    ],
    is_premium: true,
  },
];

export default function WorkflowsPage() {
  const supabase = createClient();
  const [workflows, setWorkflows] = useState<UserWorkflow[]>([]);
  const [templates, setTemplates] = useState<(typeof defaultTemplates[0])[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_workflows")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWorkflows((data as UserWorkflow[]) || []);
  }, [supabase]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from("workflow_templates").select("*").order("name");
    if (data && data.length > 0) {
      setTemplates(data as unknown as typeof defaultTemplates);
    } else {
      setTemplates(defaultTemplates);
    }
  }, [supabase]);

  useEffect(() => {
    Promise.all([fetchWorkflows(), fetchTemplates()]).then(() => setLoading(false));
  }, [fetchWorkflows, fetchTemplates]);

  async function createFromTemplate(template: (typeof defaultTemplates)[0]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("user_workflows").insert({
      user_id: user.id,
      template_id: template.id.startsWith("tpl-") ? null : template.id,
      name: template.name,
      description: template.description,
      steps: template.steps,
      is_active: false,
    });
    if (!error) {
      await fetchWorkflows();
      setShowTemplates(false);
    }
  }

  async function toggleWorkflow(id: string, currentState: boolean) {
    setTogglingId(id);
    await supabase.from("user_workflows").update({ is_active: !currentState }).eq("id", id);
    await fetchWorkflows();
    setTogglingId(null);
  }

  async function deleteWorkflow(id: string) {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    await supabase.from("user_workflows").delete().eq("id", id);
    await fetchWorkflows();
  }

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.description || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Workflows</h1>
          <p className="text-surface-400 text-sm mt-1">Create and manage your automations</p>
        </div>
        <button onClick={() => setShowTemplates(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Search */}
      {workflows.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 py-2.5"
            placeholder="Search workflows..."
          />
        </div>
      )}

      {/* Workflows list */}
      {filteredWorkflows.length > 0 ? (
        <div className="space-y-3">
          {filteredWorkflows.map((workflow) => (
            <div key={workflow.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${workflow.is_active ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-surface-800 border border-surface-700"}`}>
                  <GitBranch className={`w-5 h-5 ${workflow.is_active ? "text-emerald-400" : "text-surface-500"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{workflow.name}</h3>
                    <span className={`badge ${workflow.is_active ? "badge-green" : "badge-amber"}`}>
                      {workflow.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-surface-400 mt-0.5">{workflow.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {(workflow.steps as unknown[])?.length || 0} steps
                    </span>
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(workflow.created_at).toLocaleDateString("en-AU")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-shrink-0">
                <button
                  onClick={() => toggleWorkflow(workflow.id, workflow.is_active)}
                  disabled={togglingId === workflow.id}
                  className={`btn-ghost px-3 py-2 text-xs ${workflow.is_active ? "text-amber-400 hover:bg-amber-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`}
                >
                  {togglingId === workflow.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : workflow.is_active ? (
                    <PowerOff className="w-4 h-4" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                </button>
                <button onClick={() => deleteWorkflow(workflow.id)} className="btn-ghost px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mx-auto mb-5">
            <GitBranch className="w-7 h-7 text-surface-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {search ? "No workflows found" : "No workflows yet"}
          </h3>
          <p className="text-sm text-surface-400 max-w-sm mx-auto mb-6">
            {search ? "Try adjusting your search terms." : "Get started by creating your first automation from a template."}
          </p>
          {!search && (
            <button onClick={() => setShowTemplates(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Create First Workflow
            </button>
          )}
        </div>
      )}

      {/* Template modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTemplates(false)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto glass-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-bold text-white">Choose a Template</h2>
                <p className="text-sm text-surface-400 mt-1">Select a template to create your workflow</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-surface-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {templates.map((template) => {
                const IconComp = templateIcons[template.icon] || GitBranch;
                return (
                  <button
                    key={template.id}
                    onClick={() => !template.is_premium && createFromTemplate(template)}
                    disabled={template.is_premium}
                    className={`text-left p-5 rounded-xl border transition-all ${
                      template.is_premium
                        ? "bg-surface-800/30 border-surface-700/30 opacity-60 cursor-not-allowed"
                        : "bg-surface-800/40 border-surface-700/40 hover:bg-surface-800/70 hover:border-brand-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-700/60 border border-surface-600/40 flex items-center justify-center">
                        <IconComp className="w-4.5 h-4.5 text-surface-300" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-blue text-[10px]">{template.category}</span>
                        {template.is_premium && (
                          <span className="badge-amber text-[10px] flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Pro
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-medium text-white text-sm mb-1">{template.name}</h3>
                    <p className="text-xs text-surface-400 leading-relaxed">{template.description}</p>
                    <p className="text-xs text-surface-500 mt-2">{template.steps.length} steps</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
