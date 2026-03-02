"use client";

import { useEffect } from "react";
import { reportClientError } from "../../lib/monitoring";

export default function ErrorMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportClientError({
        message: event.message || "Client runtime error",
        stack: event.error?.stack,
        source: "window.onerror",
        pathname: window.location.pathname,
        userAgent: navigator.userAgent,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
      const stack = reason instanceof Error ? reason.stack : undefined;
      void reportClientError({
        message,
        stack,
        source: "unhandledrejection",
        pathname: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

