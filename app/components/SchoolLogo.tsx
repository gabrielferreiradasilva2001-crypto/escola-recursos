"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type SchoolRow = {
  id: string;
  name: string;
  logo_url?: string | null;
};

type SchoolLogoProps = {
  schoolId?: string | null;
  size?: number;
  className?: string;
  alt?: string;
};

const DEFAULT_LOGO_URL = "/favicon-eeav-2026.png";
const SCHOOL_LOGO_CACHE_KEY = "mutare_school_logo_cache_v1";

function initialsFromName(name: string) {
  const cleaned = name
    .replace(/^escola\s+(estadual|municipal)\s+/i, "")
    .trim();
  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => !["de", "da", "do", "das", "dos", "e"].includes(w.toLowerCase()));
  const initials = words.map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 3);
  return initials || "SC";
}

export default function SchoolLogo({
  schoolId,
  size = 32,
  className = "",
  alt = "Logo da escola",
}: SchoolLogoProps) {
  const [logoSrc, setLogoSrc] = useState<string>(DEFAULT_LOGO_URL);
  const [schoolName, setSchoolName] = useState<string>("");
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const remembered =
          !schoolId && typeof window !== "undefined"
            ? localStorage.getItem("mutare_selected_school_id") ?? ""
            : "";
        const preferredId = String(schoolId ?? remembered ?? "").trim();

        if (typeof window !== "undefined" && preferredId) {
          const rawCache = localStorage.getItem(SCHOOL_LOGO_CACHE_KEY);
          if (rawCache) {
            const cache = JSON.parse(rawCache) as Record<string, { name: string; logo_url: string }>;
            const cached = cache[preferredId];
            if (cached) {
              setSchoolName(cached.name || "");
              setLogoSrc(cached.logo_url || DEFAULT_LOGO_URL);
              setShowFallback(false);
            }
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/schools/list", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const schools = (payload?.data ?? []) as SchoolRow[];
        if (!schools.length) return;

        const chosen =
          schools.find((s) => s.id === preferredId) ??
          (schools.length === 1 ? schools[0] : schools[0]);

        if (typeof window !== "undefined") {
          const nextCache: Record<string, { name: string; logo_url: string }> = {};
          schools.forEach((s) => {
            nextCache[s.id] = {
              name: s.name || "",
              logo_url: String(s.logo_url ?? "").trim() || DEFAULT_LOGO_URL,
            };
          });
          localStorage.setItem(SCHOOL_LOGO_CACHE_KEY, JSON.stringify(nextCache));
        }

        if (!mounted || !chosen) return;
        setSchoolName(chosen.name || "");
        setLogoSrc(String(chosen.logo_url ?? "").trim() || DEFAULT_LOGO_URL);
        setShowFallback(false);
      } catch {
        // ignore
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [schoolId]);

  const initials = useMemo(() => initialsFromName(schoolName || "Escola"), [schoolName]);

  if (!showFallback && logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt={alt}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: "contain" }}
        onError={() => {
          setShowFallback(true);
          setLogoSrc("");
        }}
      />
    );
  }

  return (
    <span
      className={className}
      aria-label={alt}
      title={schoolName || "Escola"}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(241,245,249,0.9)",
        color: "#334155",
        fontSize: Math.max(9, Math.round(size * 0.28)),
        fontWeight: 900,
        letterSpacing: ".04em",
      }}
    >
      {initials}
    </span>
  );
}
