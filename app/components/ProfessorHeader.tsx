import Link from "next/link";
import type { ReactNode } from "react";
import { APP_BRAND_NAME } from "../../lib/branding";
import SchoolLogo from "./SchoolLogo";

type ProfessorHeaderProps = {
  title: string;
  subtitle?: string;
  teacherName: string;
  teacherEmail: string;
  teacherAvatarUrl?: string;
  backHref?: string;
  backLabel?: string;
  rightSlot?: ReactNode;
};

export default function ProfessorHeader({
  title,
  subtitle,
  teacherName,
  teacherEmail,
  teacherAvatarUrl,
  backHref,
  backLabel = "Voltar",
  rightSlot,
}: ProfessorHeaderProps) {
  const safeTeacherName = (teacherName || "Professor(a)").trim();
  const safeTeacherEmail = (teacherEmail || "").trim();
  const shouldShowEmail = !!safeTeacherEmail && safeTeacherName.toLowerCase() !== safeTeacherEmail.toLowerCase();

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-slate-50/80 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur sm:p-5"
      style={{
        backgroundImage: "url(/back-sala2.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/60 via-white/10 to-sky-100/60" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full items-start gap-3 sm:w-auto">
          <Link
            href={backHref || "/portal"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
            title="Voltar ao Portal"
          >
            <SchoolLogo size={28} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
          </Link>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">
              {APP_BRAND_NAME}
            </div>
            <h1 className="text-base font-black leading-tight text-slate-900 sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-0.5 hidden text-[11px] font-bold text-slate-600 sm:block sm:text-xs">{subtitle}</p> : null}
            <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs font-extrabold text-slate-700 sm:mt-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-[11px] font-black text-slate-600">
                {teacherAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={teacherAvatarUrl} alt="Avatar do usuário" className="h-full w-full object-cover" />
                ) : (
                  <span>{safeTeacherName.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0 truncate">
                {safeTeacherName}
                {shouldShowEmail ? (
                  <span className="ml-0 block truncate text-slate-500 sm:ml-2 sm:inline">{safeTeacherEmail}</span>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:overflow-visible sm:pb-0">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 sm:h-10"
            >
              {backLabel}
            </Link>
          ) : null}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
