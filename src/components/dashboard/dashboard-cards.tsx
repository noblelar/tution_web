import Link from "next/link";
import { Icon } from "./icons";

export function DashboardIntro() {
  return (
    <header className="dashboard-intro">
      <div>
        <h1 id="dashboard-title">Hello Harsh <span aria-hidden="true">👋</span></h1>
        <p>Let&apos;s learn something new today!</p>
      </div>
      <button className="dashboard-add-button" type="button" aria-label="Add a new item"><Icon name="plus" size={18} /></button>
    </header>
  );
}

export function EnrolledCourseCard() {
  return (
    <section className="dashboard-card course-card" aria-labelledby="course-card-title">
      <div className="dashboard-card-heading">
        <h2 id="course-card-title">Recent enrolled course</h2>
        <button className="dashboard-more-button" type="button" aria-label="More course options"><Icon name="more" size={17} /></button>
      </div>
      <div className="course-preview">
        <span className="course-preview-icon"><Icon name="play" size={11} /></span>
        <h3>Product Design Course</h3>
        <div className="course-progress-track"><span /></div>
        <div className="course-progress-copy"><strong>14/30</strong><span>class</span></div>
      </div>
    </section>
  );
}

type Resource = { name: string; type: "pdf" | "sheet" | "doc"; size: string; status: string };
const resources: Resource[] = [
  { name: "Auto-layout.pdf", type: "pdf", size: "8.5 MB", status: "Content" },
  { name: "Design_Tips.png", type: "sheet", size: "576 KB", status: "Download" },
  { name: "Basics_Of_UX.fig", type: "doc", size: "2.5 MB", status: "Download" },
];

export function ResourcesCard() {
  return (
    <section className="dashboard-card resources-card" aria-labelledby="resources-card-title">
      <div className="dashboard-card-heading"><h2 id="resources-card-title">Your Resources</h2><button className="dashboard-more-button" type="button" aria-label="More resource options"><Icon name="more" size={17} /></button></div>
      <div className="resource-list">
        {resources.map((resource) => <div className="resource-row" key={resource.name}>
          <span className={`resource-file-icon is-${resource.type}`}><Icon name="file" size={14} /></span>
          <div className="resource-name"><strong>{resource.name}</strong><span>All course materials and useful resources</span></div>
          <span className="resource-size">{resource.size}</span>
          <button className="resource-action" type="button">{resource.status}</button>
        </div>)}
      </div>
      <Link className="resources-see-more" href="/resources">see more</Link>
    </section>
  );
}

const calendarDays = ["27", "28", "29", "30", "31", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "1", "2", "3", "4", "5", "6"];

export function MiniCalendarCard() {
  return (
    <section className="dashboard-card mini-calendar-card" aria-labelledby="calendar-title">
      <div className="calendar-heading"><button type="button" aria-label="Previous month"><Icon name="chevronLeft" size={13} /></button><h2 id="calendar-title">June 2024</h2><button type="button" aria-label="Next month"><Icon name="chevronRight" size={13} /></button></div>
      <div className="calendar-weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-grid" aria-label="June 2024 calendar">{calendarDays.map((day, index) => <span className={`${index < 5 ? "is-muted " : ""}${day === "10" ? "is-today" : ""}`} key={`${day}-${index}`}>{day}</span>)}</div>
    </section>
  );
}

const hourBars = [
  { month: "Jan", height: "bar-height-62", value: "35 hr" },
  { month: "Feb", height: "bar-height-42", value: "24 hr" },
  { month: "Mar", height: "bar-height-78", value: "45 hr" },
  { month: "Apr", height: "bar-height-57", value: "32 hr" },
  { month: "May", height: "bar-height-28", value: "16 hr" },
];

export function HoursSpentCard() {
  return (
    <section className="dashboard-card hours-card" aria-labelledby="hours-title">
      <div className="dashboard-card-heading"><h2 id="hours-title">Hours Spent</h2><button className="dashboard-more-button" type="button" aria-label="More hours options"><Icon name="more" size={17} /></button></div>
      <div className="chart-legend"><span className="legend-item"><i className="legend-swatch is-orange" />Study</span><span className="legend-item"><i className="legend-swatch is-cream" />Online Test</span></div>
      <div className="hours-chart" role="img" aria-label="Hours spent by month: January 35 hours, February 24 hours, March 45 hours, April 32 hours, May 16 hours">
        <div className="hours-y-axis"><span>50 hr</span><span>40 hr</span><span>30 hr</span><span>20 hr</span><span>10 hr</span><span>0 hr</span></div>
        <div className="hours-plot">{hourBars.map((bar) => <div className="hour-column" key={bar.month}><div className={`hour-bar ${bar.height}`}><span className="hour-bar-fill" /></div><span className="hour-tooltip">{bar.value}</span><span className="hour-month">{bar.month}</span></div>)}</div>
      </div>
    </section>
  );
}

