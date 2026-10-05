"use client";

import { X, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { STATUS } from "@/lib/format";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-40";

export const btn = {
  primary: `${base} h-10 px-4 bg-fg text-bg hover:bg-white/85`,
  secondary: `${base} h-10 px-4 border border-line-strong bg-surface-2 hover:bg-white/[0.06]`,
  ghost: `${base} h-10 px-3 text-muted hover:text-fg hover:bg-white/[0.05]`,
  danger: `${base} h-10 px-4 border border-danger/25 text-danger hover:bg-danger/10`,
  brand: `${base} h-10 px-4 bg-brand text-bg hover:bg-brand/85`,
  sm: "h-8 px-3 text-[13px]",
};

export const card = "rounded-xl border border-line bg-surface";
export const input =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-subtle outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/15";
export const label = "block text-[13px] font-medium text-muted";

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface-2">
        <Icon className="h-5 w-5 text-muted" />
      </div>
      <div className="font-medium">{title}</div>
      {children && <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.05] ${className}`} />;
}

const tones = {
  ok: "bg-brand/10 text-brand ring-brand/20",
  warn: "bg-warn/10 text-warn ring-warn/20",
  bad: "bg-danger/10 text-danger ring-danger/20",
  neutral: "bg-white/[0.04] text-muted ring-line-strong",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function StatusBadge({ status, due }: { status: number; due?: boolean }) {
  if (status === 1 && due) return <Badge tone="warn">Due</Badge>;
  if (status === 1) return <Badge tone="ok"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Active</Badge>;
  if (status === 2) return <Badge tone="bad">Past due</Badge>;
  return <Badge>{STATUS[status]}</Badge>;
}

export function Kpi({ label, value, sub, icon: Icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between text-[13px] text-muted">
        {label}
        {Icon && <Icon className="h-4 w-4 text-subtle" />}
      </div>
      <div className="num mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-subtle">{sub}</div>}
    </div>
  );
}

export function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1.5 text-[13px] font-medium text-brand">{eyebrow}</div>}
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = "max-w-md" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal className={`fade-up w-full ${width} rounded-2xl border border-line-strong bg-surface shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-subtle hover:bg-white/5 hover:text-fg" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Deterministic hue from any string, used for avatars and generated covers. */
export function hueOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function AddressAvatar({ address, size = 20 }: { address: string; size?: number }) {
  const h = hueOf(address.toLowerCase());
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-white/10"
      style={{ width: size, height: size, background: `conic-gradient(from ${h}deg, hsl(${h} 70% 55%), hsl(${(h + 90) % 360} 70% 45%), hsl(${(h + 200) % 360} 65% 50%), hsl(${h} 70% 55%))` }}
    />
  );
}

/** Plan artwork: the creator's image if set, otherwise a generated cover from the plan name. */
export function PlanCover({ name, image, className = "" }: { name: string; image?: string; className?: string }) {
  if (image)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={`object-cover ${className}`} loading="lazy" />;
  const h = hueOf(name);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 0% 0%, hsl(${h} 45% 28%), transparent 60%), radial-gradient(90% 90% at 100% 100%, hsl(${(h + 40) % 360} 50% 22%), transparent 60%), #141416` }}
    >
      <span className="absolute bottom-2 right-3 text-6xl font-semibold tracking-tighter text-white/10">{name.trim().slice(0, 2)}</span>
    </div>
  );
}
