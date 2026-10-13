export type AcademicStatus = "active" | "inactive";
export type AcademicYearStatus = "planned" | "current" | "closed";

export type AcademicLevel = {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  displayOrder: number;
  status: AcademicStatus;
  createdAt: string;
  updatedAt: string;
};

export type Subject = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
  status: AcademicStatus;
  createdAt: string;
  updatedAt: string;
};

export type AcademicYear = {
  id: string;
  organizationId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  createdAt: string;
  updatedAt: string;
};

export type TutorCapability = {
  id: string;
  organizationId: string;
  tutorProfileId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectStatus: AcademicStatus;
  academicLevelId: string;
  academicLevelName: string;
  academicLevelStatus: AcademicStatus;
  isPrimarySubject: boolean;
  status: AcademicStatus;
  createdAt: string;
  updatedAt: string;
};

export type AcademicLevelList = { levels: AcademicLevel[] };
export type SubjectList = { subjects: Subject[] };
export type AcademicYearList = { academicYears: AcademicYear[] };
export type TutorCapabilityList = { capabilities: TutorCapability[] };