export function PerformanceCard() {
  return (
    <section className="dashboard-card performance-card" aria-labelledby="performance-title">
      <div className="dashboard-card-heading"><h2 id="performance-title">Performance</h2><button className="dashboard-more-button" type="button" aria-label="More performance options"><Icon name="more" size={17} /></button></div>
      <div className="performance-filter"><span><i className="legend-swatch is-orange" />Assignment Submission<br />Performance</span><button type="button">Monthly <Icon name="chevronDown" size={11} /></button></div>
      <div className="performance-gauge" role="img" aria-label="Your grade is 8.966 out of 10"><svg viewBox="0 0 150 100" aria-hidden="true"><path className="gauge-background" d="M25 85a50 50 0 1 1 100 0" /><path className="gauge-progress" d="M25 85a50 50 0 1 1 100 0" /><path className="gauge-needle" d="m75 85 25-37" /><circle cx="75" cy="85" r="4" /></svg><span className="gauge-grade">Your Grade: <strong>8.966</strong></span></div>
    </section>
  );
}

type Todo = { title: string; date: string; completed?: boolean };
const todos: Todo[] = [
  { title: "Human Interaction Designs", date: "Tuesday, 30 June 2024" },
  { title: "Design system Basics", date: "Monday, 24 June 2024" },
  { title: "Introduction to UI", date: "Friday, 10 June 2024", completed: true },
  { title: "Basics of Figma", date: "Friday, 05 June 2024", completed: true },
];

export function TodoListCard() {
  return (
    <section className="dashboard-card todo-card" aria-labelledby="todo-title"><div className="dashboard-card-heading"><h2 id="todo-title">To do List</h2><button className="dashboard-more-button" type="button" aria-label="More todo options"><Icon name="more" size={17} /></button></div><div className="todo-list">{todos.map((todo) => <label className={`todo-row${todo.completed ? " is-complete" : ""}`} key={todo.title}><input type="checkbox" defaultChecked={todo.completed} /><span className="todo-checkbox"><Icon name="check" size={12} /></span><span><strong>{todo.title}</strong><small>{todo.date}</small></span></label>)}</div></section>
  );
}

type ClassItem = { title: string; icon: "figma" | "palette"; duration: string; lessons: string };
const recentClasses: ClassItem[] = [
  { title: "User Experience (UX) Design", icon: "figma", duration: "5:30hrs", lessons: "05 Lessons" },
  { title: "Visual Design and Branding", icon: "palette", duration: "4:00hrs", lessons: "03 Lessons" },
];

export function RecentClassesCard() {
  return (
    <section className="dashboard-card recent-classes-card" aria-labelledby="recent-classes-title"><div className="section-heading-with-filter"><h2 id="recent-classes-title">Recent enrolled classes</h2><div><button type="button">All</button><button type="button" aria-label="Search classes"><Icon name="search" size={19} /></button></div></div><div className="class-list">{recentClasses.map((item, index) => <article className={`class-row${index === 0 ? " is-featured" : ""}`} key={item.title}><span className={`class-icon is-${item.icon}`}>{item.icon === "figma" ? "⌘" : <Icon name="palette" size={20} />}</span><div className="class-details"><h3>{item.title}</h3><div><span><Icon name="clock" size={12} />{item.duration}</span><span><Icon name="book" size={12} />{item.lessons}</span><span><Icon name="check" size={12} />Assignments</span></div></div></article>)}</div></section>
  );
}

type Lesson = { title: string; time: string; icon: "book" | "check" };
const upcomingLessons: Lesson[] = [
  { title: "UX Design Fundamentals", time: "5:30pm", icon: "book" },
  { title: "Interaction Design", time: "9:00pm", icon: "check" },
];

export function UpcomingLessonsCard() {
  return (
    <section className="dashboard-card upcoming-lessons-card" aria-labelledby="upcoming-title"><div className="dashboard-card-heading"><h2 id="upcoming-title">Upcoming Lesson</h2><button className="dashboard-more-button" type="button" aria-label="More upcoming lesson options"><Icon name="more" size={17} /></button></div><div className="lesson-list">{upcomingLessons.map((lesson) => <article className="lesson-row" key={lesson.title}><span className="lesson-icon"><Icon name={lesson.icon} size={21} /></span><div><h3>{lesson.title}</h3><p>{lesson.time}</p></div><button className="join-lesson-button" type="button">Join</button></article>)}</div></section>
  );
}
