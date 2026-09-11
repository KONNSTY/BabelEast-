import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";

const MAX_HEARTS = 5;

export function Heartbar({ hearts, className }: { hearts: number; className?: string }) {
  const filled = Math.max(0, Math.min(MAX_HEARTS, hearts));
  return (
    <div
      className={cn("flex items-center gap-1 font-black text-danger", className)}
      role="img"
      aria-label={`${filled} von ${MAX_HEARTS} Herzen übrig`}
    >
      {Array.from({ length: MAX_HEARTS }, (_, index) => (
        <Heart
          key={index}
          size={18}
          fill={index < filled ? "currentColor" : "none"}
          className={index < filled ? "text-danger" : "text-slate-200"}
          aria-hidden
        />
      ))}
    </div>
  );
}
