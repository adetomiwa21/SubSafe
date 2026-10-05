import { zeroAddress } from "viem";
import { SUBSAFE_ADDRESS, USDT_ADDRESS } from "@/lib/contract";
import { EXPLORER, IS_MAINNET, activeChain } from "@/lib/chain";
import { short } from "@/lib/format";
import { Logo } from "./Logo";

const DEPLOYED = SUBSAFE_ADDRESS !== zeroAddress;
const link = "text-muted transition-colors hover:text-fg";
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const head = "text-xs font-medium uppercase tracking-wider text-subtle";

export function Footer() {
  return (
    <footer className="border-t border-line">
      {/* Ecosystem: BOT Chain name, logo, website and explorer */}
      <div className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-5">
            <span className="text-sm text-subtle">Built on</span>
            <a href="https://botchain.ai" {...ext} aria-label="BOT Chain" className="opacity-90 transition-opacity hover:opacity-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/botchain-logo.png" alt="BOT Chain" width={146} height={32} className="h-8 w-auto" />
            </a>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a className={link} href="https://botchain.ai" {...ext}>https://botchain.ai</a>
            <a className={link} href="https://scan.botchain.ai" {...ext}>https://scan.botchain.ai</a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-subtle">Recurring USDT payments with prices locked on-chain. Built on BOT Chain.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2">
          <span className={head}>Contracts</span>
          <span className={head}>Project</span>
          {DEPLOYED ? (
            <a className={`${link} num`} href={`${EXPLORER}/address/${SUBSAFE_ADDRESS}`} {...ext}>SubSafe {short(SUBSAFE_ADDRESS)}</a>
          ) : (
            <span className="text-warn">Not deployed yet</span>
          )}
          <a className={link} href="https://github.com/adetomiwa21/SubSafe" {...ext}>GitHub</a>
          <a className={`${link} num`} href={`${EXPLORER}/token/${USDT_ADDRESS}`} {...ext}>USDT {short(USDT_ADDRESS)}</a>
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
