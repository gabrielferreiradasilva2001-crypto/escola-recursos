import fs from "node:fs/promises";
import path from "node:path";

type LogoManifest = Record<string, string>;

const LOGOS_DIR = path.join(process.cwd(), "public", "school-logos");
const LEGACY_LOGOS_DIR = path.join(process.cwd(), "public", "logo-escolas");
const MANIFEST_PATH = path.join(LOGOS_DIR, "manifest.json");
const DEFAULT_LOGO_PATH = path.join(process.cwd(), "public", "favicon-eeav-2026.png");
const DEFAULT_LOGO_PUBLIC_URL = "/favicon-eeav-2026.png";

function safeSchoolId(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

async function fileExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findLogoPathBySchoolId(dirPath: string, schoolId: string) {
  const candidates = ["png", "jpg", "jpeg", "webp", "svg"].map((ext) =>
    path.join(dirPath, `${schoolId}.${ext}`)
  );
  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }
  return "";
}

export async function readSchoolLogoManifest(): Promise<LogoManifest> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.entries(parsed as Record<string, unknown>).reduce<LogoManifest>((acc, [key, val]) => {
      if (typeof val !== "string" || !val.trim()) return acc;
      acc[key] = val.trim();
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export async function writeSchoolLogoManifest(next: LogoManifest) {
  await fs.mkdir(LOGOS_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(next, null, 2), "utf8");
}

export async function getSchoolLogoPublicUrl(schoolId?: string | null) {
  const safeId = safeSchoolId(String(schoolId ?? ""));
  if (!safeId) return DEFAULT_LOGO_PUBLIC_URL;

  const manifest = await readSchoolLogoManifest();
  const fileName = manifest[safeId];
  if (fileName) return `/school-logos/${fileName}`;

  const ownPath = await findLogoPathBySchoolId(LOGOS_DIR, safeId);
  if (ownPath) return `/school-logos/${path.basename(ownPath)}`;

  const legacyPath = await findLogoPathBySchoolId(LEGACY_LOGOS_DIR, safeId);
  if (legacyPath) return `/logo-escolas/${path.basename(legacyPath)}`;

  return DEFAULT_LOGO_PUBLIC_URL;
}

export async function loadSchoolLogoDataUrl(schoolId?: string | null) {
  try {
    const safeId = safeSchoolId(String(schoolId ?? ""));
    let targetPath = DEFAULT_LOGO_PATH;
    if (safeId) {
      const manifest = await readSchoolLogoManifest();
      const fileName = manifest[safeId];
      if (fileName) {
        targetPath = path.join(LOGOS_DIR, fileName);
      } else {
        const ownPath = await findLogoPathBySchoolId(LOGOS_DIR, safeId);
        const legacyPath = await findLogoPathBySchoolId(LEGACY_LOGOS_DIR, safeId);
        targetPath = ownPath || legacyPath || DEFAULT_LOGO_PATH;
      }
    }
    const data = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const mime =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
        ? "image/webp"
        : ext === ".svg"
        ? "image/svg+xml"
        : "image/png";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}
