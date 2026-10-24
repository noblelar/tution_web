import { BookingManagement } from "@/components/bookings";

export default function AdminBookingsPage() {
  return (
    <main className="management-shell">
      <header className="management-header"><div><h1>Bookings</h1></div></header>
      <BookingManagement />
    </main>
  );
}
