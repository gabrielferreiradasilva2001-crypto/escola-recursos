import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { readSchoolLogoManifest, writeSchoolLogoManifest } from "../../../../lib/schoolBranding";

const LOGOS_DIR = path.join(process.cwd(), "public", "school-logos");
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

function safeSchoolId(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

function extForType(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/svg+xml") return "svg";
  return "png";
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const viewerScope = await getViewerSchoolScope(user);

  try {
    const form = await req.formData();
    const schoolIdRaw = String(form.get("school_id") ?? "");
    const schoolId = safeSchoolId(schoolIdRaw);
    const logo = form.get("logo");

    if (!schoolId) {
      return NextResponse.json({ error: "Escola inválida." }, { status: 400 });
    }
    if (!viewerScope.isSuperAdmin && !hasSchoolAccess(viewerScope, schoolId)) {
      return NextResponse.json({ error: "Você não pode alterar logo de outra escola." }, { status: 403 });
    }
    if (!(logo instanceof File)) {
      return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(logo.type)) {
      return NextResponse.json({ error: "Formato inválido. Use PNG, JPG, WEBP ou SVG." }, { status: 400 });
    }
    if (logo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "A imagem deve ter no máximo 5MB." }, { status: 400 });
    }

    await fs.mkdir(LOGOS_DIR, { recursive: true });

    const manifest = await readSchoolLogoManifest();
    const oldFile = manifest[schoolId];
    if (oldFile) {
      await fs.rm(path.join(LOGOS_DIR, oldFile), { force: true });
    }

    const ext = extForType(logo.type);
    const fileName = `${schoolId}.${ext}`;
    const buffer = Buffer.from(await logo.arrayBuffer());
    await fs.writeFile(path.join(LOGOS_DIR, fileName), buffer);

    const nextManifest = { ...manifest, [schoolId]: fileName };
    await writeSchoolLogoManifest(nextManifest);

    return NextResponse.json({
      ok: true,
      logo_url: `/school-logos/${fileName}?v=${Date.now()}`,
    });
  } catch {
    return NextResponse.json({ error: "Falha ao enviar logo da escola." }, { status: 500 });
  }
}
