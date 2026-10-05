import { zeroAddress } from "viem";
import { SUBSAFE_ADDRESS, USDT_ADDRESS } from "@/lib/contract";
import { EXPLORER } from "@/lib/chain";
import { short } from "@/lib/format";
import { Logo } from "./Logo";

const DEPLOYED = SUBSAFE_ADDRESS !== zeroAddress;
const link = "text-muted transition-colors hover:text-fg";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-subtle">Recurring USDT payments with prices locked on-chain. Built on BOTChain.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-subtle">Contracts</span>
          <span className="text-xs font-medium uppercase tracking-wider text-subtle">Project</span>
          {DEPLOYED ? (
            <a className={`${link} num`} href={`${EXPLORER}/address/${SUBSAFE_ADDRESS}`} target="_blank" rel="noopener noreferrer">SubSafe {short(SUBSAFE_ADDRESS)}</a>
          ) : (
            <span className="text-warn">Not deployed yet</span>
          )}
          <a className={link} href="https://github.com/adetomiwa21/SubSafe" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a className={`${link} num`} href={`${EXPLORER}/token/${USDT_ADDRESS}`} target="_blank" rel="noopener noreferrer">USDT {short(USDT_ADDRESS)}</a>
          <a className={link} href="https://faucet.botchain.ai/en/basic" target="_blank" rel="noopener noreferrer">Testnet faucet</a>
        </div>
      </div>
    </footer>
  );
}
