"use client";

import { erc20Abi } from "viem";
import { useConnection } from "wagmi";
import { ConnectButton } from "@/components/Navbar";
import { Empty, StatusBadge, btn, card } from "@/components/ui";
import { SUBSAFE_ADDRESS, USDT_ADDRESS } from "@/lib/contract";
import { fmtNgn, fmtUsdt, perMonth, periodLabel, toUsdt, timeLeft, usdtNum } from "@/lib/format";
import { subsafe, useNow, useMySubs, useNgnRate, usePlans, useTx, useWallet, type Plan, type Sub } from "@/lib/hooks";

export default function MySubscriptions() {
  const { isConnected } = useConnection();
  const { data: subs = [], isLoading } = useMySubs();
  const { data: plans = [] } = usePlans();
  const { data: wallet } = useWallet();
  const rate = useNgnRate();
  const { send, busy } = useTx();
  const now = useNow();

  if (!isConnected)
    return (
      <Empty>
        <p className="mb-4">Connect your wallet to see your subscriptions.</p>
        <ConnectButton />
      </Empty>
    );

  const sorted = [...subs].sort((a, b) => Number(a.status === 3) - Number(b.status === 3) || b.id - a.id);

  async function adjustCap() {
    const v = prompt(`Current auto-pay cap: ${wallet ? fmtUsdt(wallet.allowance) : "?"} USDT.\nNew total cap in USDT (0 = revoke SubSafe completely):`, "50");
    if (v === null || isNaN(Number(v))) return;
    await send("Updating auto-pay cap", { address: USDT_ADDRESS, abi: erc20Abi, functionName: "approve", args: [SUBSAFE_ADDRESS, toUsdt(Number(v))] });
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My subscriptions</h1>
        <button className={btn.ghost} onClick={adjustCap} disabled={!!busy}>Adjust auto-pay cap</button>
      </div>

      <Assistant subs={subs} plans={plans} wallet={wallet} rate={rate} now={now} />

      {isLoading ? (
        <Empty>Loading…</Empty>
      ) : !sorted.length ? (
        <Empty>No subscriptions yet. Browse plans on the Explore page.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((s) => {
            const plan = plans[s.planId];
            const access = s.paidUntil > now;
            const live = s.status === 1 || s.status === 2;
            const due = live && !access;
            return (
              <div key={s.id} className={`${card} grid items-center gap-3 sm:grid-cols-[1fr_auto]`}>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 font-semibold">
                    {plan?.name ?? `Plan #${s.planId}`} <StatusBadge status={s.status} due={due} />
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
                    <span><b className="text-zinc-200">{fmtUsdt(s.price)} USDT</b> / {periodLabel(s.period)} (≈ {fmtNgn(usdtNum(s.price), rate)})</span>
                    <span>{s.status === 3 ? (access ? `access until ${new Date(s.paidUntil * 1000).toLocaleString()}` : "ended") : `next charge ${timeLeft(s.paidUntil, now)}`}</span>
                    <span>paid <b className="text-zinc-200">{s.chargeCount}</b>×</span>
                    <span>since {new Date(s.startedAt * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {due && (
                    <button className={btn.primary} disabled={!!busy} onClick={() => send("Renewing", { ...subsafe, functionName: "charge", args: [BigInt(s.id)] })}>
                      Pay now
                    </button>
                  )}
                  {live && (
                    <button
                      className={btn.danger}
                      disabled={!!busy}
                      onClick={() => confirm("Cancel? You keep access until the current period ends.") && send("Cancelling", { ...subsafe, functionName: "cancel", args: [BigInt(s.id)] })}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** SubSafe Assistant: on-device analysis of the user's subscription portfolio. */
function Assistant({ subs, plans, wallet, rate, now }: { subs: Sub[]; plans: Plan[]; wallet?: { balance: bigint; allowance: bigint }; rate: number; now: number }) {
  const live = subs.filter((s) => s.status === 1 || s.status === 2);
  const tips: React.ReactNode[] = [];

  if (!live.length) tips.push("You have no active subscriptions. Once you subscribe, I'll track your monthly spend, auto-pay runway and upcoming charges.");
  else {
    const monthly = live.reduce((a, s) => a + perMonth(s.price, s.period), 0);
    const bal = wallet ? usdtNum(wallet.balance) : 0;
    const cap = wallet ? usdtNum(wallet.allowance) : 0;
    const week = now + 7 * 86_400;
    const upcoming = live.filter((s) => s.paidUntil < week);
    const upcomingSum = upcoming.reduce((a, s) => a + usdtNum(s.price), 0);
    const pastDue = live.filter((s) => s.status === 2).length;
    const top = [...live].sort((a, b) => perMonth(b.price, b.period) - perMonth(a.price, a.period))[0];

    tips.push(
      <>You spend about <b>{monthly.toFixed(2)} USDT/month</b> (≈ {fmtNgn(monthly, rate)}), or <b>{(monthly * 12).toFixed(2)} USDT/year</b>, across {live.length} subscription{live.length > 1 ? "s" : ""}.</>
    );
    if (upcoming.length) tips.push(<>{upcoming.length} charge{upcoming.length > 1 ? "s" : ""} totalling <b>{upcomingSum.toFixed(2)} USDT</b> due within 7 days.</>);
    if (wallet && bal < upcomingSum) tips.push(<>⚠️ Your balance ({bal.toFixed(2)} USDT) won&apos;t cover the next 7 days of charges. Top up to avoid going past due.</>);
    if (wallet && cap < upcomingSum) tips.push(<>⚠️ Your auto-pay cap ({cap.toFixed(2)} USDT) is too low for upcoming charges. Use “Adjust auto-pay cap”.</>);
    else if (wallet && monthly > 0 && cap < 1e9) tips.push(<>Your auto-pay cap covers about <b>{(cap / monthly).toFixed(1)} months</b> of subscriptions.</>);
    if (pastDue) tips.push(<>🔴 {pastDue} subscription{pastDue > 1 ? "s are" : " is"} past due. Press “Pay now” to restore access.</>);
    if (top && live.length > 1)
      tips.push(<>Your biggest cost is <b>{plans[top.planId]?.name ?? "a plan"}</b> at {perMonth(top.price, top.period).toFixed(2)} USDT/month. Cancel it if you&apos;re not using it.</>);
  }

  return (
    <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-500/10 to-zinc-900/70 p-5">
      <div className="mb-2">
        🤖 <b>SubSafe Assistant</b> <span className="text-sm text-zinc-400">: spending insights, worked out in your browser</span>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-300">
        {tips.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}
