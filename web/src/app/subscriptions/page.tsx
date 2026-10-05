"use client";

import { AlertTriangle, CalendarClock, CircleDollarSign, Gauge, Inbox, Info, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { erc20Abi } from "viem";
import { useConnection } from "wagmi";
import { ConnectButton } from "@/components/Navbar";
import { Empty, Kpi, Modal, PlanCover, Skeleton, StatusBadge, btn, card, input } from "@/components/ui";
import { SUBSAFE_ADDRESS, USDT_ADDRESS } from "@/lib/contract";
import { fmtNgn, fmtUsdt, perMonth, periodLabel, timeLeft, toUsdt, usdtNum } from "@/lib/format";
import { subsafe, useMySubs, useNgnRate, useNow, usePlans, useTx, useWallet, type Plan, type Sub } from "@/lib/hooks";

export default function MySubscriptions() {
  const { isConnected } = useConnection();
  const { data: subs = [], isLoading } = useMySubs();
  const { data: plans = [] } = usePlans();
  const { data: wallet } = useWallet();
  const rate = useNgnRate();
  const now = useNow();
  const { send, busy } = useTx();
  const [capOpen, setCapOpen] = useState(false);
  const [cancelling, setCancelling] = useState<Sub | null>(null);

  if (!isConnected)
    return (
      <div className="py-16">
        <Empty icon={Wallet} title="Connect your wallet">
          <p className="mb-5">See your subscriptions, upcoming charges and spending cap.</p>
          <ConnectButton />
        </Empty>
      </div>
    );

  const live = subs.filter((s) => s.status === 1 || s.status === 2).sort((a, b) => a.paidUntil - b.paidUntil);
  const past = subs.filter((s) => s.status === 3).sort((a, b) => b.id - a.id);
  const monthly = live.reduce((a, s) => a + perMonth(s.price, s.period), 0);
  const next = live[0];
  const cap = wallet ? usdtNum(wallet.allowance) : 0;
  const unlimited = cap > 1e9;

  return (
    <div className="py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted">Everything you pay for, billed from your wallet.</p>
        </div>
        <button className={btn.secondary} onClick={() => setCapOpen(true)}><Gauge className="h-4 w-4" /> Spending cap</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Monthly spend" icon={CircleDollarSign} value={`${monthly.toFixed(2)}`} sub={`USDT · ≈ ${fmtNgn(monthly, rate)}`} />
        <Kpi label="Next charge" icon={CalendarClock} value={next ? timeLeft(next.paidUntil, now).replace("in ", "") : "–"} sub={next ? plans[next.planId]?.name : "Nothing scheduled"} />
        <Kpi label="Cap runway" icon={Gauge} value={unlimited ? "∞" : monthly ? `${(cap / monthly).toFixed(1)} mo` : "–"} sub={unlimited ? "Unlimited approval" : `${cap.toFixed(2)} USDT approved`} />
        <Kpi label="Wallet balance" icon={Wallet} value={wallet ? fmtUsdt(wallet.balance) : "–"} sub="USDT" />
      </div>

      <Insights live={live} plans={plans} wallet={wallet} rate={rate} now={now} monthly={monthly} />

      <h2 className="mb-3 mt-10 text-sm font-medium text-muted">Active · {live.length}</h2>
      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !live.length ? (
        <Empty icon={Inbox} title="No active subscriptions">
          Find something on the <Link href="/" className="text-fg underline underline-offset-4">Explore</Link> page.
        </Empty>
      ) : (
        <div className="space-y-3">
          {live.map((s) => (
            <SubRow key={s.id} s={s} plan={plans[s.planId]} rate={rate} now={now} busy={!!busy}
              onRenew={() => send("Renewing", { ...subsafe, functionName: "charge", args: [BigInt(s.id)] })}
              onCancel={() => setCancelling(s)} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-medium text-muted">Cancelled · {past.length}</h2>
          <div className="space-y-3 opacity-70">
            {past.map((s) => <SubRow key={s.id} s={s} plan={plans[s.planId]} rate={rate} now={now} busy />)}
          </div>
        </>
      )}

      <CapModal open={capOpen} onClose={() => setCapOpen(false)} current={wallet?.allowance ?? 0n} monthly={monthly} />

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Cancel subscription?">
        {cancelling && (
          <>
            <p className="text-sm leading-relaxed text-muted">
              You won&apos;t be charged for <span className="text-fg">{plans[cancelling.planId]?.name}</span> again.
              {cancelling.paidUntil > now && <> You keep access until <span className="text-fg">{new Date(cancelling.paidUntil * 1000).toLocaleString()}</span>.</>}
            </p>
            <div className="mt-6 flex gap-2">
              <button className={`${btn.secondary} flex-1`} onClick={() => setCancelling(null)}>Keep it</button>
              <button className={`${btn.danger} flex-1`} disabled={!!busy}
                onClick={async () => { if (await send("Cancelling", { ...subsafe, functionName: "cancel", args: [BigInt(cancelling.id)] })) setCancelling(null); }}>
                {busy ? `${busy}…` : "Cancel subscription"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function SubRow({ s, plan, rate, now, busy, onRenew, onCancel }: { s: Sub; plan?: Plan; rate: number; now: number; busy: boolean; onRenew?: () => void; onCancel?: () => void }) {
  const live = s.status === 1 || s.status === 2;
  const due = live && s.paidUntil <= now;
  const elapsed = Math.min(1, Math.max(0, 1 - (s.paidUntil - now) / s.period));
  return (
    <div className={`${card} flex flex-col gap-4 p-4 sm:flex-row sm:items-center`}>
      <PlanCover name={plan?.name ?? "Plan"} image={plan?.image} className="h-14 w-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{plan?.name ?? `Plan #${s.planId}`}</span>
          <StatusBadge status={s.status} due={due} />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span><span className="num text-fg">{fmtUsdt(s.price)} USDT</span> / {periodLabel(s.period)} <span className="num text-subtle">≈ {fmtNgn(usdtNum(s.price), rate)}</span></span>
          <span>Paid <span className="num text-fg">{s.chargeCount}×</span></span>
          <span>Since {new Date(s.startedAt * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        {live && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={`h-full rounded-full ${due ? "bg-warn" : "bg-brand"}`} style={{ width: `${elapsed * 100}%` }} />
            </div>
            <span className={`num shrink-0 text-xs ${due ? "text-warn" : "text-subtle"}`}>{due ? "Due now" : `Renews ${timeLeft(s.paidUntil, now)}`}</span>
          </div>
        )}
        {s.status === 3 && <div className="mt-1 text-xs text-subtle">{s.paidUntil > now ? `Access until ${new Date(s.paidUntil * 1000).toLocaleDateString()}` : "Ended"}</div>}
      </div>
      {live && (
        <div className="flex gap-2 sm:flex-col lg:flex-row">
          {due && <button className={`${btn.primary} ${btn.sm}`} disabled={busy} onClick={onRenew}>Pay now</button>}
          <button className={`${btn.ghost} ${btn.sm}`} disabled={busy} onClick={onCancel}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function Insights({ live, plans, wallet, rate, now, monthly }: { live: Sub[]; plans: Plan[]; wallet?: { balance: bigint; allowance: bigint }; rate: number; now: number; monthly: number }) {
  if (!live.length) return null;
  const items: { tone: "warn" | "info"; text: React.ReactNode }[] = [];
  const bal = wallet ? usdtNum(wallet.balance) : 0;
  const cap = wallet ? usdtNum(wallet.allowance) : 0;
  const upcoming = live.filter((s) => s.paidUntil < now + 7 * 86_400);
  const upcomingSum = upcoming.reduce((a, s) => a + usdtNum(s.price), 0);
  const pastDue = live.filter((s) => s.status === 2).length;
  const top = [...live].sort((a, b) => perMonth(b.price, b.period) - perMonth(a.price, a.period))[0];

  if (pastDue) items.push({ tone: "warn", text: <>{pastDue} subscription{pastDue > 1 ? "s are" : " is"} past due and access is paused. Use <b>Pay now</b> to restore it.</> });
  if (wallet && bal < upcomingSum) items.push({ tone: "warn", text: <>Your balance (<span className="num">{bal.toFixed(2)}</span> USDT) won&apos;t cover the <span className="num">{upcomingSum.toFixed(2)}</span> USDT due this week.</> });
  if (wallet && cap < upcomingSum) items.push({ tone: "warn", text: <>Your spending cap is lower than this week&apos;s charges. Raise it so renewals don&apos;t fail.</> });
  if (upcoming.length) items.push({ tone: "info", text: <>{upcoming.length} renewal{upcoming.length > 1 ? "s" : ""} this week, totalling <span className="num text-fg">{upcomingSum.toFixed(2)} USDT</span>.</> });
  items.push({ tone: "info", text: <>That&apos;s <span className="num text-fg">{(monthly * 12).toFixed(2)} USDT</span> a year, or about {fmtNgn(monthly * 12, rate)}.</> });
  if (top && live.length > 1) items.push({ tone: "info", text: <><span className="text-fg">{plans[top.planId]?.name}</span> is your largest cost at <span className="num">{perMonth(top.price, top.period).toFixed(2)}</span> USDT/month.</> });

  return (
    <div className={`${card} mt-3 p-4`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-brand" /> Insights
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-muted">
            {it.tone === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />}
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CapModal({ open, onClose, current, monthly }: { open: boolean; onClose: () => void; current: bigint; monthly: number }) {
  const { send, busy } = useTx();
  const [v, setV] = useState("");
  const presets = monthly > 0 ? [3, 6, 12].map((m) => ({ label: `${m} months`, value: (monthly * m).toFixed(2) })) : [{ label: "25", value: "25" }, { label: "50", value: "50" }, { label: "100", value: "100" }];

  async function save(amount: string) {
    if (await send(Number(amount) === 0 ? "Revoking access" : "Updating cap", { address: USDT_ADDRESS, abi: erc20Abi, functionName: "approve", args: [SUBSAFE_ADDRESS, toUsdt(Number(amount) || 0)] })) onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Spending cap">
      <p className="text-sm leading-relaxed text-muted">
        The total USDT SubSafe may pull across all your subscriptions. Currently <span className="num text-fg">{current > 10n ** 15n ? "unlimited" : `${fmtUsdt(current)} USDT`}</span>.
      </p>
      <label className="mt-5 block text-[13px] font-medium text-muted">
        New cap (USDT)
        <input className={`${input} num`} type="number" min="0" step="0.01" placeholder="0.00" value={v} onChange={(e) => setV(e.target.value)} />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p.label} className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-muted hover:text-fg" onClick={() => setV(p.value)}>{p.label}</button>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <button className={`${btn.danger} flex-1`} disabled={!!busy} onClick={() => save("0")}>Revoke all</button>
        <button className={`${btn.primary} flex-1`} disabled={!!busy || v === ""} onClick={() => save(v)}>{busy ? `${busy}…` : "Save cap"}</button>
      </div>
    </Modal>
  );
}
