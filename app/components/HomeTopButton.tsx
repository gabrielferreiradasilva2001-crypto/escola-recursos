"use client";

import Link from "next/link";

type HomeTopButtonProps = {
  compact?: boolean;
};

export default function HomeTopButton({ compact = false }: HomeTopButtonProps) {
  const sizeClass = compact
    ? "right-2 top-2 min-h-11 px-2.5 py-1.5 text-[11px]"
    : "right-3 top-3 min-h-11 px-3 py-2 text-xs";

  return (
    <Link
      href="/portal"
      className={`fixed z-[9998] inline-flex items-center rounded-xl border border-slate-200 bg-white/95 font-black text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50 ${sizeClass}`}
      title="Voltar para a página inicial"
    >
      Início
    </Link>
  );
}
