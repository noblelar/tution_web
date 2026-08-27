export type AcademicStatus = "active" | "inactive";

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

export type AcademicLevelList = { levels: AcademicLevel[] };
export type SubjectList = { subjects: Subject[] };
