import type { TutorAvailability, TutorAvailabilityList } from "@/lib/tutor-availability-types";

export type BackendTutorAvailability = {
  id: string;
  organization_id: string;
  centre_id: string;
  centre_name: string;
  tutor_profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type BackendTutorAvailabilityList = {
  availability: BackendTutorAvailability[];
};

export function mapTutorAvailability(input: BackendTutorAvailability): TutorAvailability {
  return {
    id: input.id,
    organizationId: input.organization_id,
    centreId: input.centre_id,
    centreName: input.centre_name,
    tutorProfileId: input.tutor_profile_id,
    dayOfWeek: input.day_of_week,
    startTime: input.start_time,
    endTime: input.end_time,
    status: input.status,
    createdAt: input.created_at,
    updatedAt: input.updated_at,
  };
}

export function mapTutorAvailabilityList(input: BackendTutorAvailabilityList): TutorAvailabilityList {
  return { availability: (input.availability ?? []).map(mapTutorAvailability) };
}
