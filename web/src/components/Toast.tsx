"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Kind = "info" | "ok" | "err";
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: Kind; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, kind: Kind = "info") => {
    setT({ msg, kind, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), kind === "info" ? 60_000 : 5_000);
  }, []);
  const Icon = t?.kind === "ok" ? CheckCircle2 : t?.kind === "err" ? XCircle : Loader2;
  const color = t?.kind === "ok" ? "text-brand" : t?.kind === "err" ? "text-danger" : "text-muted animate-spin";
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div key={t.id} className="fade-up fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-sm shadow-2xl sm:max-w-sm">
          <Icon className={`h-4 w-4 shrink-0 ${color}`} />
          <span>{t.msg}</span>
        </div>
      )}
    </Ctx.Provider>
  );
}
