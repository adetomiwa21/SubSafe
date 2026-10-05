"use client";

import { Activity, CircleDollarSign, Layers, Pause, Play, Plus, RefreshCw, Repeat, Users, Zap } from "lucide-react";
import { useState } from "react";
import { parseEventLogs } from "viem";
import { useConnection } from "wagmi";
import { ConnectButton } from "@/components/Navbar";
import { PlanCard } from "@/components/PlanCard";
import { AddressAvatar, Empty, Kpi, PlanCover, btn, card, input, label } from "@/components/ui";
import { EXPLORER } from "@/lib/chain";
import { SUBSAFE_ABI } from "@/lib/contract";
import { CATEGORIES, fmtUsdt, perMonth, periodLabel, short, toUsdt } from "@/lib/format";
import { DEPLOYED, subsafe, useAllSubs, useDueSubs, useNgnRate, useNow, usePlans, useTx, type Plan, type Sub } from "@/lib/hooks";

const MAX_UINT96 = (1n << 96n) - 1n;
const PERIODS = [
  { v: 2_592_000, l: "Monthly" },
  { v: 604_800, l: "Weekly" },
  { v: 86_400, l: "Daily" },
  { v: 300, l: "Every 5 min (demo)" },
  { v: 60, l: "Every minute (demo)" },
];

