"use client";

import { useMemo, useState } from "react";
import { DashboardShell, Icon } from "@/components/dashboard";

type Note = {
  id: number;
  category: string;
  categoryTone: "yellow" | "blue" | "green" | "purple" | "orange";
  secondaryTag?: string;
  secondaryTone?: "blue" | "purple";
  title: string;
  description: string;
  author: string;
  date: string;
  image?: "desk" | "paper";
};

const notes: Note[] = [
  { id: 1, category: "Weekly", categoryTone: "yellow", secondaryTag: "Product", secondaryTone: "blue", title: "Product Team Meeting", description: "This monthly progress agenda is following this items:", author: "Floyd Miles", date: "Mar 5 04:25" },
  { id: 2, category: "Monthly", categoryTone: "green", secondaryTag: "Business", secondaryTone: "purple", title: "Product Team Meeting", description: "This monthly progress agenda is following this items:", author: "Dianne Russell", date: "Apr 11 18:30" },
  { id: 3, category: "Personal", categoryTone: "orange", secondaryTag: "Business", secondaryTone: "purple", title: "HR Interview", description: "This monthly progress agenda is following this items:", author: "Annette Black", date: "Jun 24 13:41" },
  { id: 4, category: "Monthly", categoryTone: "green", secondaryTag: "Product", secondaryTone: "blue", title: "Monthly Team Progress", description: "This monthly progress agenda is following this items:", author: "Robert Fox", date: "Jan 31 09:53" },
  { id: 5, category: "Monthly", categoryTone: "green", secondaryTag: "Business", secondaryTone: "purple", title: "Product Team Meeting", description: "Some Summaries of this weeks meeting with some conclusion we get :", author: "Brooklyn Simmons", date: "Aug 15 10:29" },
  { id: 6, category: "Personal", categoryTone: "orange", secondaryTag: "Business", secondaryTone: "purple", title: "Document Images", description: "Report Document of Weekly Meetings", author: "Cameron Williamson", date: "Dec 30 21:28", image: "desk" },
  { id: 7, category: "Monthly", categoryTone: "green", secondaryTag: "Product", secondaryTone: "blue", title: "Monthly Team Progress", description: "This monthly progress agenda is following this items:", author: "Robert Fox", date: "Jan 31 09:53" },
  { id: 8, category: "Monthly", categoryTone: "green", secondaryTag: "Business", secondaryTone: "purple", title: "Product Team Meeting", description: "Some Summaries of this weeks meeting with some conclusion we get :", author: "Brooklyn Simmons", date: "Aug 15 10:29" },
  { id: 9, category: "Personal", categoryTone: "orange", secondaryTag: "Business", secondaryTone: "purple", title: "Document Images", description: "Report Document of Weekly Meetings", author: "Cameron Williamson", date: "Dec 30 21:28", image: "desk" },
  { id: 10, category: "Badge", categoryTone: "yellow", secondaryTag: "Product", secondaryTone: "blue", title: "Weekly Team Progress", description: "This weekly progress agenda is following this items:", author: "Dianne Russell", date: "Feb 4 10:08" },
  { id: 11, category: "Business", categoryTone: "purple", title: "Revenue Progress", description: "Some Summaries of this weeks meeting with some conclusion we get :", author: "Daniel Richards", date: "May 22 04:42", image: "paper" },
  { id: 12, category: "Product", categoryTone: "blue", title: "Monthly Products", description: "Report Document of Weekly Meetings", author: "Albert Flores", date: "Oct 15 15:40", image: "paper" },
];

export function NotesView() {
  const [sortNewest, setSortNewest] = useState(false);
  const [tag, setTag] = useState("All notes");

  const visibleNotes = useMemo(() => {
    const filtered = tag === "All notes" ? notes : notes.filter((note) => note.category === tag || note.secondaryTag === tag);
    return sortNewest ? [...filtered].reverse() : filtered;
  }, [sortNewest, tag]);

  return (
    <DashboardShell activeHref="/notes">
      <main className="notes-main" aria-labelledby="notes-title">
        <header className="notes-header">
          <h1 id="notes-title">Notes</h1>
          <div className="notes-toolbar">
            <button className="notes-toolbar-button" type="button" onClick={() => setSortNewest((current) => !current)}><Icon name="sort" size={14} />Sort By</button>
            <label className="notes-filter-control"><Icon name="filter" size={14} /><span className="visually-hidden">Filter notes</span><select value={tag} onChange={(event) => setTag(event.target.value)}><option>All notes</option><option>Weekly</option><option>Monthly</option><option>Personal</option><option>Product</option><option>Business</option></select></label>
            <button className="notes-add-button" type="button"><Icon name="plus" size={14} />Add Notes</button>
          </div>
        </header>
        <section className="notes-grid" aria-label="Notes collection">
          {visibleNotes.map((note) => <NoteCard key={note.id} note={note} />)}
        </section>
        {visibleNotes.length === 0 ? <p className="notes-empty-state">No notes match this filter.</p> : null}
      </main>
    </DashboardShell>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <article className="note-card">
      <div className="note-card-content">
        <div className="note-tags"><span className={`note-tag is-${note.categoryTone}`}>{note.category}</span>{note.secondaryTag ? <span className={`note-tag is-${note.secondaryTone}`}>{note.secondaryTag}</span> : null}</div>
        <h2>{note.title}</h2>
        <p>{note.description}</p>
        {!note.image ? <ul><li>Introduction to Newest Product Plan</li><li>Monthly Revenue updates for each</li></ul> : null}
      </div>
      {note.image ? <div className={`note-card-media is-${note.image}`} aria-label={`${note.title} preview`} role="img" /> : null}
      <footer className="note-card-footer"><span className="note-author-avatar">{note.author.split(" ").map((part) => part[0]).join("")}</span><strong>{note.author}</strong><time>{note.date}</time></footer>
    </article>
  );
}
