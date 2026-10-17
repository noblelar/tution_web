import { redirect } from "next/navigation";

export default function LegacyAdminSchedulePage() {
  redirect("/app/admin/sessions");
}
