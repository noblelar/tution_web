"use client";

import { useMemo, useState } from "react";
import { DashboardShell, Icon } from "@/components/dashboard";

type Recording = {
  id: number;
  title: string;
  course: string;
  duration: string;
  lessons: string;
  thumbnail: "yellow" | "purple";
  category: "dates" | "course";
};

const recordings: Recording[] = [
  { id: 1, title: "Color styles - 02", course: "Color Styles", duration: "1:30hrs", lessons: "02 Lessons", thumbnail: "yellow", category: "course" },
  { id: 2, title: "Design Thinking", course: "UXM Project Workbook", duration: "2:30hrs", lessons: "01 Lessons", thumbnail: "purple", category: "course" },
  { id: 3, title: "Visual Design Briefs", course: "Visual Design and Branding", duration: "3:30hrs", lessons: "08 Lessons", thumbnail: "purple", category: "dates" },
  { id: 4, title: "Curiosity for terminology", course: "Understanding various visual design", duration: "4:00hrs", lessons: "01 Lessons", thumbnail: "purple", category: "dates" },
  { id: 5, title: "Color styles - 01", course: "Color Styles", duration: "2:30hrs", lessons: "03 Lessons", thumbnail: "yellow", category: "course" },
];

export function RecordingsView() {
  const [filter, setFilter] = useState("All recordings");
  const [sortNewest, setSortNewest] = useState(false);
  const visibleRecordings = useMemo(() => {
    const filtered = filter === "All recordings" ? recordings : recordings.filter((recording) => recording.category === filter);
    return sortNewest ? [...filtered].reverse() : filtered;
  }, [filter, sortNewest]);

  return (
    <DashboardShell activeHref="/recordings">
      <main className="recordings-main" aria-labelledby="recordings-title">
        <header className="recordings-header">
          <div><h1 id="recordings-title">Class Recordings</h1><p>Access and review past class sessions</p></div>
          <div className="recordings-toolbar">
            <button className="recordings-search-button" type="button" aria-label="Search recordings"><Icon name="search" size={18} /></button>
            <span>Filter by</span>
            <button className="recordings-filter-link" type="button" onClick={() => setFilter(filter === "dates" ? "All recordings" : "dates")}>dates</button>
            <span>|</span>
            <button className="recordings-filter-link" type="button" onClick={() => setFilter(filter === "course" ? "All recordings" : "course")}>course</button>
          </div>
        </header>
        <section className="recordings-grid" aria-label="Class recordings">
          {visibleRecordings.map((recording) => <RecordingCard key={recording.id} recording={recording} />)}
        </section>
        <footer className="recordings-footer">
          <label className="recordings-row-count">Show <select aria-label="Rows per page" defaultValue="2"><option>2</option><option>5</option><option>10</option></select> Row</label>
          <div className="recordings-footer-actions"><button className="recordings-sort-button" type="button" onClick={() => setSortNewest((current) => !current)}><Icon name="sort" size={13} />{sortNewest ? "Oldest" : "Newest"}</button><nav className="recordings-pagination" aria-label="Recordings pages"><button type="button" aria-label="Previous page" disabled><Icon name="chevronLeft" size={14} /></button><button className="is-current" type="button">1</button><button type="button" aria-label="Next page"><Icon name="chevronRight" size={14} /></button></nav></div>
        </footer>
      </main>
    </DashboardShell>
  );
}

function RecordingCard({ recording }: { recording: Recording }) {
  return (
    <article className="recording-card">
      <div className={`recording-thumbnail is-${recording.thumbnail}`}><div className="recording-thumbnail-copy"><strong>{recording.course}</strong><span>{recording.thumbnail === "yellow" ? "Let's learn about colors, color contrast and color styles." : "A project to unlearn and learn the fundamentals of design"}</span></div><span className="recording-play"><Icon name="play" size={14} /></span></div>
      <h2>{recording.title}</h2>
      <div className="recording-meta"><span><Icon name="clock" size={11} />{recording.duration}</span><span><Icon name="book" size={11} />{recording.lessons}</span></div>
      <div className="recording-actions"><button className="recording-watch-button" type="button"><Icon name="play" size={11} />Watch Now</button><button className="recording-download-button" type="button"><Icon name="download" size={12} />Download</button></div>
    </article>
  );
}
