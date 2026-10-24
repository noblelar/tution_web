import type { FeedbackQuery } from "@/lib/feedback-types";

import { feedbackDate, feedbackSecondaryButton, queryStatusLabels } from "./feedback-display";

export function QueryTable({
  queries,
  timeZone,
  opening,
  onOpen,
}: {
  queries: FeedbackQuery[];
  timeZone?: string;
  opening: string;
  onOpen: (query: FeedbackQuery) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3" scope="col">Subject</th>
            <th className="px-4 py-3" scope="col">Student</th>
            <th className="px-4 py-3" scope="col">Opened by</th>
            <th className="px-4 py-3" scope="col">Status</th>
            <th className="px-4 py-3" scope="col">Assigned / updated</th>
            <th className="px-4 py-3" scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {queries.map((item) => (
            <tr className="border-t border-slate-200 align-top" key={item.id}>
              <td className="max-w-xs px-4 py-3">
                <p className="truncate font-bold text-slate-900" title={item.subject}>{item.subject}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                {item.studentFirstName} {item.studentLastName}
                <span className="block text-xs text-slate-500">{item.studentPeopleCode}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{item.openerFirstName} {item.openerLastName}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "resolved" ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800"}`}>
                  {queryStatusLabels[item.status]}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                {item.assignedTutorProfileId ? `${item.assignedTutorFirstName ?? ""} ${item.assignedTutorLastName ?? ""}` : "Centre inbox"}
                <span className="block text-xs text-slate-500">Updated {feedbackDate(item.lastMessageAt, timeZone)}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button className={feedbackSecondaryButton} disabled={Boolean(opening)} onClick={() => onOpen(item)} type="button">
                  {opening === item.id ? "Opening…" : "Open query"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
