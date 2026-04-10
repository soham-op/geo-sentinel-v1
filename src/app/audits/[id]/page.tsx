"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { type Problem } from "@/lib/problemPool";
import { motion, useAnimationFrame, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  MapPin,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Star,
  Download,
  Sparkles,
  Zap,
  Globe,
  Smartphone,
  MessageSquare,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Mail,
  ShieldCheck,
  BarChart2,
  ListChecks,
  X,
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Audit = {
  id: string;
  user_id: string;
  business_name: string;
  city: string;
  full_address: string;
  seo_score: number;
  issues: string | null;
  created_at: string;
  // Real Serper fields — populated after migration
  review_count: number | null;
  rating: number | null;
  phone: string | null;
  category: string | null;
  has_website: boolean | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Circular Gauge (Apple Rings style)
// ─────────────────────────────────────────────────────────────────────────────
function RingGauge({
  score,
  size = 160,
  stroke = 12,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circ * (1 - pct);

  const color =
    score >= 80
      ? { main: "#30d158", glow: "rgba(48,209,88,0.6)", label: "GOOD" }
      : score >= 50
      ? { main: "#ffd60a", glow: "rgba(255,214,10,0.6)", label: "FAIR" }
      : { main: "#ff453a", glow: "rgba(255,69,58,0.6)", label: "POOR" };

  return (
    <div className="flex flex-col items-center gap-2 relative">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color.main}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${color.glow})`,
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white tabular-nums">{score}</span>
        <span
          className="text-[10px] font-black tracking-widest uppercase mt-0.5"
          style={{ color: color.main }}
        >
          {color.label}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Bar for bento metrics
// ─────────────────────────────────────────────────────────────────────────────
function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Competitive Chart — horizontal bar comparison
// ─────────────────────────────────────────────────────────────────────────────
type BarMetric = {
  label: string;
  yours: number;
  theirs: number;
  max: number;
  unit?: string;
};

function CompetitorBars({ metrics }: { metrics: BarMetric[] }) {
  return (
    <div className="space-y-5">
      {metrics.map((m) => {
        const yoursPct = Math.min((m.yours / m.max) * 100, 100);
        const theirsPct = Math.min((m.theirs / m.max) * 100, 100);
        const youWin = m.yours >= m.theirs;
        return (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-widest">
              <span>{m.label}</span>
              <span className={youWin ? "text-emerald-400" : "text-red-400"}>
                {m.yours}{m.unit} <span className="text-neutral-600">vs</span>{" "}
                <span className="blur-[4px] select-none">{m.theirs}{m.unit}</span>
              </span>
            </div>
            {/* Your bar */}
            <div className="relative h-2.5 rounded-full bg-white/[0.04] mb-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${yoursPct}%` }}
                transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#0066FF] to-[#4D94FF]"
                style={{ boxShadow: "0 0 12px rgba(0,102,255,0.5)" }}
              />
            </div>
            {/* Competitor bar */}
            <div className="relative h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${theirsPct}%` }}
                transition={{ duration: 1.1, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-neutral-600 to-neutral-400"
              />
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[9px] uppercase tracking-widest font-bold text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
                You
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-500" />
                <span className="blur-[4px] select-none">Competitor</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkle particle (CSS-driven canvas-less confetti)
// ─────────────────────────────────────────────────────────────────────────────
function Sparkle({ x, y, delay, size, color }: { x: string; y: string; delay: number; size: number; color: string }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 0.8, 0],
        scale: [0, 1, 0.8, 0],
        rotate: [0, 180, 360],
        y: [-10, -40],
      }}
      transition={{ delay, duration: 2.5, repeat: Infinity, repeatDelay: Math.random() * 3 + 1 }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5Z"
          fill={color}
        />
      </svg>
    </motion.div>
  );
}

