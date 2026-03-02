export type PortalRole = "professor" | "estagiario" | "diretor" | "secretaria" | "coordenador";

type UserWithMetadata = {
  user_metadata?: Record<string, unknown> | null;
} | null;

export function resolvePortalRole(user: UserWithMetadata): PortalRole {
  const raw = String(user?.user_metadata?.management_role ?? "").trim().toLowerCase();
  if (raw === "estagiario") return "estagiario";
  if (raw === "diretor") return "diretor";
  if (raw === "secretaria") return "secretaria";
  if (raw === "coordenador") return "coordenador";
  return "professor";
}
