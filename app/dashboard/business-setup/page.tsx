"use client"; import { useState, useEffect } from "react"; import { createClient } from "@/lib/supabase-browser"; import { Building, Save, Loader2, CheckCircle, Key, Copy, Code, Sparkles, Phone, MapPin, Globe, FileText, MessageSquare, ToggleLeft, ToggleRight, RefreshCw, } from "lucide-react"; export default function BusinessSetupPage() { const supabase = createClient(); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [copiedField, setCopiedField] = useState(null); const [generatingKey, setGeneratingKey] = useState(false); const [form, setForm] = useState({ business_name: "", business_description: "", business_services: "", business_phone: "", business_address: "", business_website: "", industry: "", response_tone: "friendly" as "professional" | "friendly" | "casual", auto_reply_enabled: true, api_key: "", }); useEffect(() => { async function load() { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data: profile } = await supabase .from("profiles") .select("*") .eq("id", user.id) .single(); if (profile) { setForm({ business_name: profile.business_name || "", business_description: profile.business_description || "", business_services: profile.business_services || "", business_phone: profile.business_phone || "", business_address: profile.business_address || "", business_website: profile.business_website || "", industry: profile.industry || "", response_tone: profile.response_tone || "friendly", auto_reply_enabled: profile.auto_reply_enabled !== false, api_key: profile.api_key || "", }); } setLoading(false); } load(); }, [supabase]); async function handleSave(generateKey = false) { setSaving(true); setSaved(false); const res = await fetch("/api/business-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, generate_api_key: generateKey, }), }); const data = await res.json(); if (data.success) { if (data.api_key) { setForm((f) => ({ ...f, api_key: data.api_key })); } setSaved(true); setTimeout(() => setSaved(false), 3000); } setSaving(false); } async function generateApiKey() { setGeneratingKey(true); await handleSave(true); setGeneratingKey(false); } function copyToClipboard(text: string, field: string) { navigator.clipboard.writeText(text); setCopiedField(field); setTimeout(() => setCopiedField(null), 2000); } const embedCode = ` 
`; if (loading) { return ( 
); } return ( 
Business Setup 
Configure your business profile â€” this information powers the AI responses sent to your leads 
{/* Business Details */} 
Business Details 
Business Name * setForm({ ...form, business_name: e.target.value })} className="input-field" placeholder="e.g. Smith's Plumbing" /> 
Industry setForm({ ...form, industry: e.target.value })} className="input-field" > Select industry Trades & Construction Retail Hospitality & Food Health & Wellness Professional Services Creative & Media Technology Education & Training Real Estate Other 
Business Description setForm({ ...form, business_description: e.target.value })} className="input-field" rows={3} placeholder="Tell us about your business â€” the AI uses this to craft personalised responses. e.g. 'We're a family-run plumbing business in Adelaide's southern suburbs, specialising in emergency repairs, bathroom renovations, and hot water systems.'" /> 
Services Offered setForm({ ...form, business_services: e.target.value })} className="input-field" rows={2} placeholder="e.g. Emergency plumbing, bathroom renovations, hot water system installs, general maintenance" /> 
Phone setForm({ ...form, business_phone: e.target.value })} className="input-field" placeholder="04xx xxx xxx" /> 
Address/Area setForm({ ...form, business_address: e.target.value })} className="input-field" placeholder="e.g. Southern Adelaide" /> 
Website setForm({ ...form, business_website: e.target.value })} className="input-field" placeholder="https://..." /> 
{/* AI Settings */} 
AI Response Settings 
Response Tone 
{(["professional", "friendly", "casual"] as const).map((tone) => ( setForm({ ...form, response_tone: tone })} className={`p-3 rounded-xl border text-sm font-medium text-center transition-all ${ form.response_tone === tone ? "bg-brand-500/10 border-brand-500/30 text-brand-400" : "bg-surface-800/40 border-surface-700/40 text-surface-400 hover:border-surface-600" }`} > {tone === "professional" && "ðŸ¢ Professional"} {tone === "friendly" && "ðŸ˜Š Friendly"} {tone === "casual" && "ðŸ¤™ Casual"} ))} 
This controls how the AI writes responses to your leads 
Auto-Reply to Leads
Automatically send AI-generated responses when new leads come in 
setForm({ ...form, auto_reply_enabled: !form.auto_reply_enabled }) } className="flex-shrink-0" > {form.auto_reply_enabled ? ( ) : ( )} 
{/* API Key & Integration */} 
API Key & Integration 
Your API Key {form.api_key ? ( 
{form.api_key} 
copyToClipboard(form.api_key, "apikey")} className="btn-secondary px-3" > {copiedField === "apikey" ? ( ) : ( )} 
) : ( {generatingKey ? ( ) : ( <> Generate API Key )} )} 
This key identifies your account when receiving form submissions 
{/* Embed code */} {form.api_key && ( 
Embed Code 
Copy this code and paste it into your website where you want the contact form to appear 

                {embedCode}
              
copyToClipboard(embedCode, "embed")} className="absolute top-3 right-3 btn-secondary px-2.5 py-1.5 text-xs" > {copiedField === "embed" ? ( <> Copied! ) : ( <> Copy )} 
)} {/* Webhook URL */} {form.api_key && ( 
Webhook URL (for Zapier, Make, etc.) 
https://autoflow-puce.vercel.app/api/webhook/lead 
copyToClipboard( "https://autoflow-puce.vercel.app/api/webhook/lead", "webhook" ) } className="btn-secondary px-3" > {copiedField === "webhook" ? ( ) : ( )} 
Send POST requests with: name, email, phone, message, api_key 
)} 
{/* Save button */} 
handleSave(false)} disabled={saving} className="btn-primary px-8" > {saving ? ( ) : saved ? ( <> Saved! ) : ( <> Save Business Profile )} 
); } 
