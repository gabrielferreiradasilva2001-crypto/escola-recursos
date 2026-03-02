"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  name: string;
  birth_day: number | null;
  birth_month: number | null;
  active: boolean;
};

type BirthdayGroup = {
  today: string[];
  tomorrow: string[];
  week: { name: string; label: string }[];
};

function normalizeName(name: string) {
  return name.trim();
}

function getTodayParts() {
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1 };
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function BirthdayOverlay() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [manualClosed, setManualClosed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      if (!token) {
        if (!active) return;
        setRows([]);
        return;
      }
      fetch("/api/teachers/birthdays", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((payload) => {
          if (!active) return;
          setRows(Array.isArray(payload?.data) ? payload.data : []);
        })
        .catch(() => {
          if (!active) return;
          setRows([]);
        });
    })();

    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo<BirthdayGroup>(() => {
    const today = new Date();
    const { day, month } = getTodayParts();
    const next = addDays(today, 1);
    const tomorrowDay = next.getDate();
    const tomorrowMonth = next.getMonth() + 1;

    const todayList: string[] = [];
    const tomorrowList: string[] = [];
    const weekList: { name: string; label: string }[] = [];

    rows.forEach((r) => {
      if (!r.birth_day || !r.birth_month) return;
      const name = normalizeName(r.name);
      if (r.birth_day === day && r.birth_month === month) {
        todayList.push(name);
      } else if (r.birth_day === tomorrowDay && r.birth_month === tomorrowMonth) {
        tomorrowList.push(name);
      }
    });

    for (let i = 0; i < 7; i += 1) {
      const d = addDays(today, i);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const dd = d.getDate();
      const mm = d.getMonth() + 1;
      rows.forEach((r) => {
        if (!r.birth_day || !r.birth_month) return;
        if (r.birth_day === dd && r.birth_month === mm) {
          weekList.push({ name: normalizeName(r.name), label });
        }
      });
    }

    return { today: todayList, tomorrow: tomorrowList, week: weekList };
  }, [rows]);

  useEffect(() => {
    if (manualClosed) return;
    if (!(grouped.today.length || grouped.tomorrow.length || grouped.week.length)) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const seenKey = `eeav_birthday_seen_${todayKey}`;
    if (localStorage.getItem(seenKey)) return;
    queueMicrotask(() => setOpen(true));
    const timer = window.setTimeout(() => {
      setOpen(false);
      localStorage.setItem(seenKey, "1");
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [grouped, manualClosed]);

  if (!open) return null;

  const hasToday = grouped.today.length > 0;
  const hasTomorrow = grouped.tomorrow.length > 0;

  return (
    <div className="birthday-overlay" role="dialog" aria-live="polite">
      <div className="birthday-confetti">
        {Array.from({ length: 18 }).map((_, idx) => (
          <span key={idx} className={`confetti confetti-${idx % 6}`} />
        ))}
      </div>

      <div className="birthday-card">
        <button
          type="button"
          className="birthday-close"
          onClick={() => {
            setManualClosed(true);
            setOpen(false);
            const todayKey = new Date().toISOString().slice(0, 10);
            localStorage.setItem(`eeav_birthday_seen_${todayKey}`, "1");
          }}
          aria-label="Fechar"
        >
          ✕
        </button>
        <div className="birthday-title">
          {hasToday ? "Parabéns! 🎉" : "Aviso de aniversário"}
        </div>
        <div className="birthday-sub">
          {hasToday ? (
            <div>
              A Escola Estadual Antônio Valadares te deseja um feliz aniversário,
              <b> {grouped.today.join(", ")}</b>!
            </div>
          ) : null}
          {hasTomorrow ? (
            <div>
              Amanhã é aniversário de: <b>{grouped.tomorrow.join(", ")}</b>
            </div>
          ) : null}
        </div>
        {grouped.week.length ? (
          <div className="birthday-week">
            <div className="birthday-week-title">Aniversariantes da semana</div>
            <div className="birthday-week-list">
              {grouped.week.map((b, idx) => (
                <div key={`${b.name}-${b.label}-${idx}`} className="birthday-week-item">
                  <span>🎂</span>
                  <span className="birthday-week-date">{b.label}</span>
                  <span className="birthday-week-name">{b.name}</span>
                  <span>🎈</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="birthday-emojis">🎂✨🎈🎉</div>
      </div>

      <style jsx>{`
        .birthday-overlay {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          z-index: 9999;
          background: radial-gradient(circle at top, rgba(56, 189, 248, 0.18), rgba(15, 23, 42, 0.4));
          backdrop-filter: blur(4px);
        }
        .birthday-card {
          position: relative;
          width: min(520px, 92vw);
          padding: 22px 22px 18px;
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240, 249, 255, 0.95));
          box-shadow: 0 18px 45px rgba(15,23,42,0.2);
          border: 1px solid rgba(148, 163, 184, 0.35);
          text-align: center;
        }
        .birthday-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
        }
        .birthday-sub {
          margin-top: 10px;
          font-size: 14px;
          color: #334155;
          display: grid;
          gap: 6px;
        }
        .birthday-emojis {
          margin-top: 10px;
          font-size: 18px;
        }
        .birthday-week {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(226, 232, 240, 0.8);
          text-align: left;
        }
        .birthday-week-title {
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .birthday-week-list {
          display: grid;
          gap: 6px;
          font-size: 12px;
        }
        .birthday-week-item {
          display: grid;
          grid-template-columns: auto auto 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 10px;
          background: rgba(248, 250, 252, 0.9);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .birthday-week-date {
          font-weight: 900;
          color: rgba(15, 23, 42, 0.75);
        }
        .birthday-week-name {
          font-weight: 900;
          color: rgba(15, 23, 42, 0.95);
        }
        .birthday-close {
          position: absolute;
          top: 10px;
          right: 10px;
          border: 0;
          background: rgba(15, 23, 42, 0.08);
          color: #0f172a;
          font-weight: 900;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
        }
        .birthday-confetti {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .confetti {
          position: absolute;
          top: -10px;
          width: 10px;
          height: 18px;
          border-radius: 3px;
          opacity: 0.85;
          animation: fall 6.5s linear infinite;
        }
        .confetti-0 { left: 8%; background: #38bdf8; animation-delay: 0s; }
        .confetti-1 { left: 18%; background: #34d399; animation-delay: 0.6s; }
        .confetti-2 { left: 30%; background: #f59e0b; animation-delay: 1.1s; }
        .confetti-3 { left: 45%; background: #f472b6; animation-delay: 0.2s; }
        .confetti-4 { left: 62%; background: #a78bfa; animation-delay: 0.9s; }
        .confetti-5 { left: 78%; background: #60a5fa; animation-delay: 1.4s; }

        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(120vh) rotate(300deg); opacity: 0.2; }
        }

        @media (max-width: 520px) {
          .birthday-card {
            padding: 18px 16px;
          }
          .birthday-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
