"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import { deletePendingStaff, PendingStaffDeletionError, type PendingStaffDeletionTarget } from "@/lib/pending-staff-deletion";

type Props = {
  target: PendingStaffDeletionTarget;
  onClose: () => void;
  onDeleted: () => void;
  onRefresh: () => Promise<void>;
};

export function PendingStaffDeleteDialog({ target, onClose, onDeleted, onRefresh }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewRequired, setReviewRequired] = useState(false);
  const busyRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const changeOpen = useCallback((open: boolean) => {
    if (!open && !busyRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = contentRef.current?.closest<HTMLElement>("[role='dialog']");
    cancelRef.current?.focus();
    function containFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), a[href], [tabindex='0']",
      ));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (!dialog.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    }
    document.addEventListener("keydown", containFocus);
    return () => {
      document.removeEventListener("keydown", containFocus);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  async function confirmDeletion() {
    if (busyRef.current || !acknowledged || reviewRequired || !target.eligible) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await deletePendingStaff(target);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account could not be deleted.");
      if (caught instanceof PendingStaffDeletionError && caught.requiresRefresh) {
        setReviewRequired(true);
        try {
          await onRefresh();
        } catch {
          setError((message) => `${message} The account details could not refresh; reload this page to check the latest status.`);
        }
      }
      busyRef.current = false;
      setBusy(false);
      return;
    }
    // Keep submission locked until the parent closes/navigates. A committed
    // deletion must not become retryable during client-side navigation.
    onDeleted();
  }

  return (
    <FormDialog
      open
      title={`Delete pending ${target.kind} account?`}
      description="Only an invited account that has never completed activation can be permanently deleted. This is different from revoking an invitation or disabling access."
      onOpenChange={changeOpen}
    >
      <div aria-busy={busy} className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6" ref={contentRef}>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 font-semibold text-slate-950">{target.name}</p>
          <p className="mb-0 break-all text-sm text-slate-600">{target.email}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950">
          <p className="mb-2 font-semibold">This cannot be undone.</p>
          <p className="mb-0">The pending account, its onboarding data and all activation invitations will be removed. Old activation links will stop working, and the email address can be invited again. The administrative audit record is retained.</p>
        </div>
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-800">
          <input
            checked={acknowledged}
            className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
            disabled={busy || reviewRequired || !target.eligible}
            onChange={(event) => setAcknowledged(event.target.checked)}
            type="checkbox"
          />
          I understand that this permanently removes the pending account.
        </label>
        {!target.eligible ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">This account is no longer eligible for deletion. Close the dialog and review its current status.</p> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        {reviewRequired ? <p className="text-sm leading-6 text-slate-600">Close this dialog and review the refreshed account before taking another action.</p> : null}
        <div className="-mx-5 -mb-5 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
          <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={() => changeOpen(false)} ref={cancelRef} type="button">Cancel</button>
          <button className="min-h-11 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy || !acknowledged || reviewRequired || !target.eligible} onClick={() => void confirmDeletion()} type="button">{busy ? "Deleting pending account…" : "Delete pending account"}</button>
        </div>
      </div>
    </FormDialog>
  );
}
