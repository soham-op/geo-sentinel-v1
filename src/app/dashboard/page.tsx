"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Zap,
  Search,
  Bell,
  ChevronRight,
  TrendingUp,
  Globe,
  Activity,
  Menu,
  X,
  MapPin,
  Calendar,
  ArrowRight,
} from "lucide-react";

type Audit = {
  id: string;
  user_id: string;
  business_name: string;
  city: string;
  full_address: string;
  seo_score: number;
  created_at: string;
};

const navItems = [
  { label: "My Audits", icon: ClipboardList, href: "#audits" },
  { label: "Settings", icon: Settings, href: "#settings" },
  { label: "Upgrade to Pro", icon: Zap, href: "#upgrade", highlight: true },
];

function getScoreBadge(score: number) {
  if (score >= 75) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (score >= 55) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("My Audits");
  const [fullAddress, setFullAddress] = useState("");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [fetching, setFetching] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      openSignIn();
      return;
    }

    const fetchAudits = async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAudits(data as Audit[]);
      }
      setFetching(false);
    };

    fetchAudits();
  }, [isLoaded, user, openSignIn]);

  const runAudit = async () => {
    if (!fullAddress || !user) return;
    setRunning(true);
    try {
      // ── 1. Run real Serper audit server-side ──────────────────────
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullAddress }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson?.error ?? "Audit API failed");
      }

      const payload = await res.json();

      // ── 2. Persist to Supabase with real data ─────────────────────
      const { data, error } = await supabase
        .from("audits")
        .insert({
          user_id: user.id,
          full_address: fullAddress,
          business_name: payload.business_name,
          city: payload.city,
          seo_score: payload.seo_score,
          issues: payload.issues,
        })
        .select()
        .single();

      if (!error && data) {
        setAudits((prev) => [data as Audit, ...prev]);
        setFullAddress("");
      }
    } catch (err) {
      console.error("runAudit error:", err);
    } finally {
      setRunning(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0066FF]/30 border-t-[#0066FF] rounded-full animate-spin" />
      </div>
    );
  }

  const avgScore = audits.length > 0 ? Math.round(audits.reduce((acc, a) => acc + a.seo_score, 0) / audits.length) : 0;
  const uniqueCities = new Set(audits.map((a) => a.city)).size;

  const fadeInUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-neutral-100 font-sans selection:bg-[#0066FF]/30 overflow-hidden">

      {/* ──── Sidebar ──── */}
      <aside className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 flex flex-col bg-[#0A0A0A] border-r border-white/5 z-20 shrink-0 overflow-hidden`}>
        <div className="h-[70px] flex items-center gap-3 px-6 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#003DB3] flex items-center justify-center shadow-[0_0_15px_rgba(0,102,255,0.4)]">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white/90">Geo<span className="text-[#0066FF]">Sentinel</span></span>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Main Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;
            return (
              <button key={item.label} onClick={() => setActiveNav(item.label)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${item.highlight ? "mt-6 bg-[#0066FF]/10 text-[#4D94FF] hover:bg-[#0066FF]/20" : isActive ? "bg-white/[0.06] text-white font-medium shadow-sm" : "text-neutral-400 hover:text-white hover:bg-white/[0.02]"}`}>
                <div className="flex items-center gap-3"><Icon className={`w-4 h-4 ${isActive && !item.highlight ? "text-[#0066FF]" : ""}`} /> {item.label}</div>
                {item.highlight && <ChevronRight className="w-3 h-3" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02]">
            <UserButton />
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-medium text-neutral-200 truncate">{user?.firstName ?? "My Account"}</p>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Free Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ──── Main Content ──── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#0066FF]/[0.02] rounded-full blur-[140px] pointer-events-none" />

        <header className="flex-shrink-0 flex items-center justify-between gap-4 px-6 h-[70px] border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input type="text" placeholder="Search audits…" className="bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-[#4D94FF] focus:bg-white/[0.05] w-64 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#0066FF] rounded-full border-2 border-[#050505]"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 z-10">
          <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }} className="max-w-5xl mx-auto space-y-8">

            <motion.div variants={fadeInUp}>
              <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
              <p className="text-sm text-neutral-400 mt-1">Manage your local SEO audits and track performance.</p>
            </motion.div>

            {/* Stats Row */}
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Audits", value: audits.length.toString(), icon: LayoutDashboard, delta: "+2 this week" },
                { label: "Avg SEO Score", value: avgScore.toString(), icon: TrendingUp, delta: avgScore >= 70 ? "Healthy" : "Needs Work" },
                { label: "Locations Analyzed", value: uniqueCities.toString(), icon: Globe, delta: "Across all markets" },
              ].map(({ label, value, icon: Icon, delta }) => (
                <div key={label} className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-colors relative overflow-hidden group">
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#0066FF]/0 via-[#0066FF]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</p>
                      <div className="w-8 h-8 rounded-xl bg-[#0066FF]/10 flex items-center justify-center border border-[#0066FF]/20">
                        <Icon className="w-4 h-4 text-[#4D94FF]" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white">{value}</p>
                    <p className="text-xs text-neutral-500 mt-1 font-medium">{delta}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* New Audit Card */}
            <motion.div variants={fadeInUp} className="bg-[#0A0A0A] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0066FF]/[0.03] rounded-full blur-[80px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 border-b border-white/[0.04] pb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066FF]/20 to-violet-500/20 border border-[#0066FF]/20 flex items-center justify-center">
                    <Search className="w-5 h-5 text-[#4D94FF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Run New Audit</h2>
                    <p className="text-xs text-neutral-400">Instantly analyze local SEO signals for any business.</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="fullAddress" className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">
                      Full Business Address
                    </label>
                    <input
                      id="fullAddress"
                      type="text"
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      placeholder="Enter business name and full address (e.g., Star Dental, Kothrud, Pune)..."
                      className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#0066FF]/60 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={runAudit}
                    disabled={running || !fullAddress}
                    className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055DD] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_24px_rgba(0,102,255,0.4)]"
                  >
                    {running ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning...</>
                    ) : (
                      <>Run Audit <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Audit History List */}
            <motion.div variants={fadeInUp} className="bg-[#0A0A0A] border border-white/[0.06] rounded-3xl overflow-hidden shadow-xl">
              <div className="px-6 py-5 border-b border-white/[0.04] bg-white/[0.01]">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Audit History</h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {fetching ? (
                  <div className="p-8 text-center text-sm font-medium text-neutral-500">Loading your audits...</div>
                ) : audits.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center mb-3">
                      <ClipboardList className="w-5 h-5 text-neutral-600" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-300">No audits found</p>
                    <p className="text-xs text-neutral-500 mt-1">Use the form above to run your first local SEO scan.</p>
                  </div>
                ) : (
                  audits.map((audit) => (
                    <Link href={`/audits/${audit.id}`} key={audit.id} className="group block hover:bg-white/[0.02] transition-colors">
                      <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="hidden sm:flex shrink-0 w-10 h-10 rounded-xl bg-white/[0.04] items-center justify-center border border-white/[0.04] group-hover:bg-[#0066FF]/10 group-hover:border-[#0066FF]/20 transition-all">
                            <MapPin className="w-4 h-4 text-neutral-500 group-hover:text-[#4D94FF]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-white truncate group-hover:text-[#4D94FF] transition-colors">{audit.full_address || audit.business_name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500"><Calendar className="w-3.5 h-3.5" /> {new Date(audit.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className={`px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${getScoreBadge(audit.seo_score)}`}>
                            Score: {audit.seo_score}
                          </div>
                          <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}
