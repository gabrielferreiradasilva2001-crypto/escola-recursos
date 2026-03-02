import { NextResponse } from "next/server";
import { normalizeErrorPayload, reportServerError } from "../../../../lib/monitoring";
import { captureServerException } from "../../../../lib/serverMonitoring";

export async function POST(req: Request) {
  try {
    const payload = normalizeErrorPayload(
      (await req.json().catch(() => ({}))) as {
        message?: string;
        stack?: string;
        source?: string;
        pathname?: string;
        userAgent?: string;
        context?: Record<string, unknown>;
      }
    );

    if (!payload.message?.trim()) {
      return NextResponse.json({ ok: false, error: "Mensagem obrigatória." }, { status: 400 });
    }

    reportServerError(new Error(payload.message), {
      source: payload.source || "client",
      pathname: payload.pathname,
      userAgent: payload.userAgent,
      stack: payload.stack,
      context: payload.context,
    });
    await captureServerException(new Error(payload.message), {
      source: payload.source || "client",
      pathname: payload.pathname,
      userAgent: payload.userAgent,
      stack: payload.stack,
      context: payload.context,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    reportServerError(error, { route: "/api/monitoring/error" });
    await captureServerException(
      error instanceof Error ? error : new Error("Falha ao registrar erro em monitoring/error"),
      { source: "api/monitoring/error" }
    );
    return NextResponse.json({ ok: false, error: "Falha ao registrar erro." }, { status: 500 });
  }
}
