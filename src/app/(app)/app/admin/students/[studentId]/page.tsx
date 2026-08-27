import { StudentDetail } from "@/components/admin/student-detail";

type PageProps = {
  params: Promise<{ studentId: string }>;
};

export default async function AdminStudentDetailPage({ params }: PageProps) {
  const { studentId } = await params;
  return <StudentDetail studentProfileId={studentId} />;
}
