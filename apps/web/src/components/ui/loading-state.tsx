export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-zinc-400">
      <span className="h-3 w-3 animate-pulse rounded-full bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.8)]" />
      {label}
    </div>
  );
}
