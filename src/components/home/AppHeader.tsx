import Link from "next/link";
import { Sparkles, Zap } from "lucide-react";
import { Heartbar } from "@/components/Heartbar";
import { StreakBadge } from "@/components/StreakBadge";

export function AppHeader({ xp, hearts, streak }: { xp: number; hearts: number; streak: number }) {
  return (
    <header className="border-b border-sky-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
            <Sparkles size={20} aria-hidden />
          </div>
          <span className="text-xl font-black tracking-tight">
            lingua<span className="text-brand">flow</span>
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <StreakBadge days={streak} />
          <Heartbar hearts={hearts} />
          <span className="hidden items-center gap-1 font-black text-cyan-600 sm:flex">
            <Zap size={18} fill="currentColor" aria-hidden /> {xp} XP
          </span>
          <Link href="/login" className="touch-target inline-flex items-center rounded-full bg-slate-900 px-4 text-xs font-black text-white">
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
