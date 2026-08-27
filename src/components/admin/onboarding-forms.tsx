"use client";

import { FormEvent, useEffect, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import type { Centre } from "@/lib/account-types";
import type { ParentProfile } from "@/lib/profile-types";

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ error: "", success: "", submitting: true });
    const body = formObject(event.currentTarget);
    try {
      await postOnboarding("/api/profiles/onboarding/parents", body);
      setStatus({ error: "", success: "Parent profile created.", submitting: false });
      event.currentTarget.reset();
      onCreated?.();
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
    }
  }

  return (
    <FormDialog
      description="Create the parent identity, parent profile, people code, and invitation in one manager-led workflow."
      onOpenChange={onOpenChange}
      open={open}
      title="Onboard parent / guardian"
    >
      <form className="onboarding-form" onSubmit={submit}>
        <StatusMessages centreError={centreError} status={status} />
        <PersonFields />
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ error: "", success: "", submitting: true });
    const body = formObject(event.currentTarget);
    try {
      await postOnboarding("/api/profiles/onboarding/students", {
        ...body,
        peopleCodeLoginEnabled: true,
      });
      setStatus({ error: "", success: "Student profile created.", submitting: false });
      event.currentTarget.reset();
      onCreated?.();
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
    }
  }

  return (
    <FormDialog
      description="Create an independent student with email, or link a no-email student to an existing parent."
      onOpenChange={onOpenChange}
      open={open}
      title="Onboard student"
    >
      <form className="onboarding-form" onSubmit={submit}>
        <StatusMessages centreError={centreError} status={status} />
        <PersonFields emailRequired={false} />
        <div className="form-grid">
          <label>
            Date of birth <input name="dateOfBirth" required type="date" />
          </label>
          <label>
            Gender <input name="gender" placeholder="Male, female, other…" />
          </label>
          <label>
            Existing parent / guardian
            <select name="parentProfileId">
              <option value="">No parent selected — email becomes required</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.preferredName ?? parent.peopleCode} · {parent.peopleCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            Relationship type
            <select defaultValue="guardian" name="relationshipType">
              <option value="guardian">Guardian</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="carer">Carer</option>
            </select>
          </label>
        </div>
        <CentreField centres={centres} />
        <StudentAcademicFields />
        <p className="form-helper">If no parent is selected, provide the student email for independent access. If a parent is selected, the student can use people code + date of birth.</p>
        <DialogActions submitting={status.submitting} submitLabel="Create student" />
      </form>
    </FormDialog>
  );
}

export function ParentStudentOnboardingDialog({ open, onOpenChange, onCreated }: OnboardingDialogProps) {
  const { centres, error: centreError } = useCentres(open);
  const [status, setStatus] = useState<FormStatus>(initialStatus);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ error: "", success: "", submitting: true });
    const data = new FormData(event.currentTarget);
    const centreId = stringFromData(data, "centreId");
    const parent = scopedFormObject(data, "parent", centreId);
    const student = scopedFormObject(data, "student", centreId);

    try {
      await postOnboarding("/api/profiles/onboarding/parent-student", {
        parent,
        student: { ...student, peopleCodeLoginEnabled: true },
        relationshipType: stringFromData(data, "relationshipType") || "guardian",
      });
      setStatus({ error: "", success: "Parent and student profiles created and linked.", submitting: false });
      event.currentTarget.reset();
      onCreated?.();
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
    }
  }

  return (
    <FormDialog
      description="Create a parent, create a student, and link them immediately. This is the preferred no-email student onboarding path."
      onOpenChange={onOpenChange}
      open={open}
      title="Onboard parent with student"
    >
      <form className="onboarding-form" onSubmit={submit}>
        <StatusMessages centreError={centreError} status={status} />
        <CentreField centres={centres} />
        <fieldset className="form-section">
          <legend>Parent / guardian</legend>
          <PersonFields namePrefix="parent" />
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
            <label>
              Relationship type
              <select defaultValue="guardian" name="relationshipType">
                <option value="guardian">Guardian</option>
                <option value="mother">Mother</option>
                <option value="father">Father</option>
                <option value="carer">Carer</option>
              </select>
            </label>
          </div>
          <StudentAcademicFields namePrefix="student" />
        </fieldset>
        <DialogActions submitting={status.submitting} submitLabel="Create family" />
      </form>
    </FormDialog>
  );
}

export function TutorOnboardingDialog({ open, onOpenChange, onCreated }: OnboardingDialogProps) {
  const { centres, error: centreError } = useCentres(open);
  const [status, setStatus] = useState<FormStatus>(initialStatus);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ error: "", success: "", submitting: true });
    try {
      await postOnboarding("/api/profiles/onboarding/tutors", formObject(event.currentTarget));
      setStatus({ error: "", success: "Tutor profile created.", submitting: false });
      event.currentTarget.reset();
      onCreated?.();
    } catch (error) {
      setStatus({ error: errorMessage(error), success: "", submitting: false });
    }
  }

  return (
    <FormDialog
      description="Create a tutor staff identity, centre assignment, profile, and invitation."
      onOpenChange={onOpenChange}
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

function PersonFields({ emailRequired = true, namePrefix = "" }: { emailRequired?: boolean; namePrefix?: string }) {
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
        Phone number <input name={name("phoneNumber")} type="tel" />
      </label>
    </div>
  );
}

function CentreField({ centres }: { centres: Centre[] }) {
  return (
    <label>
      Centre
      <select name="centreId" required>
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

function useCentres(open: boolean) {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;

    async function loadCentres() {
      setError("");
      try {
        const response = await fetch("/api/users/context", { cache: "no-store" });
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
  }, [open]);

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
