"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

function getScoreColor(score: number) {
  if (score >= 75) return { text: "text-emerald-400", ring: "stroke-emerald-400", glow: "shadow-[0_0_50px_rgba(52,211,153,0.3)]", label: "Great", labelClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" };
  if (score >= 55) return { text: "text-amber-400", ring: "stroke-amber-400", glow: "shadow-[0_0_50px_rgba(251,191,36,0.3)]", label: "Needs Work", labelClass: "bg-amber-500/10 text-amber-300 border-amber-500/20" };
  return { text: "text-red-400", ring: "stroke-red-400", glow: "shadow-[0_0_50px_rgba(248,113,113,0.3)]", label: "Critical", labelClass: "bg-red-500/10 text-red-300 border-red-500/20" };
}

const recommendations = [
  { ok: true,  text: "Google Business Profile is claimed" },
  { ok: false, text: "NAP consistency across all directories" },
  { ok: false, text: "Missing citations on Yelp, Bing Places" },
  { ok: true,  text: "Website mobile-friendly" },
  { ok: false, text: "No customer reviews in the last 30 days" },
  { ok: true,  text: "Business hours are up to date" },
];

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const businessName = params.get("businessName") ?? "Your Business";
  const city = params.get("city") ?? "Unknown City";
  const score = Number(params.get("score") ?? 0);
  const { text, ring, glow, label, labelClass } = getScoreColor(score);

  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#04080f] text-neutral-100 font-sans selection:bg-[#0066FF]/30">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#0066FF]/6 rounded-full blur-[130px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 sticky top-0 border-b border-white/[0.06] bg-[#04080f]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-[66px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#003DB3] flex items-center justify-center shadow-[0_0_16px_rgba(0,102,255,0.5)]">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[17px] text-white tracking-tight">
              Geo<span className="text-[#0066FF]">Sentinel</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#4D94FF] hover:text-white transition-colors flex items-center gap-1.5">
            Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 flex flex-col gap-8">

        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest mb-5 ${labelClass}`}>
            {score >= 75 ? <Trophy className="w-3.5 h-3.5" /> : score >= 55 ? <TrendingUp className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {label}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Audit Complete</h1>
          <p className="text-neutral-400">
            <span className="text-white font-semibold">{businessName}</span> · {city}
          </p>
        </div>

        {/* Score Card */}
        <div className={`bg-[#080d17] border border-white/[0.07] rounded-3xl p-10 flex flex-col items-center gap-6 ${glow} transition-all`}>
          {/* Circular progress */}
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={`${ring} transition-all duration-1000`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${text}`}>{score}</span>
              <span className="text-xs text-neutral-500 font-medium">/ 100</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-bold text-white mb-1">Local SEO Score</p>
            <p className="text-sm text-neutral-500 max-w-xs">
              {score >= 75
                ? "Your business is performing strongly in local search. Keep maintaining your presence."
                : score >= 55
                ? "There's solid room for improvement. Address the issues below to climb the rankings."
                : "Urgent action needed. Your competitors are outranking you in local search right now."}
            </p>
          </div>

          {/* Sub-metrics */}
          <div className="grid grid-cols-3 gap-4 w-full pt-4 border-t border-white/[0.06]">
            {[
              { icon: BarChart3, label: "Citations", value: `${Math.floor(score * 0.7)}%` },
              { icon: TrendingUp, label: "Rankings", value: `${Math.floor(score * 0.85)}%` },
              { icon: Trophy, label: "Reviews", value: `${Math.floor(score * 0.6)}%` },
            ].map(({ icon: Icon, label: l, value }) => (
              <div key={l} className="flex flex-col items-center gap-2 text-center">
                <Icon className="w-4 h-4 text-neutral-500" />
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-neutral-600 uppercase tracking-wide">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-[#080d17] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0066FF]" />
            Action Items
          </h2>
          <ul className="space-y-3">
            {recommendations.map(({ ok, text: t }) => (
              <li key={t} className="flex items-center gap-3 text-sm">
                {ok
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <span className={ok ? "text-neutral-300" : "text-neutral-400"}>{t}</span>
                {!ok && <span className="ml-auto text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold">Fix</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_0_24px_rgba(0,102,255,0.35)] hover:shadow-[0_0_36px_rgba(0,102,255,0.55)] text-sm"
          >
            View All Audits in Dashboard <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-200 font-semibold py-3.5 px-6 rounded-xl transition-all text-sm"
          >
            Run Another Audit
          </button>
        </div>

      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#04080f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0066FF]/30 border-t-[#0066FF] rounded-full animate-spin" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
