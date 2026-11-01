import type { Expense } from "@/lib/expenses";
import { formatExpenseDate, formatRupees } from "@/lib/expenses";

type ExpenseListProps = {
  expenses: Expense[];
  onEdit: (expense: Expense, trigger: HTMLButtonElement) => void;
  onDelete: (expense: Expense) => void;
  onAdd: () => void;
};

const categoryClass: Record<Expense["category"], string> = {
  "Food & drink": "category-food",
  Transport: "category-transport",
  Home: "category-home",
  Utilities: "category-home",
  Health: "category-health",
  Shopping: "category-shopping",
  Leisure: "category-leisure",
  Other: "category-other",
};

export default function ExpenseList({
  expenses,
  onEdit,
  onDelete,
  onAdd,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <button type="button" aria-label="Add your first expense" onClick={onAdd}>
          <span className="empty-mark" aria-hidden="true">＋</span>
        </button>
        <h3>No expenses yet</h3>
        <p>Your everyday spending will feel easier to follow once it’s here.</p>
      </div>
    );
  }

  return (
    <ul className="expense-list" aria-label="Recent expenses">
      {expenses.map((expense) => (
        <li className="expense-row" key={expense.id}>
          <span className={`category-dot ${categoryClass[expense.category]}`} aria-hidden="true" />
          <div className="expense-description">
            <span className="expense-title">{expense.description}</span>
            <span className="expense-mobile-meta">
              {expense.category}<span aria-hidden="true"> · </span>{formatExpenseDate(expense.date)}
            </span>
          </div>
          <span className="expense-category">{expense.category}</span>
          <time className="expense-date" dateTime={expense.date}>{formatExpenseDate(expense.date)}</time>
          <span className="expense-amount">{formatRupees(expense.amountMinor)}</span>
          <div className="expense-actions" aria-label={`Actions for ${expense.description}`}>
            <button
              className="icon-button"
              type="button"
              aria-label={`Edit ${expense.description}`}
              onClick={(event) => onEdit(expense, event.currentTarget)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m13.7 3.3 3 3M4 16l3.6-.8L16.5 6.3a2.1 2.1 0 0 0-3-3L4.6 12.2 4 16Z" />
              </svg>
            </button>
            <button
              className="icon-button danger-action"
              type="button"
              aria-label={`Delete ${expense.description}`}
              onClick={() => onDelete(expense)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4.5 6h11M8 6V4h4v2m2 0-.6 10H6.6L6 6m2.5 2.5v5m3-5v5" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
