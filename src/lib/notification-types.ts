export type InAppNotification = {
  id: string;
  centreId?: string;
  centreName?: string;
  type:
    | "weekly_booking_reminder"
    | "booking_credits_required"
    | "session_feedback_published"
    | "session_feedback_withdrawn"
    | "feedback_query_created"
    | "feedback_query_assigned"
    | "feedback_query_reply"
    | "feedback_query_resolution_proposed"
    | "feedback_query_resolved"
    | "feedback_query_reopened";
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

