"use client";

import { useEffect, useRef } from "react";

type DeleteConfirmationDialogProps = {
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error: string | null;
};

export default function DeleteConfirmationDialog({ description, onCancel, onConfirm, deleting, error }: DeleteConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  return (
    <dialog
      className="expense-dialog confirm-dialog"
      ref={dialogRef}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      aria-busy={deleting}
      onCancel={(event) => { event.preventDefault(); if (!deleting) onCancel(); }}
      onClick={(event) => { if (event.target === dialogRef.current && !deleting) onCancel(); }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">A QUICK CHECK</p>
          <h2 id="delete-dialog-title">Delete this expense?</h2>
        </div>
        <button className="icon-button dialog-close" type="button" onClick={onCancel} aria-label="Close confirmation" disabled={deleting}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
        </button>
      </div>
      <p className="delete-description" id="delete-dialog-description">
        <strong>{description}</strong> will be removed from your expense list. This can’t be undone.
      </p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button ref={cancelRef} className="button button-secondary" type="button" onClick={onCancel} disabled={deleting}>Cancel</button>
        <button className="button button-danger" type="button" onClick={onConfirm} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete expense"}
        </button>
      </div>
    </dialog>
  );
}
