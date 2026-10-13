export type StudentPlacementStatus = "active" | "inactive";

export type StudentPlacement = {
  id: string;
  organizationId: string;
  centreId: string;
  studentProfileId: string;
  academicYearId: string;
  academicLevelId: string;
  status: StudentPlacementStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudentPlacementList = {
  placements: StudentPlacement[];
};
