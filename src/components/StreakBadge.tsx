import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";

export function StreakBadge({ days, className }: { days: number; className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-1 font-black text-orange-500", className)}
      role="status"
      aria-label={`${days} Tage Streak`}
    >
      <Flame size={19} fill={days > 0 ? "currentColor" : "none"} aria-hidden />
      {days}
    </span>
  );
}
