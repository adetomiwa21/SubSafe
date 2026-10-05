"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useConnection } from "wagmi";
import { PlanCard } from "@/components/PlanCard";
import { SubscribeModal } from "@/components/SubscribeModal";
import { ConnectButton } from "@/components/Navbar";
import { Empty, Stat, btn, input } from "@/components/ui";
import { fmtUsdt } from "@/lib/format";
import { DEPLOYED, useNow, useMySubs, useNgnRate, usePlans, useWallet, type Plan } from "@/lib/hooks";

export default function Explore() {
  const { isConnected } = useConnection();
  const { data: plans = [], isLoading } = usePlans();
  const { data: subs = [] } = useMySubs();
  const { data: wallet } = useWallet();
  const rate = useNgnRate();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Plan | null>(null);

  const now = useNow();
  const subscribed = useMemo(
    () => new Set(subs.filter((s) => (s.status === 1 || s.status === 2) && s.paidUntil > now).map((s) => s.planId)),
    [subs, now]
  );
  const shown = plans.filter((p) => p.active && (!q || `${p.name} ${p.desc}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      {!DEPLOYED && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          SubSafe contract not deployed yet. Run <code>npm run deploy:botchain</code> in <code>/contracts</code>.
        </div>
      )}

      <section className="mb-12 grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Subscriptions,{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">on-chain.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-400">
            Pay for Netflix-style services monthly in <b className="text-zinc-200">USDT</b> on BOTChain. Approve a spending cap once, get auto-charged each
            period, and cancel any time. The price is locked into the contract, so nobody can raise it on you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isConnected ? <a href="#plans" className={btn.primary}>Browse plans</a> : <ConnectButton />}
            <Link href="/studio" className={btn.ghost}>Sell a subscription</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Live plans" value={plans.filter((p) => p.active).length} />
          <Stat label="Active subscribers" value={plans.reduce((a, p) => a + p.subscriberCount, 0)} />
          <Stat label="Your USDT" value={wallet ? fmtUsdt(wallet.balance) : "–"} />
          <Stat label="Auto-pay cap" value={wallet ? (wallet.allowance > 10n ** 15n ? "∞" : fmtUsdt(wallet.allowance)) : "–"} />
        </div>
      </section>

      <section id="plans">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Explore plans</h2>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <input className={`${input} mt-0 w-56`} placeholder="Search plans…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="whitespace-nowrap">1 USDT ≈ ₦{Math.round(rate).toLocaleString()}</span>
          </div>
        </div>
        {isLoading ? (
          <Empty>Loading plans from BOTChain…</Empty>
        ) : !shown.length ? (
          <Empty>
            No plans yet. <Link href="/studio" className="text-emerald-400 hover:underline">Publish the first one →</Link>
          </Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <PlanCard key={p.id} plan={p} rate={rate} subscribed={subscribed.has(p.id)} onSubscribe={() => setPicked(p)} />
            ))}
          </div>
        )}
      </section>

      {picked && (isConnected ? <SubscribeModal plan={picked} rate={rate} onClose={() => setPicked(null)} /> : <ConnectPrompt onClose={() => setPicked(null)} />)}
    </>
  );
}

function ConnectPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 text-zinc-300">Connect your wallet to subscribe.</p>
        <ConnectButton />
      </div>
    </div>
  );
}
