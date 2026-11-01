"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ExpenseFormDialog from "@/components/expense-form-dialog";
import ExpenseList from "@/components/expense-list";
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog";
import {
  apiCategoryByLabel,
  expenseFromApi,
  formatRupees,
  type ExpenseFields,
  type Expense,
} from "@/lib/expenses";

const MAX_EXPENSES = 100;
const SAFE_VALIDATION_MESSAGES = new Set([
  "Amount must be a positive safe integer.",
  "Description must not be empty.",
  "Category is not supported.",
  "Date must be a valid ISO date or datetime.",
  "Unexpected fields are not allowed.",
  "At least one valid expense field is required.",
]);

type RequestKind = "load" | "save" | "delete";

async function requestErrorMessage(response: Response, kind: RequestKind): Promise<string> {
  const fallback = {
    load: "We couldn’t load your expenses. Check your connection and try again.",
    save: "We couldn’t save this expense. Please try again.",
    delete: "We couldn’t delete this expense. Please try again.",
  }[kind];

  if (response.status === 404) return "This expense is no longer available. Refresh the list and try again.";

  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 400 && typeof payload === "object" && payload !== null && "error" in payload) {
    const error = payload.error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_FAILED" && "issues" in error && Array.isArray(error.issues)) {
      const messages = error.issues
        .flatMap((issue) => typeof issue === "object" && issue !== null && "message" in issue && typeof issue.message === "string" ? [issue.message] : [])
        .filter((message) => SAFE_VALIDATION_MESSAGES.has(message));
      if (messages.length > 0) return [...new Set(messages)].join(" ");
    }
    return "Please check the expense details and try again.";
  }

  return fallback;
}

const currencyIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 8h12M6 12h12M9 4h3.5a4.5 4.5 0 0 1 0 9H9l7 7" />
  </svg>
);

