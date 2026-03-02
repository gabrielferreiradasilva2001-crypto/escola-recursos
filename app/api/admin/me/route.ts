import { NextResponse } from "next/server";
import { requireUser } from "../../_auth";
import { getAdminScope } from "../../_admin";
import { getViewerSchoolScope } from "../../_schoolScope";

export async function GET(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    const scope = await getAdminScope(user?.id ?? "");
    const schoolScope = user ? await getViewerSchoolScope(user) : { allowedSchoolIds: [] };
    return NextResponse.json({
      ok: true,
      isAdmin: scope.isAdmin,
      isSuperAdmin: scope.isSuperAdmin,
      allowedSchoolIds: schoolScope.allowedSchoolIds,
      allowedPeriods: scope.allowedPeriods,
      allowedLocations: scope.allowedLocations,
      defaultPeriod: scope.defaultPeriod,
      defaultLocation: scope.defaultLocation,
    });
  } catch {
    return NextResponse.json({ ok: false, isAdmin: false }, { status: 400 });
  }
}
