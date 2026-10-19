import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { tutorNavigation } from "@/components/dashboard/tutor-navigation";
import { FeedbackWorkspace } from "@/components/feedback/feedback-workspace";

export default function TutorFeedbackPage() {
  return (
    <DashboardShell defaultDisplayName="Tutor" homeHref="/app" navigation={tutorNavigation} navigationLabel="Tutor navigation" searchPlaceholder="Search your Tution workspace">
      <FeedbackWorkspace audience="tutor" />
    </DashboardShell>
  );
}
