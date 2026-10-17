"use client";

import { FormEvent, useEffect, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import type { Centre, ManagedAccount } from "@/lib/account-types";
import type {
  ParentOnboardingResult,
  ParentProfile,
  ParentStudentOnboardingResult,
  StudentOnboardingResult,
  TutorOnboardingResult,
} from "@/lib/profile-types";
import { otherRelationshipPattern, studentEmailRequired } from "@/lib/profile-onboarding-rules";

type OnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

type StudentDialogProps = OnboardingDialogProps & {
  parents: ParentProfile[];
};

type FormStatus = {
  error: string;
  success: string;
  submitting: boolean;
};

const initialStatus: FormStatus = { error: "", success: "", submitting: false };

export function ParentOnboardingDialog({ open, onOpenChange, onCreated }: OnboardingDialogProps) {
  const { centres, error: centreError } = useCentres(open);
  const [status, setStatus] = useState<FormStatus>(initialStatus);

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) setStatus(initialStatus);
    onOpenChange(nextOpen);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ error: "", success: "", submitting: true });
    const body = formObject(form);
    try {
      const result = (await postOnboarding("/api/profiles/onboarding/parents", body)) as ParentOnboardingResult;
      setStatus({ error: "", success: activationOutcome("Parent", result.account), submitting: false });
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
      return;
    }

    form.reset();
    onCreated?.();
    changeOpen(false);
  }

  return (
    <FormDialog
      description="Create the parent identity, parent profile, people code, and invitation in one manager-led workflow."
      onOpenChange={changeOpen}
      open={open}
      title="Onboard parent / guardian"
    >
      <form className="onboarding-form" onSubmit={submit}>
        <StatusMessages centreError={centreError} status={status} />
        <PersonFields phoneRequired />
        <CentreField centres={centres} />
        <AddressFields />
        <ConsentFields />
        <DialogActions submitting={status.submitting} submitLabel="Create parent" />
      </form>
    </FormDialog>
  );
}

export function StudentOnboardingDialog({ open, onOpenChange, onCreated, parents }: StudentDialogProps) {
  const { centres, error: centreError } = useCentres(open);
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const [parentProfileId, setParentProfileId] = useState("");
  const [centreId, setCentreId] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [matchedGuardian, setMatchedGuardian] = useState<ParentProfile | null>(null);
  const [guardianLookupError, setGuardianLookupError] = useState("");

  function resetDialogState() {
    setStatus(initialStatus);
    setParentProfileId("");
    setCentreId("");
    setGuardianEmail("");
    setMatchedGuardian(null);
    setGuardianLookupError("");
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) resetDialogState();
    onOpenChange(nextOpen);
  }

  async function findGuardian() {
    setGuardianLookupError("");
    setMatchedGuardian(null);
    if (!centreId || !guardianEmail.trim()) {
      setGuardianLookupError("Select a centre and enter the guardian's exact email address.");
      return;
    }
    try {
      const response = await fetch(`/api/profiles/parents?email=${encodeURIComponent(guardianEmail.trim())}`, { cache: "no-store" });
      const result = (await response.json()) as { parents?: ParentProfile[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Guardian lookup failed.");
      const match = result.parents?.[0] ?? null;
      if (!match) {
        setGuardianLookupError("No guardian with that exact email is visible in your permitted centres. Use the parent + student workflow for a new guardian.");
        return;
      }
      setMatchedGuardian(match);
      setParentProfileId(match.id);
    } catch (cause) {
      setGuardianLookupError(cause instanceof Error ? cause.message : "Guardian lookup failed.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ error: "", success: "", submitting: true });
    const body = formObject(form);
    try {
      const result = (await postOnboarding("/api/profiles/onboarding/students", {
        ...body,
        peopleCodeLoginEnabled: Boolean(body.email),
      })) as StudentOnboardingResult;
      setStatus({ error: "", success: activationOutcome("Student", result.account), submitting: false });
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
      return;
    }

    form.reset();
    onCreated?.();
    changeOpen(false);
  }

  return (
    <FormDialog
      description="Create an independent student with email, or link a no-email student to an existing parent."
      onOpenChange={changeOpen}
      open={open}
      title="Onboard student"
    >
      <form className="onboarding-form" onSubmit={submit}>
        <StatusMessages centreError={centreError} status={status} />
        <PersonFields emailRequired={studentEmailRequired(parentProfileId)} />
        <CentreField centres={centres} onChange={(value) => {
          setCentreId(value);
          setParentProfileId("");
          setMatchedGuardian(null);
          setGuardianLookupError("");
        }} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">Find existing guardian by exact email
            <input onChange={(event) => { setGuardianEmail(event.target.value); setMatchedGuardian(null); setParentProfileId(""); }} type="email" value={guardianEmail} />
          </label>
          <button className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800" onClick={findGuardian} type="button">Find guardian</button>
        </div>
        {guardianLookupError ? <p className="text-sm text-red-700" role="alert">{guardianLookupError}</p> : null}
        <div className="form-grid">
          <label>
            Date of birth <input name="dateOfBirth" required type="date" />
          </label>
          <label>
            Gender <input name="gender" placeholder="Male, female, other…" />
          </label>
          <label>
            Existing parent / guardian
            <select name="parentProfileId" onChange={(event) => setParentProfileId(event.target.value)} value={parentProfileId}>
              <option value="">No parent selected — email becomes required</option>
              {[...parents, ...(matchedGuardian && !parents.some((parent) => parent.id === matchedGuardian.id) ? [matchedGuardian] : [])].map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.preferredName ?? parent.peopleCode} · {parent.peopleCode}
                </option>
              ))}
            </select>
          </label>
          {parentProfileId ? <RelationshipFields /> : null}
        </div>
        <StudentAcademicFields />
        <p className="form-helper">If no parent is selected, an email is required for the student. If a parent is selected, student email is optional and the family link includes the guardian relationship.</p>
        <DialogActions submitting={status.submitting} submitLabel="Create student" />
      </form>
    </FormDialog>
  );
}

