"use client";

import { Check, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { erc20Abi, maxUint256 } from "viem";
import { SUBSAFE_ADDRESS, USDT_ADDRESS } from "@/lib/contract";
import { fmtNgn, fmtUsdt, periodLabel, usdtNum } from "@/lib/format";
import { subsafe, useTx, useWallet, type Plan } from "@/lib/hooks";
import { useToast } from "./Toast";
import { Modal, PlanCover, btn } from "./ui";

const UNLIMITED = 10n ** 15n; // anything above 1B USDT counts as already unlimited
const CAPS = [1, 3, 6, 12];

export function SubscribeModal({ plan, rate, onClose }: { plan: Plan; rate: number; onClose: () => void }) {
  const [periods, setPeriods] = useState(12);
  const [step, setStep] = useState(0); // 0 idle · 1 approving · 2 subscribing · 3 done
  const { data: wallet } = useWallet();
  const { send, busy } = useTx();
  const toast = useToast();
  const cap = plan.price * BigInt(periods);
  const short = wallet && wallet.balance < plan.price;

  async function go() {
    if (!wallet) return;
    if (short) return toast(`You need at least ${fmtUsdt(plan.price)} USDT.`, "err");
    setStep(1);
    // Add this plan's cap on top of what's already approved for other subscriptions.
    if (wallet.allowance < UNLIMITED) {
      const sum = wallet.allowance + cap;
      const ok = await send("Approving USDT", { address: USDT_ADDRESS, abi: erc20Abi, functionName: "approve", args: [SUBSAFE_ADDRESS, sum > maxUint256 ? maxUint256 : sum] });
      if (!ok) return setStep(0);
    }
    setStep(2);
    const ok = await send("Subscribing", { ...subsafe, functionName: "subscribe", args: [BigInt(plan.id)] });
    if (!ok) return setStep(0);
    setStep(3);
    setTimeout(onClose, 900);
  }

  const steps = [`Approve ${fmtUsdt(cap)} USDT spending cap`, `Pay first ${periodLabel(plan.period)} · ${fmtUsdt(plan.price)} USDT`];

  return (
    <Modal open onClose={onClose} title="Confirm subscription">
      <div className="flex items-center gap-3">
        <PlanCover name={plan.name} image={plan.image} className="h-14 w-14 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <div className="truncate font-semibold">{plan.name}</div>
          <div className="text-sm text-muted">
            <span className="num text-fg">{fmtUsdt(plan.price)} USDT</span> / {periodLabel(plan.period)} <span className="num text-subtle">· ≈ {fmtNgn(usdtNum(plan.price), rate)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[13px] font-medium text-muted">Auto-pay cap</div>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-line bg-bg p-1">
          {CAPS.map((n) => (
            <button
              key={n}
              disabled={step > 0}
              onClick={() => setPeriods(n)}
              className={`rounded-md py-1.5 text-sm transition-colors ${periods === n ? "bg-surface-2 text-fg ring-1 ring-line-strong" : "text-muted hover:text-fg"}`}
            >
              {n} {n === 1 ? "period" : "periods"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-subtle">
          SubSafe can pull at most <span className="num text-muted">{fmtUsdt(cap)} USDT</span> for this plan. Lower or revoke it any time.
        </p>
      </div>

      <div className="mt-4 flex gap-2.5 rounded-lg border border-brand/20 bg-brand/[0.06] p-3 text-xs leading-relaxed text-muted">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        The price is locked into the contract when you subscribe. The creator can never charge you more per period, and cancelling stops all future charges.
      </div>

      <ol className="mt-5 space-y-2.5">
        {steps.map((s, i) => {
          const n = i + 1;
          const state = step > n ? "done" : step === n ? "doing" : "todo";
          return (
            <li key={s} className="flex items-center gap-3 text-sm">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ring-1 ${state === "done" ? "bg-brand text-bg ring-brand" : state === "doing" ? "text-fg ring-fg/40" : "text-subtle ring-line-strong"}`}>
                {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : state === "doing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : n}
              </span>
              <span className={state === "todo" ? "text-subtle" : ""}>{s}</span>
            </li>
          );
        })}
      </ol>

      {short && <p className="mt-4 text-sm text-danger">Your balance is {fmtUsdt(wallet!.balance)} USDT. Get test USDT from the BOTChain faucet.</p>}

      <div className="mt-6 flex gap-2">
        <button className={`${btn.secondary} flex-1`} onClick={onClose}>Cancel</button>
        <button className={`${btn.primary} flex-1`} onClick={go} disabled={!!busy || step === 3 || !wallet || !!short}>
          {step === 3 ? "Subscribed" : busy ? `${busy}…` : "Subscribe"}
        </button>
      </div>
    </Modal>
  );
}
