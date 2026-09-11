export function LoadingState({ label = "Wird geladen …" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-4 py-16 text-slate-400">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand" aria-hidden />
      <p className="text-sm font-bold">{label}</p>
    </div>
  );
}
