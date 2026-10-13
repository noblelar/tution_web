import type { StageThreeReadiness } from "@/lib/stage-three-readiness-types";

export type BackendStageThreeReadiness = {
  centre_id: string;
  ready: boolean;
  status: "ready" | "attention" | "blocked";
  counts: {
    active_academic_years: number;
    active_academic_levels: number;
    active_subjects: number;
    active_tutors: number;
    tutors_with_capabilities: number;
    tutors_with_availability: number;
    active_students: number;
    students_with_current_placement: number;
  };
  blockers: string[];
  warnings: string[];
  generated_at: string;
};

export function mapStageThreeReadiness(input: BackendStageThreeReadiness): StageThreeReadiness {
  return {
    centreId: input.centre_id,
    ready: input.ready,
    status: input.status,
    counts: {
      activeAcademicYears: input.counts.active_academic_years,
      activeAcademicLevels: input.counts.active_academic_levels,
      activeSubjects: input.counts.active_subjects,
      activeTutors: input.counts.active_tutors,
      tutorsWithCapabilities: input.counts.tutors_with_capabilities,
      tutorsWithAvailability: input.counts.tutors_with_availability,
      activeStudents: input.counts.active_students,
      studentsWithCurrentPlacement: input.counts.students_with_current_placement,
    },
    blockers: input.blockers ?? [],
    warnings: input.warnings ?? [],
    generatedAt: input.generated_at,
  };
}
