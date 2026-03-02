import { NextResponse } from "next/server";
import { supabaseAdmin } from "../teachers/_supabaseAdmin";
import { requireUser } from "../_auth";
import { getViewerSchoolScope } from "../_schoolScope";

const BUCKET = "school-activity-photos";
const MAX_FILES = 15;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type SubmissionRow = {
  id: string;
  batch_id: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  location: string | null;
  description: string;
  photo_name: string;
  photo_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: "pending" | "published" | "rejected";
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
};

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

async function buildSignedRows(rows: SubmissionRow[]) {
  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(row.photo_path, 60 * 60);
      return {
        ...row,
        url: signed?.signedUrl ?? "",
      };
    })
  );
}

export async function GET(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") ?? "").trim();

  let query = supabaseAdmin
    .from("activity_submissions")
    .select(
      "id,batch_id,created_at,created_by,created_by_name,location,description,photo_name,photo_path,mime_type,size_bytes,status,reviewed_at,reviewed_by,review_note"
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  if (status === "pending" || status === "published" || status === "rejected") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = await buildSignedRows((data ?? []) as SubmissionRow[]);
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const form = await req.formData();
  const description = String(form.get("description") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  const photoEntries = form.getAll("photos");
  const files = photoEntries.filter((entry): entry is File => entry instanceof File);

  if (!description || description.length < 5) {
    return NextResponse.json(
      { error: "Descreva a atividade com pelo menos 5 caracteres." },
      { status: 400 }
    );
  }
  if (!location) {
    return NextResponse.json({ error: "Selecione a escola/unidade da atividade." }, { status: 400 });
  }

  const viewerScope = await getViewerSchoolScope(user);
  const { data: schools, error: schoolsError } = await supabaseAdmin
    .from("schools")
    .select("id,name,active")
    .order("name");

  if (schoolsError) {
    return NextResponse.json({ error: schoolsError.message }, { status: 500 });
  }

  const visibleSchools = viewerScope.isSuperAdmin
    ? (schools ?? [])
    : (schools ?? []).filter((school) => viewerScope.allowedSchoolIds.includes(String(school.id)));
  const allowedNames = new Set(
    visibleSchools
      .filter((school) => school.active !== false)
      .map((school) => String(school.name ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
  const legacyNames = new Set(["eeav - sede", "eeav - extensão"]);
  const locationNormalized = location.toLowerCase();
  if (allowedNames.size && !allowedNames.has(locationNormalized) && !legacyNames.has(locationNormalized)) {
    return NextResponse.json({ error: "Selecione uma escola válida para o seu perfil." }, { status: 400 });
  }
  if (!files.length) {
    return NextResponse.json({ error: "Selecione ao menos uma foto." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Envie no máximo ${MAX_FILES} fotos por atividade.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Todos os arquivos devem ser imagens." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Cada imagem deve ter no máximo ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB.` },
        { status: 400 }
      );
    }
  }

  const createdByName =
    String(user.user_metadata?.name ?? "").trim() ||
    String(user.user_metadata?.username ?? "").trim() ||
    user.email ||
    "Usuário";

  const batchId = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const fileName = safeName(file.name || `foto-${index + 1}.jpg`);
      const filePath = `${safeName(user.id)}/${batchId}/${Date.now()}-${index + 1}-${fileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Falha ao enviar foto.");
      }

      uploadedPaths.push(filePath);
    }

    const rows = uploadedPaths.map((path, idx) => {
      const file = files[idx];
      return {
        batch_id: batchId,
        created_by: user.id,
        created_by_name: createdByName,
        location,
        description,
        photo_name: file.name || `foto-${idx + 1}`,
        photo_path: path,
        mime_type: file.type || null,
        size_bytes: file.size || null,
        status: "pending" as const,
      };
    });

    const { error: insertError } = await supabaseAdmin.from("activity_submissions").insert(rows);
    if (insertError) {
      await supabaseAdmin.storage.from(BUCKET).remove(uploadedPaths);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, batch_id: batchId, count: rows.length });
  } catch (err) {
    if (uploadedPaths.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(uploadedPaths);
    }
    const message = err instanceof Error ? err.message : "Falha ao enviar fotos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const body = await req.json().catch(() => ({}));
  const batchId = String(body?.batch_id ?? "").trim();
  if (!batchId) {
    return NextResponse.json({ error: "Lote inválido." }, { status: 400 });
  }

  const { data: rows, error: readErr } = await supabaseAdmin
    .from("activity_submissions")
    .select("id,photo_path,created_by")
    .eq("batch_id", batchId)
    .eq("created_by", user.id);
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!rows?.length) {
    return NextResponse.json(
      { error: "Envio não encontrado ou sem permissão para excluir." },
      { status: 404 }
    );
  }

  const paths = rows.map((row) => String(row.photo_path ?? "")).filter(Boolean);
  if (paths.length) {
    const { error: storageErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
    if (storageErr) {
      return NextResponse.json(
        { error: storageErr.message ?? "Falha ao remover fotos do storage." },
        { status: 500 }
      );
    }
  }

  const { error: delErr } = await supabaseAdmin
    .from("activity_submissions")
    .delete()
    .eq("batch_id", batchId)
    .eq("created_by", user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, removed: rows.length });
}
