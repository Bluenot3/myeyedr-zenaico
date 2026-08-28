import { describe, expect, it } from "vitest";
import {
  buildPrimaryCandidatePatch,
  isPositionAcceptingApplications,
  type CareersPosition,
} from "../../supabase/functions/_shared/careers-routing.ts";

const position: CareersPosition = {
  id: "position-new",
  title: "Assistant General Manager",
  location_id: "location-havertown",
  region: "Delaware",
  status: "open",
};

describe("careers job availability", () => {
  it("publishes only open jobs attached to active offices", () => {
    expect(isPositionAcceptingApplications(position, { active: true })).toBe(true);
    expect(isPositionAcceptingApplications(position, { active: false })).toBe(false);
    expect(isPositionAcceptingApplications(position, null)).toBe(false);
    expect(isPositionAcceptingApplications({ ...position, status: "closed" }, { active: true })).toBe(false);
  });

  it("allows open network-wide jobs without a location", () => {
    expect(isPositionAcceptingApplications({ ...position, location_id: null }, null)).toBe(true);
  });
});

describe("returning applicant routing", () => {
  it("moves a returning applicant's canonical pointer to the selected job", () => {
    expect(buildPrimaryCandidatePatch(position, "active", "2026-08-27T12:00:00.000Z")).toEqual({
      position_id: "position-new",
      location_id: "location-havertown",
      region: "Delaware",
      applied_role: "Assistant General Manager",
      stage: "applied",
      status: "active",
      updated_at: "2026-08-27T12:00:00.000Z",
    });
  });

  it("does not erase a hired candidate's lifecycle status", () => {
    const patch = buildPrimaryCandidatePatch(position, "hired", "2026-08-27T12:00:00.000Z");
    expect(patch).toBeNull();
  });
});
