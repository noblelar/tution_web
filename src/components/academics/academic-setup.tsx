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
      <section className={`management-panel ${styles.scopePanel}`} aria-labelledby="academic-scope-title">
        <div>
          <p className="eyebrow">Management scope</p>
          <h2 id="academic-scope-title">Shared academic catalogue</h2>
          <p>Levels and subjects are shared across Tution. Your selected centre confirms where your manager permission applies and is recorded in the audit event.</p>
        </div>
        <label className="scope-control">
          Authorize through centre
          <select disabled={loading || pendingAction !== ""} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>
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
          <div className={styles.catalogueGrid}>
          <CataloguePanel
            title="Academic levels"
            description="Create the ordered levels used later by students, tutors, lessons, materials, and assignments."
            count={levels.length}
            actionLabel="Add level"
            onAction={openLevelDialog}
          >
            <div className={styles.entries}>
              {levels.length ? levels.map((level) => (
                <CatalogueEntry key={level.id} name={level.name} description={level.description} order={level.displayOrder} status={level.status}>
                  <button disabled={pendingAction !== ""} onClick={() => editLevel(level)} type="button">Edit</button>
                  <button className={level.status === "active" ? styles.dangerButton : styles.restoreButton} disabled={pendingAction !== ""} onClick={() => void changeStatus("levels", level.id, level.status === "active" ? "deactivate" : "reactivate")} type="button">{level.status === "active" ? "Deactivate" : "Reactivate"}</button>
                </CatalogueEntry>
              )) : <p className="empty-state">No academic levels have been created yet.</p>}
            </div>
          </CataloguePanel>

          <CataloguePanel
            title="Subjects"
            description="Maintain the core subjects offered by the tuition centre, with stable codes for future integrations."
            count={subjects.length}
            actionLabel="Add subject"
            onAction={openSubjectDialog}
          >
            <div className={styles.entries}>
              {subjects.length ? subjects.map((subject) => (
                <CatalogueEntry key={subject.id} name={subject.name} code={subject.code} description={subject.description} order={subject.displayOrder} status={subject.status}>
                  <button disabled={pendingAction !== ""} onClick={() => editSubject(subject)} type="button">Edit</button>
                  <button className={subject.status === "active" ? styles.dangerButton : styles.restoreButton} disabled={pendingAction !== ""} onClick={() => void changeStatus("subjects", subject.id, subject.status === "active" ? "deactivate" : "reactivate")} type="button">{subject.status === "active" ? "Deactivate" : "Reactivate"}</button>
                </CatalogueEntry>
              )) : <p className="empty-state">No subjects have been created yet.</p>}
            </div>
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
        <form className="account-form" onSubmit={submitLevel}>
          <label>Name<input maxLength={120} onChange={(event) => setLevelDraft({ ...levelDraft, name: event.target.value })} placeholder="e.g. GCSE" required value={levelDraft.name} /></label>
          <label>Description <span>Optional</span><textarea maxLength={2000} onChange={(event) => setLevelDraft({ ...levelDraft, description: event.target.value })} placeholder="How this level is used" value={levelDraft.description} /></label>
          <label>Display order<input max={10000} min={0} onChange={(event) => setLevelDraft({ ...levelDraft, displayOrder: event.target.value })} required type="number" value={levelDraft.displayOrder} /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button disabled={pendingAction !== ""} onClick={cancelLevelEdit} type="button">Cancel</button>
            <button className="primary-button" disabled={pendingAction !== ""} type="submit">
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
        <form className="account-form" onSubmit={submitSubject}>
          <div className={styles.twoFields}>
            <label>Name<input maxLength={120} onChange={(event) => setSubjectDraft({ ...subjectDraft, name: event.target.value })} placeholder="e.g. Mathematics" required value={subjectDraft.name} /></label>
            <label>Code<input maxLength={24} onChange={(event) => setSubjectDraft({ ...subjectDraft, code: event.target.value.toUpperCase() })} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,23}" placeholder="MATHS" required value={subjectDraft.code} /></label>
          </div>
          <label>Description <span>Optional</span><textarea maxLength={2000} onChange={(event) => setSubjectDraft({ ...subjectDraft, description: event.target.value })} placeholder="What the subject covers" value={subjectDraft.description} /></label>
          <label>Display order<input max={10000} min={0} onChange={(event) => setSubjectDraft({ ...subjectDraft, displayOrder: event.target.value })} required type="number" value={subjectDraft.displayOrder} /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button disabled={pendingAction !== ""} onClick={cancelSubjectEdit} type="button">Cancel</button>
            <button className="primary-button" disabled={pendingAction !== ""} type="submit">
              {pendingAction === "create-subject" || pendingAction === "update-subject" ? "Saving…" : editingSubjectId ? "Save subject" : "Add subject"}
            </button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}

function CataloguePanel({ title, description, count, actionLabel, onAction, children }: { title: string; description: string; count: number; actionLabel: string; onAction: () => void; children: React.ReactNode }) {
  return <section className={`management-panel ${styles.cataloguePanel}`}><header className={styles.panelHeader}><div><p className="eyebrow">{count} configured</p><h2>{title}</h2><p>{description}</p></div><button className="primary-button" onClick={onAction} type="button">{actionLabel}</button></header>{children}</section>;
}

function CatalogueEntry({ name, code, description, order, status, children }: { name: string; code?: string; description?: string; order: number; status: "active" | "inactive"; children: React.ReactNode }) {
  return <article className={styles.entry}><div className={styles.entryHeader}><div><div className={styles.entryTitle}><h3>{name}</h3>{code ? <code>{code}</code> : null}</div><p>{description || "No description provided."}</p></div><span className={`status-badge ${status === "active" ? "status-active" : "status-disabled"}`}>{status}</span></div><div className={styles.entryFooter}><span>Display order {order}</span><div className={styles.entryActions}>{children}</div></div></article>;
}

function errorMessage(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }
