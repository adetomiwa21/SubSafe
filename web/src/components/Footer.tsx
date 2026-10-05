import { SUBSAFE_ADDRESS } from "@/lib/contract";
import { EXPLORER } from "@/lib/chain";
import { zeroAddress } from "viem";
import { short } from "@/lib/format";

const DEPLOYED = SUBSAFE_ADDRESS !== zeroAddress;

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-6 text-center text-sm text-zinc-500">
      SubSafe · Built on BOTChain ·{" "}
      {DEPLOYED ? (
        <a className="text-emerald-400 hover:underline" href={`${EXPLORER}/address/${SUBSAFE_ADDRESS}`} target="_blank" rel="noopener noreferrer">
          Contract {short(SUBSAFE_ADDRESS)}
        </a>
      ) : (
        <span className="text-amber-400">Contract not deployed yet</span>
      )}
    </footer>
  );
}
