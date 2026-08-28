export interface CareersPosition {
  id: string;
  title: string;
  location_id: string | null;
  region: string;
  status: string;
}

export interface CareersLocation {
  active: boolean | null;
  region?: string | null;
}

export function isPositionAcceptingApplications(
  position: Pick<CareersPosition, "location_id" | "status">,
  location?: CareersLocation | null,
): boolean {
  if (position.status !== "open") return false;
  if (!position.location_id) return true;
  return !!location && location.active !== false;
}

export function buildPrimaryCandidatePatch(
  position: CareersPosition,
  existingStatus: string | undefined,
  updatedAt: string,
): Record<string, unknown> | null {
  if (existingStatus === "hired") return null;

  return {
    position_id: position.id,
    location_id: position.location_id,
    region: position.region || "",
    applied_role: position.title,
    updated_at: updatedAt,
    stage: "applied",
    status: "active",
  };
}
