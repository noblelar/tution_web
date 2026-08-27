"use client";

import { useMemo, useState } from "react";
import { DashboardShell, Icon } from "@/components/dashboard";

type CalendarEventKind = "meeting" | "review" | "discussion" | "research" | "deals";
type CalendarEvent = { id: number; day: number; title: string; time?: string; kind: CalendarEventKind };
type CalendarCell = { date: Date; isCurrentMonth: boolean };

const calendarEvents: CalendarEvent[] = [
  { id: 1, day: 2, title: "Design Review", kind: "review" },
  { id: 2, day: 5, title: "Meeting", time: "11:30 - 13:00", kind: "meeting" },
  { id: 3, day: 8, title: "Design Review", time: "10:00 - 11:00", kind: "review" },
  { id: 4, day: 8, title: "Discussion", time: "10:00 - 11:00", kind: "discussion" },
  { id: 5, day: 13, title: "Market Research", kind: "research" },
  { id: 6, day: 13, title: "Discussion", kind: "discussion" },
  { id: 7, day: 19, title: "Design Review", kind: "review" },
  { id: 8, day: 19, title: "New Deals", kind: "deals" },
  { id: 9, day: 22, title: "Meeting", kind: "meeting" },
  { id: 10, day: 22, title: "Design Review", kind: "review" },
  { id: 11, day: 28, title: "Meeting", kind: "meeting" },
  { id: 12, day: 28, title: "Design Review", kind: "review" },
  { id: 13, day: 28, title: "New Deals", kind: "deals" },
  { id: 14, day: 28, title: "Discussion", kind: "discussion" },
  { id: 15, day: 30, title: "Meeting", kind: "meeting" },
  { id: 16, day: 30, title: "Design Review", kind: "review" },
  { id: 17, day: 30, title: "New Deals", kind: "deals" },
  { id: 18, day: 30, title: "Discussion", kind: "discussion" },
];

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleView() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [view, setView] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [filterOpen, setFilterOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState<"All events" | CalendarEventKind>("All events");
  const displayDate = new Date(Date.UTC(2023, 8 + monthOffset, 1));
  const monthName = displayDate.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const cells = useMemo(() => getCalendarCells(new Date(Date.UTC(2023, 8 + monthOffset, 1))), [monthOffset]);
  const eventsForMonth = monthOffset === 0 ? calendarEvents : [];

  return (
    <DashboardShell>
      <main className="schedule-main" aria-labelledby="schedule-title">
        <header className="schedule-header">
          <div className="schedule-title-row"><h1 id="schedule-title">Calendar</h1><nav className="schedule-view-tabs" aria-label="Calendar view"><button className={view === "Monthly" ? "is-active" : ""} type="button" onClick={() => setView("Monthly")}>Monthly</button><button className={view === "Weekly" ? "is-active" : ""} type="button" onClick={() => setView("Weekly")}>Weekly</button><button className={view === "Daily" ? "is-active" : ""} type="button" onClick={() => setView("Daily")}>Daily</button></nav></div>
          <div className="schedule-actions"><button className={`schedule-filter-button${filterOpen ? " is-open" : ""}`} type="button" onClick={() => setFilterOpen((open) => !open)}><Icon name="filter" size={13} />Filter</button><button className="schedule-add-button" type="button"><Icon name="plus" size={14} />Add Event</button></div>
        </header>
        <div className="schedule-month-controls"><button className="schedule-month-select" type="button" onClick={() => setMonthOffset(0)}>{monthName} {displayDate.getUTCFullYear()} <Icon name="chevronDown" size={13} /></button><div className="schedule-month-navigation"><button type="button" aria-label="Previous month" onClick={() => setMonthOffset((offset) => offset - 1)}><Icon name="chevronLeft" size={14} /></button><button className="schedule-today-button" type="button" onClick={() => setMonthOffset(0)}>Today</button><button type="button" aria-label="Next month" onClick={() => setMonthOffset((offset) => offset + 1)}><Icon name="chevronRight" size={14} /></button></div>{filterOpen ? <label className="schedule-filter-menu"><span className="visually-hidden">Event filter</span><select value={eventFilter} onChange={(event) => setEventFilter(event.target.value as "All events" | CalendarEventKind)}><option value="All events">All events</option><option value="meeting">Meetings</option><option value="review">Design reviews</option><option value="discussion">Discussions</option><option value="research">Research</option><option value="deals">New deals</option></select></label> : null}</div>
        <section className={`schedule-calendar${view !== "Monthly" ? " is-alternate-view" : ""}`} aria-label={`${monthName} ${displayDate.getUTCFullYear()} calendar`}>
          <div className="schedule-weekday-row">{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
          <div className="schedule-days-grid">{cells.map((cell) => <CalendarDay key={cell.date.toISOString()} cell={cell} events={eventsForMonth.filter((event) => event.day === cell.date.getUTCDate() && cell.isCurrentMonth && (eventFilter === "All events" || event.kind === eventFilter))} />)}</div>
        </section>
      </main>
    </DashboardShell>
  );
}

function CalendarDay({ cell, events }: { cell: CalendarCell; events: CalendarEvent[] }) {
  return <div className={`schedule-day${cell.isCurrentMonth ? "" : " is-outside"}`}><time dateTime={cell.date.toISOString().slice(0, 10)}>{cell.date.getUTCDate()}</time><div className="schedule-event-list">{events.map((event) => <CalendarEventChip event={event} key={event.id} />)}</div></div>;
}

function CalendarEventChip({ event }: { event: CalendarEvent }) {
  return <div className={`schedule-event-chip is-${event.kind}`}><strong>{event.title}</strong>{event.time ? <span>{event.time}</span> : null}</div>;
}

function getCalendarCells(month: Date): CalendarCell[] {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const cells: CalendarCell[] = [];
  for (let index = firstDay.getUTCDay() - 1; index >= 0; index -= 1) cells.push({ date: new Date(Date.UTC(year, monthIndex - 1, previousMonthDays - index)), isCurrentMonth: false });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ date: new Date(Date.UTC(year, monthIndex, day)), isCurrentMonth: true });
  let nextDay = 1;
  while (cells.length < 42) { cells.push({ date: new Date(Date.UTC(year, monthIndex + 1, nextDay)), isCurrentMonth: false }); nextDay += 1; }
  return cells;
}
