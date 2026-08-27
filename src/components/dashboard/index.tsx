import {
  DashboardIntro,
  EnrolledCourseCard,
  HoursSpentCard,
  MiniCalendarCard,
  PerformanceCard,
  RecentClassesCard,
  ResourcesCard,
  TodoListCard,
  UpcomingLessonsCard,
} from "./dashboard-cards";
import { DashboardShell } from "./dashboard-shell";

export function LearningDashboard() {
  return (
    <DashboardShell>
      <main className="dashboard-main" aria-labelledby="dashboard-title">
        <DashboardIntro />
        <div className="dashboard-overview-grid">
          <EnrolledCourseCard />
          <ResourcesCard />
          <MiniCalendarCard />
        </div>
        <div className="dashboard-insights-grid">
          <HoursSpentCard />
          <PerformanceCard />
          <TodoListCard />
        </div>
        <div className="dashboard-learning-grid">
          <RecentClassesCard />
          <UpcomingLessonsCard />
        </div>
      </main>
    </DashboardShell>
  );
}

export { Icon } from "./icons";

export {
  DashboardIntro,
  DashboardShell,
  EnrolledCourseCard,
  HoursSpentCard,
  MiniCalendarCard,
  PerformanceCard,
  RecentClassesCard,
  ResourcesCard,
  TodoListCard,
  UpcomingLessonsCard,
};
