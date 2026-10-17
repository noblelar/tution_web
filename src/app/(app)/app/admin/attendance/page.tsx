import { AttendanceManagement } from "@/components/attendance";

export default function AdminAttendancePage() {
  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <p className="eyebrow">Tution administration</p>
          <h1>Attendance</h1>
          <p className="mt-3 max-w-3xl text-slate-500">Manage session rosters, record attendance, settle credits, and prepare secure QR self-check-in.</p>
        </div>
      </header>
      <AttendanceManagement />
    </main>
  );
}
