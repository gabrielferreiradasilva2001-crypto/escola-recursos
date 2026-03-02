import { NextResponse } from "next/server";
import { requireUser } from "../../_auth";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

const BUCKET = "profile-photos";
const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function ensureBucketExists() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if ((buckets ?? []).some((b) => b.name === BUCKET)) return;
  await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_SIZE_BYTES}`,
    allowedMimeTypes: Array.from(ALLOWED_TYPES),
  });
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response || !user) return response;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Formato inválido. Use JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Limite: 4MB." },
        { status: 400 }
      );
    }

    await ensureBucketExists();

    const ext = extFromType(file.type);
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadErr) {
      return NextResponse.json({ error: "Falha no upload da foto." }, { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const previousPath = String(user.user_metadata?.avatar_path ?? "").trim();
    const nextMetadata = {
      ...(user.user_metadata ?? {}),
      avatar_url: pub.publicUrl,
      avatar_path: path,
    };
    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: nextMetadata,
    });
    if (metaErr) {
      return NextResponse.json({ error: "Foto enviada, mas não foi possível salvar o perfil." }, { status: 500 });
    }

    if (previousPath && previousPath !== path) {
      await supabaseAdmin.storage.from(BUCKET).remove([previousPath]);
    }

    return NextResponse.json({ ok: true, avatarUrl: pub.publicUrl, avatarPath: path });
  } catch {
    return NextResponse.json({ error: "Erro inesperado ao atualizar foto." }, { status: 500 });
  }
}
