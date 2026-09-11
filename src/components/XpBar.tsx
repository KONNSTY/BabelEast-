import { cn } from "@/lib/cn";

type XpBarProps = {
  current: number;
  goal: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
};

export function XpBar({ current, goal, className, trackClassName, barClassName }: XpBarProps) {
  const percent = goal > 0 ? Math.max(0, Math.min(100, Math.round((current / goal) * 100))) : 0;
  return (
    <div
      className={cn("h-3 w-full overflow-hidden rounded-full bg-slate-100", trackClassName, className)}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-label={`${current} von ${goal} XP`}
    >
      <div
        className={cn("h-full rounded-full bg-brand transition-[width] duration-300", barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
