"use client";

import { useState } from "react";
import { parseEventLogs } from "viem";
import { useConnection } from "wagmi";
import { ConnectButton } from "@/components/Navbar";
import { Empty, btn, card, input } from "@/components/ui";
import { SUBSAFE_ABI } from "@/lib/contract";
import { fmtNgn, fmtUsdt, periodLabel, short, toUsdt } from "@/lib/format";
import { DEPLOYED, useNow, subsafe, useDueSubs, useNgnRate, usePlanSubs, usePlans, useTx, type Plan } from "@/lib/hooks";

const MAX_UINT96 = (1n << 96n) - 1n;
const PERIODS = [
  { v: 2_592_000, l: "Monthly (30 days)" },
  { v: 604_800, l: "Weekly" },
  { v: 86_400, l: "Daily" },
  { v: 300, l: "Every 5 min (demo)" },
  { v: 60, l: "Every 1 min (demo)" },
];

export default function Studio() {
  const { address, isConnected } = useConnection();
  const { data: plans = [] } = usePlans();
  const mine = plans.filter((p) => address && p.merchant.toLowerCase() === address.toLowerCase());

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-6">
        <CreatePlan />
        <Keeper />
      </div>
      <div>
        <h2 className="mb-4 text-2xl font-bold">Your plans</h2>
        {!isConnected ? (
          <Empty>
            <p className="mb-4">Connect your wallet to manage your plans.</p>
            <ConnectButton />
          </Empty>
        ) : !mine.length ? (
          <Empty>You haven&apos;t published any plans yet.</Empty>
        ) : (
          <div className="flex flex-col gap-3">{mine.map((p) => <MerchantPlan key={p.id} plan={p} />)}</div>
        )}
      </div>
    </div>
  );
}

function CreatePlan() {
  const { isConnected } = useConnection();
  const rate = useNgnRate();
  const { send, busy } = useTx();
  const [f, setF] = useState({ name: "", desc: "", image: "", price: "", period: 2_592_000 });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = toUsdt(f.price || 0);
    if (price === 0n || price > MAX_UINT96) return;
    const meta = JSON.stringify({ desc: f.desc, image: f.image });
    const ok = await send("Publishing plan", { ...subsafe, functionName: "createPlan", args: [f.name, meta, price, Number(f.period)] });
    if (ok) setF({ name: "", desc: "", image: "", price: "", period: 2_592_000 });
  }

  return (
    <form className={card} onSubmit={submit}>
      <h2 className="mb-4 text-2xl font-bold">Create a plan</h2>
      <label className="mb-3 block text-sm text-zinc-400">
        Plan name
        <input className={input} required maxLength={60} placeholder="e.g. NaijaFlix Premium" value={f.name} onChange={set("name")} />
      </label>
      <label className="mb-3 block text-sm text-zinc-400">
        Description
        <textarea className={`${input} min-h-20`} maxLength={240} placeholder="What subscribers get" value={f.desc} onChange={set("desc")} />
      </label>
      <label className="mb-3 block text-sm text-zinc-400">
        Cover image URL (optional)
        <input className={input} type="url" placeholder="https://…" value={f.image} onChange={set("image")} />
      </label>
      <div className="mb-2 grid grid-cols-2 gap-3">
        <label className="block text-sm text-zinc-400">
          Price (USDT)
          <input className={input} type="number" step="0.01" min="0.01" required placeholder="5" value={f.price} onChange={set("price")} />
        </label>
        <label className="block text-sm text-zinc-400">
          Billing period
          <select className={input} value={f.period} onChange={set("period")}>
            {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </label>
      </div>
      <p className="mb-4 h-5 text-xs text-zinc-500">{Number(f.price) > 0 && `≈ ${fmtNgn(Number(f.price), rate)} per period for Nigerian subscribers`}</p>
      {isConnected ? (
        <button className={`${btn.primary} w-full`} type="submit" disabled={!!busy || !DEPLOYED}>{busy ?? "Publish plan"}</button>
      ) : (
        <ConnectButton className="w-full" />
      )}
    </form>
  );
}

