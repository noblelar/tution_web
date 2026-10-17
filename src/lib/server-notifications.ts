import "server-only";

import type { InAppNotification, NotificationList } from "@/lib/notification-types";

export type BackendInAppNotification = {
  id: string;
  centre_id?: string;
  centre_name?: string;
  type: InAppNotification["type"];
  title: string;
  message: string;
  action_href: string;
  available_at: string;
  expires_at: string;
  read_at?: string;
  created_at: string;
};

export type BackendNotificationList = {
  notifications: BackendInAppNotification[];
  active_count: number;
  unread_count: number;
};

export function mapNotification(value: BackendInAppNotification): InAppNotification {
  return {
    id: value.id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    type: value.type,
    title: value.title,
    message: value.message,
    actionHref: value.action_href,
    availableAt: value.available_at,
    expiresAt: value.expires_at,
    readAt: value.read_at,
    createdAt: value.created_at,
  };
}

export function mapNotificationList(value: BackendNotificationList): NotificationList {
  return {
    notifications: (value.notifications ?? []).map(mapNotification),
    activeCount: value.active_count ?? 0,
    unreadCount: value.unread_count ?? 0,
  };
}

