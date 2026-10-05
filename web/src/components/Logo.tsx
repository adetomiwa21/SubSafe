/** Shield with a renewal arrow: "protected recurring payments". */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path d="M16 6.5 8.5 9.4v6.1c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10V9.4L16 6.5Z" fill="var(--color-bg)" />
      <path d="M19.6 13.1a4.2 4.2 0 1 0 .9 3.4" fill="none" stroke="var(--color-brand)" strokeWidth="1.9" strokeLinecap="round" />
      <path d="m20.9 11.2-.9 2.6-2.6-.6" fill="none" stroke="var(--color-brand)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
      <LogoMark />
      SubSafe
    </span>
  );
}
