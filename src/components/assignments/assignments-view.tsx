"use client";

import { useMemo, useState } from "react";
import { DashboardShell, Icon } from "@/components/dashboard";

type AssignmentStatus = "Done" | "Progress" | "Pending";
type Assignment = {
  title: string;
  course: string;
  dueDate: string;
  status: AssignmentStatus;
  submission: string;
};

const assignments: Assignment[] = [
  { title: "Conducting User Research", course: "User Research and Personas", dueDate: "July 1, 2024", status: "Done", submission: "Submitted" },
  { title: "Competitive Analysis Report", course: "Competitive Analysis in UX", dueDate: "July 25, 2024", status: "Progress", submission: "Upload" },
  { title: "Creating Wireframes", course: "Wireframing and Prototyping", dueDate: "August 1, 2024", status: "Progress", submission: "Upload" },
  { title: "Usability Testing and Findings", course: "Usability Testing and Iteration", dueDate: "August 22, 2024", status: "Pending", submission: "Upload" },
  { title: "Developing Visual Design", course: "Visual Design and Branding", dueDate: "August 29, 2024", status: "Pending", submission: "Upload" },
  { title: "Creating a Design System", course: "Design Systems and Components", dueDate: "September 5, 2024", status: "Pending", submission: "Upload" },
];

const pages = [1, 2, 3, 4, 5, "…", 10] as const;

export function AssignmentsView() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | AssignmentStatus>("All");
  const [dateRange, setDateRange] = useState("All dates");
  const [page, setPage] = useState(1);

  const filteredAssignments = useMemo(() => assignments.filter((assignment) => {
    const matchesQuery = `${assignment.title} ${assignment.course}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All" || assignment.status === status;
    const matchesDate = dateRange === "All dates" || (dateRange === "Upcoming" && assignment.status !== "Done");
    return matchesQuery && matchesStatus && matchesDate;
  }), [dateRange, query, status]);

  return (
    <DashboardShell activeHref="/assignments">
      <main className="assignments-main" aria-labelledby="assignments-title">
        <header className="assignments-header">
          <div>
            <h1 id="assignments-title">Assignments</h1>
            <p>View and manage your course assignments</p>
          </div>
          <div className="assignments-toolbar">
            {searchOpen ? <label className="assignments-search-input"><span className="visually-hidden">Search assignments</span><Icon name="search" size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assignments" type="search" /></label> : <button className="assignments-search-button" type="button" aria-label="Search assignments" onClick={() => setSearchOpen(true)}><Icon name="search" size={18} /></button>}
            <span className="assignments-filter-label">Filter by</span>
            <label className="assignments-filter"><span className="visually-hidden">Filter by dates</span><select aria-label="Filter by dates" value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option>All dates</option><option>Upcoming</option></select></label>
            <span className="assignments-filter-divider">|</span>
            <label className="assignments-filter"><span className="visually-hidden">Filter by status</span><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as "All" | AssignmentStatus)}><option value="All">Status</option><option value="Done">Done</option><option value="Progress">Progress</option><option value="Pending">Pending</option></select></label>
          </div>
        </header>
        <section className="assignments-table-card" aria-label="Course assignments">
          <div className="assignments-table-scroll">
            <table className="assignments-table">
              <thead><tr><th scope="col">Assignment Title</th><th scope="col">Course/lessons</th><th scope="col">Due Date</th><th scope="col">Status</th><th scope="col">Submit</th></tr></thead>
              <tbody>{filteredAssignments.map((assignment) => <tr key={assignment.title}><td title={assignment.title}>{assignment.title}</td><td title={assignment.course}>{assignment.course}</td><td>{assignment.dueDate}</td><td><AssignmentStatusBadge status={assignment.status} /></td><td><button className={`assignment-submit-button${assignment.submission === "Submitted" ? " is-submitted" : ""}`} type="button">{assignment.submission}</button></td></tr>)}</tbody>
            </table>
            {filteredAssignments.length === 0 ? <p className="assignments-empty-state">No assignments match these filters.</p> : null}
          </div>
          <footer className="assignments-footer">
            <label className="assignments-row-count">Show <select aria-label="Rows per page" defaultValue="10"><option>10</option><option>20</option><option>50</option></select> Row</label>
            <nav className="assignments-pagination" aria-label="Assignments pages"><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}><Icon name="chevronLeft" size={14} /></button>{pages.map((pageNumber, index) => typeof pageNumber === "number" ? <button className={page === pageNumber ? "is-current" : ""} key={pageNumber} type="button" onClick={() => setPage(pageNumber)}>{pageNumber}</button> : <span key={`ellipsis-${index}`}>{pageNumber}</span>)}<button type="button" aria-label="Next page" onClick={() => setPage(Math.min(10, page + 1))}><Icon name="chevronRight" size={14} /></button></nav>
          </footer>
        </section>
      </main>
    </DashboardShell>
  );
}

function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return <span className={`assignment-status is-${status.toLowerCase()}`}><i />{status}</span>;
}
