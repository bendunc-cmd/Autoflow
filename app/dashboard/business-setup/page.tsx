"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  Building,
  Save,
  Loader2,
  CheckCircle,
  Key,
  Copy,
  Code,
  Sparkles,
  Phone,
  MapPin,
  Globe,
  FileText,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from "lucide-react";

export default function BusinessSetupPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    business_description: "",
    business_services: "",
    business_phone: "",
    business_address: "",
    business_website: "",
    industry: "",
    response_tone: "friendly" as "professional" | "friendly" | "casual",
    auto_reply_enabled: true,
    api_key: "",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setForm({
          business_name: profile.business_name || "",
          business_description: profile.business_description || "",
          business_services: profile.business_services || "",
          business_phone: profile.business_phone || "",
          business_address: profile.business_address || "",
          business_website: profile.business_website || "",
          industry: profile.industry || "",
          response_tone: profile.response_tone || "friendly",
          auto_reply_enabled: profile.auto_reply_enabled !== false,
          api_key: profile.api_key || "",
        });
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave(generateKey = false) {
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/business-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        generate_api_key: generateKey,
      }),
    });

    const data = await res.json();
    if (data.success) {
      if (data.api_key) {
        setForm((f) => ({ ...f, api_key: data.api_key }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function generateApiKey() {
    setGeneratingKey(true);
    await handleSave(true);
    setGeneratingKey(false);
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const embedCode = `<!-- AutoFlow AI Contact Form -->
<div id="autoflow-form"></div>
<script>
(function() {
  var f = document.getElementById('autoflow-form');
  f.innerHTML = \`
    <form id="af-form" style="max-width:480px;font-family:-apple-system,sans-serif;">
      <div style="margin-bottom:12px;">
        <input type="text" name="name" placeholder="Your name" required
          style="width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:12px;">
        <input type="email" name="email" placeholder="Your email" required
          style="width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:12px;">
        <input type="tel" name="phone" placeholder="Phone (optional)"
          style="width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:12px;">
        <textarea name="message" placeholder="How can we help?" rows="4" required
          style="width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
      </div>
      <button type="submit"
        style="width:100%;padding:12px;background:#338bfc;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
        Send Enquiry
      </button>
      <p id="af-msg" style="margin-top:8px;font-size:13px;text-align:center;display:none;"></p>
    </form>
  \`;
  document.getElementById('af-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var d = new FormData(e.target);
    var msg = document.getElementById('af-msg');
    var btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Sending...';
    fetch('https://autoflow-rust.vercel.app/api/webhook/lead', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: d.get('name'), email: d.get('email'),
        phone: d.get('phone'), message: d.get('message'),
        api_key: '${form.api_key}', source: 'embedded_form'
      })
    }).then(function(r){return r.json()}).then(function(r) {
      if (r.success) {
        msg.style.display='block'; msg.style.color='#16a34a';
        msg.textContent='Thanks! We\\'ll be in touch shortly.';
        e.target.reset();
      } else {
        msg.style.display='block'; msg.style.color='#dc2626';
        msg.textContent='Something went wrong. Please try again.';
      }
      btn.disabled = false; btn.textContent = 'Send Enquiry';
    }).catch(function() {
      msg.style.display='block'; msg.style.color='#dc2626';
      msg.textContent='Something went wrong. Please try again.';
      btn.disabled = false; btn.textContent = 'Send Enquiry';
    });
  });
})();
</script>`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Business Setup
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Configure your business profile — this information powers the AI responses sent to your leads
        </p>
      </div>

      {/* Business Details */}
      <div className="glass-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
          <Building className="w-4 h-4 text-surface-400" />
          Business Details
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              Business Name *
            </label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="input-field"
              placeholder="e.g. Smith's Plumbing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              Industry
            </label>
            <select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="input-field"
            >
              <option value="">Select industry</option>
              <option value="trades">Trades & Construction</option>
              <option value="retail">Retail</option>
              <option value="hospitality">Hospitality & Food</option>
              <option value="health">Health & Wellness</option>
              <option value="professional">Professional Services</option>
              <option value="creative">Creative & Media</option>
              <option value="tech">Technology</option>
              <option value="education">Education & Training</option>
              <option value="real_estate">Real Estate</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Business Description
          </label>
          <textarea
            value={form.business_description}
            onChange={(e) => setForm({ ...form, business_description: e.target.value })}
            className="input-field"
            rows={3}
            placeholder="Tell us about your business — the AI uses this to craft personalised responses. e.g. 'We're a family-run plumbing business in Adelaide's southern suburbs, specialising in emergency repairs, bathroom renovations, and hot water systems.'"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">
            Services Offered
          </label>
          <textarea
            value={form.business_services}
            onChange={(e) => setForm({ ...form, business_services: e.target.value })}
            className="input-field"
            rows={2}
            placeholder="e.g. Emergency plumbing, bathroom renovations, hot water system installs, general maintenance"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={form.business_phone}
              onChange={(e) => setForm({ ...form, business_phone: e.target.value })}
              className="input-field"
              placeholder="04xx xxx xxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Address/Area
            </label>
            <input
              type="text"
              value={form.business_address}
              onChange={(e) => setForm({ ...form, business_address: e.target.value })}
              className="input-field"
              placeholder="e.g. Southern Adelaide"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              Website
            </label>
            <input
              type="url"
              value={form.business_website}
              onChange={(e) => setForm({ ...form, business_website: e.target.value })}
              className="input-field"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="glass-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          AI Response Settings
        </h2>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
            Response Tone
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["professional", "friendly", "casual"] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => setForm({ ...form, response_tone: tone })}
                className={`p-3 rounded-xl border text-sm font-medium text-center transition-all ${
                  form.response_tone === tone
                    ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                    : "bg-surface-800/40 border-surface-700/40 text-surface-400 hover:border-surface-600"
                }`}
              >
                {tone === "professional" && "🏢 Professional"}
                {tone === "friendly" && "😊 Friendly"}
                {tone === "casual" && "🤙 Casual"}
              </button>
            ))}
          </div>
          <p className="text-xs text-surface-500 mt-2">
            This controls how the AI writes responses to your leads
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/40 border border-surface-700/40">
          <div>
            <p className="text-sm font-medium text-white">Auto-Reply to Leads</p>
            <p className="text-xs text-surface-400 mt-0.5">
              Automatically send AI-generated responses when new leads come in
            </p>
          </div>
          <button
            onClick={() =>
              setForm({ ...form, auto_reply_enabled: !form.auto_reply_enabled })
            }
            className="flex-shrink-0"
          >
            {form.auto_reply_enabled ? (
              <ToggleRight className="w-10 h-10 text-brand-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-surface-500" />
            )}
          </button>
        </div>
      </div>

      {/* API Key & Integration */}
      <div className="glass-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
          <Key className="w-4 h-4 text-surface-400" />
          API Key & Integration
        </h2>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">
            Your API Key
          </label>
          {form.api_key ? (
            <div className="flex gap-2">
              <div className="flex-1 input-field font-mono text-xs bg-surface-900 truncate flex items-center">
                {form.api_key}
              </div>
              <button
                onClick={() => copyToClipboard(form.api_key, "apikey")}
                className="btn-secondary px-3"
              >
                {copiedField === "apikey" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button onClick={generateApiKey} className="btn-secondary px-3" title="Regenerate">
                <RefreshCw className={`w-4 h-4 ${generatingKey ? "animate-spin" : ""}`} />
              </button>
            </div>
          ) : (
            <button onClick={generateApiKey} className="btn-primary">
              {generatingKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Generate API Key
                </>
              )}
            </button>
          )}
          <p className="text-xs text-surface-500 mt-2">
            This key identifies your account when receiving form submissions
          </p>
        </div>

        {/* Embed code */}
        {form.api_key && (
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5 flex items-center gap-1">
              <Code className="w-3.5 h-3.5" />
              Embed Code
            </label>
            <p className="text-xs text-surface-400 mb-3">
              Copy this code and paste it into your website where you want the contact form to appear
            </p>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-surface-900 border border-surface-700/60 text-xs text-surface-400 overflow-x-auto max-h-48 overflow-y-auto font-mono leading-relaxed">
                {embedCode}
              </pre>
              <button
                onClick={() => copyToClipboard(embedCode, "embed")}
                className="absolute top-3 right-3 btn-secondary px-2.5 py-1.5 text-xs"
              >
                {copiedField === "embed" ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Webhook URL */}
        {form.api_key && (
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              Webhook URL (for Zapier, Make, etc.)
            </label>
            <div className="flex gap-2">
              <div className="flex-1 input-field font-mono text-xs bg-surface-900 truncate flex items-center">
                https://autoflow-rust.vercel.app/api/webhook/lead
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    "https://autoflow-rust.vercel.app/api/webhook/lead",
                    "webhook"
                  )
                }
                className="btn-secondary px-3"
              >
                {copiedField === "webhook" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-surface-500 mt-2">
              Send POST requests with: name, email, phone, message, api_key
            </p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="btn-primary px-8"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Business Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
