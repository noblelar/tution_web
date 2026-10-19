import type { DashboardBucket } from "@/lib/admin-dashboard-types";

export function topSubjectBuckets(items: DashboardBucket[], maximum = 8): DashboardBucket[] {
  if (items.length <= maximum) return items;
  return [
    ...items.slice(0, maximum),
    {
      key: "other_subjects",
      label: "Other subjects",
      count: items.slice(maximum).reduce((sum, item) => sum + item.count, 0),
    },
  ];
}
