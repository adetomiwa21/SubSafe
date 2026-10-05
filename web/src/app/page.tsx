"use client";

import { ArrowRight, Ban, CalendarClock, Gauge, Lock, Search, ShieldCheck, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useConnection } from "wagmi";
import { ConnectButton } from "@/components/Navbar";
import { PassPreview } from "@/components/PassPreview";
import { PlanCard } from "@/components/PlanCard";
import { SubscribeModal } from "@/components/SubscribeModal";
import { Empty, Modal, SectionHead, Skeleton, btn, card } from "@/components/ui";
import { fmtUsdt } from "@/lib/format";
import { NETWORK_LABEL } from "@/lib/chain";
import { DEPLOYED, useAllSubs, useMySubs, useNgnRate, useNow, usePlans, type Plan } from "@/lib/hooks";

const STEPS = [
  { icon: Wallet, title: "Pick a plan, set a cap", body: "Choose how many periods SubSafe may bill, from 1 to 12. You approve exactly that much USDT and nothing more." },
  { icon: CalendarClock, title: "Billed when due", body: "Each period, a keeper calls the contract. It only charges subscriptions that are actually due, at the price you locked in." },
  { icon: Ban, title: "Cancel in one click", body: "Cancelling stops future charges straight away. You keep access until the end of the period you already paid for." },
];

const SAFETY = [
  { icon: Lock, title: "Price lock", body: "Price and billing period are copied into your subscription. Creators can't raise them later." },
  { icon: Gauge, title: "Spending cap", body: "You approve a fixed USDT amount, never an unlimited allowance." },
  { icon: ShieldCheck, title: "No double billing", body: "The contract rejects any charge before the period ends." },
  { icon: CalendarClock, title: "No back-charges", body: "Lapse for three months and renew, and you pay for one period from today." },
];

export default function Explore() {
  const { isConnected } = useConnection();
  const { data: plans = [], isLoading } = usePlans();
  const { data: subs = [] } = useMySubs();
  const { data: all = [] } = useAllSubs();
  const rate = useNgnRate();
  const now = useNow();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [picked, setPicked] = useState<Plan | null>(null);

  const subscribed = useMemo(() => new Set(subs.filter((s) => (s.status === 1 || s.status === 2) && s.paidUntil > now).map((s) => s.planId)), [subs, now]);
  const live = plans.filter((p) => p.active);
  const cats = ["All", ...Array.from(new Set(live.map((p) => p.category)))];
  const shown = live.filter((p) => (cat === "All" || p.category === cat) && (!q || `${p.name} ${p.desc}`.toLowerCase().includes(q.toLowerCase())));
  const volume = all.reduce((a, s) => a + s.price * BigInt(s.chargeCount), 0n);
  const activeSubs = plans.reduce((a, p) => a + p.subscriberCount, 0);

  return (
    <>
      {/* Hero */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-16 pt-14 sm:-mx-6 sm:px-6 md:pt-20">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative grid items-center gap-14 md:grid-cols-[1.15fr_1fr]">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-xs text-muted">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-brand" /> Live on BOT Chain {NETWORK_LABEL.toLowerCase()}
            </span>
            <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-[3.4rem]">
              Subscriptions that
              <br />
              <span className="text-muted">can&apos;t overcharge you.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
              Pay for streaming, music, classes and software monthly in USDT. Approve a cap once, get billed each period, and cancel whenever you like. The
              price is enforced by a smart contract, not a promise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isConnected ? (
                <a href="#plans" className={btn.primary}>Browse plans <ArrowRight className="h-4 w-4" /></a>
              ) : (
                <ConnectButton />
              )}
              <Link href="/studio" className={btn.secondary}><Store className="h-4 w-4" /> Sell a subscription</Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              <Stat label="Live plans" value={DEPLOYED ? live.length : "–"} />
              <Stat label="Active subs" value={DEPLOYED ? activeSubs : "–"} />
              <Stat label="USDT billed" value={DEPLOYED ? fmtUsdt(volume) : "–"} />
            </dl>
          </div>
          <div className="fade-up [animation-delay:120ms]">
            <PassPreview />
          </div>
        </div>
      </section>

      {!DEPLOYED && (
        <div className="mb-10 rounded-lg border border-warn/25 bg-warn/[0.06] px-4 py-3 text-sm text-warn">
          The SubSafe contract isn&apos;t deployed yet. Plans will appear here once it is.
        </div>
      )}

      {/* Plans */}
      <section id="plans" className="scroll-mt-24 py-10">
        <SectionHead eyebrow="Marketplace" title="Explore plans">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              className="h-10 w-64 rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-subtle focus:border-brand/60"
              placeholder="Search plans"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </SectionHead>

        {cats.length > 2 && (
          <div className="-mt-2 mb-6 flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${cat === c ? "bg-fg text-bg" : "border border-line-strong text-muted hover:text-fg"}`}
              >
                {c}
              </button>
            ))}
            <span className="num ml-auto self-center text-xs text-subtle">1 USDT ≈ ₦{Math.round(rate).toLocaleString()}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[380px]" />)}
          </div>
        ) : !shown.length ? (
          <Empty icon={Store} title={q || cat !== "All" ? "No plans match" : "No plans yet"}>
            {q || cat !== "All" ? "Try a different search or category." : <>Creators can publish the first one in <Link href="/studio" className="text-fg underline underline-offset-4">Creator Studio</Link>.</>}
          </Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <PlanCard key={p.id} plan={p} rate={rate} subscribed={subscribed.has(p.id)} onSubscribe={() => setPicked(p)} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="py-14">
        <SectionHead eyebrow="How it works" title="Set it up once. It runs itself." />
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`${card} p-6`}>
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-brand" />
                <span className="num text-xs text-subtle">0{i + 1}</span>
              </div>
              <h3 className="mt-6 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Safety */}
      <section className="py-14">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-brand">Why it&apos;s safe</div>
            <h2 className="text-2xl font-semibold tracking-tight">The rules live in the contract.</h2>
            <p className="mt-3 text-muted">
              Card subscriptions are easy to start and hard to stop. SubSafe flips that: every limit below is enforced on-chain, and anyone can read the code.
            </p>
            <a href="https://github.com/adetomiwa21/SubSafe/blob/main/contracts/src/SubSafe.sol" target="_blank" rel="noopener noreferrer" className={`${btn.secondary} mt-6`}>
              Read the contract <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {SAFETY.map((s) => (
              <div key={s.title} className="bg-surface p-5">
                <s.icon className="h-4 w-4 text-muted" />
                <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator CTA */}
      <section className="py-10">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-gradient-to-br from-surface-2 to-surface p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Run a membership, newsletter or class?</h2>
            <p className="mt-1.5 max-w-xl text-muted">Publish a plan in under a minute. Get paid in USDT every period, with no chargebacks and no card processor.</p>
          </div>
          <Link href="/studio" className={btn.primary}>Open Creator Studio <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {picked &&
        (isConnected ? (
          <SubscribeModal plan={picked} rate={rate} onClose={() => setPicked(null)} />
        ) : (
          <Modal open onClose={() => setPicked(null)} title="Connect a wallet">
            <p className="mb-5 text-sm text-muted">Connect a BOTChain wallet holding USDT to subscribe to {picked.name}.</p>
            <ConnectButton className="w-full" />
          </Modal>
        ))}
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="num mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}
