import { STATUS } from "@/lib/format";

export const btn = {
  primary: "rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed",
  ghost: "rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold transition hover:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed",
  danger: "rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-40",
};

export const card = "rounded-2xl border border-white/10 bg-zinc-900/70 p-5";
export const input = "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-zinc-400">{children}</div>;
}

export function StatusBadge({ status, due }: { status: number; due?: boolean }) {
  const label = status === 1 && due ? "Due" : STATUS[status];
  const tone =
    status === 1 && !due ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : status === 1 ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
    : status === 2 ? "border-red-400/30 bg-red-400/10 text-red-300"
    : "border-white/10 text-zinc-400";
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs ${tone}`}>{label}</span>;
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={card}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-zinc-400">{label}</div>
    </div>
  );
}
