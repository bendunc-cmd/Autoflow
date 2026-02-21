"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  Zap,
  Phone,
  PhoneMissed,
  MessageCircle,
  Mail,
  Clock,
  Voicemail,
  Settings,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface AutomationCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  enabled: boolean;
  configurable: boolean;
  configLink?: string;
  status: "active" | "coming_soon" | "needs_setup";
  statusLabel: string;
  details: string[];
}

export default function AutomationsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  const hasAutoReply = profile?.auto_reply_enabled ?? false;
  const hasTwilioNumber = !!profile?.twilio_phone_number;
  const responseTone = profile?.response_tone || "professional";

  const automations: AutomationCard[] = [
    {
      id: "auto-reply",
      title: "AI Auto-Reply Emails",
      description: "When a new lead comes in via web form, AI instantly generates and sends a personalised reply to the customer.",
      icon: Sparkles,
      iconColor: "text-brand-400",
      iconBg: "bg-brand-500/10 border-brand-500/20",
      enabled: hasAutoReply,
      configurable: true,
      configLink: "/dashboard/business-setup",
      status: hasAutoReply ? "active" : "needs_setup",
      statusLabel: hasAutoReply ? "Active" : "Disabled",
      details: [
        `Response tone: ${responseTone.charAt(0).toUpperCase() + responseTone.slice(1)}`,
        "Sent via: noreply@autoflowai.app",
        "Trigger: New web form submission",
      ],
    },
    {
      id: "follow-ups",
      title: "Automated Follow-Up Sequence",
      description: "AutoFlow automatically follows up with leads that haven't responded. Hot leads get contacted faster, cold leads get more time.",
      icon: Clock,
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/10 border-orange-500/20",
      enabled: true,
      configurable: false,
      status: "active",
      statusLabel: "Active",
      details: [
        "Hot leads: follow-up after 2 hours",
        "Warm leads: follow-up after 24 hours",
        "Cold leads: follow-up after 48 hours",
        "Maximum 3 follow-ups per lead",
      ],
    },
    {
      id: "missed-call",
      title: "Missed Call Text-Back",
      description: "When a customer calls and nobody answers, AutoFlow instantly sends a professional text message to convert the missed call into a lead.",
      icon: PhoneMissed,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      enabled: hasTwilioNumber,
      configurable: true,
      configLink: "/dashboard/business-setup",
      status: hasTwilioNumber ? "active" : "needs_setup",
      statusLabel: hasTwilioNumber ? "Active" : "Needs Phone Number",
      details: hasTwilioNumber
        ? [
            `Business number: ${profile?.twilio_phone_number}`,
            `Forwards to: ${profile?.forwarding_number || "Not set"}`,
            "Trigger: Unanswered incoming call",
          ]
        : [
            "Requires an Australian phone number",
            "Set up in Business Setup → Phone Settings",
          ],
    },
    {
      id: "ai-sms",
      title: "AI SMS Conversations",
      description: "After the text-back, AI continues the conversation via SMS — qualifying the lead, gathering details, and booking jobs automatically.",
      icon: MessageCircle,
      iconColor: "text-green-400",
      iconBg: "bg-green-500/10 border-green-500/20",
      enabled: false,
      configurable: false,
      status: "coming_soon",
      statusLabel: "Coming Soon",
      details: [
        "AI qualifies leads through natural conversation",
        "Gathers job details, urgency, and availability",
        "Escalates to owner when needed",
        "Full conversation visible in dashboard",
      ],
    },
    {
      id: "voicemail",
      title: "Voicemail Transcription",
      description: "When a caller leaves a voicemail, AutoFlow transcribes it, analyses the content with AI, and creates a lead with urgency scoring.",
      icon: Voicemail,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10 border-purple-500/20",
      enabled: false,
      configurable: false,
      status: "coming_soon",
      statusLabel: "Coming Soon",
      details: [
        "AI transcription of voicemail audio",
        "Automatic urgency and category detection",
        "Lead created with full AI analysis",
        "Owner notified with transcription summary",
      ],
    },
    {
      id: "owner-notifications",
      title: "Owner Email Notifications",
      description: "Get an instant email alert every time a new lead comes in, with the AI summary and customer details so you can respond quickly.",
      icon: Mail,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
      enabled: true,
      configurable: false,
      status: "active",
      statusLabel: "Active",
      details: [
        `Sending to: ${profile?.email || "Your email"}`,
        "Includes AI summary and urgency",
        "Trigger: Every new lead",
      ],
    },
  ];

  const activeCount = automations.filter((a) => a.status === "active").length;
  const totalCount = automations.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Automations</h1>
        <p className="text-surface-400 text-sm mt-1">
          {activeCount} of {totalCount} automations running — working for you while you&apos;re on the tools
        </p>
      </div>

      {/* ── Summary Bar ────────────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">AutoFlow is handling your leads 24/7</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {activeCount} Active
              </span>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">
              Every incoming lead gets instant AI analysis, personalised responses, and automated follow-ups
            </p>
          </div>
        </div>
      </div>

      {/* ── Automation Cards ───────────────────────────────── */}
      <div className="space-y-3">
        {automations.map((auto) => {
          const Icon = auto.icon;

          return (
            <div key={auto.id} className="glass-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${auto.iconBg} border flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${auto.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{auto.title}</h3>
                      {auto.status === "active" && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          {auto.statusLabel}
                        </span>
                      )}
                      {auto.status === "needs_setup" && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {auto.statusLabel}
                        </span>
                      )}
                      {auto.status === "coming_soon" && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface-500/10 text-surface-400 border border-surface-500/20 font-medium">
                          <Clock className="w-3 h-3" />
                          {auto.statusLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-400 mt-1">
                      {auto.description}
                    </p>

                    {/* Details */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {auto.details.map((detail, i) => (
                        <span key={i} className="text-xs text-surface-500">
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Configure button */}
                  {auto.configurable && auto.configLink && (
                    <Link
                      href={auto.configLink}
                      className="flex items-center gap-1 text-xs text-surface-500 hover:text-brand-400 transition-colors flex-shrink-0 mt-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configure
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
