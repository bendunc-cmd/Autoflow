"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { User, Building, Mail, Save, Loader2, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setBusinessName(profile.business_name || "");
        setIndustry(profile.industry || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      business_name: businessName,
      industry: industry,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
        <p className="text-surface-400 text-sm mt-1">Manage your profile and business details</p>
      </div>

      <form onSubmit={handleSave} className="glass-card p-6 space-y-6">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Profile Information</h2>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="email" value={email} disabled className="input-field pl-11 opacity-60 cursor-not-allowed" />
          </div>
          <p className="text-xs text-surface-500 mt-1">Email cannot be changed here</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field pl-11" placeholder="Your full name" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Business Name</label>
          <div className="relative">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input-field pl-11" placeholder="Your business name" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Industry</label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="input-field">
            <option value="">Select your industry</option>
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

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
