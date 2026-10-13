import { TutorDetail } from "@/components/admin/tutor-detail";
import { TutorManagement } from "@/components/admin/tutor-management";

type PageProps = {
  searchParams: Promise<{ tutor?: string | string[]; deleted?: string }>;
};

export default async function AdminTutorsPage({ searchParams }: PageProps) {
  const { tutor, deleted } = await searchParams;
  const tutorProfileId = Array.isArray(tutor) ? tutor[0] : tutor;
  return tutorProfileId ? <TutorDetail key={tutorProfileId} tutorProfileId={tutorProfileId} /> : <TutorManagement pendingAccountDeleted={deleted === "pending"} />;
}
