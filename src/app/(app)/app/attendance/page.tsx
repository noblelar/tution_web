import { AttendanceManagement } from "@/components/attendance";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { tutorNavigation } from "@/components/dashboard/tutor-navigation";

export default function TutorAttendancePage() {
  return (
    <DashboardShell
      defaultDisplayName="Tutor"
      homeHref="/app"
      navigation={tutorNavigation}
      navigationLabel="Tutor navigation"
      searchPlaceholder="Search your Tution workspace"
    >
      <main className="management-shell">
        <header className="management-header">
          <div>
            <p className="eyebrow">Tutor workspace</p>
            <h1>Attendance</h1>
            <p className="mt-3 max-w-3xl text-slate-500">Open assigned session rosters and record present, late, absent, or excused attendance.</p>
          </div>
        </header>
        <AttendanceManagement tutorWorkspace />
      </main>
    </DashboardShell>
  );
}
