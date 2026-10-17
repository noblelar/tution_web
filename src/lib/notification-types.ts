export type InAppNotification = {
  id: string;
  centreId?: string;
  centreName?: string;
  type: "weekly_booking_reminder" | "booking_credits_required";
  title: string;
  message: string;
  actionHref: string;
  availableAt: string;
  expiresAt: string;
  readAt?: string;
  createdAt: string;
};

export type NotificationList = {
  notifications: InAppNotification[];
  activeCount: number;
  unreadCount: number;
};

