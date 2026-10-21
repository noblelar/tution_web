import { Suspense } from "react";

import { NotesView } from "@/components/notes";

export default function NotesPage() {
  return (
    <Suspense fallback={<NotesPageFallback />}>
      <NotesView />
    </Suspense>
  );
}

function NotesPageFallback() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8" aria-busy="true" aria-label="Loading learning notes">
      <div className="h-64 animate-pulse rounded-3xl border border-orange-100 bg-orange-50" />
      <div className="mt-6 h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </main>
  );
}