export default function Studio() {
  const { address, isConnected } = useConnection();
  const { data: plans = [] } = usePlans();
  const { data: all = [] } = useAllSubs();
  const now = useNow();
  const mine = plans.filter((p) => address && p.merchant.toLowerCase() === address.toLowerCase());
  const ids = new Set(mine.map((p) => p.id));
  const mySubs = all.filter((s) => ids.has(s.planId));
  const activeSubs = mySubs.filter((s) => (s.status === 1 || s.status === 2) && s.paidUntil > now);
  const revenue = mySubs.reduce((a, s) => a + s.price * BigInt(s.chargeCount), 0n);
  const mrr = activeSubs.reduce((a, s) => a + perMonth(s.price, s.period), 0);

  return (
    <div className="py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Creator Studio</h1>
        <p className="mt-1 text-sm text-muted">Publish plans, track revenue and collect renewals.</p>
      </div>

      {isConnected && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Monthly recurring" icon={Repeat} value={mrr.toFixed(2)} sub="USDT / month" />
          <Kpi label="Total revenue" icon={CircleDollarSign} value={fmtUsdt(revenue)} sub="USDT, before 1% fee" />
          <Kpi label="Active subscribers" icon={Users} value={activeSubs.length} sub={`${mySubs.length} all-time`} />
          <Kpi label="Plans" icon={Layers} value={mine.length} sub={`${mine.filter((p) => p.active).length} live`} />
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-6">
          <CreatePlan />
          <Keeper />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Your plans</h2>
          {!isConnected ? (
            <Empty icon={Layers} title="Connect your wallet">
              <p className="mb-5">Your plans and subscribers show up here.</p>
              <ConnectButton />
            </Empty>
          ) : !mine.length ? (
            <Empty icon={Plus} title="No plans yet">Publish your first plan with the form. It goes live immediately.</Empty>
          ) : (
            <div className="space-y-3">{mine.map((p) => <MerchantPlan key={p.id} plan={p} subs={mySubs.filter((s) => s.planId === p.id)} now={now} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreatePlan() {
  const { address, isConnected } = useConnection();
  const rate = useNgnRate();
  const { send, busy } = useTx();
  const blank = { name: "", desc: "", image: "", category: "Entertainment", price: "", period: 2_592_000 };
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const price = Number(f.price) > 0 ? toUsdt(f.price) : 0n;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (price === 0n || price > MAX_UINT96) return;
    const meta = JSON.stringify({ desc: f.desc, image: f.image, category: f.category });
    if (await send("Publishing plan", { ...subsafe, functionName: "createPlan", args: [f.name, meta, price, Number(f.period)] })) setF(blank);
  }

  const preview: Plan = {
    id: 0, merchant: address ?? "0x0000000000000000000000000000000000000000", price, period: Number(f.period), active: true,
    subscriberCount: 0, name: f.name, desc: f.desc, image: f.image, category: f.category,
  };

  return (
    <form className={`${card} p-5`} onSubmit={submit}>
      <h2 className="font-semibold">New plan</h2>
      <p className="mt-0.5 text-sm text-muted">Price and billing period can&apos;t be changed after publishing.</p>

      <div className="mt-5 space-y-4">
        <label className={label}>
          Name
          <input className={input} required maxLength={60} placeholder="NaijaFlix Premium" value={f.name} onChange={set("name")} />
        </label>
        <label className={label}>
          Description
          <textarea className={`${input} min-h-20 resize-none`} maxLength={200} placeholder="HD Nollywood films and series, new releases every Friday." value={f.desc} onChange={set("desc")} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Price (USDT)
            <input className={`${input} num`} type="number" step="0.01" min="0.01" required placeholder="5.00" value={f.price} onChange={set("price")} />
          </label>
          <label className={label}>
            Billing
            <select className={input} value={f.period} onChange={set("period")}>
              {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Category
            <select className={input} value={f.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className={label}>
            Cover image URL
            <input className={input} type="url" placeholder="Optional" value={f.image} onChange={set("image")} />
          </label>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Preview</div>
        <div className="max-w-[300px]"><PlanCard plan={preview} rate={rate} preview /></div>
      </div>

      <div className="mt-6">
        {isConnected ? (
          <button className={`${btn.primary} w-full`} type="submit" disabled={!!busy || !DEPLOYED}>{busy ? `${busy}…` : "Publish plan"}</button>
        ) : (
          <ConnectButton className="w-full" />
        )}
      </div>
    </form>
  );
}

function MerchantPlan({ plan, subs, now }: { plan: Plan; subs: Sub[]; now: number }) {
  const { send, busy } = useTx();
  const due = subs.filter((s) => (s.status === 1 || s.status === 2) && s.paidUntil <= now);
  const revenue = subs.reduce((a, s) => a + s.price * BigInt(s.chargeCount), 0n);
  const toggle = () =>
    send(plan.active ? "Pausing plan" : "Resuming plan", {
      ...subsafe, functionName: "updatePlan",
      args: [BigInt(plan.id), !plan.active, JSON.stringify({ desc: plan.desc, image: plan.image, category: plan.category })],
    });

  return (
    <div className={card}>
      <div className="flex items-center gap-4 p-4">
        <PlanCover name={plan.name} image={plan.image} className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{plan.name}</span>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${plan.active ? "bg-brand" : "bg-subtle"}`} title={plan.active ? "Live" : "Paused"} />
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            <span className="num text-fg">{fmtUsdt(plan.price)} USDT</span> / {periodLabel(plan.period)} · {plan.category}
          </div>
        </div>
        <button className={`${btn.ghost} ${btn.sm}`} onClick={toggle} disabled={!!busy} title={plan.active ? "Pause new sign-ups" : "Resume"}>
          {plan.active ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
        </button>
      </div>
      <div className="grid grid-cols-3 border-t border-line text-center">
        <Cell label="Active" value={plan.subscriberCount} />
        <Cell label="Revenue" value={fmtUsdt(revenue)} />
        <Cell label="Due now" value={due.length} highlight={due.length > 0} />
      </div>
      {(subs.length > 0 || due.length > 0) && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="flex items-center -space-x-1.5">
            {subs.slice(0, 6).map((s) => <AddressAvatar key={s.id} address={s.subscriber} size={22} />)}
            {subs.length > 6 && <span className="num pl-3 text-xs text-subtle">+{subs.length - 6}</span>}
          </div>
          {due.length > 0 && (
            <button className={`${btn.brand} ${btn.sm}`} disabled={!!busy} onClick={() => send(`Collecting ${due.length}`, { ...subsafe, functionName: "chargeMany", args: [due.map((s) => BigInt(s.id))] })}>
              <Zap className="h-3.5 w-3.5" /> Collect {due.length}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="border-r border-line px-2 py-3 last:border-r-0">
      <div className={`num text-sm font-semibold ${highlight ? "text-warn" : ""}`}>{value}</div>
      <div className="text-[11px] text-subtle">{label}</div>
    </div>
  );
}

/** Anyone can run the keeper. The contract only charges what's due, at the locked price. */
function Keeper() {
  const { isConnected } = useConnection();
  const { data, refetch, isFetching } = useDueSubs();
  const { send, busy } = useTx();
  const [log, setLog] = useState<{ hash: string; ok: number; failed: string[] } | null>(null);

  async function run() {
    if (!data?.due.length) return;
    const rcpt = await send("Running keeper", { ...subsafe, functionName: "chargeMany", args: [data.due.slice(0, 50)] });
    if (!rcpt) return;
    const events = parseEventLogs({ abi: SUBSAFE_ABI, logs: rcpt.logs });
    setLog({
      hash: rcpt.transactionHash,
      ok: events.filter((e) => e.eventName === "Charged").length,
      failed: events.flatMap((e) => (e.eventName === "ChargeFailed" ? [`#${e.args.subId} ${short(e.args.subscriber)}: ${e.args.reason}`] : [])),
    });
  }

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-brand" /> Keeper</h2>
        <button className={`${btn.ghost} ${btn.sm}`} onClick={() => refetch()} disabled={isFetching} aria-label="Rescan">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Renewals are permissionless. Anyone can trigger them, and wallets that can&apos;t pay are marked past due instead of blocking everyone else.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-bg px-4 py-3">
        <div>
          <div className="num text-xl font-semibold">{data ? data.due.length : "–"}</div>
          <div className="text-xs text-subtle">due of {data?.total ?? "–"} subscriptions</div>
        </div>
        {isConnected ? (
          <button className={btn.primary} onClick={run} disabled={!!busy || !data?.due.length}>{busy ? `${busy}…` : "Charge all due"}</button>
        ) : (
          <ConnectButton />
        )}
      </div>
      {log && (
        <div className="fade-up mt-3 space-y-1 rounded-lg border border-line bg-bg p-3 text-xs">
          <div className="flex justify-between text-muted">
            <span>Charged <span className="num text-brand">{log.ok}</span> · Past due <span className="num text-warn">{log.failed.length}</span></span>
            <a className="num text-subtle hover:text-fg" href={`${EXPLORER}/tx/${log.hash}`} target="_blank" rel="noopener noreferrer">{short(log.hash)} ↗</a>
          </div>
          {log.failed.map((f) => <div key={f} className="num text-subtle">{f}</div>)}
        </div>
      )}
    </div>
  );
}
