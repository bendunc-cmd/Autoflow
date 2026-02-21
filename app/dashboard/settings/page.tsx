"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  CheckCircle,
  Zap,
  Crown,
  Rocket,
  Loader2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    icon: Zap,
    iconColor: "text-brand-400",
    iconBg: "bg-brand-500/10 border-brand-500/20",
    features: [
      "Lead capture & AI analysis",
      "Email auto-reply",
      "Lead dashboard & CRM",
      "Automated follow-ups",
      "50 leads/month",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    icon: Crown,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    popular: true,
    features: [
      "Everything in Starter",
      "Phone & SMS integration",
      "AI SMS conversations",
      "Missed call text-back",
      "200 leads/month",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    icon: Rocket,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    features: [
      "Everything in Pro",
      "Reviews & reputation",
      "Ads integration",
      "Quoting & invoicing",
      "Unlimited leads",
    ],
  },
];

export default function SettingsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setSuccessMessage("Payment successful! Your plan is now active.");
      // Refresh profile to get updated plan
      setTimeout(() => fetchProfile(), 2000);
    }
  }, [searchParams, fetchProfile]);

  async function handleCheckout(plan: string) {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
      }
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  const currentPlan = profile?.subscription_plan || "free";
  const subscriptionStatus = profile?.subscription_status || "none";
  const isSubscribed = subscriptionStatus === "active";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
        <p className="text-surface-400 text-sm mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {/* ── Success Message ────────────────────────────────── */}
      {successMessage && (
        <div className="glass-card p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* ── Current Plan ───────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white">Current Plan</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isSubscribed
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : subscriptionStatus === "past_due"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-surface-500/10 text-surface-400 border border-surface-500/20"
                }`}>
                  {isSubscribed ? "Active" : subscriptionStatus === "past_due" ? "Past Due" : "No Plan"}
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                {isSubscribed
                  ? `You're on the ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan`
                  : "Choose a plan to get started"}
              </p>
            </div>
          </div>

          {isSubscribed && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="flex items-center gap-2 text-xs text-surface-400 hover:text-white transition-colors"
            >
              {portalLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* ── Pricing Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id && isSubscribed;
          const isLoading = checkoutLoading === plan.id;

          return (
            <div
              key={plan.id}
              className={`glass-card p-5 relative ${
                plan.popular
                  ? "ring-1 ring-brand-500/30"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs px-3 py-1 rounded-full bg-brand-500 text-white font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${plan.iconBg} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">${plan.price}</span>
                    <span className="text-xs text-surface-500">/mo</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-surface-300">{feature}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isLoading || checkoutLoading !== null}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    plan.popular
                      ? "bg-brand-500 hover:bg-brand-600 text-white"
                      : "bg-surface-800/50 hover:bg-surface-700/50 text-white border border-surface-700/50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : isSubscribed ? (
                    "Switch Plan"
                  ) : (
                    "Get Started"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Past Due Warning ───────────────────────────────── */}
      {subscriptionStatus === "past_due" && (
        <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-300 font-medium">Payment issue</p>
              <p className="text-xs text-surface-400 mt-0.5">
                Your last payment failed. Please update your payment method to keep your account active.
              </p>
            </div>
            <button
              onClick={handleManageBilling}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex-shrink-0"
            >
              Update Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
