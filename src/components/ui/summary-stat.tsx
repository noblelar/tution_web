export function SummaryStat({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className="flex h-6 min-w-6 cursor-default select-none items-center justify-center rounded-full bg-orange-600 px-2 text-xs font-black text-white"
        title={tooltip}
      >
        {value}
      </dd>
    </div>
  );
}
