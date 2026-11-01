"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { rupeesToMinorUnits, type Expense, type ExpenseCategory, type ExpenseFields } from "@/lib/expenses";
import ExpenseCategoryPicker from "@/components/expense-category-picker";
import ExpenseDatePicker from "@/components/expense-date-picker";

type ExpenseFormDialogProps = {
  expense: Expense | null;
  onClose: () => void;
  onSave: (input: ExpenseFields) => Promise<void>;
  saving: boolean;
  saveError: string | null;
};

export default function ExpenseFormDialog({
  expense,
  onClose,
  onSave,
  saving,
  saveError,
}: ExpenseFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [amount, setAmount] = useState(expense ? String(expense.amountMinor / 100) : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "Food & drink");
  const [date, setDate] = useState(expense?.date ?? (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  })());
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    amountRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || saving) return;
    const amountMinor = rupeesToMinorUnits(amount);
    const nextErrors: typeof errors = {};
    if (amountMinor === null) nextErrors.amount = "Enter an amount greater than ₹0 with up to two decimal places.";
    if (!description.trim()) nextErrors.description = "Add a short description.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submittingRef.current = true;
    try {
      await onSave({
        description: description.trim(),
        category,
        amountMinor: amountMinor!,
        date,
      });
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <dialog
      className="expense-dialog"
      ref={dialogRef}
      aria-labelledby="expense-dialog-title"
      aria-busy={saving}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !saving) onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">YOUR MONEY, IN GOOD ORDER</p>
          <h2 id="expense-dialog-title">{expense ? "Edit expense" : "Add an expense"}</h2>
        </div>
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close dialog" disabled={saving}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
        </button>
      </div>

      <form className="expense-form" onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="expense-amount">Amount</label>
        <div className={`amount-input-wrap ${errors.amount ? "has-error" : ""}`}>
          <span aria-hidden="true">₹</span>
          <input
            id="expense-amount"
            ref={amountRef}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            onChange={(event) => setAmount(event.target.value)}
            disabled={saving}
            required
          />
        </div>
        {errors.amount && <p className="field-error" id="amount-error">{errors.amount}</p>}

        <label className="field-label" htmlFor="expense-description">Description</label>
        <input
          className={`text-input ${errors.description ? "has-error" : ""}`}
          id="expense-description"
          type="text"
          placeholder="e.g. Lunch with friends"
          maxLength={120}
          value={description}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
          onChange={(event) => setDescription(event.target.value)}
          disabled={saving}
          required
        />
        {errors.description && <p className="field-error" id="description-error">{errors.description}</p>}

        <div className="field-grid">
          <div>
            <label className="field-label" htmlFor="expense-category">Category</label>
            <ExpenseCategoryPicker value={category} onChange={setCategory} disabled={saving} />
          </div>
          <div>
            <label className="field-label" htmlFor="expense-date">Date</label>
            <ExpenseDatePicker value={date} onChange={setDate} disabled={saving} />
          </div>
        </div>

        {saveError && <p className="field-error" role="alert">{saveError}</p>}
        <div className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : expense ? "Save changes" : "Add expense"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