function MerchantPlan({ plan }: { plan: Plan }) {
  const { data: subs = [] } = usePlanSubs(plan.id);
  const { send, busy } = useTx();
  const now = useNow();
  const due = subs.filter((s) => (s.status === 1 || s.status === 2) && s.paidUntil <= now);
  const revenue = subs.reduce((a, s) => a + s.price * BigInt(s.chargeCount), 0n);

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2 font-semibold">
            {plan.name}
            <span className={`rounded-full border px-2.5 py-0.5 text-xs ${plan.active ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-zinc-400"}`}>
              {plan.active ? "Live" : "Paused"}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
            <span><b className="text-zinc-200">{fmtUsdt(plan.price)} USDT</b> / {periodLabel(plan.period)}</span>
            <span>active <b className="text-zinc-200">{plan.subscriberCount}</b> ({subs.length} all-time)</span>
            <span>revenue <b className="text-zinc-200">{fmtUsdt(revenue)} USDT</b></span>
            <span>due now <b className="text-zinc-200">{due.length}</b></span>
          </div>
        </div>
        <div className="flex gap-2">
          {due.length > 0 && (
            <button className={btn.primary} disabled={!!busy} onClick={() => send(`Charging ${due.length}`, { ...subsafe, functionName: "chargeMany", args: [due.map((s) => BigInt(s.id))] })}>
              Charge {due.length} due
            </button>
          )}
          <button
            className={btn.ghost}
            disabled={!!busy}
            onClick={() => send(plan.active ? "Pausing" : "Resuming", { ...subsafe, functionName: "updatePlan", args: [BigInt(plan.id), !plan.active, JSON.stringify({ desc: plan.desc, image: plan.image })] })}
          >
            {plan.active ? "Pause" : "Resume"}
          </button>
        </div>
      </div>
      {subs.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3 text-xs text-zinc-500">
          Subscribers: {subs.slice(0, 6).map((s) => short(s.subscriber)).join(", ")}{subs.length > 6 && ` +${subs.length - 6} more`}
        </div>
      )}
    </div>
  );
}

/** Anyone can run the keeper. The contract only charges what is actually due, at the locked price. */
function Keeper() {
  const { isConnected } = useConnection();
  const { data, refetch, isFetching } = useDueSubs();
  const { send, busy } = useTx();
  const [log, setLog] = useState("");

  async function run() {
    if (!data?.due.length) return;
    const rcpt = await send("Running keeper", { ...subsafe, functionName: "chargeMany", args: [data.due.slice(0, 50)] });
    if (!rcpt) return;
    const events = parseEventLogs({ abi: SUBSAFE_ABI, logs: rcpt.logs });
    const ok = events.filter((e) => e.eventName === "Charged").length;
    const failed = events.flatMap((e) => (e.eventName === "ChargeFailed" ? [`#${e.args.subId} ${short(e.args.subscriber)}: ${e.args.reason}`] : []));
    setLog(`tx ${rcpt.transactionHash}\n✓ charged ${ok}, past due ${failed.length}${failed.map((f) => `\n  ${f}`).join("")}`);
  }

  return (
    <div className={card}>
      <h2 className="mb-2 text-xl font-bold">⚙️ Keeper: run auto-charges</h2>
      <p className="mb-4 text-sm leading-relaxed text-zinc-400">
        No admin decides when to bill. Anyone can call <code className="text-emerald-300">chargeMany()</code>, and the contract only charges subscriptions
        that are due, at the price each subscriber locked in. Wallets that can&apos;t pay are marked <b>Past due</b> and skipped. Nothing reverts.
      </p>
      <div className="mb-3 text-sm">
        {data ? <><b>{data.due.length}</b> due of {data.total} subscriptions</> : "–"}
      </div>
      <div className="flex gap-2">
        <button className={btn.ghost} onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Scanning…" : "Rescan"}</button>
        {isConnected ? (
          <button className={btn.primary} onClick={run} disabled={!!busy || !data?.due.length}>{busy ?? "Charge all due"}</button>
        ) : (
          <ConnectButton />
        )}
      </div>
      {log && <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950 p-3 text-xs text-zinc-400">{log}</pre>}
    </div>
  );
}
