"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import type { Centre } from "@/lib/account-types";
import type { AcademicLevel, AcademicLevelList, Subject, SubjectList } from "@/lib/academic-types";
import { AcademicYearsPanel } from "./academic-years-panel";
import styles from "./academic-setup.module.css";

type ApiError = { error?: string };
type LevelDraft = { name: string; description: string; displayOrder: string };
type SubjectDraft = LevelDraft & { code: string };

const emptyLevel: LevelDraft = { name: "", description: "", displayOrder: "0" };
const emptySubject: SubjectDraft = { name: "", code: "", description: "", displayOrder: "0" };

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) throw new Error("Request verification is unavailable.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export function AcademicSetup() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levelDraft, setLevelDraft] = useState<LevelDraft>(emptyLevel);
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(emptySubject);
  const [editingLevelId, setEditingLevelId] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState("");
  const [dialogKind, setDialogKind] = useState<"level" | "subject" | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalogue = useCallback(async (scopeCentreId: string) => {
    const query = `?centreId=${encodeURIComponent(scopeCentreId)}`;
    const [levelResponse, subjectResponse] = await Promise.all([
      fetch(`/api/academics/levels${query}`, { cache: "no-store" }),
      fetch(`/api/academics/subjects${query}`, { cache: "no-store" }),
    ]);
    const levelResult = (await levelResponse.json()) as AcademicLevelList & ApiError;
    const subjectResult = (await subjectResponse.json()) as SubjectList & ApiError;
    if (!levelResponse.ok) throw new Error(levelResult.error ?? "Academic levels could not be loaded.");
    if (!subjectResponse.ok) throw new Error(subjectResult.error ?? "Subjects could not be loaded.");
    setLevels(levelResult.levels ?? []);
    setSubjects(subjectResult.subjects ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/users/context", { cache: "no-store" });
        const result = (await response.json()) as { centres?: Centre[] } & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Academic setup is unavailable.");
        const availableCentres = result.centres ?? [];
        const initialCentre = availableCentres[0]?.id ?? "";
        if (!initialCentre) throw new Error("You do not have an active centre management scope.");
        if (cancelled) return;
        setCentres(availableCentres);
        setCentreId(initialCentre);
        await loadCatalogue(initialCentre);
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, "Academic setup is unavailable."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [loadCatalogue]);

  async function changeCentre(nextCentreId: string) {
    setCentreId(nextCentreId);
    setError("");
    setNotice("");
    setLoading(true);
    cancelLevelEdit();
    cancelSubjectEdit();
    try { await loadCatalogue(nextCentreId); }
    catch (caught) { setError(errorMessage(caught, "Academic catalogue could not be loaded.")); }
    finally { setLoading(false); }
  }

  async function submitLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingLevelId ? "update-level" : "create-level";
    setPendingAction(action); setError(""); setNotice("");
    try {
      await mutate(editingLevelId ? `/api/academics/levels/${encodeURIComponent(editingLevelId)}` : "/api/academics/levels", editingLevelId ? "PUT" : "POST", {
        centreId, name: levelDraft.name, description: levelDraft.description,
        displayOrder: Number(levelDraft.displayOrder),
      });
      setNotice(editingLevelId ? "Academic level updated." : "Academic level created.");
      cancelLevelEdit();
      await loadCatalogue(centreId);
    } catch (caught) { setError(errorMessage(caught, "The academic level could not be saved.")); }
    finally { setPendingAction(""); }
  }

  async function submitSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingSubjectId ? "update-subject" : "create-subject";
    setPendingAction(action); setError(""); setNotice("");
    try {
      await mutate(editingSubjectId ? `/api/academics/subjects/${encodeURIComponent(editingSubjectId)}` : "/api/academics/subjects", editingSubjectId ? "PUT" : "POST", {
        centreId, name: subjectDraft.name, code: subjectDraft.code,
        description: subjectDraft.description, displayOrder: Number(subjectDraft.displayOrder),
      });
      setNotice(editingSubjectId ? "Subject updated." : "Subject created.");
      cancelSubjectEdit();
      await loadCatalogue(centreId);
    } catch (caught) { setError(errorMessage(caught, "The subject could not be saved.")); }
    finally { setPendingAction(""); }
  }

  async function changeStatus(kind: "levels" | "subjects", id: string, action: "deactivate" | "reactivate") {
    const reason = action === "deactivate" ? window.prompt("Why should this catalogue entry be deactivated?") : "";
    if (reason === null) return;
    if (action === "deactivate" && !reason.trim()) { setError("A deactivation reason is required."); return; }
    const key = `${kind}:${id}:${action}`;
    setPendingAction(key); setError(""); setNotice("");
    try {
      await mutate(`/api/academics/${kind}/${encodeURIComponent(id)}/${action}`, "POST", { centreId, reason });
      setNotice(action === "deactivate" ? "Catalogue entry deactivated without deleting its history." : "Catalogue entry reactivated.");
      await loadCatalogue(centreId);
    } catch (caught) { setError(errorMessage(caught, "The catalogue status could not be changed.")); }
    finally { setPendingAction(""); }
  }

  async function mutate(path: string, method: "POST" | "PUT", body: Record<string, unknown>) {
    const csrf = await csrfToken();
    const response = await fetch(path, { method, headers: { "content-type": "application/json", "x-csrf-token": csrf }, body: JSON.stringify(body) });
    const result = (await response.json()) as ApiError;
    if (!response.ok) throw new Error(result.error ?? "The academic catalogue could not be changed.");
  }

  function editLevel(level: AcademicLevel) {
    setEditingLevelId(level.id);
    setLevelDraft({ name: level.name, description: level.description ?? "", displayOrder: String(level.displayOrder) });
    setError("");
    setNotice("");
    setDialogKind("level");
  }

  function openLevelDialog() {
    setEditingLevelId("");
    setLevelDraft(emptyLevel);
    setError("");
    setNotice("");
    setDialogKind("level");
  }

  function cancelLevelEdit() {
    setEditingLevelId("");
    setLevelDraft(emptyLevel);
    setDialogKind((current) => current === "level" ? null : current);
  }

  function editSubject(subject: Subject) {
    setEditingSubjectId(subject.id);
    setSubjectDraft({ name: subject.name, code: subject.code, description: subject.description ?? "", displayOrder: String(subject.displayOrder) });
    setError("");
    setNotice("");
    setDialogKind("subject");
  }

  function openSubjectDialog() {
    setEditingSubjectId("");
    setSubjectDraft(emptySubject);
    setError("");
    setNotice("");
    setDialogKind("subject");
  }

  function cancelSubjectEdit() {
    setEditingSubjectId("");
    setSubjectDraft(emptySubject);
    setDialogKind((current) => current === "subject" ? null : current);
  }

  return (
    <div className={styles.setup}>
      <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" aria-labelledby="academic-setup-title">
        <h2 className="text-lg font-black tracking-tight text-slate-950" id="academic-setup-title">Academic setup</h2>
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Centre
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100" disabled={loading || pendingAction !== ""} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>
            {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
          </select>
        </label>
      </section>

      {error && !dialogKind ? <p className={`form-error ${styles.message}`} role="alert">{error}</p> : null}
      {notice ? <p className={styles.success} role="status">{notice}</p> : null}
      {loading ? <p className="loading-state">Loading academic catalogue…</p> : null}

      {!loading && centreId ? (
        <>
          <AcademicYearsPanel centreId={centreId} />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <CataloguePanel id="academic-levels-title" title="Academic levels" count={levels.length} actionLabel="Add level" onAction={openLevelDialog}>
              {levels.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3" scope="col">Name</th>
                        <th className="px-4 py-3" scope="col">Order</th>
                        <th className="px-4 py-3" scope="col">Status</th>
                        <th className="px-4 py-3 text-right" scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {levels.map((level) => (
                        <tr key={level.id}>
                          <td className="px-4 py-3"><CatalogueName name={level.name} description={level.description} /></td>
                          <td className="px-4 py-3 text-slate-600">{level.displayOrder}</td>
                          <td className="px-4 py-3"><CatalogueStatus status={level.status} /></td>
                          <td className="px-4 py-3">
                            <CatalogueActions active={level.status === "active"} disabled={pendingAction !== ""} onEdit={() => editLevel(level)} onToggle={() => void changeStatus("levels", level.id, level.status === "active" ? "deactivate" : "reactivate")} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No academic levels have been created yet.</p>}
            </CataloguePanel>

            <CataloguePanel id="subjects-title" title="Subjects" count={subjects.length} actionLabel="Add subject" onAction={openSubjectDialog}>
              {subjects.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3" scope="col">Name</th>
                        <th className="px-4 py-3" scope="col">Code</th>
                        <th className="px-4 py-3" scope="col">Order</th>
                        <th className="px-4 py-3" scope="col">Status</th>
                        <th className="px-4 py-3 text-right" scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjects.map((subject) => (
                        <tr key={subject.id}>
                          <td className="px-4 py-3"><CatalogueName name={subject.name} description={subject.description} /></td>
                          <td className="px-4 py-3"><code className="rounded bg-orange-50 px-1.5 py-0.5 text-xs font-extrabold text-orange-700">{subject.code}</code></td>
                          <td className="px-4 py-3 text-slate-600">{subject.displayOrder}</td>
                          <td className="px-4 py-3"><CatalogueStatus status={subject.status} /></td>
                          <td className="px-4 py-3">
                            <CatalogueActions active={subject.status === "active"} disabled={pendingAction !== ""} onEdit={() => editSubject(subject)} onToggle={() => void changeStatus("subjects", subject.id, subject.status === "active" ? "deactivate" : "reactivate")} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="empty-state">No subjects have been created yet.</p>}
            </CataloguePanel>
          </div>
        </>
      ) : null}

      <FormDialog
        open={dialogKind === "level"}
        title={editingLevelId ? "Edit academic level" : "Add academic level"}
        description="Define the level and its position in the shared academic catalogue."
        onOpenChange={(open) => { if (!open && pendingAction === "") cancelLevelEdit(); }}
      >
        <form className="account-form !mt-0 !gap-5 p-5 sm:p-6" onSubmit={submitLevel}>
          <label>Name<input maxLength={120} onChange={(event) => setLevelDraft({ ...levelDraft, name: event.target.value })} placeholder="e.g. GCSE" required value={levelDraft.name} /></label>
          <label>Description <span>Optional</span><textarea maxLength={2000} onChange={(event) => setLevelDraft({ ...levelDraft, description: event.target.value })} placeholder="How this level is used" value={levelDraft.description} /></label>
          <label>Display order<input max={10000} min={0} onChange={(event) => setLevelDraft({ ...levelDraft, displayOrder: event.target.value })} required type="number" value={levelDraft.displayOrder} /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions -mx-5 -mb-5 mt-1 flex-col-reverse border-t border-slate-200 px-5 !py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:px-6">
            <button className="w-full rounded-lg px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:w-auto" disabled={pendingAction !== ""} onClick={cancelLevelEdit} type="button">Cancel</button>
            <button className="primary-button w-full !px-5 !py-3 transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:w-auto" disabled={pendingAction !== ""} type="submit">
              {pendingAction === "create-level" || pendingAction === "update-level" ? "Saving…" : editingLevelId ? "Save level" : "Add level"}
            </button>
          </div>
        </form>
      </FormDialog>

      <FormDialog
        open={dialogKind === "subject"}
        title={editingSubjectId ? "Edit subject" : "Add subject"}
        description="Define the subject and its stable code in the shared academic catalogue."
        onOpenChange={(open) => { if (!open && pendingAction === "") cancelSubjectEdit(); }}
      >
        <form className="account-form !mt-0 !gap-5 p-5 sm:p-6" onSubmit={submitSubject}>
          <div className={styles.twoFields}>
            <label>Name<input maxLength={120} onChange={(event) => setSubjectDraft({ ...subjectDraft, name: event.target.value })} placeholder="e.g. Mathematics" required value={subjectDraft.name} /></label>
            <label>Code<input maxLength={24} onChange={(event) => setSubjectDraft({ ...subjectDraft, code: event.target.value.toUpperCase() })} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,23}" placeholder="MATHS" required value={subjectDraft.code} /></label>
          </div>
          <label>Description <span>Optional</span><textarea maxLength={2000} onChange={(event) => setSubjectDraft({ ...subjectDraft, description: event.target.value })} placeholder="What the subject covers" value={subjectDraft.description} /></label>
          <label>Display order<input max={10000} min={0} onChange={(event) => setSubjectDraft({ ...subjectDraft, displayOrder: event.target.value })} required type="number" value={subjectDraft.displayOrder} /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions -mx-5 -mb-5 mt-1 flex-col-reverse border-t border-slate-200 px-5 !py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:px-6">
            <button className="w-full rounded-lg px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:w-auto" disabled={pendingAction !== ""} onClick={cancelSubjectEdit} type="button">Cancel</button>
            <button className="primary-button w-full !px-5 !py-3 transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:w-auto" disabled={pendingAction !== ""} type="submit">
              {pendingAction === "create-subject" || pendingAction === "update-subject" ? "Saving…" : editingSubjectId ? "Save subject" : "Add subject"}
            </button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}

function CataloguePanel({ id, title, count, actionLabel, onAction, children }: { id: string; title: string; count: number; actionLabel: string; onAction: () => void; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={id}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950" id={id}>
          {title} <span className="text-sm font-bold text-slate-500">{count}</span>
        </h2>
        <button className="primary-button" onClick={onAction} type="button">{actionLabel}</button>
      </div>
      {children}
    </section>
  );
}

function CatalogueName({ name, description }: { name: string; description?: string | null }) {
  return (
    <>
      <span className="font-black text-slate-900">{name}</span>
      {description ? <span className="block max-w-xs truncate text-xs text-slate-500" title={description}>{description}</span> : null}
    </>
  );
}

function CatalogueStatus({ status }: { status: "active" | "inactive" }) {
  return <span className={`status-badge ${status === "active" ? "status-active" : "status-disabled"}`}>{status}</span>;
}

function CatalogueActions({ active, disabled, onEdit, onToggle }: { active: boolean; disabled: boolean; onEdit: () => void; onToggle: () => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50" disabled={disabled} onClick={onEdit} type="button">Edit</button>
      <button className={`text-xs font-bold hover:underline disabled:opacity-50 ${active ? "text-red-700" : "text-emerald-700"}`} disabled={disabled} onClick={onToggle} type="button">{active ? "Deactivate" : "Reactivate"}</button>
    </div>
  );
}

function errorMessage(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }
