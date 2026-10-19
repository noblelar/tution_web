import "server-only";

import type { AdminDashboard } from "@/lib/admin-dashboard-types";

type BackendOverview = {
  centres: Array<{ id: string; name: string; time_zone: string }>;
  academic_years: Array<{ id: string; name: string; status: string }>;
  selected_academic_year_id?: string;
  selected_centre_id?: string;
  scope: AdminDashboard["scope"];
  time_zone: string;
  from: string;
  through: string;
  generated_at: string;
  counts: {
    active_students: number;
    active_tutors: number;
    active_centres: number;
    sessions_today: number;
    sessions_next_7_days: number;
    confirmed_bookings: number;
    waitlisted_bookings: number;
    credits_required_bookings: number;
    capacity_seats: number;
    occupied_seats: number;
    capacity_sessions: number;
  };
  charts: {
    attendance: Array<{ key: string; label: string; count: number }>;
    age_bands: Array<{ key: string; label: string; count: number }>;
    academic_levels: Array<{ key: string; label: string; count: number }>;
    subject_demand: Array<{ key: string; label: string; count: number }>;
    weekly_trend: Array<{ week_start: string; sessions: number; confirmed_bookings: number }>;
  };
  alerts: {
    pending_tutors: number;
    pending_managers: number;
    pending_guardians: number;
    pending_students: number;
    unresolved_queries: number;
    failed_deliveries: Array<{ message_type: string; count: number; latest_at: string }>;
  };
};

export function mapAdminDashboard(value: BackendOverview): AdminDashboard {
  return {
    centres: value.centres.map((centre) => ({ id: centre.id, name: centre.name, timeZone: centre.time_zone })),
    academicYears: value.academic_years.map((year) => ({ id: year.id, name: year.name, status: year.status })),
    selectedAcademicYearId: value.selected_academic_year_id,
    selectedCentreId: value.selected_centre_id,
    scope: value.scope,
    timeZone: value.time_zone,
    from: value.from,
    through: value.through,
    generatedAt: value.generated_at,
    counts: {
      activeStudents: value.counts.active_students,
      activeTutors: value.counts.active_tutors,
      activeCentres: value.counts.active_centres,
      sessionsToday: value.counts.sessions_today,
      sessionsNext7Days: value.counts.sessions_next_7_days,
      confirmedBookings: value.counts.confirmed_bookings,
      waitlistedBookings: value.counts.waitlisted_bookings,
      creditsRequiredBookings: value.counts.credits_required_bookings,
      capacitySeats: value.counts.capacity_seats,
      occupiedSeats: value.counts.occupied_seats,
      capacitySessions: value.counts.capacity_sessions,
    },
    charts: {
      attendance: value.charts.attendance,
      ageBands: value.charts.age_bands,
      academicLevels: value.charts.academic_levels,
      subjectDemand: value.charts.subject_demand,
      weeklyTrend: value.charts.weekly_trend.map((point) => ({
        weekStart: point.week_start,
        sessions: point.sessions,
        confirmedBookings: point.confirmed_bookings,
      })),
    },
    alerts: {
      pendingTutors: value.alerts.pending_tutors,
      pendingManagers: value.alerts.pending_managers,
      pendingGuardians: value.alerts.pending_guardians,
      pendingStudents: value.alerts.pending_students,
      unresolvedQueries: value.alerts.unresolved_queries,
      failedDeliveries: value.alerts.failed_deliveries.map((failure) => ({
        messageType: failure.message_type,
        count: failure.count,
        latestAt: failure.latest_at,
      })),
    },
  };
}

export type { BackendOverview };
