import { faqs } from "@/lib/marketing-copy";

export function FaqGrid({ items = faqs }: { items?: typeof faqs }) {
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.q}
          className="flex min-w-0 gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-violet-300">
            <item.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{item.q}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
