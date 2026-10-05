"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConnect, useConnection, useDisconnect, useSwitchChain } from "wagmi";
import { botchainTestnet } from "@/lib/chain";
import { short, errMsg } from "@/lib/format";
import { useToast } from "./Toast";
import { useMounted } from "@/lib/hooks";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/subscriptions", label: "My Subscriptions" },
  { href: "/studio", label: "Creator Studio" },
];

export function ConnectButton({ className = "" }: { className?: string }) {
  const { address, chainId, isConnected } = useConnection();
  const { mutateAsync: connect, connectors } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: switchChain } = useSwitchChain();
  const toast = useToast();
  const mounted = useMounted();

  const base = "rounded-xl px-4 py-2 text-sm font-semibold transition";
  if (!mounted) return <button className={`${base} bg-emerald-600 ${className}`}>Connect Wallet</button>;

  if (isConnected && chainId !== botchainTestnet.id)
    return (
      <button className={`${base} bg-amber-500 text-black ${className}`} onClick={() => switchChain({ chainId: botchainTestnet.id }).catch((e) => toast(errMsg(e), "err"))}>
        Switch to BOTChain
      </button>
    );

  if (isConnected)
    return (
      <button className={`${base} border border-white/10 bg-zinc-900 hover:border-emerald-500 ${className}`} onClick={() => disconnect()} title="Disconnect">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
        {short(address!)}
      </button>
    );

  return (
    <button
      className={`${base} bg-gradient-to-br from-emerald-500 to-emerald-700 text-white hover:brightness-110 ${className}`}
      onClick={async () => {
        const c = connectors[0];
        if (!c || typeof window === "undefined" || !(window as { ethereum?: unknown }).ethereum)
          return toast("No wallet found. Install MetaMask, BO Wallet or TokenPocket.", "err");
        try {
          await connect({ connector: c, chainId: botchainTestnet.id });
        } catch (e) {
          toast(errMsg(e), "err");
        }
      }}
    >
      Connect Wallet
    </button>
  );
}

export function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          🛡️ Sub<span className="font-extrabold text-emerald-400">Safe</span>
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-zinc-900 p-1 sm:order-none sm:w-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${path === l.href ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 md:inline">BOTChain Testnet</span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