export function ParentStudentOnboardingDialog({ open, onOpenChange, onCreated }: OnboardingDialogProps) {
  const { centres, error: centreError } = useCentres(open);
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const [relationshipFormKey, setRelationshipFormKey] = useState(0);

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) setStatus(initialStatus);
    onOpenChange(nextOpen);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ error: "", success: "", submitting: true });
    const data = new FormData(form);
    const centreId = stringFromData(data, "centreId");
    const parent = scopedFormObject(data, "parent", centreId);
    const student = scopedFormObject(data, "student", centreId);

    try {
      const result = (await postOnboarding("/api/profiles/onboarding/parent-student", {
        parent,
        student: { ...student, peopleCodeLoginEnabled: Boolean(student.email) },
        relationshipType: stringFromData(data, "relationshipType") || "guardian",
        relationshipDescription: stringFromData(data, "relationshipDescription") || undefined,
      })) as ParentStudentOnboardingResult;
      setStatus({
        error: "",
        success: `${activationOutcome("Parent", result.parentAccount)} ${activationOutcome("Student", result.studentAccount)} Profiles linked successfully.`,
        submitting: false,
      });
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
      return;
    }

    form.reset();
    setRelationshipFormKey((current) => current + 1);
    onCreated?.();
    changeOpen(false);
  }

  return (
    <FormDialog
      description="Create a parent, create a student, and link them immediately. This is the preferred no-email student onboarding path."
      onOpenChange={changeOpen}
      open={open}
      title="Onboard parent with student"
    >
      <form className="onboarding-form" onSubmit={submit}>
        <StatusMessages centreError={centreError} status={status} />
        <CentreField centres={centres} />
        <fieldset className="form-section">
          <legend>Parent / guardian</legend>
          <PersonFields namePrefix="parent" phoneRequired />
          <AddressFields namePrefix="parent" />
          <ConsentFields namePrefix="parent" />
        </fieldset>
        <fieldset className="form-section">
          <legend>Student</legend>
          <PersonFields emailRequired={false} namePrefix="student" />
          <div className="form-grid">
            <label>
              Date of birth <input name="student.dateOfBirth" required type="date" />
            </label>
            <label>
              Gender <input name="student.gender" placeholder="Male, female, other…" />
            </label>
            <RelationshipFields key={relationshipFormKey} />
          </div>
          <StudentAcademicFields namePrefix="student" />
        </fieldset>
        <DialogActions submitting={status.submitting} submitLabel="Create family" />
      </form>
    </FormDialog>
  );
}

