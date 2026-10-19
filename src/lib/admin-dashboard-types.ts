export type DashboardCentre = {
  id: string;
  name: string;
  timeZone: string;
};

export type DashboardCounts = {
  activeStudents: number;
  activeTutors: number;
  activeCentres: number;
  sessionsToday: number;
  sessionsNext7Days: number;
  confirmedBookings: number;
  waitlistedBookings: number;
  creditsRequiredBookings: number;
  capacitySeats: number;
  occupiedSeats: number;
  capacitySessions: number;
};

export type DashboardBucket = {
  key: string;
  label: string;
  count: number;
};

export type DashboardWeeklyPoint = {
  weekStart: string;
  sessions: number;
  confirmedBookings: number;
};

export type DashboardCharts = {
  attendance: DashboardBucket[];
  ageBands: DashboardBucket[];
  academicLevels: DashboardBucket[];
  subjectDemand: DashboardBucket[];
  weeklyTrend: DashboardWeeklyPoint[];
};

export type DashboardAcademicYear = { id: string; name: string; status: string };

export type DashboardAlerts = {
  pendingTutors: number;
  pendingManagers: number;
  pendingGuardians: number;
  pendingStudents: number;
  unresolvedQueries: number;
  failedDeliveries: Array<{ messageType: string; count: number; latestAt: string }>;
};

export type AdminDashboard = {
  centres: DashboardCentre[];
  academicYears: DashboardAcademicYear[];
  selectedAcademicYearId?: string;
  selectedCentreId?: string;
  scope: "organization" | "assigned_centres" | "centre";
  timeZone: string;
  from: string;
  through: string;
  generatedAt: string;
  counts: DashboardCounts;
  charts: DashboardCharts;
  alerts: DashboardAlerts;
};
