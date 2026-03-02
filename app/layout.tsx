import type { Metadata, Viewport } from "next";
import "./globals.css";
import BirthdayOverlay from "./components/BirthdayOverlay";
import ForcePasswordGate from "./components/ForcePasswordGate";
import BackgroundCustomizer from "./components/BackgroundCustomizer";
import ErrorMonitor from "./components/ErrorMonitor";
import { APP_BROWSER_TITLE, APP_DESCRIPTION } from "../lib/branding";

export const metadata: Metadata = {
  title: APP_BROWSER_TITLE,
  description: APP_DESCRIPTION,
  icons: {
    icon: "/favicon-loop.png?v=20260301b",
    apple: "/favicon-loop.png?v=20260301b",
    shortcut: "/favicon.ico?v=20260301b",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <link rel="icon" href="/favicon-loop.png?v=20260301b" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico?v=20260301b" />
        <link rel="apple-touch-icon" href="/favicon-loop.png?v=20260301b" />
      </head>
      <body>
        <ErrorMonitor />
        <ForcePasswordGate />
        <BirthdayOverlay />
        <BackgroundCustomizer />
        {children}
      </body>
    </html>
  );
}
