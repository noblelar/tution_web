import { AttendanceManagement } from "@/components/attendance";

export default function AdminAttendancePage() {
  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <h1>Attendance</h1>
        </div>
      </header>
      <AttendanceManagement />
    </main>
  );
}
