import { Check, Users } from "lucide-react";
import { fmtNgn, fmtUsdt, periodLabel, usdtNum } from "@/lib/format";
import type { Plan } from "@/lib/hooks";
import { AddressAvatar, PlanCover, btn } from "./ui";

export function PlanCard({ plan, rate, subscribed, onSubscribe, preview }: { plan: Plan; rate: number; subscribed?: boolean; onSubscribe?: () => void; preview?: boolean }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="relative">
        <PlanCover name={plan.name || "New plan"} image={plan.image} className="aspect-[16/9] w-full" />
        <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur">{plan.category}</span>
        {subscribed && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-brand px-2 py-0.5 text-[11px] font-semibold text-bg">
            <Check className="h-3 w-3" strokeWidth={3} /> Subscribed
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug">{plan.name || "Plan name"}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{plan.desc || "Describe what subscribers get."}</p>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="num text-2xl font-semibold">{fmtUsdt(plan.price)}</span>
          <span className="text-sm text-muted">USDT / {periodLabel(plan.period)}</span>
        </div>
        <div className="num text-xs text-subtle">≈ {fmtNgn(usdtNum(plan.price), rate)}</div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-subtle">
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{plan.subscriberCount} active</span>
          <span className="inline-flex items-center gap-1.5"><AddressAvatar address={plan.merchant} size={14} /><span className="num">{plan.merchant.slice(0, 6)}</span></span>
        </div>

        {!preview && (
          <button className={`${subscribed ? btn.secondary : btn.primary} mt-4 w-full`} disabled={subscribed} onClick={onSubscribe}>
            {subscribed ? "You're subscribed" : "Subscribe"}
          </button>
        )}
      </div>
    </article>
  );
}
