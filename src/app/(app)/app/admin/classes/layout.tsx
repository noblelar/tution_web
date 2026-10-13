import type { ReactNode } from "react";

import { StageThreeReadinessPanel } from "@/components/admin/stage-three-readiness";

export default function ClassesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <StageThreeReadinessPanel />
    </>
  );
}
