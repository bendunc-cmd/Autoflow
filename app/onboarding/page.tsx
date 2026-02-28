"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  Zap,
  Building,
  Clock,
  Phone,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00",
];

const INDUSTRIES = [
  "Windows & Doors",
  "Plumbing",
  "Electrical",
  "HVAC / Air Conditioning",
  "Roofing",
  "Painting",
  "Landscaping",
  "Cleaning",
  "Building & Construction",
  "Auto / Mechanic",
  "Beauty & Hair",
  "Health & Wellness",
  "Photography",
  "Consulting",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Business info
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Step 2: Working hours
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");

  // Step 3: Services
  const [services, setServices] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      // Check if already onboarded
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, business_name")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_complete) {
        router.push("/dashboard");
      }

      // Pre-fill if any data exists
      if (profile?.business_name) setBusinessName(profile.business_name);
    }
    checkUser();
  }, []);

  const totalSteps = 4;

  async function saveAndFinish() {
    if (!userId) return;
    setLoading(true);

    try {
      // Build working hours object
      const workingHours: Record<string, { start: string; end: string } | null> = {};
      DAYS.forEach((day) => {
        workingHours[day.toLowerCase()] = workingDays[day]
          ? { start: startTime, end: endTime }
          : null;
      });

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: businessName.trim(),
          industry: industry,
          business_description: businessDescription.trim() || null,
          business_phone: businessPhone.trim() || null,
          business_address: businessAddress.trim() || null,
          business_services: services.trim() || null,
          working_hours: workingHours,
          onboarding_complete: true,
        })
        .eq("id", userId);

      if (error) throw error;

      // Upsert availability rules so the SMS booking system knows when to offer slots
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };

      const availabilityRows = DAYS.map((day) => ({
        user_id: userId,
        day_of_week: dayMap[day.toLowerCase()],
        start_time: workingDays[day] ? startTime + ":00" : "09:00:00",
        end_time: workingDays[day] ? endTime + ":00" : "17:00:00",
        is_available: workingDays[day],
      }));

      // Delete existing rules first, then insert fresh
      await supabase
        .from("availability_rules")
        .delete()
        .eq("user_id", userId);

      await supabase
        .from("availability_rules")
        .insert(availabilityRows);

      // Small delay for animation
      await new Promise((r) => setTimeout(r, 500));
      router.push("/dashboard");
    } catch (err) {
      console.error("Onboarding save error:", err);
      alert("Something went wrong saving your details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setWorkingDays((prev) => ({ ...prev, [day]: !prev[day] }));
  }

  function canProceed() {
    switch (step) {
      case 1:
        return businessName.trim().length > 0 && industry.length > 0;
      case 2:
        return Object.values(workingDays).some((v) => v);
      case 3:
        return true; // Services optional
      case 4:
        return true;
      default:
        return false;
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">
              AutoFlow<span className="text-brand-400"> AI</span>
            </span>
          </div>
          <p className="text-surface-400 text-sm">
            Let&apos;s get your business set up in 2 minutes
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                s <= step
                  ? "bg-brand-500"
                  : "bg-surface-800"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="glass-card p-8">
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <Building className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Your Business
                  </h2>
                  <p className="text-sm text-surface-400">
                    Tell us about your business
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Smith's Window Solutions"
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Industry *
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                >
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="e.g. 0412 345 678"
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Business Address
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. 123 Main St, Adelaide SA 5000"
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Brief Description
                </label>
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="What does your business do? This helps the AI respond to customers."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Working Hours */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Working Hours
                  </h2>
                  <p className="text-sm text-surface-400">
                    When can customers book appointments?
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-3">
                  Working Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        workingDays[day]
                          ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                          : "bg-surface-800/60 text-surface-500 border border-surface-700/50 hover:border-surface-600"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">
                    Start Time
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">
                    End Time
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
                <p className="text-sm text-surface-400">
                  💡 You can set different hours per day later in Business Setup. This sets your default hours.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Services */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Your Services
                  </h2>
                  <p className="text-sm text-surface-400">
                    What services do you offer? The AI will use this to help customers.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Services (one per line)
                </label>
                <textarea
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder={"e.g.\nWindow replacement\nWindow repairs\nDoor installation\nFree measure & quote"}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
                <p className="text-sm text-surface-400">
                  💡 The AI assistant will mention these services when talking to your customers via SMS. You can update them anytime.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Your AI Number */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    You&apos;re All Set!
                  </h2>
                  <p className="text-sm text-surface-400">
                    Here&apos;s what happens next
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">AI SMS Assistant</p>
                    <p className="text-sm text-surface-400 mt-0.5">
                      Your AI will automatically respond to customer texts, qualify leads, and book appointments for you.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Smart Reminders</p>
                    <p className="text-sm text-surface-400 mt-0.5">
                      Customers get automatic SMS reminders 24 hours and 2 hours before their appointments.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Lead Dashboard</p>
                    <p className="text-sm text-surface-400 mt-0.5">
                      Track every lead, view SMS conversations, and manage your bookings from one place.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
                  <Phone className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Your AI Phone Number</p>
                    <p className="text-sm text-surface-400 mt-0.5">
                      Your dedicated AI phone number will be assigned once your account is activated. You&apos;ll find it in Business Setup.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-800/60">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-surface-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={saveAndFinish}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-all disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Launch Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <p className="text-center text-xs text-surface-500 mt-4">
          Step {step} of {totalSteps}
        </p>
      </div>
    </div>
  );
}
