"use client";

import { LogOut, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useBlockNumber, useConnect, useConnection, useDisconnect, useSwitchChain } from "wagmi";
import { EXPLORER, NETWORK_LABEL, activeChain } from "@/lib/chain";
import { errMsg, fmtUsdt, short } from "@/lib/format";
import { useMounted, useWallet } from "@/lib/hooks";
import { Logo } from "./Logo";
import { useToast } from "./Toast";
import { AddressAvatar, btn } from "./ui";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/studio", label: "Creator Studio" },
];

export function ConnectButton({ className = "" }: { className?: string }) {
  const { address, chainId, isConnected } = useConnection();
  const { mutateAsync: connect, connectors, isPending } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: switchChain } = useSwitchChain();
  const { data: wallet } = useWallet();
  const toast = useToast();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);

  if (!mounted) return <button className={`${btn.primary} ${className}`}>Connect wallet</button>;

  if (isConnected && chainId !== activeChain.id)
    return (
      <button className={`${btn.secondary} border-warn/40 text-warn ${className}`} onClick={() => switchChain({ chainId: activeChain.id }).catch((e) => toast(errMsg(e), "err"))}>
        Switch to BOT Chain
      </button>
    );

  if (isConnected && address)
    return (
      <div className="relative">
        <button className={`${btn.secondary} gap-2.5 pl-2 ${className}`} onClick={() => setOpen((o) => !o)}>
          <AddressAvatar address={address} />
          <span className="num hidden text-muted sm:inline">{wallet ? `${fmtUsdt(wallet.balance)} USDT` : "…"}</span>
          <span className="num">{short(address)}</span>
        </button>
        {open && (
          <div className="fade-up absolute right-0 top-12 z-50 w-56 rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-2xl" onMouseLeave={() => setOpen(false)}>
            <div className="px-3 py-2 text-xs text-subtle">Connected to {activeChain.name}</div>
            <a className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5" href={`${EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer">
              <Wallet className="h-4 w-4 text-muted" /> View on explorer
            </a>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-white/5" onClick={() => { setOpen(false); disconnect(); }}>
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          </div>
        )}
      </div>
    );

  return (
    <button
      className={`${btn.primary} ${className}`}
      disabled={isPending}
      onClick={async () => {
        const c = connectors[0];
        if (!c || !(window as { ethereum?: unknown }).ethereum) return toast("No wallet found. Install MetaMask, BO Wallet or TokenPocket.", "err");
        try {
          await connect({ connector: c, chainId: activeChain.id });
        } catch (e) {
          toast(errMsg(e), "err");
        }
      }}
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

function BlockPill() {
  const { data } = useBlockNumber({ watch: true });
  const mounted = useMounted();
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-muted lg:inline-flex" title={`Latest ${activeChain.name} block`}>
      <span className={`h-1.5 w-1.5 rounded-full ${data ? "pulse-dot bg-brand" : "bg-subtle"}`} />
      {NETWORK_LABEL}
      <span className="num text-subtle">{mounted && data ? `#${data.toLocaleString()}` : ""}</span>
    </span>
  );
}

export function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${path === l.href ? "text-fg" : "text-muted hover:text-fg"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <BlockPill />
          <ConnectButton />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${path === l.href ? "bg-white/[0.06] text-fg" : "text-muted"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
