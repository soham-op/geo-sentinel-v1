"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, UserButton, useUser, useClerk } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Activity,
  ScanSearch,
  BarChart3,
  Trophy,
  ChevronRight,
  Zap,
  Shield,
  Globe,
} from "lucide-react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: ScanSearch,
    title: "Scan",
    description: "Enter any business name and city. Our engine instantly crawls 50+ local directories, maps platforms, and citation sources to build a complete visibility snapshot.",
    color: "from-[#0066FF] to-[#0040CC]",
    glow: "shadow-[0_0_40px_rgba(0,102,255,0.25)]",
    badge: "bg-[#0066FF]/10 text-[#4D94FF]",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Analyze",
    description: "We cross-reference 200+ data points and competitor benchmarks to surface your exact weaknesses — NAP inconsistencies, ranking gaps, and missed keywords.",
    color: "from-violet-500 to-violet-700",
    glow: "shadow-[0_0_40px_rgba(139,92,246,0.25)]",
    badge: "bg-violet-500/10 text-violet-300",
  },
  {
    number: "03",
    icon: Trophy,
    title: "Dominate",
    description: "Receive a prioritized action plan that drives you to the top of local search. Track your progress week-over-week as your rankings climb and leads pour in.",
    color: "from-emerald-500 to-emerald-700",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
    badge: "bg-emerald-500/10 text-emerald-300",
  },
];

