"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { erc20Abi, zeroAddress, type Abi, type Address } from "viem";
import { useConnection, useConfig } from "wagmi";
import { readContract, readContracts, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { SUBSAFE_ABI, SUBSAFE_ADDRESS, USDT_ADDRESS } from "./contract";
import { errMsg, parseMeta } from "./format";
import { useToast } from "@/components/Toast";

export const DEPLOYED = SUBSAFE_ADDRESS !== zeroAddress;
const safe = { address: SUBSAFE_ADDRESS, abi: SUBSAFE_ABI } as const;

export type Plan = {
  id: number;
  merchant: Address;
  price: bigint;
  period: number;
  active: boolean;
  subscriberCount: number;
  name: string;
  desc: string;
  image: string;
  category: string;
};

export type Sub = {
  id: number;
  subscriber: Address;
  planId: number;
  price: bigint;
  period: number;
  paidUntil: number;
  startedAt: number;
  chargeCount: number;
  status: number;
};

/** All plans on SubSafe. */
export function usePlans() {
  const config = useConfig();
  return useQuery({
    queryKey: ["plans"],
    enabled: DEPLOYED,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Plan[]> => {
      const n = Number(await readContract(config, { ...safe, functionName: "planCount" }));
      if (!n) return [];
      const res = await readContracts(config, {
        allowFailure: false,
        contracts: Array.from({ length: n }, (_, i) => ({ ...safe, functionName: "getPlan" as const, args: [BigInt(i)] as const })),
      });
      return res.map((p, id) => ({
        id,
        merchant: p.merchant,
        price: p.price,
        period: Number(p.period),
        active: p.active,
        subscriberCount: Number(p.subscriberCount),
        name: p.name,
        ...parseMeta(p.metadata),
      }));
    },
  });
}

async function loadSubs(config: ReturnType<typeof useConfig>, ids: readonly bigint[]): Promise<Sub[]> {
  if (!ids.length) return [];
  const res = await readContracts(config, {
    allowFailure: false,
    contracts: ids.map((id) => ({ ...safe, functionName: "getSubscription" as const, args: [id] as const })),
  });
  return res.map((s, i) => ({
    id: Number(ids[i]),
    subscriber: s.subscriber,
    planId: Number(s.planId),
    price: s.price,
    period: Number(s.period),
    paidUntil: Number(s.paidUntil),
    startedAt: Number(s.startedAt),
    chargeCount: Number(s.chargeCount),
    status: Number(s.status),
  }));
}

/** Subscriptions owned by the connected wallet. */
export function useMySubs() {
  const config = useConfig();
  const { address } = useConnection();
  return useQuery({
    queryKey: ["mySubs", address],
    enabled: DEPLOYED && !!address,
    refetchInterval: 30_000,
    queryFn: async () => loadSubs(config, await readContract(config, { ...safe, functionName: "subsOf", args: [address!] })),
  });
}

/** Subscriptions belonging to one plan (merchant view). */
export function usePlanSubs(planId: number) {
  const config = useConfig();
  return useQuery({
    queryKey: ["planSubs", planId],
    enabled: DEPLOYED,
    refetchInterval: 30_000,
    queryFn: async () => loadSubs(config, await readContract(config, { ...safe, functionName: "subsOfPlan", args: [BigInt(planId)] })),
  });
}

/** Every subscription on SubSafe (protocol stats). */
export function useAllSubs() {
  const config = useConfig();
  return useQuery({
    queryKey: ["allSubs"],
    enabled: DEPLOYED,
    refetchInterval: 30_000,
    queryFn: async () => {
      const n = Number(await readContract(config, { ...safe, functionName: "subscriptionCount" }));
      return loadSubs(config, Array.from({ length: n }, (_, i) => BigInt(i)));
    },
  });
}

/** Every subscription id that is due right now (keeper view). */
export function useDueSubs() {
  const config = useConfig();
  return useQuery({
    queryKey: ["due"],
    enabled: DEPLOYED,
    refetchInterval: 30_000,
    queryFn: async () => {
      const n = Number(await readContract(config, { ...safe, functionName: "subscriptionCount" }));
      if (!n) return { total: 0, due: [] as bigint[] };
      const flags = await readContracts(config, {
        allowFailure: false,
        contracts: Array.from({ length: n }, (_, i) => ({ ...safe, functionName: "isDue" as const, args: [BigInt(i)] as const })),
      });
      return { total: n, due: flags.flatMap((d, i) => (d ? [BigInt(i)] : [])) };
    },
  });
}

/** USDT balance + SubSafe allowance ("auto-pay cap") of the connected wallet. */
export function useWallet() {
  const config = useConfig();
  const { address } = useConnection();
  return useQuery({
    queryKey: ["wallet", address],
    enabled: !!address,
    refetchInterval: 15_000,
    queryFn: async () => {
      const [balance, allowance] = await readContracts(config, {
        allowFailure: false,
        contracts: [
          { address: USDT_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address!] },
          { address: USDT_ADDRESS, abi: erc20Abi, functionName: "allowance", args: [address!, SUBSAFE_ADDRESS] },
        ],
      });
      return { balance, allowance };
    },
  });
}

/** Live USD→NGN rate from a free public FX API (no key). Falls back to a sane default. */
export function useNgnRate() {
  return useQuery({
    queryKey: ["ngn"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const j = await r.json();
        return Number(j?.rates?.NGN) || 1550;
      } catch {
        return 1550;
      }
    },
    placeholderData: 1550,
  }).data!;
}

type WriteArgs = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] };

/** Send a tx, wait for it, toast the result, and refresh every query. */
export function useTx() {
  const config = useConfig();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function send(label: string, args: WriteArgs) {
    setBusy(label);
    try {
      toast(`${label}… confirm in your wallet`);
      const hash = await writeContract(config, args as never);
      toast(`${label}: waiting for confirmation…`);
      const rcpt = await waitForTransactionReceipt(config, { hash });
      if (rcpt.status !== "success") throw new Error("Transaction reverted");
      toast(`${label} ✓`, "ok");
      await qc.invalidateQueries();
      return rcpt;
    } catch (e) {
      console.error(e);
      toast(errMsg(e), "err");
      return null;
    } finally {
      setBusy(null);
    }
  }

  return { send, busy };
}

export { safe as subsafe };

/** Current unix time (seconds), re-rendering every 15s so countdowns stay fresh. */
export function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** false during SSR/hydration, true afterwards — avoids wallet-state hydration mismatches. */
export function useMounted() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}
