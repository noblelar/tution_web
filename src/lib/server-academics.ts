import "server-only";

import {
  AcademicLevel,
  AcademicLevelList,
  Subject,
  SubjectList,
} from "@/lib/academic-types";

export type BackendAcademicLevel = {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  display_order: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type BackendSubject = BackendAcademicLevel & { code: string };
export type BackendAcademicLevelList = { levels: BackendAcademicLevel[] };
export type BackendSubjectList = { subjects: BackendSubject[] };

export function mapAcademicLevel(level: BackendAcademicLevel): AcademicLevel {
  return {
    id: level.id,
    organizationId: level.organization_id,
    name: level.name,
    description: level.description,
    displayOrder: level.display_order,
    status: level.status,
    createdAt: level.created_at,
    updatedAt: level.updated_at,
  };
}

export function mapSubject(subject: BackendSubject): Subject {
  return { ...mapAcademicLevel(subject), code: subject.code };
}

export function mapAcademicLevelList(list: BackendAcademicLevelList): AcademicLevelList {
  return { levels: (list.levels ?? []).map(mapAcademicLevel) };
}

export function mapSubjectList(list: BackendSubjectList): SubjectList {
  return { subjects: (list.subjects ?? []).map(mapSubject) };
}
