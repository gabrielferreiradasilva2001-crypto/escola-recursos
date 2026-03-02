import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_supabaseAdmin";
import { resolveTeacherSchoolIdsForUser } from "../../_schoolScope";

export async function POST(req: Request) {
  try {
    await req.json().catch(() => ({}));

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ ok: true, data: null });
    }

    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user ?? null;
    const teacherId = String(user?.user_metadata?.teacher_id ?? "").trim();
    const userEmail = String(user?.email ?? "").trim().toLowerCase();
    const localUsername = userEmail.endsWith("@local.eeav")
      ? userEmail.replace("@local.eeav", "")
      : userEmail;

    let data: { id: string; name: string; school_ids: string[] | null } | null = null;
    let error: { message: string } | null = null;

    if (teacherId) {
      const byId = await supabaseAdmin
        .from("teachers")
        .select("id,name,school_ids")
        .eq("id", teacherId)
        .limit(1)
        .maybeSingle();
      data = (byId.data as { id: string; name: string; school_ids: string[] | null } | null) ?? null;
      error = byId.error ? { message: byId.error.message } : null;
    }

    if (!data && !error && userEmail) {
      const candidates = Array.from(new Set([userEmail, localUsername].filter(Boolean)));
      if (candidates.length) {
        const byEmail = await supabaseAdmin
          .from("teachers")
          .select("id,name,school_ids")
          .in("email", candidates)
          .limit(1)
          .maybeSingle();
        data = (byEmail.data as { id: string; name: string; school_ids: string[] | null } | null) ?? null;
        error = byEmail.error ? { message: byEmail.error.message } : null;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ ok: true, data: data ?? null });
    }

    const resolvedSchoolIds = await resolveTeacherSchoolIdsForUser(user);
    if (!data) {
      if (!resolvedSchoolIds.length) {
        return NextResponse.json({ ok: true, data: null });
      }
      const fallbackName = String(user.user_metadata?.name ?? "").trim() || null;
      const fallbackId = String(user.user_metadata?.teacher_id ?? "").trim() || null;
      return NextResponse.json({
        ok: true,
        data: {
          id: fallbackId ?? "",
          name: fallbackName ?? "",
          school_ids: resolvedSchoolIds,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        school_ids: resolvedSchoolIds,
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
