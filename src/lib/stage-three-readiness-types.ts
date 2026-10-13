export type StageThreeReadinessCounts = {
  activeAcademicYears: number;
  activeAcademicLevels: number;
  activeSubjects: number;
  activeTutors: number;
  tutorsWithCapabilities: number;
  tutorsWithAvailability: number;
  activeStudents: number;
  studentsWithCurrentPlacement: number;
};

export type StageThreeReadiness = {
  centreId: string;
  ready: boolean;
  status: "ready" | "attention" | "blocked";
  counts: StageThreeReadinessCounts;
  blockers: string[];
  warnings: string[];
  generatedAt: string;
};
