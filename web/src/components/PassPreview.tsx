import { ArrowUpRight, RefreshCw } from "lucide-react";
import { LogoMark } from "./Logo";

/** Illustrative membership pass shown in the hero: what a SubSafe subscription looks like. */
export function PassPreview() {
  const history = [
    { d: "Oct 05", h: "0x8f3a…21c4" },
    { d: "Sep 05", h: "0x1b7e…9d02" },
    { d: "Aug 05", h: "0xc441…e7a9" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-8 -z-10 rounded-full bg-brand/10 blur-3xl" />
      <div className="rounded-2xl border border-line-strong bg-gradient-to-b from-surface-2 to-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e50914]/15 text-sm font-bold text-[#ff4d57]">NF</div>
            <div>
              <div className="text-sm font-semibold">NaijaFlix Premium</div>
              <div className="text-xs text-subtle">Monthly membership</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand ring-1 ring-inset ring-brand/20">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Active
          </span>
        </div>

        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="num text-4xl font-semibold">5.00</span>
          <span className="text-sm text-muted">USDT / month</span>
        </div>
        <div className="num text-xs text-subtle">≈ ₦6,650 · price locked</div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Next charge in 12 days</span>
            <span className="num">Nov 05</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-[60%] rounded-full bg-brand" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-line bg-bg/60 p-2.5">
            <div className="text-subtle">Auto-pay cap</div>
            <div className="num mt-0.5 text-sm text-fg">9 of 12 left</div>
          </div>
          <div className="rounded-lg border border-line bg-bg/60 p-2.5">
            <div className="text-subtle">Paid so far</div>
            <div className="num mt-0.5 text-sm text-fg">15.00 USDT</div>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-2 text-xs font-medium text-subtle">Charges</div>
          <ul className="space-y-1.5">
            {history.map((r) => (
              <li key={r.h} className="flex items-center justify-between text-xs">
                <span className="text-muted">{r.d}</span>
                <span className="num inline-flex items-center gap-1 text-subtle">{r.h}<ArrowUpRight className="h-3 w-3" /></span>
                <span className="num text-fg">−5.00</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-between text-[11px] text-subtle">
          <span className="inline-flex items-center gap-1.5"><LogoMark className="h-4 w-4" /> Secured by SubSafe</span>
          <span>BOTChain</span>
        </div>
      </div>
    </div>
  );
}
