"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function detectIsImage(url: string, name: string) {
  const source = `${url} ${name}`.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"].some((ext) => source.includes(ext));
}
function detectIsPdf(url: string, name: string) {
  const source = `${url} ${name}`.toLowerCase();
  return source.includes(".pdf");
}

async function trimImageWhiteBorders(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let top = height;
        let left = width;
        let right = -1;
        let bottom = -1;
        const whiteThreshold = 245;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            const isWhitePixel = r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;
            if (a > 10 && !isWhitePixel) {
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        }

        if (right < left || bottom < top) return resolve(src);

        const w = right - left + 1;
        const h = bottom - top + 1;
        const out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        const outCtx = out.getContext("2d");
        if (!outCtx) return resolve(src);
        outCtx.drawImage(canvas, left, top, w, h, 0, 0, w, h);
        resolve(out.toDataURL("image/png"));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export default function PrintFilePage() {
  const searchParams = useSearchParams();
  const fileUrl = (searchParams.get("url") || "").trim();
  const fileName = (searchParams.get("name") || "Arquivo").trim();
  const isImage = useMemo(() => detectIsImage(fileUrl, fileName), [fileName, fileUrl]);
  const isPdf = useMemo(() => detectIsPdf(fileUrl, fileName), [fileName, fileUrl]);
  const proxiedUrl = useMemo(
    () => (fileUrl ? `/api/print-proxy?url=${encodeURIComponent(fileUrl)}` : ""),
    [fileUrl]
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [viewSrc, setViewSrc] = useState(proxiedUrl || fileUrl);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fileUrl) {
        if (alive) setLoading(false);
        return;
      }
      if (!isImage) {
        if (alive) {
          setViewSrc(proxiedUrl || fileUrl);
          setLoading(false);
        }
        return;
      }
      const trimmed = await trimImageWhiteBorders(proxiedUrl || fileUrl);
      if (!alive) return;
      setViewSrc(trimmed);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [fileUrl, isImage, proxiedUrl]);

  if (!fileUrl) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-800">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          Arquivo não informado.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { margin: 0 !important; }
          .hide-print { display: none !important; }
          .print-area {
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .print-image {
            width: auto !important;
            max-width: 100vw !important;
            height: auto !important;
            max-height: 100vh !important;
            object-fit: contain !important;
            display: block !important;
          }
          .print-frame {
            width: 100% !important;
            height: 100vh !important;
            border: 0 !important;
          }
          .print-frame-pdf {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            border: 0 !important;
          }
        }
      `}</style>

      <header className="hide-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{fileName}</div>
            <div className="text-xs font-semibold text-slate-500">
              {isImage ? "Visualização ajustada para impressão" : "Arquivo aberto para impressão"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              Original
            </a>
            <button
              type="button"
              onClick={() => {
                if (isPdf && iframeRef.current?.contentWindow) {
                  iframeRef.current.contentWindow.focus();
                  iframeRef.current.contentWindow.print();
                  return;
                }
                window.print();
              }}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white hover:bg-emerald-600"
            >
              Imprimir
            </button>
          </div>
        </div>
      </header>

      <section className="print-area mx-auto flex max-w-6xl items-center justify-center p-4">
        {loading ? (
          <div className="hide-print rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
            Ajustando visualização...
          </div>
        ) : isImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewSrc}
              alt={fileName}
              className="print-image block max-h-[calc(100vh-6rem)] max-w-full object-contain"
            />
          </>
        ) : (
          <iframe
            ref={iframeRef}
            src={viewSrc}
            title={fileName}
            className={`print-frame h-[calc(100vh-6rem)] w-full rounded-xl border border-slate-200 bg-white ${
              isPdf ? "print-frame-pdf" : ""
            }`}
          />
        )}
      </section>
    </main>
  );
}
