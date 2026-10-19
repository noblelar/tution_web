import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FeedbackWorkspace } from "@/components/feedback/feedback-workspace";

export default function StudentFeedbackPage() {
  return <DashboardShell><FeedbackWorkspace audience="student" /></DashboardShell>;
}
