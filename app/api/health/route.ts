import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "escola-recursos",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "unknown",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      region: process.env.VERCEL_REGION || "local",
      uptimeSeconds: Math.floor(process.uptime()),
    },
    { status: 200 }
  );
}

