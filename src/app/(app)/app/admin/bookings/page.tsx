import { BookingManagement } from "@/components/bookings";

export default function AdminBookingsPage() {
  return (
    <main className="management-shell">
      <header className="management-header"><div><p className="eyebrow">Tution administration</p><h1>Bookings</h1><p className="mt-3 max-w-3xl text-slate-500">Manage confirmed places, waiting lists, student self-booking permissions, and booking-related refunds.</p></div></header>
      <BookingManagement />
    </main>
  );
}
