import { formatUnits, parseUnits } from "viem";

export const DECIMALS = 6; // BOTChain USDT
export const STATUS = ["None", "Active", "Past due", "Cancelled"] as const;
export const MONTH = 2_592_000;

export const toUsdt = (v: string | number) => parseUnits(String(v), DECIMALS);
export const usdtNum = (v: bigint) => Number(formatUnits(v, DECIMALS));
export const fmtUsdt = (v: bigint) => usdtNum(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
export const fmtNgn = (usdt: number, rate: number) => "₦" + Math.round(usdt * rate).toLocaleString();
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Normalise any billing period to a 30-day month so plans are comparable. */
export const perMonth = (price: bigint, period: number) => (usdtNum(price) * MONTH) / period;

export function periodLabel(sec: number) {
  if (sec === MONTH) return "month";
  if (sec === 604_800) return "week";
  if (sec === 86_400) return "day";
  if (sec % 86_400 === 0) return `${sec / 86_400} days`;
  if (sec % 3_600 === 0) return `${sec / 3_600}h`;
  if (sec % 60 === 0) return `${sec / 60} min`;
  return `${sec}s`;
}

export function timeLeft(ts: number, now: number) {
  const d = ts - now;
  if (d <= 0) return "due now";
  if (d < 3_600) return `in ${Math.ceil(d / 60)} min`;
  if (d < 86_400) return `in ${Math.round(d / 3_600)} h`;
  return `in ${Math.round(d / 86_400)} days`;
}

export function parseMeta(m: string): { desc: string; image: string } {
  try {
    const j = JSON.parse(m);
    return { desc: j.desc || "", image: j.image || "" };
  } catch {
    return { desc: m || "", image: "" };
  }
}

export function errMsg(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; cause?: { data?: { errorName?: string } } };
  const m = err?.shortMessage || err?.message || String(e);
  if (/user rejected|denied/i.test(m)) return "Transaction rejected in wallet";
  const name = err?.cause?.data?.errorName;
  return name ? `Reverted: ${name}` : m.split("\n")[0].slice(0, 160);
}
