"use client";

import { useEffect, useState } from "react";
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

type CurrentUser = {
  user?: {
    firstName?: string;
    email?: string;
  };
};

export function LearningDashboard() {
  const [firstName, setFirstName] = useState("Student");

  useEffect(() => {
    let active = true;
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as CurrentUser;
        const name = result.user?.firstName?.trim() || result.user?.email?.split("@")[0] || "Student";
        if (active) setFirstName(name);
      } catch {
        // Keep neutral fallback.
      }
    }
    void loadUser();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardShell>
      <main className="dashboard-main" aria-labelledby="dashboard-title">
        <DashboardIntro firstName={firstName} />
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

export { Icon, type IconName } from "./icons";

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
