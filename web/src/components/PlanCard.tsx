import { fmtNgn, fmtUsdt, periodLabel, short, usdtNum } from "@/lib/format";
import type { Plan } from "@/lib/hooks";
import { btn } from "./ui";

const EMOJI = ["🎬", "🎵", "📚", "🎮", "🏋️", "☁️", "🍔", "📰", "🎓", "🎙️"];
const GRADS = ["from-emerald-800 to-cyan-950", "from-purple-800 to-indigo-950", "from-orange-800 to-stone-950", "from-blue-800 to-slate-950", "from-pink-800 to-rose-950"];

export function PlanCard({ plan, rate, subscribed, onSubscribe }: { plan: Plan; rate: number; subscribed: boolean; onSubscribe: () => void }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 transition hover:-translate-y-1 hover:border-white/20">
      {plan.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={plan.image} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className={`flex h-32 items-end bg-gradient-to-br p-3 text-4xl ${GRADS[plan.id % GRADS.length]}`}>{EMOJI[plan.id % EMOJI.length]}</div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{plan.name}</h3>
          {subscribed && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">Subscribed</span>}
        </div>
        <p className="flex-1 text-sm leading-relaxed text-zinc-400">{plan.desc}</p>
        <div className="text-xl font-extrabold">
          {fmtUsdt(plan.price)} USDT <span className="text-sm font-medium text-zinc-400">/ {periodLabel(plan.period)}</span>
        </div>
        <div className="text-xs text-zinc-500">
          ≈ {fmtNgn(usdtNum(plan.price), rate)} · {plan.subscriberCount} subscriber{plan.subscriberCount === 1 ? "" : "s"} · by {short(plan.merchant)}
        </div>
        <button className={subscribed ? btn.ghost : btn.primary} disabled={subscribed} onClick={onSubscribe}>
          {subscribed ? "Active" : "Subscribe"}
        </button>
      </div>
    </div>
  );
}
