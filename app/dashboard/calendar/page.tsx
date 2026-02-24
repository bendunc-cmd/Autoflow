"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Phone,
  X,
  Check,
  Trash2,
  User,
  MapPin,
  FileText,
  AlertCircle,
} from "lucide-react";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  title: string;
  description: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  source: string;
  lead_id: string | null;
  notes: string | null;
  created_at: string;
}

interface AvailabilityRule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", label: "Pending" },
  confirmed: { bg: "bg-brand-500/10 border-brand-500/20", text: "text-brand-400", label: "Confirmed" },
  completed: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", label: "Completed" },
  cancelled: { bg: "bg-surface-500/10 border-surface-500/20", text: "text-surface-400", label: "Cancelled" },
  no_show: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", label: "No Show" },
};

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return [`${h}:00`, `${h}:30`];
}).flat();

const WORK_TIME_SLOTS = TIME_SLOTS.filter((t) => {
  const h = parseInt(t.split(":")[0]);
  return h >= 6 && h <= 20;
});

export default function CalendarPage() {
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);

  // New booking form
  const [newBooking, setNewBooking] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    title: "",
    description: "",
    booking_date: "",
    start_time: "09:00",
    end_time: "10:00",
    notes: "",
  });

  const getWeekDates = useCallback(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const getMonthDates = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday start
    const dates: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) dates.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) dates.push(new Date(year, month, d));
    while (dates.length % 7 !== 0) dates.push(null);
    return dates;
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch bookings for current month range (with buffer)
    const rangeStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const rangeEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .gte("booking_date", rangeStart.toISOString().split("T")[0])
      .lte("booking_date", rangeEnd.toISOString().split("T")[0])
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });

    const { data: availData } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("day_of_week");

    setBookings(bookingsData || []);
    setAvailability(availData || []);
    setLoading(false);
  }, [currentDate, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const getBookingsForDate = (dateStr: string) =>
    bookings.filter((b) => b.booking_date === dateStr && b.status !== "cancelled");

  const isToday = (d: Date) => formatDate(d) === formatDate(new Date());

  const handleAddBooking = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      customer_name: newBooking.customer_name,
      customer_phone: newBooking.customer_phone || null,
      customer_email: newBooking.customer_email || null,
      title: newBooking.title || `Job: ${newBooking.customer_name}`,
      description: newBooking.description || null,
      booking_date: newBooking.booking_date,
      start_time: newBooking.start_time,
      end_time: newBooking.end_time,
      notes: newBooking.notes || null,
      source: "manual",
      status: "confirmed",
    });

    if (!error) {
      setShowAddModal(false);
      setNewBooking({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        title: "",
        description: "",
        booking_date: "",
        start_time: "09:00",
        end_time: "10:00",
        notes: "",
      });
      fetchData();
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    await supabase
      .from("bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", bookingId);
    setShowDetailModal(null);
    fetchData();
  };

  const handleDeleteBooking = async (bookingId: string) => {
    await supabase.from("bookings").delete().eq("id", bookingId);
    setShowDetailModal(null);
    fetchData();
  };

  const saveAvailability = async (dayOfWeek: number, startTime: string, endTime: string, isAvailable: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = availability.find((a) => a.day_of_week === dayOfWeek);
    if (existing) {
      await supabase
        .from("availability_rules")
        .update({ start_time: startTime, end_time: endTime, is_available: isAvailable })
        .eq("id", existing.id);
    } else {
      await supabase.from("availability_rules").insert({
        user_id: user.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable,
      });
    }
    fetchData();
  };

  const weekDates = getWeekDates();
  const monthDates = getMonthDates();

  // Stats
  const today = formatDate(new Date());
  const todayBookings = getBookingsForDate(today);
  const weekBookings = bookings.filter((b) => {
    const d = new Date(b.booking_date);
    return weekDates.some((wd) => formatDate(wd) === formatDate(d)) && b.status !== "cancelled";
  });
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const headerLabel = view === "week"
    ? `${weekDates[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
    : `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-brand-400" />
            Calendar
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage your jobs, appointments, and availability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAvailability(!showAvailability)}
            className="btn-ghost text-sm"
          >
            <Clock className="w-4 h-4" />
            Hours
          </button>
          <button
            onClick={() => {
              setSelectedDate(formatDate(new Date()));
              setNewBooking((prev) => ({ ...prev, booking_date: formatDate(new Date()) }));
              setShowAddModal(true);
            }}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Booking
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-white">{todayBookings.length}</p>
          <p className="text-xs text-surface-400 mt-0.5">Today</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-white">{weekBookings.length}</p>
          <p className="text-xs text-surface-400 mt-0.5">This Week</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-xs text-surface-400 mt-0.5">Pending</p>
        </div>
      </div>

      {/* Availability Settings (collapsible) */}
      {showAvailability && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-surface-400" />
            Business Hours
          </h2>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const rule = availability.find((a) => a.day_of_week === day);
              const isAvail = rule?.is_available ?? (day >= 1 && day <= 5);
              const startT = rule?.start_time?.substring(0, 5) || "07:00";
              const endT = rule?.end_time?.substring(0, 5) || "17:00";
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm text-surface-300 w-12">{DAY_NAMES[day]}</span>
                  <button
                    onClick={() => saveAvailability(day, startT, endT, !isAvail)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isAvail ? "bg-brand-500" : "bg-surface-700"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isAvail ? "left-5" : "left-0.5"}`} />
                  </button>
                  {isAvail && (
                    <div className="flex items-center gap-2">
                      <select
                        value={startT}
                        onChange={(e) => saveAvailability(day, e.target.value, endT, true)}
                        className="bg-surface-800 border border-surface-700 rounded-lg px-2 py-1 text-xs text-surface-300"
                      >
                        {WORK_TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-surface-500 text-xs">to</span>
                      <select
                        value={endT}
                        onChange={(e) => saveAvailability(day, startT, e.target.value, true)}
                        className="bg-surface-800 border border-surface-700 rounded-lg px-2 py-1 text-xs text-surface-300"
                      >
                        {WORK_TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!isAvail && <span className="text-xs text-surface-500">Closed</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-800/60 text-surface-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">{headerLabel}</h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-surface-800/60 text-surface-400 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={goToday} className="text-xs text-brand-400 hover:text-brand-300 px-3 py-1.5 rounded-lg border border-brand-500/20 hover:bg-brand-500/10 transition-colors ml-2">
            Today
          </button>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-surface-700/50">
          <button
            onClick={() => setView("week")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${view === "week" ? "bg-brand-500/20 text-brand-400" : "text-surface-400 hover:text-white"}`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${view === "month" ? "bg-brand-500/20 text-brand-400" : "text-surface-400 hover:text-white"}`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="animate-pulse text-surface-400">Loading calendar...</div>
        </div>
      ) : view === "week" ? (
        /* ── WEEK VIEW ────────────────────────────────── */
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-surface-700/40">
            {weekDates.map((d) => (
              <div
                key={formatDate(d)}
                className={`p-3 text-center border-r border-surface-700/40 last:border-r-0 ${isToday(d) ? "bg-brand-500/5" : ""}`}
              >
                <p className="text-xs text-surface-400">{DAY_NAMES[d.getDay()]}</p>
                <p className={`text-lg font-bold mt-0.5 ${isToday(d) ? "text-brand-400" : "text-white"}`}>
                  {d.getDate()}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDates.map((d) => {
              const dateStr = formatDate(d);
              const dayBookings = getBookingsForDate(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`border-r border-surface-700/40 last:border-r-0 p-2 space-y-1.5 cursor-pointer hover:bg-surface-800/20 transition-colors ${isToday(d) ? "bg-brand-500/5" : ""}`}
                  onClick={() => {
                    setNewBooking((prev) => ({ ...prev, booking_date: dateStr }));
                    setSelectedDate(dateStr);
                    setShowAddModal(true);
                  }}
                >
                  {dayBookings.map((b) => {
                    const st = STATUS_STYLES[b.status] || STATUS_STYLES.confirmed;
                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailModal(b);
                        }}
                        className={`${st.bg} border rounded-lg p-2 cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        <p className="text-xs font-medium text-white truncate">{b.title}</p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {b.start_time.substring(0, 5)} – {b.end_time.substring(0, 5)}
                        </p>
                        <p className="text-xs text-surface-500 truncate mt-0.5">{b.customer_name}</p>
                      </div>
                    );
                  })}
                  {dayBookings.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4 text-surface-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── MONTH VIEW ───────────────────────────────── */
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-surface-700/40">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="p-2 text-center text-xs text-surface-400 font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDates.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} className="p-2 border-r border-b border-surface-700/20 min-h-[80px] bg-surface-900/30" />;
              const dateStr = formatDate(d);
              const dayBookings = getBookingsForDate(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`p-2 border-r border-b border-surface-700/20 min-h-[80px] cursor-pointer hover:bg-surface-800/20 transition-colors ${isToday(d) ? "bg-brand-500/5" : ""}`}
                  onClick={() => {
                    setNewBooking((prev) => ({ ...prev, booking_date: dateStr }));
                    setSelectedDate(dateStr);
                    setShowAddModal(true);
                  }}
                >
                  <p className={`text-xs font-medium mb-1 ${isToday(d) ? "text-brand-400" : "text-surface-400"}`}>
                    {d.getDate()}
                  </p>
                  {dayBookings.slice(0, 3).map((b) => {
                    const st = STATUS_STYLES[b.status] || STATUS_STYLES.confirmed;
                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailModal(b);
                        }}
                        className={`${st.text} text-xs truncate py-0.5 px-1.5 rounded mb-0.5 ${st.bg} border cursor-pointer`}
                      >
                        {b.start_time.substring(0, 5)} {b.customer_name}
                      </div>
                    );
                  })}
                  {dayBookings.length > 3 && (
                    <p className="text-xs text-surface-500">+{dayBookings.length - 3} more</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ADD BOOKING MODAL ──────────────────────────── */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-lg p-6 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-white">New Booking</h2>
                <button onClick={() => setShowAddModal(false)} className="text-surface-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">Customer Name *</label>
                  <input
                    type="text"
                    value={newBooking.customer_name}
                    onChange={(e) => setNewBooking({ ...newBooking, customer_name: e.target.value })}
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none"
                    placeholder="John Smith"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">Phone</label>
                    <input
                      type="tel"
                      value={newBooking.customer_phone}
                      onChange={(e) => setNewBooking({ ...newBooking, customer_phone: e.target.value })}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none"
                      placeholder="04XX XXX XXX"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={newBooking.customer_email}
                      onChange={(e) => setNewBooking({ ...newBooking, customer_email: e.target.value })}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none"
                      placeholder="john@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">Job Title *</label>
                  <input
                    type="text"
                    value={newBooking.title}
                    onChange={(e) => setNewBooking({ ...newBooking, title: e.target.value })}
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none"
                    placeholder="Window replacement quote"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">Date *</label>
                  <input
                    type="date"
                    value={newBooking.booking_date}
                    onChange={(e) => setNewBooking({ ...newBooking, booking_date: e.target.value })}
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">Start Time</label>
                    <select
                      value={newBooking.start_time}
                      onChange={(e) => setNewBooking({ ...newBooking, start_time: e.target.value })}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
                    >
                      {WORK_TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">End Time</label>
                    <select
                      value={newBooking.end_time}
                      onChange={(e) => setNewBooking({ ...newBooking, end_time: e.target.value })}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
                    >
                      {WORK_TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">Notes</label>
                  <textarea
                    value={newBooking.notes}
                    onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none resize-none h-20"
                    placeholder="Any additional details..."
                  />
                </div>
                <button
                  onClick={handleAddBooking}
                  disabled={!newBooking.customer_name || !newBooking.booking_date}
                  className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Create Booking
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── BOOKING DETAIL MODAL ──────────────────────── */}
      {showDetailModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowDetailModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-lg p-6 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-white">{showDetailModal.title}</h2>
                <button onClick={() => setShowDetailModal(null)} className="text-surface-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-white">{showDetailModal.customer_name}</span>
                </div>
                {showDetailModal.customer_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-surface-400" />
                    <a href={`tel:${showDetailModal.customer_phone}`} className="text-sm text-brand-400 hover:text-brand-300">
                      {showDetailModal.customer_phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-300">
                    {new Date(showDetailModal.booking_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-300">
                    {showDetailModal.start_time.substring(0, 5)} – {showDetailModal.end_time.substring(0, 5)}
                  </span>
                </div>
                {showDetailModal.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-surface-400 mt-0.5" />
                    <span className="text-sm text-surface-300">{showDetailModal.notes}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-surface-400" />
                  <span className={`text-sm font-medium ${STATUS_STYLES[showDetailModal.status]?.text || "text-surface-400"}`}>
                    {STATUS_STYLES[showDetailModal.status]?.label || showDetailModal.status}
                  </span>
                </div>

                {/* Status Actions */}
                <div className="pt-3 border-t border-surface-700/40">
                  <p className="text-xs text-surface-400 mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {["confirmed", "completed", "cancelled", "no_show"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(showDetailModal.id, s)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          showDetailModal.status === s
                            ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} border-current`
                            : "border-surface-700 text-surface-400 hover:text-white hover:border-surface-500"
                        }`}
                      >
                        {STATUS_STYLES[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteBooking(showDetailModal.id)}
                  className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 mt-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Booking
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
