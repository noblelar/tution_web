import type { StudentPlacement, StudentPlacementList } from "@/lib/student-placement-types";

export type BackendStudentPlacement = {
  id: string;
  organization_id: string;
  centre_id: string;
  student_profile_id: string;
  academic_year_id: string;
  academic_level_id: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type BackendStudentPlacementList = {
  placements: BackendStudentPlacement[];
};

export function mapStudentPlacement(input: BackendStudentPlacement): StudentPlacement {
  return {
    id: input.id,
    organizationId: input.organization_id,
    centreId: input.centre_id,
    studentProfileId: input.student_profile_id,
    academicYearId: input.academic_year_id,
    academicLevelId: input.academic_level_id,
    status: input.status,
    createdAt: input.created_at,
    updatedAt: input.updated_at,
  };
}

export function mapStudentPlacementList(input: BackendStudentPlacementList): StudentPlacementList {
  return { placements: (input.placements ?? []).map(mapStudentPlacement) };
}