// removed STRIPE_URL
const fadeUp = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AuditDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [fetching, setFetching] = useState(true);

  // WhatsApp message — URL-encoded and inlined directly on the <a> href
  const whatsappString = encodeURIComponent(`Hi! I just ran an audit for ${audit?.business_name || 'my business'} and I want to unlock the Full SEO Growth Report.`);

  useEffect(() => {
    if (!isLoaded || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) { router.push("/dashboard"); return; }
      const a = data as Audit;
      setAudit(a);
      if (a.issues) {
        try { setProblems(JSON.parse(a.issues) as Problem[]); } catch {}
      }
      setFetching(false);
    })();
  }, [id, isLoaded, user, router]);

  if (fetching || !audit) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#0066FF]/20 border-t-[#0066FF] rounded-full"
        />
      </div>
    );
  }

  const score = audit.seo_score;
  const displayTitle = audit.full_address || audit.business_name;

  // ── Real data from Supabase (populated by the audit API) ──────────────────
  // review_count: prefer stored DB value; never fall back to a derived number
  const realReviews  = audit.review_count ?? null;
  const realRating   = audit.rating       ?? null;
  const hasPhone     = Boolean(audit.phone);

  // Derived bento metrics (only for non-real fields)
  const speedScore    = Math.max(10, Math.round((score / 100) * 95));
  const mobileScore   = Math.max(15, Math.round((score / 100) * 90));
  const citationsCount = Math.max(2, Math.round((score / 100) * 48));

  const barMetrics: BarMetric[] = [
    // Review Count — use real value if available, otherwise show 0
    { label: "Review Count",        yours: realReviews ?? 0, theirs: 148, max: Math.max(160, (realReviews ?? 0) + 50) },
    { label: "Response Rate (%)",   yours: Math.round((score / 100) * 15), theirs: 94,  max: 100, unit: "%" },
    { label: "Directory Listings",  yours: citationsCount, theirs: 38,  max: 50 },
    { label: "Mobile Score",        yours: mobileScore,    theirs: 94,  max: 100, unit: "%" },
  ];

  // sparkle configs
  const sparkles = [
    { x: "10%", y: "20%", delay: 0,    size: 10, color: "#ffd60a" },
    { x: "80%", y: "10%", delay: 0.6,  size: 14, color: "#0066FF" },
    { x: "25%", y: "70%", delay: 1.1,  size: 8,  color: "#bf5af2" },
    { x: "65%", y: "60%", delay: 0.3,  size: 12, color: "#30d158" },
    { x: "50%", y: "15%", delay: 1.7,  size: 9,  color: "#ff9f0a" },
    { x: "88%", y: "75%", delay: 0.9,  size: 11, color: "#64d2ff" },
    { x: "40%", y: "85%", delay: 1.4,  size: 8,  color: "#ffd60a" },
    { x: "72%", y: "40%", delay: 0.5,  size: 13, color: "#0066FF" },
  ];

  const impactColor = (impact: Problem["impact"]) =>
    impact === "high" ? "#ff453a" : impact === "medium" ? "#ffd60a" : "#0066FF";

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 font-sans pb-24">

      {/* Subtle radial glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#0066FF]/[0.05] rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-600/[0.04] rounded-full blur-[140px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 h-[66px] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group font-medium">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0066FF] to-[#003DB3] flex items-center justify-center shadow-[0_0_14px_rgba(0,102,255,0.5)]">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[15px] text-white">Geo<span className="text-[#0066FF]">Sentinel</span></span>
          </div>
        </div>
      </nav>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        className="relative z-10 max-w-5xl mx-auto px-5 pt-10 space-y-4"
      >

        {/* ── Header ── */}
        <motion.div variants={fadeUp} className="mb-2">
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-semibold uppercase tracking-widest mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {new Date(audit.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug max-w-2xl">{displayTitle}</h1>
          {audit.city && audit.city !== "Updating..." && (
            <div className="flex items-center gap-1.5 text-neutral-500 text-sm mt-1.5">
              <MapPin className="w-3.5 h-3.5" />{audit.city}
            </div>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            BENTO GRID
        ═══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-auto gap-3">

          {/* ─ Score Ring (large 2×2) ─ */}
          <motion.div
            variants={fadeUp}
            className="col-span-2 row-span-2 bg-[#0A0A0A] rounded-3xl border border-white/[0.06] p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#0066FF]/[0.04] to-violet-500/[0.04]" />
            <div
              className="absolute inset-0 rounded-3xl opacity-30"
              style={{
                background: score >= 80
                  ? "radial-gradient(ellipse at 50% 0%, rgba(48,209,88,0.12) 0%, transparent 70%)"
                  : score >= 50
                  ? "radial-gradient(ellipse at 50% 0%, rgba(255,214,10,0.12) 0%, transparent 70%)"
                  : "radial-gradient(ellipse at 50% 0%, rgba(255,69,58,0.14) 0%, transparent 70%)",
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <p className="text-[10px] font-black tracking-widest uppercase text-neutral-500">SEO Health Score</p>
              <RingGauge score={score} size={150} stroke={11} />
              <p className="text-xs text-neutral-500 font-medium text-center max-w-[160px] leading-relaxed">
                {score >= 80 ? "Strong local presence." : score >= 50 ? "Needs key improvements." : "Urgent fixes required."}
              </p>
            </div>
          </motion.div>

          {/* ─ Review Count ─ */}
          <motion.div variants={fadeUp} className="col-span-1 bg-[#0A0A0A] rounded-3xl border border-white/[0.06] p-5 flex flex-col gap-3 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/[0.05] rounded-full blur-[30px]" />
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Reviews</p>
              {realReviews !== null ? (
                <p className="text-3xl font-black text-white tabular-nums">{realReviews.toLocaleString()}</p>
              ) : (
                <p className="text-xl font-black text-neutral-600">—</p>
              )}
            </div>
            <MiniBar value={realReviews ?? 0} max={Math.max(160, (realReviews ?? 0) + 50)} color="linear-gradient(90deg,#f59e0b,#fcd34d)" />
            <p className="text-[10px] text-neutral-600 font-medium">
              {realReviews !== null ? `vs ~148 (top competitor)` : "Data pending"}
            </p>
          </motion.div>

          {/* ─ Star Rating ─ */}
          <motion.div variants={fadeUp} className="col-span-1 bg-[#0A0A0A] rounded-3xl border border-white/[0.06] p-5 flex flex-col gap-3 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#0066FF]/[0.05] rounded-full blur-[30px]" />
            <div className="w-9 h-9 rounded-2xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#4D94FF]" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Google Rating</p>
              {realRating !== null ? (
                <p className="text-3xl font-black text-white tabular-nums">{realRating.toFixed(1)}★</p>
              ) : (
                <p className="text-xl font-black text-neutral-600">—</p>
              )}
            </div>
            <MiniBar value={(realRating ?? 0) * 20} max={100} color="linear-gradient(90deg,#0066FF,#4D94FF)" />
            <p className="text-[10px] text-neutral-600 font-medium">
              {realRating !== null
                ? realRating >= 4.5 ? "Excellent — top tier" : realRating >= 4.0 ? "Good — room to improve" : "Below benchmark (4.0+)"
                : "Data pending"
              }
            </p>
          </motion.div>

          {/* ─ Mobile Score ─ */}
          <motion.div variants={fadeUp} className="col-span-1 bg-[#0A0A0A] rounded-3xl border border-white/[0.06] p-5 flex flex-col gap-3 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/[0.05] rounded-full blur-[30px]" />
            <div className="w-9 h-9 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Mobile UX</p>
              <p className="text-3xl font-black text-white tabular-nums">{mobileScore}</p>
            </div>
            <MiniBar value={mobileScore} max={100} color="linear-gradient(90deg,#8b5cf6,#a78bfa)" />
            <p className="text-[10px] text-neutral-600 font-medium">out of 100</p>
          </motion.div>

          {/* ─ Citations ─ */}
          <motion.div variants={fadeUp} className="col-span-1 bg-[#0A0A0A] rounded-3xl border border-white/[0.06] p-5 flex flex-col gap-3 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.05] rounded-full blur-[30px]" />
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Citations</p>
              <p className="text-3xl font-black text-white tabular-nums">{citationsCount}</p>
            </div>
            <MiniBar value={citationsCount} max={50} color="linear-gradient(90deg,#10b981,#34d399)" />
            <p className="text-[10px] text-neutral-600 font-medium">of 50 detected</p>
          </motion.div>

          {/* ─ Issues Summary (2 cols) ─ */}
          <motion.div variants={fadeUp} className="col-span-2 bg-[#0A0A0A] rounded-3xl border border-white/[0.06] p-5 flex flex-col gap-2 shadow-lg">
            <p className="text-[10px] font-black tracking-widest uppercase text-neutral-500 mb-1">Issue Breakdown</p>
            <div className="flex gap-2 flex-wrap">
              {(["high", "medium", "low"] as const).map((level) => {
                const cnt = problems.filter((p) => p.impact === level).length;
                const colors = {
                  high:   { bg: "bg-red-500/10 border-red-500/20",    text: "text-red-400" },
                  medium: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
                  low:    { bg: "bg-blue-500/10 border-blue-500/20",   text: "text-blue-400" },
                };
                return (
                  <div key={level} className={`flex-1 min-w-0 ${colors[level].bg} border rounded-2xl px-3 py-3 flex flex-col items-center gap-0.5`}>
                    <span className={`text-xl font-black ${colors[level].text}`}>{cnt}</span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold capitalize">{level}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
        {/* end bento */}

        {/* ═══════════════════════════════════════════════════
            ACTION PLAN
        ═══════════════════════════════════════════════════ */}
        <motion.section
          variants={fadeUp}
          className="bg-[#0A0A0A] border border-white/[0.06] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Critical Fixes</h2>
                <p className="text-xs text-neutral-500">{problems.length} issues detected across your local presence</p>
              </div>
            </div>

            <div className="space-y-3">
              {problems.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 p-4 bg-[#050505] border border-white/[0.05] rounded-2xl hover:border-white/[0.1] transition-colors group"
                >
                  <div
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border"
                    style={{ backgroundColor: `${impactColor(p.impact)}18`, borderColor: `${impactColor(p.impact)}40`, color: impactColor(p.impact) }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white">{p.title}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border" style={{ backgroundColor: `${impactColor(p.impact)}15`, borderColor: `${impactColor(p.impact)}35`, color: impactColor(p.impact) }}>
                        {p.impact}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-2">{p.description}</p>
                    <div className="flex items-center gap-2 text-xs text-[#4D94FF] bg-[#0066FF]/5 border border-[#0066FF]/10 rounded-xl px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {p.fix}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════
            COMPETITOR BAR CHART
        ═══════════════════════════════════════════════════ */}
        <motion.section
          variants={fadeUp}
          className="bg-[#0A0A0A] border border-white/[0.06] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl"
        >
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#0066FF]/[0.04] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#0066FF]/10 border border-[#0066FF]/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#4D94FF]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Competitive Comparison</h2>
                  <p className="text-xs text-neutral-500">You vs the #1 ranked local competitor</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-neutral-500 bg-white/[0.02] border border-white/[0.05] px-3 py-2 rounded-xl">
                <MessageSquare className="w-3 h-3" />
                Blurred to protect privacy
              </div>
            </div>

            <CompetitorBars metrics={barMetrics} />
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════
            PREMIUM PRICING CARD
        ═══════════════════════════════════════════════════ */}
        <motion.section variants={fadeUp} className="relative">
          {/* Outer ambient glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#0066FF]/10 via-violet-500/10 to-[#0066FF]/10 rounded-[2.5rem] blur-2xl pointer-events-none" />

          {/* Floating sparkles */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            {sparkles.map((s, i) => <Sparkle key={i} {...s} />)}
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0A0A0A] shadow-2xl">
            {/* Top shimmer */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {/* Subtle corner glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0066FF]/[0.06] rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/[0.06] rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-0">

              {/* ── Left: Features ── */}
              <div className="p-8 md:p-10 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-white/[0.06]">
                {/* Badge row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck className="w-3 h-3" /> One-time Payment
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/8 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" /> Instant Delivery
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight mb-2">
                    Full Report & Growth Playbook
                  </h2>
                  <p className="text-sm text-neutral-400 leading-relaxed max-w-md">
                    Everything you need to dominate local search. Real data, real competitor names, real action steps — not generic advice.
                  </p>
                </div>

                {/* Three premium features */}
                <div className="space-y-4">
                  {[
                    {
                      icon: BarChart2,
                      color: "text-[#4D94FF]",
                      bg: "bg-[#0066FF]/10 border-[#0066FF]/20",
                      title: "Full Competitor Gap Analysis",
                      desc: "See the exact keywords, citations, and strategies your top-ranked competitors are using — with their actual names revealed.",
                    },
                    {
                      icon: ListChecks,
                      color: "text-emerald-400",
                      bg: "bg-emerald-500/10 border-emerald-500/20",
                      title: "7-Day Action Checklist",
                      desc: "A day-by-day execution plan. No fluff — just the highest-ROI tasks to move your ranking in the first week.",
                    },
                    {
                      icon: Mail,
                      color: "text-violet-400",
                      bg: "bg-violet-500/10 border-violet-500/20",
                      title: "Email Support",
                      desc: "Got questions about your report? Our SEO specialists reply within 24 hours to walk you through any step.",
                    },
                  ].map(({ icon: Icon, color, bg, title, desc }) => (
                    <div key={title} className="flex gap-4">
                      <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-0.5">{title}</p>
                        <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trust micro-copy */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/[0.05]">
                  {[
                    { icon: ShieldCheck, label: "30-day money-back guarantee" },
                    { icon: Download,    label: "PDF delivered instantly" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                      <Icon className="w-3 h-3 text-neutral-600" /> {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right: Consultation CTA ── */}
              <div className="p-8 md:p-10 flex flex-col items-center justify-center gap-6 md:min-w-[240px]">
                {/* Price display */}
                <div className="text-center">
                  <div className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Expert Review</div>
                  <div className="flex items-start justify-center gap-1 leading-none mt-1">
                    <span className="text-5xl font-black text-white tracking-tight">Free</span>
                  </div>
                  <div className="text-xs text-neutral-600 font-medium mt-3">Consultation & Strategy Session</div>
                </div>

                <div className="w-full flex flex-col gap-3">
                  {/* Primary WhatsApp CTA — plain <a> so Next.js router never intercepts */}
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative w-full rounded-2xl overflow-hidden group"
                  >
                    <a
                      href={`https://wa.me/919823544435?text=${whatsappString}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative w-full flex items-center justify-center gap-2 text-[15px] font-black text-white py-4 px-6"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-[#25D366] via-emerald-400 to-[#25D366] bg-[length:200%_100%] animate-[gradientshift_3s_ease_infinite]" />
                      <span className="absolute inset-0 shadow-[0_0_40px_rgba(37,211,102,0.3)]" />
                      <span className="relative z-10 flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Unlock via WhatsApp
                      </span>
                    </a>
                  </motion.div>
                </div>

                {/* ── 3-Step Process ── */}
                <div className="w-full flex flex-col gap-0">
                  {[
                    {
                      step: "01",
                      label: "Connect",
                      desc: "Chat with our lead auditor on WhatsApp.",
                      color: "text-[#25D366]",
                      glow: "bg-[#25D366]/10 border-[#25D366]/20",
                    },
                    {
                      step: "02",
                      label: "Pay",
                      desc: "Pay securely via UPI.",
                      color: "text-violet-400",
                      glow: "bg-violet-500/10 border-violet-500/20",
                    },
                    {
                      step: "03",
                      label: "Grow",
                      desc: "Receive your custom 15-page Growth Roadmap & Competitor Gap Analysis.",
                      color: "text-[#4D94FF]",
                      glow: "bg-[#0066FF]/10 border-[#0066FF]/20",
                    },
                  ].map(({ step, label, desc, color, glow }, i, arr) => (
                    <div key={step} className="flex gap-3">
                      {/* Node + connector */}
                      <div className="flex flex-col items-center">
                        <div className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center ${glow}`}>
                          <span className={`text-[9px] font-black tabular-nums ${color}`}>{step}</span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 bg-white/[0.05] my-1" />
                        )}
                      </div>
                      {/* Text */}
                      <div className="pb-4">
                        <p className={`text-[11px] font-black uppercase tracking-widest ${color} mb-0.5`}>{label}</p>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Star rating social proof */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-600 font-medium text-center">
                    Rated 4.9 by 800+ business owners
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </motion.div>

      <style jsx global>{`
        @keyframes gradientshift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
