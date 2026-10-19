"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { InAppNotification, NotificationList } from "@/lib/notification-types";
import { Icon, type IconName } from "./icons";

const emptyNotifications: NotificationList = {
  notifications: [],
  activeCount: 0,
  unreadCount: 0,
};

export function NotificationMenu({ enabled }: { enabled: boolean }) {
  return enabled ? <EnabledNotificationMenu /> : null;
}

function EnabledNotificationMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationList>(emptyNotifications);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingID, setPendingID] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Notifications could not be loaded.");
      const result = (await response.json()) as NotificationList;
      setData(result);
      setError("");
    } catch (requestError) {
      if (showLoading) {
        setError(requestError instanceof Error ? requestError.message : "Notifications could not be loaded.");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications(false);
    const interval = window.setInterval(() => void loadNotifications(false), 60_000);
    const refreshOnFocus = () => void loadNotifications(false);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadNotifications(false);
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const isInside = (target: EventTarget | null) => target instanceof Node && menuRef.current?.contains(target) === true;
    const closeOnPointer = (event: PointerEvent) => {
      if (!isInside(event.target)) setOpen(false);
    };
    const closeOnFocus = (event: FocusEvent) => {
      if (!isInside(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const closeOnWindowBlur = () => setOpen(false);
    document.addEventListener("pointerdown", closeOnPointer, true);
    document.addEventListener("focusin", closeOnFocus, true);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("blur", closeOnWindowBlur);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer, true);
      document.removeEventListener("focusin", closeOnFocus, true);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("blur", closeOnWindowBlur);
    };
  }, [open]);

  async function mutateNotification(notification: InAppNotification, operation: "read" | "dismiss") {
    setPendingID(notification.id);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Notification verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}?operation=${operation}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "The notification could not be updated.");
      }
      const updated = (await response.json()) as InAppNotification;
      setData((current) => {
        if (operation === "dismiss") {
          const notifications = current.notifications.filter((item) => item.id !== notification.id);
          return {
            notifications,
            activeCount: Math.max(0, current.activeCount - 1),
            unreadCount: Math.max(0, current.unreadCount - (notification.readAt ? 0 : 1)),
          };
        }
        return {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - (notification.readAt ? 0 : 1)),
          notifications: current.notifications.map((item) => item.id === notification.id ? updated : item),
        };
      });
      setError("");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The notification could not be updated.");
      return false;
    } finally {
      setPendingID("");
    }
  }

  async function openNotification(notification: InAppNotification) {
    let destination = notificationDestination(notification.actionHref);
    if (!destination) {
      setError("This notification does not have an available destination.");
      return;
    }
    if (notification.type.startsWith("feedback_query_") || notification.type.startsWith("session_feedback_")) {
      const feedbackDestination = new URL(destination, window.location.origin);
      if (notification.centreId) feedbackDestination.searchParams.set("centreId", notification.centreId);
      feedbackDestination.searchParams.set("tab", notification.type.startsWith("feedback_query_") ? "queries" : "feedback");
      destination = `${feedbackDestination.pathname}${feedbackDestination.search}${feedbackDestination.hash}`;
    }
    if (!notification.readAt) await mutateNotification(notification, "read");
    setOpen(false);
    router.push(destination);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={data.activeCount ? `Notifications, ${data.activeCount} active` : "Notifications"}
        className="dashboard-icon-button rounded-full p-1.5 transition hover:bg-orange-50 hover:text-[#f45b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void loadNotifications(true);
        }}
        ref={triggerRef}
        type="button"
      >
        <Icon name="bell" size={18} />
        {data.activeCount > 0 ? (
          <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-[#f45b23] px-1 text-center text-[9px] font-extrabold leading-4 text-white">
            {data.activeCount > 9 ? "9+" : data.activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          aria-label="Notifications"
          aria-live="polite"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1.25rem_3rem_rgb(15_23_42/0.18)]"
          role="dialog"
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-sm font-extrabold text-slate-900">Notifications</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Booking reminders, feedback, and query updates remain here until resolved, dismissed, or expired.</p>
            </div>
            <button
              aria-label="Close notifications"
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setOpen(false)}
              type="button"
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          <div className="max-h-[26rem] overflow-y-auto p-3">
            {loading && data.notifications.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs font-medium text-slate-500">Checking for notifications…</p>
            ) : null}
            {!loading && data.notifications.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <span className="mx-auto grid size-9 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
                  <Icon name="bell" size={18} />
                </span>
                <p className="mt-3 text-sm font-bold text-slate-700">You are all caught up</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">New reminders, feedback, and query updates will appear here.</p>
              </div>
            ) : null}
            <div className="space-y-2">
              {data.notifications.map((notification) => (
                <article
                  className={`rounded-xl border p-4 transition ${notification.readAt ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50/60"}`}
                  key={notification.id}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-orange-100 text-[#f45b23]">
                      <Icon name={notificationPresentation(notification.type).icon} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-extrabold leading-5 text-slate-900">{notification.title}</p>
                        {!notification.readAt ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#f45b23]" aria-label="Unread" /> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-[11px] font-semibold text-slate-400">Available {formatNotificationTime(notification.availableAt)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-[#f45b23] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#dc4815] disabled:cursor-wait disabled:opacity-60"
                          disabled={pendingID === notification.id}
                          onClick={() => void openNotification(notification)}
                          type="button"
                        >
                          {notificationPresentation(notification.type).action}
                        </button>
                        <button
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                          disabled={pendingID === notification.id}
                          onClick={() => void mutateNotification(notification, "dismiss")}
                          type="button"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">{error}</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function notificationPresentation(type: InAppNotification["type"]): { icon: IconName; action: string } {
  switch (type) {
    case "booking_credits_required":
      return { icon: "activity", action: "Review booking" };
    case "weekly_booking_reminder":
      return { icon: "calendar", action: "Open bookings" };
    case "session_feedback_published":
      return { icon: "book", action: "Read feedback" };
    case "session_feedback_withdrawn":
      return { icon: "file", action: "View withdrawal notice" };
    case "feedback_query_created":
      return { icon: "message", action: "Review query" };
    case "feedback_query_assigned":
      return { icon: "message", action: "Open assigned query" };
    case "feedback_query_reply":
      return { icon: "message", action: "Read reply" };
    case "feedback_query_resolution_proposed":
      return { icon: "check", action: "Review resolution" };
    case "feedback_query_resolved":
      return { icon: "check", action: "View resolved query" };
    case "feedback_query_reopened":
      return { icon: "message", action: "Open reopened query" };
    default:
      return { icon: "bell", action: "View update" };
  }
}

function notificationDestination(value: string): string | null {
  if (!value.startsWith("/app/") && value !== "/app") return null;
  try {
    const destination = new URL(value, window.location.origin);
    if (destination.origin !== window.location.origin) return null;
    if (destination.pathname !== "/app" && !destination.pathname.startsWith("/app/")) return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

