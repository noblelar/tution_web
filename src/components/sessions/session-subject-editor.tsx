"use client";

import type { Subject } from "@/lib/academic-types";
import type { TutorProfile } from "@/lib/profile-types";
import type { SessionSubjectSelection } from "@/lib/session-rules";

type SessionSubjectEditorProps = {
  value: SessionSubjectSelection[];
  subjects: Subject[];
  tutors: TutorProfile[];
  onChange: (value: SessionSubjectSelection[]) => void;
  disabled?: boolean;
};

const selectClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";
const smallButton = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export function SessionSubjectEditor({ value, subjects, tutors, onChange, disabled = false }: SessionSubjectEditorProps) {
  const selectedSubjectIDs = new Set(value.map((item) => item.subjectId));
  const availableSubject = subjects.find((subject) => !selectedSubjectIDs.has(subject.id));

  function update(index: number, next: SessionSubjectSelection) {
    onChange(value.map((item, itemIndex) => itemIndex === index ? next : item));
  }

  function addSubject() {
    if (!availableSubject) return;
    onChange([...value, { subjectId: availableSubject.id, tutorProfileIds: [] }]);
  }

  function removeSubject(index: number) {
    if (value.length === 1) return;
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveSubject(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function toggleTutor(index: number, tutorID: string) {
    const current = value[index];
    const selected = current.tutorProfileIds.includes(tutorID);
    update(index, {
      ...current,
      tutorProfileIds: selected ? current.tutorProfileIds.filter((id) => id !== tutorID) : [...current.tutorProfileIds, tutorID],
    });
  }

  return (
    <fieldset className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4" disabled={disabled}>
      <legend className="px-1 text-sm font-black text-slate-900">Subjects offered in this session</legend>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-xs leading-5 text-slate-500">Students choose exactly one of these subjects when booking. Tutor assignment is optional and belongs to each subject.</p>
        <button className={smallButton} disabled={!availableSubject || disabled} onClick={addSubject} type="button">Add subject</button>
      </div>

      <div className="grid gap-3">
        {value.map((offering, index) => (
          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" key={`subject-offering-${index}`}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
                Subject {index + 1}
                <select
                  className={selectClass}
                  onChange={(event) => update(index, { subjectId: event.target.value, tutorProfileIds: [] })}
                  required
                  value={offering.subjectId}
                >
                  {subjects.map((subject) => (
                    <option disabled={subject.id !== offering.subjectId && selectedSubjectIDs.has(subject.id)} key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button aria-label={`Move subject ${index + 1} up`} className={smallButton} disabled={index === 0 || disabled} onClick={() => moveSubject(index, -1)} type="button">Move up</button>
                <button aria-label={`Move subject ${index + 1} down`} className={smallButton} disabled={index === value.length - 1 || disabled} onClick={() => moveSubject(index, 1)} type="button">Move down</button>
                <button className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40" disabled={value.length === 1 || disabled} onClick={() => removeSubject(index)} type="button">Remove</button>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tutors for this subject <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></p>
              {tutors.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {tutors.map((tutor) => {
                    const name = [tutor.firstName, tutor.lastName].filter(Boolean).join(" ") || tutor.email;
                    return (
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/50" key={tutor.id}>
                        <input checked={offering.tutorProfileIds.includes(tutor.id)} className="size-4 accent-orange-600" onChange={() => toggleTutor(index, tutor.id)} type="checkbox" />
                        <span className="min-w-0 truncate">{name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">No active tutors are available at this centre. You can assign tutors later.</p>}
              <p className="mt-2 text-xs leading-5 text-slate-400">The backend verifies that every selected tutor has an active capability for this subject.</p>
            </div>
          </section>
        ))}
      </div>
    </fieldset>
  );
}
