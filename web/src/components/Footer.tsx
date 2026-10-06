import { zeroAddress } from "viem";
import { SUBSAFE_ADDRESS, USDT_ADDRESS } from "@/lib/contract";
import { EXPLORER, IS_MAINNET, activeChain } from "@/lib/chain";
import { short } from "@/lib/format";
import { Logo } from "./Logo";

const DEPLOYED = SUBSAFE_ADDRESS !== zeroAddress;
const link = "text-muted transition-colors hover:text-fg";
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const head = "mb-1 text-xs font-medium uppercase tracking-wider text-subtle";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-subtle">Recurring USDT payments with prices locked on-chain.</p>
          <a href="https://botchain.ai" {...ext} aria-label="Built on BOT Chain" className="mt-6 inline-flex items-center gap-3 opacity-90 transition-opacity hover:opacity-100">
            <span className="text-xs text-subtle">Built on</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/botchain-logo.png" alt="BOT Chain" width={128} height={28} className="h-7 w-auto" />
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <span className={head}>BOT Chain</span>
          <a className={link} href="https://botchain.ai" {...ext}>https://botchain.ai</a>
          <a className={link} href="https://scan.botchain.ai" {...ext}>https://scan.botchain.ai</a>
        </div>

        <div className="flex flex-col gap-2">
          <span className={head}>Contracts</span>
          {DEPLOYED ? (
            <a className={`${link} num`} href={`${EXPLORER}/address/${SUBSAFE_ADDRESS}`} {...ext}>SubSafe {short(SUBSAFE_ADDRESS)}</a>
          ) : (
            <span className="text-warn">Not deployed yet</span>
          )}
          <a className={`${link} num`} href={`${EXPLORER}/token/${USDT_ADDRESS}`} {...ext}>USDT {short(USDT_ADDRESS)}</a>
        </div>

        <div className="flex flex-col gap-2">
          <span className={head}>Project</span>
          <a className={link} href="https://github.com/adetomiwa21/SubSafe" {...ext}>GitHub</a>
          <a className={link} href="https://x.com/SubSafe_x" {...ext}>X / Twitter</a>
          {IS_MAINNET ? (
            <span className="text-subtle">{activeChain.name} · ID {activeChain.id}</span>
          ) : (
            <a className={link} href="https://faucet.botchain.ai/en/basic" {...ext}>Testnet faucet</a>
          )}
        </div>
      </div>
    </footer>
  );
}
