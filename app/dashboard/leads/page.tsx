"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Lead } from "@/lib/types";
import {
  Users,
  Flame,
  Sun,
  Snowflake,
  Search,
  Filter,
  Mail,
  Phone,
  PhoneOff,
  PhoneMissed,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox,
  ArrowRight,
  Sparkles,
  Globe,
  Voicemail,
  MessageCircle,
} from "lucide-react";

// ── Urgency config ──────────────────────────────────────────
const urgencyConfig = {
  hot: { icon: Flame, label: "Hot", class: "badge-red", color: "text-red-400" },
  warm: { icon: Sun, label: "Warm", class: "badge-amber", color: "text-amber-400" },
  cold: { icon: Snowflake, label: "Cold", class: "badge-blue", color: "text-blue-400" },
};

// ── Status config ───────────────────────────────────────────
const statusConfig: Record<string, { label: string; class: string }> = {
  new: { label: "New", class: "badge-blue" },
  contacted: { label: "Contacted", class: "badge-amber" },
  qualified: { label: "Qualified", class: "badge-green" },
  converted: { label: "Converted", class: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" },
  lost: { label: "Lost", class: "bg-surface-600/20 text-surface-400 border border-surface-600/30" },
};

// ── Source config (NEW) ─────────────────────────────────────
const sourceConfig: Record<string, { icon: any; label: string; color: string; bgColor: string; borderColor: string }> = {
  web: {
    icon: Globe,
    label: "Web Form",
    color: "text-brand-400",
    bgColor: "bg-brand-500/10",
    borderColor: "border-brand-500/20",
  },
  missed_call: {
    icon: PhoneMissed,
    label: "Missed Call",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  sms: {
    icon: MessageCircle,
    label: "SMS",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  voicemail: {
    icon: Voicemail,
    label: "Voicemail",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  manual: {
    icon: Users,
    label: "Manual",
    color: "text-surface-400",
    bgColor: "bg-surface-500/10",
    borderColor: "border-surface-500/20",
  },
  test: {
    icon: Globe,
    label: "Test",
    color: "text-brand-400",
    bgColor: "bg-brand-500/10",
    borderColor: "border-brand-500/20",
  },
};

const defaultSource = {
  icon: Globe,
  label: "Web",
  color: "text-brand-400",
  bgColor: "bg-brand-500/10",
  borderColor: "border-brand-500/20",
};

function getSourceConfig(source: string | null | undefined) {
  if (!source) return defaultSource;
  return sourceConfig[source] || defaultSource;
}

export default function LeadsPage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  async function updateStatus(leadId: string, newStatus: string) {
    setUpdatingId(leadId);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, status: newStatus }),
    });
    await fetchLeads();
    setUpdatingId(null);
  }

  // ── Filtering (null-safe for email) ─────────────────────────
  const filtered = leads.filter((lead) => {
    const matchesSearch =
      (lead.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.message || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.category || "").toLowerCase().includes(search.toLowerCase());
    const matchesUrgency = filterUrgency === "all" || lead.urgency === filterUrgency;
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesSource = filterSource === "all" || lead.source === filterSource;
    return matchesSearch && matchesUrgency && matchesStatus && matchesSource;
  });

  // ── Stats ───────────────────────────────────────────────────
  const stats = {
    total: leads.length,
    hot: leads.filter((l) => l.urgency === "hot").length,
    warm: leads.filter((l) => l.urgency === "warm").length,
    cold: leads.filter((l) => l.urgency === "cold").length,
    new: leads.filter((l) => l.status === "new").length,
  };

  // ── Source breakdown for filter badges ──────────────────────
  const sourceCounts = leads.reduce((acc, lead) => {
    const src = lead.source || "web";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Leads</h1>
          <p className="text-surface-400 text-sm mt-1">
            AI-powered lead management — {stats.total} total, {stats.new} new
          </p>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-surface-400">Total Leads</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.hot}</p>
          <p className="text-xs text-surface-400">Hot</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats.warm}</p>
          <p className="text-xs text-surface-400">Warm</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.cold}</p>
          <p className="text-xs text-surface-400">Cold</p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 py-2.5"
            placeholder="Search leads..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="input-field py-2.5 w-auto text-sm"
          >
            <option value="all">All Urgency</option>
            <option value="hot">🔴 Hot</option>
            <option value="warm">🟡 Warm</option>
            <option value="cold">🔵 Cold</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field py-2.5 w-auto text-sm"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="input-field py-2.5 w-auto text-sm"
          >
            <option value="all">All Sources</option>
            <option value="web">🌐 Web Form</option>
            <option value="missed_call">📞 Missed Call</option>
            <option value="sms">💬 SMS</option>
            <option value="voicemail">🎙️ Voicemail</option>
            <option value="manual">✏️ Manual</option>
          </select>
        </div>
      </div>

      {/* ── Lead Cards ─────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const urgency = urgencyConfig[lead.urgency] || urgencyConfig.warm;
            const status = statusConfig[lead.status] || statusConfig.new;
            const source = getSourceConfig(lead.source);
            const isExpanded = expandedLead === lead.id;
            const UrgencyIcon = urgency.icon;
            const SourceIcon = source.icon;

            return (
              <div key={lead.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                  className="w-full p-5 flex items-start sm:items-center justify-between gap-4 text-left hover:bg-surface-800/30 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Source icon (replaces urgency icon as primary indicator) */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${source.bgColor} border ${source.borderColor}`}>
                      <SourceIcon className={`w-5 h-5 ${source.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-white">{lead.name}</h3>
                        <span className={`badge text-[10px] ${urgency.class}`}>
                          {urgency.label}
                        </span>
                        <span className={`badge text-[10px] ${status.class}`}>
                          {status.label}
                        </span>
                        {lead.category && (
                          <span className="badge bg-surface-700/60 text-surface-300 border border-surface-600/40 text-[10px]">
                            {lead.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-surface-400 mt-0.5 truncate">
                        {lead.ai_summary || lead.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {/* Source label */}
                        <span className={`text-xs flex items-center gap-1 ${source.color}`}>
                          <SourceIcon className="w-3 h-3" />
                          {source.label}
                        </span>
                        {/* Email (only show if exists) */}
                        {lead.email && (
                          <span className="text-xs text-surface-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </span>
                        )}
                        {/* Phone (only show if exists and no email, or always for phone leads) */}
                        {lead.phone && !lead.email && (
                          <span className="text-xs text-surface-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                        )}
                        <span className="text-xs text-surface-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.created_at).toLocaleString("en-AU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  )}
                </button>

                {/* ── Expanded Detail Panel ──────────────────── */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-surface-700/40 pt-4 space-y-4 animate-fade-in">
                    {/* Contact actions */}
                    <div className="flex flex-wrap gap-3">
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="btn-ghost text-xs text-brand-400"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {lead.email}
                        </a>
                      )}
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="btn-ghost text-xs text-brand-400"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {lead.phone}
                        </a>
                      )}
                    </div>

                    {/* Original message */}
                    <div>
                      <p className="text-xs font-medium text-surface-400 mb-1.5 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Original Message
                      </p>
                      <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/40 text-sm text-surface-300 leading-relaxed">
                        {lead.message}
                      </div>
                    </div>

                    {/* AI auto-reply */}
                    {lead.ai_response_sent && (
                      <div>
                        <p className="text-xs font-medium text-brand-400 mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Auto-Reply Sent
                        </p>
                        <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/15 text-sm text-surface-300 leading-relaxed">
                          {lead.ai_response_sent}
                        </div>
                      </div>
                    )}

                    {/* Follow-up info */}
                    {lead.next_follow_up_at && (
                      <div className="flex items-center gap-2 text-xs text-surface-500">
                        <Clock className="w-3 h-3" />
                        Next follow-up:{" "}
                        {new Date(lead.next_follow_up_at).toLocaleString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" "}(#{(lead.follow_up_count || 0) + 1} of 3)
                      </div>
                    )}

                    {/* Status update buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <p className="text-xs text-surface-500 self-center mr-1">
                        Update status:
                      </p>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => updateStatus(lead.id, key)}
                          disabled={
                            lead.status === key || updatingId === lead.id
                          }
                          className={`badge text-[11px] cursor-pointer transition-opacity ${
                            lead.status === key
                              ? `${config.class} opacity-100 ring-1 ring-white/20`
                              : `${config.class} opacity-50 hover:opacity-100`
                          }`}
                        >
                          {updatingId === lead.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            config.label
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mx-auto mb-5">
            <Inbox className="w-7 h-7 text-surface-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {search || filterUrgency !== "all" || filterStatus !== "all" || filterSource !== "all"
              ? "No leads match your filters"
              : "No leads yet"}
          </h3>
          <p className="text-sm text-surface-400 max-w-sm mx-auto mb-6">
            {search || filterUrgency !== "all" || filterStatus !== "all" || filterSource !== "all"
              ? "Try adjusting your search or filters."
              : "Set up your business profile and embed the contact form to start receiving AI-powered leads."}
          </p>
          {!search && filterUrgency === "all" && filterStatus === "all" && filterSource === "all" && (
            <a href="/dashboard/business-setup" className="btn-primary">
              Set Up Business Profile
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
