export const studentNotesUpdatedEvent = "tution:student-notes-updated";
export const studentPromptRefreshEvent = "tution:student-reflection-prompt-refresh";
export const notificationsRefreshEvent = "tution:notifications-refresh";

export function dispatchStudentNotesUpdated(): void {
  window.dispatchEvent(new Event(studentNotesUpdatedEvent));
  window.dispatchEvent(new Event(notificationsRefreshEvent));
}

export function dispatchStudentPromptRefresh(): void {
  window.dispatchEvent(new Event(studentPromptRefreshEvent));
  window.dispatchEvent(new Event(notificationsRefreshEvent));
}
