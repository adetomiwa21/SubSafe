"use client";

import { useState } from "react";
import { erc20Abi, maxUint256 } from "viem";
import { SUBSAFE_ADDRESS, USDT_ADDRESS } from "@/lib/contract";
import { fmtNgn, fmtUsdt, periodLabel, usdtNum } from "@/lib/format";
import { subsafe, useTx, useWallet, type Plan } from "@/lib/hooks";
import { useToast } from "./Toast";
import { btn, input } from "./ui";

const UNLIMITED = 10n ** 15n; // treat anything above 1B USDT as "already unlimited"

export function SubscribeModal({ plan, rate, onClose }: { plan: Plan; rate: number; onClose: () => void }) {
  const [periods, setPeriods] = useState(12);
  const [step, setStep] = useState(0); // 0 idle, 1 approving, 2 subscribing, 3 done
  const { data: wallet } = useWallet();
  const { send, busy } = useTx();
  const toast = useToast();
  const cap = plan.price * BigInt(periods);

  async function go() {
    if (!wallet) return;
    if (wallet.balance < plan.price) return toast(`You need at least ${fmtUsdt(plan.price)} USDT (balance ${fmtUsdt(wallet.balance)}).`, "err");
    setStep(1);
    // Add this plan's cap on top of whatever is already approved for other subscriptions.
    if (wallet.allowance < UNLIMITED) {
      const sum = wallet.allowance + cap;
      const ok = await send("Approving USDT", {
        address: USDT_ADDRESS, abi: erc20Abi, functionName: "approve",
        args: [SUBSAFE_ADDRESS, sum > maxUint256 ? maxUint256 : sum],
      });
      if (!ok) return setStep(0);
    }
    setStep(2);
    const ok = await send("Subscribing", { ...subsafe, functionName: "subscribe", args: [BigInt(plan.id)] });
    if (!ok) return setStep(0);
    setStep(3);
    setTimeout(onClose, 800);
  }

  const li = (n: number) => (step > n ? "text-emerald-400" : step === n ? "text-white" : "text-zinc-500");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Subscribe to {plan.name}</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {fmtUsdt(plan.price)} USDT (≈ {fmtNgn(usdtNum(plan.price), rate)}) every {periodLabel(plan.period)}. The first period is charged now.
        </p>

        <label className="mt-5 block text-sm text-zinc-400">
          Auto-pay cap: how many periods can SubSafe charge?
          <select className={input} value={periods} onChange={(e) => setPeriods(Number(e.target.value))} disabled={step > 0}>
            <option value={1}>1 period (manual renew)</option>
            <option value={3}>3 periods</option>
            <option value={6}>6 periods</option>
            <option value={12}>12 periods</option>
          </select>
        </label>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          SubSafe can pull at most <b className="text-zinc-300">{fmtUsdt(cap)} USDT</b> for this plan. The price is locked on-chain, so the merchant can
          never charge you more per period. You can lower or revoke the cap any time.
        </p>

        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
          <li className={li(1)}>Approve USDT spending cap {step > 1 && "✓"}</li>
          <li className={li(2)}>Subscribe &amp; pay first period {step > 2 && "✓"}</li>
        </ol>

        <div className="mt-6 flex justify-end gap-2">
          <button className={btn.ghost} onClick={onClose}>Close</button>
          <button className={btn.primary} onClick={go} disabled={!!busy || step === 3 || !wallet}>
            {busy ?? (step === 3 ? "Subscribed ✓" : "Approve & Subscribe")}
          </button>
        </div>
      </div>
    </div>
  );
}
