"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

type NoteDialogProps = {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  size?: "small" | "large";
};

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';

export function NoteDialog({ open, title, description, children, onOpenChange, size = "large" }: NoteDialogProps) {
  const id = useId();
  const contentRef = useRef<HTMLElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function focusFirst() {
      (contentRef.current?.querySelector<HTMLElement>(focusableSelector) ?? contentRef.current)?.focus();
    }
    if (!contentRef.current?.contains(document.activeElement)) focusFirst();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChangeRef.current(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(contentRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        contentRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || !contentRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !contentRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    function keepFocusInside(event: FocusEvent) {
      if (event.target instanceof Node && !contentRef.current?.contains(event.target)) focusFirst();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80 grid place-items-center p-3 sm:p-5" role="presentation">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
        onClick={() => onOpenChangeRef.current(false)}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-describedby={`${id}-description`}
        aria-labelledby={`${id}-title`}
        aria-modal="true"
        className={`relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] ${size === "small" ? "max-w-lg" : "max-w-4xl"}`}
        ref={contentRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-slate-950" id={`${id}-title`}>{title}</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500" id={`${id}-description`}>{description}</p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            onClick={() => onOpenChangeRef.current(false)}
            type="button"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
