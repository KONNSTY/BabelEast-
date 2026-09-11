import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type EmptyStateProps = {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-sm">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-sky-50 text-brand">
        {icon ?? <Sparkles size={26} aria-hidden />}
      </div>
      <div>
        <h2 className="font-black text-slate-900">{title}</h2>
        {message && <p className="mt-1 text-sm font-medium text-slate-500">{message}</p>}
      </div>
      {action}
    </div>
  );
}
