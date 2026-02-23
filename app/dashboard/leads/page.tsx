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
  Plus,
  X,
  UserPlus,
  Activity,
  Send,
  Bell,
  CheckCircle,
  AlertCircle,
  FileText,
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

// ── Source config ─────────────────────────────────────────── 
const sourceConfig: Record<string, { icon: any; label: string; color: string; bgColor: string; borderColor: string }> = {
  web: { icon: Globe, label: "Web Form", color: "text-brand-400", bgColor: "bg-brand-500/10", borderColor: "border-brand-500/20" },
  missed_call: { icon: PhoneMissed, label: "Missed Call", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20" },
  sms: { icon: MessageCircle, label: "SMS", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/20" },
  voicemail: { icon: Voicemail, label: "Voicemail", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20" },
  manual: { icon: UserPlus, label: "Manual", color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/20" },
  test: { icon: Globe, label: "Test", color: "text-brand-400", bgColor: "bg-brand-500/10", borderColor: "border-brand-500/20" },
};

const defaultSource = { icon: Globe, label: "Web", color: "text-brand-400", bgColor: "bg-brand-500/10", borderColor: "border-brand-500/20" };

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
  const [activities, setActivities] = useState<Record<string, any[]>>({});
  const [loadingActivities, setLoadingActivities] = useState<string | null>(null);

  // SMS conversation state
  const [smsMessages, setSmsMessages] = useState<Record<string, any[]>>({});
  const [loadingSms, setLoadingSms] = useState<string | null>(null);

  // ── Add Lead Modal state ──────────────────────────────────── 
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingLead, setAddingLead] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);

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

    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    const interval = setInterval(fetchLeads, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchLeads]);

  async function updateStatus(leadId: string, newStatus: string) {
    setUpdatingId(leadId);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, status: newStatus }),
    });
    setActivities((prev) => {
      const next = { ...prev };
      delete next[leadId];
      return next;
    });
    await fetchLeads();
    await fetchActivities(leadId);
    setUpdatingId(null);
  }

  async function fetchActivities(leadId: string) {
    if (activities[leadId]) return;
    setLoadingActivities(leadId);
    const { data } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    setActivities((prev) => ({ ...prev, [leadId]: data || [] }));
    setLoadingActivities(null);
  }

  async function fetchSmsMessages(leadId: string) {
    if (smsMessages[leadId]) return;
    setLoadingSms(leadId);

    // First find the conversation linked to this lead
    const { data: conversation } = await supabase
      .from("sms_conversations")
      .select("id, stage, status, customer_number")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (conversation) {
      const { data: messages } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      setSmsMessages((prev) => ({
        ...prev,
        [leadId]: messages || [],
      }));
    } else {
      setSmsMessages((prev) => ({ ...prev, [leadId]: [] }));
    }

    setLoadingSms(null);
  }

  function toggleExpand(leadId: string) {
    if (expandedLead === leadId) {
      setExpandedLead(null);
    } else {
      setExpandedLead(leadId);
      fetchActivities(leadId);
      // Auto-fetch SMS for sms/missed_call/voicemail source leads
      const lead = leads.find((l) => l.id === leadId);
      if (lead && ["sms", "missed_call", "voicemail"].includes(lead.source || "")) {
        fetchSmsMessages(leadId);
      }
    }
  }

  // ── Add Lead handler ──────────────────────────────────────── 
  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSuccess(false);

    if (!addForm.name.trim()) { setAddError("Name is required"); return; }
    if (!addForm.phone.trim() && !addForm.email.trim()) { setAddError("At least one contact method (phone or email) required"); return; }

    setAddingLead(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || "Failed to create lead"); return; }
      setAddSuccess(true);
      setAddForm({ name: "", phone: "", email: "", message: "" });
      await fetchLeads();
      setTimeout(() => { setShowAddModal(false); setAddSuccess(false); }, 1500);
    } catch { setAddError("Something went wrong. Please try again."); } finally { setAddingLead(false); }
  }

  function openAddModal() {
    setAddForm({ name: "", phone: "", email: "", message: "" });
    setAddError("");
    setAddSuccess(false);
    setShowAddModal(true);
  }

  // ── Filtering ───────────────────────────────────────────── 
  const filtered = leads.filter((lead) => {
    const matchesSearch = (lead.name || "").toLowerCase().includes(search.toLowerCase())
      || (lead.email || "").toLowerCase().includes(search.toLowerCase())
      || (lead.phone || "").toLowerCase().includes(search.toLowerCase())
      || (lead.message || "").toLowerCase().includes(search.toLowerCase())
      || (lead.category || "").toLowerCase().includes(search.toLowerCase());
    const matchesUrgency = filterUrgency === "all" || lead.urgency === filterUrgency;
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesSource = filterSource === "all" || lead.source === filterSource;
    return matchesSearch && matchesUrgency && matchesStatus && matchesSource;
  });

  const stats = {
    total: leads.length,
    hot: leads.filter((l) => l.urgency === "hot").length,
    warm: leads.filter((l) => l.urgency === "warm").length,
    cold: leads.filter((l) => l.urgency === "cold").length,
    new: leads.filter((l) => l.status === "new").length,
  };

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
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
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

      {/* ── Search & Filters ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50" />
        </div>
        <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm focus:outline-none focus:border-brand-500/50">
          <option value="all">All Urgency</option>
          <option value="hot">🔴 Hot</option>
          <option value="warm">🟡 Warm</option>
          <option value="cold">🔵 Cold</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm focus:outline-none focus:border-brand-500/50">
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm focus:outline-none focus:border-brand-500/50">
          <option value="all">All Sources</option>
          <option value="web">🌐 Web Form</option>
          <option value="missed_call">📞 Missed Call</option>
          <option value="sms">💬 SMS</option>
          <option value="voicemail">🎙️ Voicemail</option>
          <option value="manual">✏️ Manual</option>
        </select>
      </div>

      {/* ── Lead Cards ─────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Inbox className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-400">
              {leads.length === 0 ? "No leads yet. They'll appear here when customers reach out." : "No leads match your current filters."}
            </p>
          </div>
        ) : (
          filtered.map((lead) => {
            const urg = urgencyConfig[lead.urgency as keyof typeof urgencyConfig] || urgencyConfig.warm;
            const stat = statusConfig[lead.status] || statusConfig.new;
            const src = getSourceConfig(lead.source);
            const SourceIcon = src.icon;
            const isExpanded = expandedLead === lead.id;
            const leadSmsMessages = smsMessages[lead.id] || [];
            const hasSmsThread = ["sms", "missed_call", "voicemail"].includes(lead.source || "");

            return (
              <div key={lead.id} className={`glass-card overflow-hidden transition-all duration-200 ${isExpanded ? "ring-1 ring-brand-500/30" : ""}`}>
                {/* ── Card Header (always visible) ──────── */}
                <div className="p-4 cursor-pointer hover:bg-surface-800/30 transition-colors" onClick={() => toggleExpand(lead.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${src.bgColor} border ${src.borderColor} flex items-center justify-center flex-shrink-0`}>
                      <SourceIcon className={`w-5 h-5 ${src.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{lead.name || lead.phone || "Unknown"}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urg.class}`}>{urg.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.class}`}>{stat.label}</span>
                        {lead.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-300 border border-surface-600/30">{lead.category}</span>
                        )}
                      </div>
                      <p className="text-sm text-surface-400 mt-1 line-clamp-1">{lead.ai_summary || lead.message || "No details available"}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                        <span className={`flex items-center gap-1 ${src.color}`}><SourceIcon className="w-3 h-3" />{src.label}</span>
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-surface-500">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* ── Expanded Details ──────────────────── */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-surface-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Left: Details */}
                      <div className="space-y-3">
                        {lead.ai_summary && (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-brand-400 mb-1">
                              <Sparkles className="w-3 h-3" /> AI Summary
                            </div>
                            <p className="text-sm text-surface-300">{lead.ai_summary}</p>
                          </div>
                        )}
                        {lead.message && (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-surface-500 mb-1">
                              <MessageSquare className="w-3 h-3" /> Original Message
                            </div>
                            <p className="text-sm text-surface-400 bg-surface-800/50 rounded-lg p-3">{lead.message}</p>
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm text-surface-300">
                              <Mail className="w-4 h-4 text-surface-500" /> {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-surface-300">
                              <Phone className="w-4 h-4 text-surface-500" /> {lead.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="space-y-3">
                        <div className="text-xs font-medium text-surface-500 mb-2">Update Status</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(statusConfig).map(([key, cfg]) => (
                            <button key={key} onClick={() => updateStatus(lead.id, key)}
                              disabled={lead.status === key || updatingId === lead.id}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                                lead.status === key
                                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/30 cursor-default"
                                  : "bg-surface-800/50 text-surface-400 border border-surface-700/50 hover:border-brand-500/30 hover:text-white"
                              } ${updatingId === lead.id ? "opacity-50" : ""}`}>
                              {updatingId === lead.id && lead.status !== key ? (<Loader2 className="w-3 h-3 animate-spin inline mr-1" />) : null}
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-surface-600 mt-2">
                          Follow-up #{lead.follow_up_count || 0}
                          {lead.next_follow_up_at && (
                            <span className="ml-2">
                              Next: {new Date(lead.next_follow_up_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── SMS Conversation Thread ───────────── */}
                    {hasSmsThread && (
                      <div className="mt-4 pt-4 border-t border-surface-700/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                            <MessageCircle className="w-3 h-3" />
                            SMS Conversation
                          </div>
                          {!smsMessages[lead.id] && !loadingSms && (
                            <button
                              onClick={() => fetchSmsMessages(lead.id)}
                              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                            >
                              Load messages
                            </button>
                          )}
                        </div>

                        {loadingSms === lead.id ? (
                          <div className="flex items-center gap-2 text-sm text-surface-500 py-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading conversation...
                          </div>
                        ) : leadSmsMessages.length === 0 && smsMessages[lead.id] ? (
                          <p className="text-xs text-surface-600">No SMS messages found.</p>
                        ) : leadSmsMessages.length > 0 ? (
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {leadSmsMessages.map((msg: any, i: number) => {
                              const isCustomer = msg.direction === "inbound";
                              return (
                                <div key={msg.id || i} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                                    isCustomer
                                      ? "bg-surface-800/70 border border-surface-700/50 rounded-bl-md"
                                      : "bg-brand-500/20 border border-brand-500/30 rounded-br-md"
                                  }`}>
                                    <p className={`text-sm leading-relaxed ${isCustomer ? "text-surface-200" : "text-brand-100"}`}>
                                      {msg.body}
                                    </p>
                                    <div className={`flex items-center gap-1.5 mt-1 ${isCustomer ? "justify-start" : "justify-end"}`}>
                                      <span className="text-xs text-surface-600">
                                        {isCustomer ? "Customer" : msg.sender === "ai" ? "AI" : "You"}
                                      </span>
                                      <span className="text-xs text-surface-600">·</span>
                                      <span className="text-xs text-surface-600">
                                        {new Date(msg.created_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* ── Activity Timeline ─────────────────── */}
                    <div className="mt-4 pt-4 border-t border-surface-700/50">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-surface-400 mb-3">
                        <Activity className="w-3 h-3" /> Activity Timeline
                      </div>
                      {loadingActivities === lead.id ? (
                        <div className="flex items-center gap-2 text-sm text-surface-500 py-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading timeline...
                        </div>
                      ) : (activities[lead.id] || []).length === 0 ? (
                        <p className="text-xs text-surface-600">No activity recorded yet.</p>
                      ) : (
                        <div className="relative ml-2">
                          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-700/50" />
                          <div className="space-y-3">
                            {(activities[lead.id] || []).map((act: any, i: number) => {
                              const actConfig: Record<string, { icon: any; color: string }> = {
                                auto_reply: { icon: Send, color: "text-brand-400" },
                                email_sent: { icon: Send, color: "text-brand-400" },
                                status_change: { icon: CheckCircle, color: "text-amber-400" },
                                follow_up: { icon: Bell, color: "text-orange-400" },
                                note: { icon: FileText, color: "text-teal-400" },
                              };
                              const ac = actConfig[act.type] || { icon: AlertCircle, color: "text-surface-400" };
                              const ActIcon = ac.icon;
                              return (
                                <div key={act.id || i} className="flex items-start gap-3 relative">
                                  <div className="w-4 h-4 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0 z-10">
                                    <ActIcon className={`w-2.5 h-2.5 ${ac.color}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-surface-300 leading-relaxed">{act.description}</p>
                                    <p className="text-xs text-surface-600 mt-0.5">
                                      {new Date(act.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Add Lead Modal ─────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !addingLead && setShowAddModal(false)} />
          <div className="relative w-full max-w-md glass-card p-0 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between p-5 border-b border-surface-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Add Lead</h2>
                  <p className="text-xs text-surface-400">Walk-in, referral, or phone enquiry</p>
                </div>
              </div>
              <button onClick={() => !addingLead && setShowAddModal(false)} className="text-surface-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {addSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Lead Created</h3>
                <p className="text-sm text-surface-400">AI is analysing the enquiry now</p>
              </div>
            ) : (
              <form onSubmit={handleAddLead} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">Customer Name <span className="text-red-400">*</span></label>
                  <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="John Smith" autoFocus
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      placeholder="0412 345 678"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">
                    What do they need? <span className="text-surface-600 ml-1">(AI will analyse this)</span>
                  </label>
                  <textarea value={addForm.message} onChange={(e) => setAddForm({ ...addForm, message: e.target.value })}
                    placeholder="e.g. Wants a quote for replacing 3 windows in the kitchen. Mentioned it's urgent because one is cracked." rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 resize-none" />
                </div>
                {addError && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{addError}</div>
                )}
                <p className="text-xs text-surface-600">Need at least a name and one contact method (phone or email). If you describe what they need, AI will score the urgency and categorise it automatically.</p>
                <button type="submit" disabled={addingLead}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors">
                  {addingLead ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating Lead...</>) : (<><Sparkles className="w-4 h-4" /> Create Lead</>)}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
