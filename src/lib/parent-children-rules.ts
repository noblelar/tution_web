import type { BookingParticipant, SessionBooking } from "./booking-types";

export type ParentChildDirectoryItem = BookingParticipant & {
  upcomingBookings: SessionBooking[];
  nextBooking?: SessionBooking;
  walletBalance: number;
  bookingsRequiringCredits: number;
};

export function buildParentChildDirectory(
  participants: BookingParticipant[],
  bookings: SessionBooking[],
  now = Date.now(),
): ParentChildDirectoryItem[] {
  return participants
    .map((participant) => {
      const upcomingBookings = bookings
        .filter((booking) =>
          booking.studentProfileId === participant.studentProfileId &&
          booking.status !== "cancelled" &&
          new Date(booking.endsAt).getTime() > now,
        )
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

      return {
        ...participant,
        upcomingBookings,
        nextBooking: upcomingBookings[0],
        walletBalance: participant.wallets.reduce((total, wallet) => total + wallet.balanceCredits, 0),
        bookingsRequiringCredits: upcomingBookings.filter((booking) => booking.status === "credits_required").length,
      };
    })
    .sort((left, right) =>
      left.lastName.localeCompare(right.lastName) || left.firstName.localeCompare(right.firstName),
    );
}

export function filterParentChildDirectory(
  items: ParentChildDirectoryItem[],
  search: string,
  centreId: string,
): ParentChildDirectoryItem[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (centreId && item.centreId !== centreId) return false;
    if (!normalizedSearch) return true;
    return `${item.firstName} ${item.lastName} ${item.peopleCode} ${item.centreName}`
      .toLocaleLowerCase()
      .includes(normalizedSearch);
  });
}

export function parentChildDirectoryMetrics(items: ParentChildDirectoryItem[]) {
  return {
    children: items.length,
    centres: new Set(items.map((item) => item.centreId)).size,
    upcomingBookings: items.reduce((total, item) => total + item.upcomingBookings.length, 0),
    bookingsRequiringCredits: items.reduce((total, item) => total + item.bookingsRequiringCredits, 0),
  };
}