export function TutorOnboardingDialog({ open, onOpenChange, onCreated }: OnboardingDialogProps) {
  const { centres, error: centreError } = useCentres(
    open,
    "/api/profiles/onboarding/tutors?context=management",
  );
  const [status, setStatus] = useState<FormStatus>(initialStatus);

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) setStatus(initialStatus);
    onOpenChange(nextOpen);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ error: "", success: "", submitting: true });
    try {
      const result = (await postOnboarding(
        "/api/profiles/onboarding/tutors",
        formObject(form),
      )) as TutorOnboardingResult;
      const success = result.invitation.emailDelivery.status === "failed"
        ? "Tutor created, but the activation email could not be sent. Retry the invitation from tutor management."
        : "Tutor created and the activation email was accepted for delivery.";
      setStatus({ error: "", success, submitting: false });
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
      return;
    }

    form.reset();
    onCreated?.();
    changeOpen(false);
  }

  return (
    <FormDialog
      description="Create a tutor staff identity, centre assignment, profile, and invitation."
      onOpenChange={changeOpen}
      open={open}
      title="Onboard tutor"
    >
      <form className="onboarding-form" onSubmit={submit}>
        <StatusMessages centreError={centreError} status={status} />
        <PersonFields />
        <CentreField centres={centres} />
        <DialogActions submitting={status.submitting} submitLabel="Create tutor" />
      </form>
    </FormDialog>
  );
}

function PersonFields({
  emailRequired = true,
  namePrefix = "",
  phoneRequired = false,
}: {
  emailRequired?: boolean;
  namePrefix?: string;
  phoneRequired?: boolean;
}) {
  const name = fieldName(namePrefix);
  return (
    <div className="form-grid">
      <label>
        First name <input name={name("firstName")} required />
      </label>
      <label>
        Last name <input name={name("lastName")} required />
      </label>
      <label>
        Preferred name <input name={name("preferredName")} />
      </label>
      <label>
        Email <input name={name("email")} required={emailRequired} type="email" />
      </label>
      <label>
        Phone number <input name={name("phoneNumber")} required={phoneRequired} type="tel" />
      </label>
    </div>
  );
}

export function RelationshipFields() {
  const [relationshipType, setRelationshipType] = useState("guardian");
  const isOther = relationshipType === "other";

  return (
    <>
      <label>
        Relationship type
        <select name="relationshipType" onChange={(event) => setRelationshipType(event.target.value)} value={relationshipType}>
          <option value="guardian">Guardian</option>
          <option value="mother">Mother</option>
          <option value="father">Father</option>
          <option value="carer">Carer</option>
          <option value="step_parent">Step-parent</option>
          <option value="other">Other</option>
        </select>
      </label>
      {isOther ? (
        <label>
          Other relationship (1–3 words)
          <input
            maxLength={80}
            name="relationshipDescription"
            pattern={otherRelationshipPattern}
            placeholder="E.g. elder brother"
            required
          />
        </label>
      ) : null}
    </>
  );
}

