export type TutorAvailabilityStatus = "active" | "inactive";

export type TutorAvailability = {
  id: string;
  organizationId: string;
  centreId: string;
  centreName: string;
  tutorProfileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: TutorAvailabilityStatus;
  createdAt: string;
  updatedAt: string;
};

export type TutorAvailabilityList = {
  availability: TutorAvailability[];
};
