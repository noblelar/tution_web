"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

type Props = { open: boolean; title: string; description: string; children: ReactNode; onOpenChange: (open: boolean) => void };
const focusable = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex="0"]';

export function FeedbackDialog({ open, title, description, children, onOpenChange }: Props) {
  const id = useId();
  const content = useRef<HTMLElement>(null);
  const change = useRef(onOpenChange);
  useEffect(() => { change.current = onOpenChange; }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirst = () => { (content.current?.querySelector<HTMLElement>(focusable) ?? content.current)?.focus(); };
    if (!content.current?.contains(document.activeElement)) focusFirst();

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); change.current(false); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(content.current?.querySelectorAll<HTMLElement>(focusable) ?? []).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) { event.preventDefault(); content.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !content.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !content.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    function focusin(event: FocusEvent) {
      if (event.target instanceof Node && !content.current?.contains(event.target)) focusFirst();
    }
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-80 grid place-items-center p-3 sm:p-5" role="presentation">
      <button aria-label="Close dialog" className="absolute inset-0 bg-slate-950/45" onClick={() => change.current(false)} tabIndex={-1} type="button" />
      <section aria-describedby={`${id}-description`} aria-labelledby={`${id}-title`} aria-modal="true" className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]" ref={content} role="dialog" tabIndex={-1}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div className="min-w-0"><h2 className="break-words text-xl font-bold tracking-tight" id={`${id}-title`}>{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500" id={`${id}-description`}>{description}</p></div>
          <button aria-label="Close dialog" className="grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-orange-600" onClick={() => change.current(false)} type="button">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}
