"use client";

import { type ReactNode, useEffect } from "react";

import { Icon } from "@/components/dashboard";

type FormDialogProps = {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function FormDialog({ open, title, description, children, onOpenChange }: FormDialogProps) {
  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="form-dialog-layer" role="presentation">
      <button
        aria-label="Close dialog"
        className="form-dialog-overlay"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <section
        aria-describedby="form-dialog-description"
        aria-labelledby="form-dialog-title"
        aria-modal="true"
        className="form-dialog-content"
        role="dialog"
      >
        <header className="form-dialog-header">
          <div>
            <h2 id="form-dialog-title">{title}</h2>
            <p id="form-dialog-description">{description}</p>
          </div>
          <button
            aria-label="Close dialog"
            className="form-dialog-close"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
