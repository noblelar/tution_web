export const sessionDurationMinutes = 120 as const;

export type SessionSubjectSelection = {
  subjectId: string;
  tutorProfileIds: string[];
};

export function normalizeSessionSubjectSelections(values: SessionSubjectSelection[]): SessionSubjectSelection[] {
  if (!values.length) throw new Error("Add at least one subject to the session.");
  if (values.length > 50) throw new Error("A session cannot offer more than 50 subjects.");
  const subjectIDs = new Set<string>();
  return values.map((value) => {
    const subjectId = value.subjectId.trim();
    if (!subjectId) throw new Error("Choose a subject for every offering.");
    if (subjectIDs.has(subjectId)) throw new Error("Each subject can only be offered once per session.");
    subjectIDs.add(subjectId);
    const tutorProfileIds = [...new Set(value.tutorProfileIds.map((id) => id.trim()).filter(Boolean))];
    if (tutorProfileIds.length > 20) throw new Error("A subject cannot have more than 20 tutors.");
    return {
      subjectId,
      tutorProfileIds,
    };
  });
}

export function zonedInputToISO(value: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choose a valid date and time.");
  const wanted = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let candidate = new Date(wanted);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = dateParts(candidate, timeZone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    candidate = new Date(candidate.getTime() + wanted - represented);
  }
  return candidate.toISOString();
}

export function toCentreInput(value: string, timeZone: string): string {
  const parts = dateParts(new Date(value), timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatSessionDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatSessionTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function dateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const part = (type: "year" | "month" | "day" | "hour" | "minute") => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute") };
}

function pad(value: number) { return String(value).padStart(2, "0"); }