const features = [
  { icon: Zap, label: "Instant results in under 30 seconds" },
  { icon: Shield, label: "GDPR-compliant data handling" },
  { icon: Globe, label: "Covers 50+ directories worldwide" },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const [fullAddress, setFullAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Connecting to Google Maps API...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setLoadingText("Connecting to Google Maps API...");
      return;
    }

    const int = setInterval(() => {
      setProgress((p) => Math.min(p + (Math.random() * 8 + 2), 95));
    }, 400);

    const t1 = setTimeout(() => setLoadingText("Analyzing Competitor Citations..."), 2000);
    const t2 = setTimeout(() => setLoadingText("Calculating Growth Opportunities..."), 4000);

    return () => {
      clearInterval(int);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isLoading]);

  const startAudit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!fullAddress) return;

    if (!isLoaded) return;

    if (!user) {
      openSignIn();
      return;
    }

    setIsLoading(true);
    try {
      // ── 1. Run real Serper audit server-side ──────────────────────
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullAddress }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ?? "Audit API failed");
      }

      const payload = await res.json();

      // ── 2. Persist to Supabase with real data ─────────────────────
      const { data: inserted, error } = await supabase.from("audits").insert({
        user_id:       user.id,
        full_address:  fullAddress,
        business_name: payload.business_name,
        city:          payload.city,
        seo_score:     payload.seo_score,
        issues:        payload.issues,
        // Real extracted Serper data — review_count prefers payload.review_count
        // which itself already tried raw.ratingCount → raw.reviews on the server
        review_count:  payload.review_count  ?? null,
        rating:        payload.rating        ?? null,
        category:      payload.category      ?? null,
        phone:         payload.phone         ?? null,
        has_website:   payload.has_website   ?? null,
      }).select("id").single();

      if (error) throw error;

      setProgress(100);
      setLoadingText("Audit Complete! Redirecting...");
      setTimeout(() => {
        // Navigate straight to the results page using the real inserted row ID
        router.push(inserted?.id ? `/audits/${inserted.id}` : "/dashboard");
      }, 500);

    } catch (err) {
      console.error("Full Error:", JSON.stringify(err, null, 2));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 font-sans selection:bg-[#0066FF]/30 overflow-x-hidden">

      {/* ── Deep Dark Ambient Glow Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#0066FF]/[0.08] rounded-full blur-[160px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-violet-600/[0.05] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#0066FF]/[0.06] rounded-full blur-[150px]" />
        {/* Extremely subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-[0.2]"
          style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-50 sticky top-0 w-full border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#003DB3] flex items-center justify-center shadow-[0_0_18px_rgba(0,102,255,0.4)]">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[18px] text-white tracking-tight">
              Geo<span className="text-[#0066FF]">Sentinel</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-400 font-medium">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {isLoaded && user ? (
              <>
                <Link href="/dashboard" className="text-sm font-semibold text-[#4D94FF] hover:text-[#0066FF] transition-colors mr-3">
                  Dashboard →
                </Link>
                <UserButton />
              </>
            ) : isLoaded && !user ? (
              <>
                <SignInButton mode="modal">
                  <span className="text-sm font-semibold text-neutral-300 hover:text-white cursor-pointer mr-3">Log In</span>
                </SignInButton>
                <SignInButton mode="modal">
                  <span className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors">Sign In Free</span>
                </SignInButton>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-neutral-300 text-xs font-semibold uppercase tracking-widest mb-10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0066FF]"></span>
            </span>
            Trusted by 12,000+ local businesses
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-7 text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400">
            Stop Losing Customers
            <br />
            to Competitors.
          </h1>

          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Your customers are searching right now. If you&apos;re not at the top of local results,
            your competitors are getting their business. GeoSentinel fixes that — in seconds.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-14">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs font-medium text-neutral-400 bg-[#0A0A0A] border border-white/[0.08] rounded-full px-4 py-2">
                <Icon className="w-3.5 h-3.5 text-[#0066FF]" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hero Form / Floating Command Center */}
        <motion.form 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={startAudit} 
          className="relative max-w-3xl mx-auto group z-20"
        >
          {/* Intense Outer Glow for Floating Command Center */}
          <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-r from-[#0066FF]/20 via-violet-500/20 to-[#0066FF]/20 blur-xl pointer-events-none" />
          
          {/* Deep glowing hover border */}
          <div className="absolute -inset-px rounded-[1.25rem] bg-gradient-to-r from-[#0066FF]/50 via-white/40 to-violet-500/50 opacity-100 blur-[2px] pointer-events-none" />

          <div className="relative bg-[#050505]/90 backdrop-blur-2xl rounded-2xl border border-white/20 p-2.5 flex flex-col sm:flex-row items-stretch gap-2 z-10 shadow-[0_0_60px_rgba(0,102,255,0.15)] ring-1 ring-white/10">
            <div className="flex-1 flex items-center gap-3 px-5 py-4 rounded-xl hover:bg-white/[0.03] transition-colors group/input bg-[#0A0A0A]/50 border border-white/[0.05]">
              <Search className="w-5 h-5 text-neutral-400 group-focus-within/input:text-white transition-colors shrink-0" />
              <input
                type="text"
                placeholder="Enter business name and full address (e.g., Star Dental, Kothrud, Pune)..."
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                required
                className="w-full bg-transparent text-white placeholder:text-neutral-500 focus:outline-none text-[15px] font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`relative overflow-hidden flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 transition-all font-bold px-8 py-4 rounded-xl min-w-[200px] shadow-[0_4px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.25)] group/btn whitespace-nowrap active:scale-[0.98] ${isLoading ? "cursor-wait opacity-100" : "hover:scale-[1.02]"}`}
            >
              {/* Internal Progress Bar */}
              {isLoading && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-[#0066FF]/15" 
                  style={{ width: `${progress}%`, transition: "width 0.4s ease-out" }} 
                />
              )}
              
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin shrink-0" />
                    <span className="text-[13px]">{loadingText}</span>
                  </>
                ) : (
                  <>
                    Start Audit
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </div>
          
          {/* Social Proof Bar */}
          <div className="mt-8 flex items-center justify-center gap-3 text-[13px] font-medium text-neutral-400 tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Trusted by 500+ local businesses in Pune
          </div>
        </motion.form>
      </section>

      {/* ── Stats Bar ── */}
      <section id="features" className="relative z-10 border-y border-white/[0.04] bg-[#0A0A0A]/50 py-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "200+", label: "Data Points Checked" },
            { value: "140%", label: "Avg ROI Increase" },
            { value: "85K+", label: "Rankings Won" },
            { value: "50+", label: "Directories Scanned" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{s.value}</p>
              <p className="text-xs uppercase tracking-widest text-neutral-500 font-bold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-6 py-32">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-5">
            How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066FF] to-violet-400">Works</span>
          </h2>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto">
            Three steps. Zero technical expertise required. Unfair competitive advantage.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(({ number, icon: Icon, title, description, color, glow, badge }, i) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              key={title}
              className={`relative group bg-[#0A0A0A] rounded-3xl border border-white/[0.08] p-10 flex flex-col gap-6 hover:border-white/20 transition-all duration-500 hover:-translate-y-2`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center ${glow} shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-4xl font-black ${badge} px-4 py-2 rounded-xl`}>
                  {number}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
                <p className="text-neutral-400 text-[15px] leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-white text-lg">
            Geo<span className="text-[#0066FF]">Sentinel</span>
          </span>
          <p className="text-sm text-neutral-600 font-medium">© {new Date().getFullYear()} GeoSentinel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
