import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { studentNavigation } from "@/components/dashboard/student-navigation";
import { StudentReflectionPrompt } from "@/components/notes";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      defaultDisplayName="Student"
      homeHref="/app/student"
      navigation={studentNavigation}
      navigationLabel="Student navigation"
      searchPlaceholder="Search your student workspace"
      showSearch={false}
    >
      <StudentReflectionPrompt />
      {children}
    </DashboardShell>
  );
}
