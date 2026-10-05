"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Kind = "info" | "ok" | "err";
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: Kind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, kind: Kind = "info") => {
    setT({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), kind === "info" ? 60_000 : 5_000);
  }, []);
  const tone = t?.kind === "err" ? "border-red-500/60 text-red-300" : t?.kind === "ok" ? "border-emerald-500/60" : "border-white/10";
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div className={`fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl border bg-zinc-900 px-5 py-3 text-sm shadow-2xl ${tone}`}>
          {t.msg}
        </div>
      )}
    </Ctx.Provider>
  );
}
