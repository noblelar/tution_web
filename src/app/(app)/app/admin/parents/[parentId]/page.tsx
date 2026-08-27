import { ParentDetail } from "@/components/admin/parent-detail";

type PageProps = {
  params: Promise<{ parentId: string }>;
};

export default async function AdminParentDetailPage({ params }: PageProps) {
  const { parentId } = await params;
  return <ParentDetail parentProfileId={parentId} />;
}
