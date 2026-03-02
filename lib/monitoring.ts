export type MonitoringErrorPayload = {
  message: string;
  stack?: string;
  source?: string;
  pathname?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
};

function limitText(value: string, max = 2000) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function normalizeErrorPayload(input: MonitoringErrorPayload): MonitoringErrorPayload {
  return {
    message: limitText(String(input.message || "Erro desconhecido"), 800),
    stack: input.stack ? limitText(String(input.stack), 4000) : undefined,
    source: input.source ? limitText(String(input.source), 120) : undefined,
    pathname: input.pathname ? limitText(String(input.pathname), 240) : undefined,
    userAgent: input.userAgent ? limitText(String(input.userAgent), 260) : undefined,
    context: input.context ?? {},
  };
}

export async function reportClientError(payload: MonitoringErrorPayload) {
  try {
    const normalized = normalizeErrorPayload(payload);
    await fetch("/api/monitoring/error", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-monitor-source": "web-client" },
      body: JSON.stringify(normalized),
      keepalive: true,
    });
  } catch {
    // never break UX because of monitoring
  }
}

export function reportServerError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  const stack = error instanceof Error ? error.stack : undefined;
  const payload = normalizeErrorPayload({
    message,
    stack,
    source: "server",
    context,
  });
  console.error("[monitoring:error]", JSON.stringify(payload));
}
