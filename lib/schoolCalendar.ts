import fs from "node:fs/promises";
import path from "node:path";

type CalendarManifest = Record<string, string>;

const CALENDAR_DIR = path.join(process.cwd(), "public", "school-calendars");
const MANIFEST_PATH = path.join(CALENDAR_DIR, "manifest.json");
const DEFAULT_CALENDAR_PUBLIC_URL = "/calendario_escolar_SED_2026.pdf";

function safeSchoolId(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function readSchoolCalendarManifest(): Promise<CalendarManifest> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.entries(parsed as Record<string, unknown>).reduce<CalendarManifest>((acc, [key, val]) => {
      if (typeof val !== "string" || !val.trim()) return acc;
      acc[key] = val.trim();
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export async function writeSchoolCalendarManifest(next: CalendarManifest) {
  await fs.mkdir(CALENDAR_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(next, null, 2), "utf8");
}

export async function setCalendarForSchools(schoolIds: string[], fileName: string) {
  const ids = Array.from(new Set(schoolIds.map((id) => safeSchoolId(id)).filter(Boolean)));
  if (!ids.length) return;
  const manifest = await readSchoolCalendarManifest();
  ids.forEach((id) => {
    manifest[id] = fileName;
  });
  await writeSchoolCalendarManifest(manifest);
}

export async function getSchoolCalendarPublicUrl(schoolId?: string | null) {
  const safeId = safeSchoolId(String(schoolId ?? ""));
  if (!safeId) return DEFAULT_CALENDAR_PUBLIC_URL;
  const manifest = await readSchoolCalendarManifest();
  const fileName = manifest[safeId];
  if (!fileName) return DEFAULT_CALENDAR_PUBLIC_URL;
  return `/school-calendars/${fileName}`;
}

export async function saveCalendarPdfFile(buffer: Buffer, originalName = "calendario.pdf") {
  const ext = path.extname(originalName).toLowerCase() === ".pdf" ? ".pdf" : ".pdf";
  await fs.mkdir(CALENDAR_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).slice(2, 8);
  const fileName = `calendar-${stamp}-${random}${ext}`;
  const targetPath = path.join(CALENDAR_DIR, fileName);
  await fs.writeFile(targetPath, buffer);
  return fileName;
}
