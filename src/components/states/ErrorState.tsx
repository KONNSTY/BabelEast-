import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "Das hat nicht geklappt.", message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-sm">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-danger">
        <AlertTriangle size={26} aria-hidden />
      </div>
      <div>
        <h2 className="font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Erneut versuchen
        </Button>
      )}
    </div>
  );
}
