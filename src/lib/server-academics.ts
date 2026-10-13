import "server-only";

import {
  AcademicLevel,
  AcademicLevelList,
  AcademicYear,
  AcademicYearList,
  Subject,
  SubjectList,
  TutorCapability,
  TutorCapabilityList,
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
export type BackendAcademicYear = {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "current" | "closed";
  created_at: string;
  updated_at: string;
};
export type BackendAcademicLevelList = { levels: BackendAcademicLevel[] };
export type BackendSubjectList = { subjects: BackendSubject[] };
export type BackendAcademicYearList = { years: BackendAcademicYear[] };
export type BackendTutorCapability = {
  id: string;
  organization_id: string;
  tutor_profile_id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_status: "active" | "inactive";
  academic_level_id: string;
  academic_level_name: string;
  academic_level_status: "active" | "inactive";
  is_primary_subject: boolean;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};
export type BackendTutorCapabilityList = { capabilities: BackendTutorCapability[] };

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

export function mapAcademicYear(year: BackendAcademicYear): AcademicYear {
  return {
    id: year.id,
    organizationId: year.organization_id,
    name: year.name,
    startDate: year.start_date,
    endDate: year.end_date,
    status: year.status,
    createdAt: year.created_at,
    updatedAt: year.updated_at,
  };
}

export function mapTutorCapability(capability: BackendTutorCapability): TutorCapability {
  return {
    id: capability.id,
    organizationId: capability.organization_id,
    tutorProfileId: capability.tutor_profile_id,
    subjectId: capability.subject_id,
    subjectName: capability.subject_name,
    subjectCode: capability.subject_code,
    subjectStatus: capability.subject_status,
    academicLevelId: capability.academic_level_id,
    academicLevelName: capability.academic_level_name,
    academicLevelStatus: capability.academic_level_status,
    isPrimarySubject: capability.is_primary_subject,
    status: capability.status,
    createdAt: capability.created_at,
    updatedAt: capability.updated_at,
  };
}

export function mapAcademicLevelList(list: BackendAcademicLevelList): AcademicLevelList {
  return { levels: (list.levels ?? []).map(mapAcademicLevel) };
}

export function mapSubjectList(list: BackendSubjectList): SubjectList {
  return { subjects: (list.subjects ?? []).map(mapSubject) };
}

export function mapAcademicYearList(list: BackendAcademicYearList): AcademicYearList {
  return { academicYears: (list.years ?? []).map(mapAcademicYear) };
}

export function mapTutorCapabilityList(list: BackendTutorCapabilityList): TutorCapabilityList {
  return { capabilities: (list.capabilities ?? []).map(mapTutorCapability) };
}