function CentreField({ centres, onChange }: { centres: Centre[]; onChange?: (centreId: string) => void }) {
  return (
    <label>
      Centre
      <select name="centreId" onChange={(event) => onChange?.(event.target.value)} required>
        <option value="">Select centre</option>
        {centres.map((centre) => (
          <option key={centre.id} value={centre.id}>
            {centre.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function AddressFields({ namePrefix = "" }: { namePrefix?: string }) {
  const name = fieldName(namePrefix);
  return (
    <div className="form-grid">
      <label>
        Address line 1 <input name={name("addressLine1")} />
      </label>
      <label>
        Address line 2 <input name={name("addressLine2")} />
      </label>
      <label>
        City <input name={name("city")} />
      </label>
      <label>
        County / region <input name={name("countyRegion")} />
      </label>
      <label>
        Postcode <input name={name("postalCode")} />
      </label>
      <label>
        Country <input name={name("country")} />
      </label>
    </div>
  );
}

function ConsentFields({ namePrefix = "" }: { namePrefix?: string }) {
  const name = fieldName(namePrefix);
  return (
    <div className="form-check-grid">
      <label>
        <input name={name("contactConsent")} type="checkbox" value="true" /> Contact consent confirmed
      </label>
      <label>
        <input name={name("marketingOptIn")} type="checkbox" value="true" /> Marketing opt-in
      </label>
    </div>
  );
}

function StudentAcademicFields({ namePrefix = "" }: { namePrefix?: string }) {
  const name = fieldName(namePrefix);
  return (
    <div className="form-grid">
      <label>
        School name <input name={name("schoolName")} />
      </label>
      <label>
        Year group <input name={name("academicYearGroup")} placeholder="Year 7, GCSE, A-Level…" />
      </label>
      <label>
        Referral source <input name={name("referralSource")} />
      </label>
      <label className="form-grid-wide">
        Notes <textarea name={name("notes")} rows={3} />
      </label>
    </div>
  );
}

function DialogActions({ submitting, submitLabel }: { submitting: boolean; submitLabel: string }) {
  return (
    <footer className="dialog-actions">
      <button className="student-primary-action" disabled={submitting} type="submit">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </footer>
  );
}

function StatusMessages({ centreError, status }: { centreError: string; status: FormStatus }) {
  return (
    <>
      {centreError ? <p className="form-error" role="alert">{centreError}</p> : null}
      {status.error ? <p className="form-error" role="alert">{status.error}</p> : null}
      {status.success ? <p className="form-success" role="status">{status.success}</p> : null}
    </>
  );
}

function useCentres(open: boolean, endpoint = "/api/users/context") {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;

    async function loadCentres() {
      setError("");
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const result = (await response.json()) as { centres?: Centre[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Centres could not be loaded.");
        if (active) setCentres(result.centres ?? []);
      } catch (loadError) {
        if (active) setError(errorMessage(loadError));
      }
    }

    void loadCentres();
    return () => {
      active = false;
    };
  }, [endpoint, open]);

  return { centres, error };
}

async function postOnboarding(path: string, body: Record<string, unknown>) {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Request verification failed.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Onboarding failed.");
  return result;
}

function formObject(form: HTMLFormElement) {
  const data = new FormData(form);
  const result: Record<string, unknown> = {};
  data.forEach((value, key) => {
    result[key] = typeof value === "string" ? value.trim() : value;
  });
  result.contactConsent = data.get("contactConsent") === "true";
  result.marketingOptIn = data.get("marketingOptIn") === "true";
  return result;
}

function scopedFormObject(data: FormData, scope: string, centreId: string) {
  const result: Record<string, unknown> = { centreId };
  const prefix = `${scope}.`;
  data.forEach((value, key) => {
    if (!key.startsWith(prefix)) return;
    result[key.slice(prefix.length)] = typeof value === "string" ? value.trim() : value;
  });
  result.contactConsent = data.get(`${scope}.contactConsent`) === "true";
  result.marketingOptIn = data.get(`${scope}.marketingOptIn`) === "true";
  return result;
}

function stringFromData(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fieldName(prefix: string) {
  return (name: string) => (prefix ? `${prefix}.${name}` : name);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function activationOutcome(label: "Parent" | "Student", account?: ManagedAccount) {
  if (!account) {
    return `${label} profile created without a login account.`;
  }
  if (account.accountStatus === "active") {
    return `${label} profile linked to the existing active account.`;
  }
  const status = account.invitation?.emailDelivery?.status;
  if (status === "smtp_accepted") {
    return `${label} created and the activation email was accepted for delivery.`;
  }
  if (status === "failed" || status === "unavailable") {
    return `${label} created, but the activation email could not be sent.`;
  }
  return `${label} created with an activation invitation pending.`;
}