export default function ExpenseDashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [currentDateLabel, setCurrentDateLabel] = useState("");
  const [currentMonthLabel, setCurrentMonthLabel] = useState("");
  const [dialogExpense, setDialogExpense] = useState<Expense | null | undefined>(undefined);
  const [deleteCandidate, setDeleteCandidate] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const expensesHeadingRef = useRef<HTMLHeadingElement>(null);
  const saveInFlight = useRef(false);
  const deleteInFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadExpenses() {
      try {
        const response = await fetch("/api/expenses", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setLoadError(await requestErrorMessage(response, "load"));
          setLoadState("error");
          return;
        }

        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("Invalid expense response.");
        setExpenses(payload.map(expenseFromApi).slice(0, MAX_EXPENSES));
        setLoadError(null);
        setLoadState("ready");
      } catch {
        if (controller.signal.aborted) return;
        setLoadError("We couldn’t load your expenses. Check your connection and try again.");
        setLoadState("error");
      }
    }

    void loadExpenses();
    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => {
    function updateDateLabels() {
      const today = new Date();
      setCurrentDateLabel(new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(today).toUpperCase());
      setCurrentMonthLabel(new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(today));
    }

    const timeout = window.setTimeout(updateDateLabels, 0);
    const interval = window.setInterval(updateDateLabels, 60_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)),
    [expenses],
  );
  const totalMinor = expenses.reduce<number | null>((total, expense) => {
    if (total === null || expense.amountMinor > Number.MAX_SAFE_INTEGER - total) return null;
    return total + expense.amountMinor;
  }, 0);
  const averageMinor = totalMinor !== null && expenses.length
    ? Math.round(totalMinor / expenses.length)
    : null;
  function openDialog(expense: Expense | null) {
    setDialogExpense(expense);
  }

  function closeDialog() {
    setDialogExpense(undefined);
  }

  async function saveExpense(input: ExpenseFields): Promise<void> {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setSaveError(null);
    setRequestNotice(null);

    const editingExpense = dialogExpense;
    const expenseId = editingExpense?.id;
    const isEditing = expenseId !== undefined;

    try {
      const response = await fetch(
        isEditing ? `/api/expenses/${encodeURIComponent(expenseId)}` : "/api/expenses",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountMinor: input.amountMinor,
            description: input.description,
            category: apiCategoryByLabel[input.category],
            date: input.date,
          }),
        },
      );

      if (!response.ok) {
        setSaveError(await requestErrorMessage(response, "save"));
        return;
      }

      const savedExpense = expenseFromApi(await response.json());
      const updatedExpenses = (isEditing
        ? expenses.map((expense) => expense.id === savedExpense.id ? savedExpense : expense)
        : [savedExpense, ...expenses.filter((expense) => expense.id !== savedExpense.id)])
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, MAX_EXPENSES);
      setExpenses(updatedExpenses);
      if (!updatedExpenses.some((expense) => expense.id === savedExpense.id)) {
        setRequestNotice("Expense saved successfully, but it is outside the latest 100 expenses currently shown.");
      }
      closeDialog();
    } catch {
      setSaveError(isEditing
        ? "We couldn’t confirm whether this change was saved. Refresh the dashboard before retrying."
        : "We couldn’t confirm whether this expense was saved. Refresh the dashboard before retrying to avoid creating a duplicate.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteCandidate || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/expenses/${encodeURIComponent(deleteCandidate.id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setDeleteError(await requestErrorMessage(response, "delete"));
        return;
      }

      const deletedId = deleteCandidate.id;
      setExpenses((current) => current.filter((expense) => expense.id !== deletedId));
      setRequestNotice(null);
      try {
        const refreshResponse = await fetch("/api/expenses", { cache: "no-store" });
        if (!refreshResponse.ok) throw new Error("Refresh failed.");
        const payload: unknown = await refreshResponse.json();
        if (!Array.isArray(payload)) throw new Error("Invalid expense response.");
        setExpenses(payload.map(expenseFromApi).slice(0, MAX_EXPENSES));
      } catch {
        setRequestNotice("Expense deleted. The list could not be refreshed, so it may not include the next expense yet. Refresh the dashboard to update it.");
      }
      setDeleteCandidate(null);
      window.requestAnimationFrame(() => expensesHeadingRef.current?.focus());
    } catch {
      setDeleteError("We couldn’t confirm whether this expense was deleted. Refresh the dashboard before retrying.");
    } finally {
      deleteInFlight.current = false;
      setDeleting(false);
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem("expense-tracker-theme", nextTheme);
    } catch {
      // The in-page theme still changes if storage is unavailable.
    }
  }

  return (
    <main className="app-shell">
      <div className="dashboard-container">
        <header className="topbar">
          <a className="brand" href="#main-content" aria-label="Minto home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32"><path d="M8 22V11l8 7 8-7v11M16 18v5" /></svg>
            </span>
            <span className="brand-name">minto<span>.</span></span>
          </a>

          <div className="topbar-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label="Switch between light and dark themes"
              title="Switch theme"
            >
              <svg className="theme-icon theme-icon-moon" viewBox="0 0 20 20" aria-hidden="true"><path d="M16.6 12.1A6.9 6.9 0 0 1 7.9 3.4a6.9 6.9 0 1 0 8.7 8.7Z" /></svg>
              <svg className="theme-icon theme-icon-sun" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.1" /><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4m8.8 8.8 1.4 1.4m0-11.6-1.4 1.4m-8.8 8.8-1.4 1.4" /></svg>
            </button>
            <button className="button button-primary add-button" type="button" onClick={() => openDialog(null)}>
              <span aria-hidden="true">＋</span><span>Add expense</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content" id="main-content">
          <section className="page-intro" aria-labelledby="page-title">
            <div>
              <p className="eyebrow">{currentDateLabel}</p>
              <h1 id="page-title">Your spending, <span>in good shape.</span></h1>
              <p className="intro-copy">A little clarity goes a long way. Here’s where things stand.</p>
            </div>
            <div className="month-pill"><span className="status-dot" /> {currentMonthLabel} overview</div>
          </section>

          <section className="summary-grid" aria-label="Expense summary">
            <article className="summary-card summary-total">
              <div className="summary-topline"><span className="summary-label">Total spent</span><span className="summary-icon">{currencyIcon}</span></div>
              <p className="summary-value total-value">{loadState === "ready" && totalMinor !== null ? formatRupees(totalMinor) : "—"}</p>
              <p className="summary-note">{totalMinor === null && loadState === "ready" ? "Total exceeds the safe calculation range" : "Across up to 100 latest expenses"}</p>
            </article>
            <article className="summary-card">
              <div className="summary-topline"><span className="summary-label">Expenses shown</span><span className="summary-icon summary-icon-neutral"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 9h6m-6 4h6m-6 4h3" /></svg></span></div>
              <p className="summary-value">{loadState === "ready" ? String(expenses.length).padStart(2, "0") : "—"}</p>
              <p className="summary-note">Latest records, capped at 100</p>
            </article>
            <article className="summary-card">
              <div className="summary-topline"><span className="summary-label">Average expense</span><span className="summary-icon summary-icon-neutral"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 9 12l3.5 3.5L20 8" /><path d="M14 8h6v6" /></svg></span></div>
              <p className="summary-value">{loadState === "ready" && averageMinor !== null ? formatRupees(averageMinor) : "—"}</p>
              <p className="summary-note">Average of the loaded records</p>
            </article>
          </section>

          <section className="expenses-panel" aria-labelledby="expenses-heading">
            <div className="panel-heading">
              <div>
                <div className="panel-title-row"><h2 id="expenses-heading" ref={expensesHeadingRef} tabIndex={-1}>Recent expenses</h2><span className="count-pill">{expenses.length}</span></div>
                <p className="panel-subtitle">The little things that make up your month.</p>
              </div>
              <span className="count-pill">Latest 100 max</span>
            </div>

            <div className="list-column-head" aria-hidden="true"><span>Expense</span><span>Category</span><span>Date</span><span>Amount</span><span /></div>
            {requestNotice && <p className="request-notice" role="status">{requestNotice}</p>}
            {loadState === "loading" && (
              <div className="empty-state" role="status" aria-live="polite">
                <h3>Loading your expenses…</h3>
                <p>Your latest entries will be here in a moment.</p>
              </div>
            )}
            {loadState === "error" && (
              <div className="empty-state" role="alert">
                <h3>We couldn’t load your expenses</h3>
                <p>{loadError}</p>
                <button className="button button-secondary" type="button" onClick={() => {
                  setLoadError(null);
                  setLoadState("loading");
                  setLoadAttempt((attempt) => attempt + 1);
                }}>Try again</button>
              </div>
            )}
            {loadState === "ready" && (
              <ExpenseList
                expenses={sortedExpenses}
                onEdit={(expense) => openDialog(expense)}
                onDelete={setDeleteCandidate}
                onAdd={() => openDialog(null)}
              />
            )}
            <div className="panel-footer"><span className="footer-leaf" aria-hidden="true">✳</span> Small steps make a thoughtful picture.</div>
          </section>
        </div>

        <footer className="page-footer"><span>Made for a little more peace of mind.</span><span>Connected to your expense list</span></footer>
      </div>

      {dialogExpense !== undefined && (
        <ExpenseFormDialog
          key={dialogExpense?.id ?? "new-expense"}
          expense={dialogExpense}
          onClose={closeDialog}
          onSave={saveExpense}
          saving={saving}
          saveError={saveError}
        />
      )}
      {deleteCandidate && (
        <DeleteConfirmationDialog
          description={deleteCandidate.description}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={confirmDelete}
          deleting={deleting}
          error={deleteError}
        />
      )}
    </main>
  );
}
