export const expenseCategories = [
  "Food & drink",
  "Transport",
  "Home",
  "Utilities",
  "Health",
  "Shopping",
  "Leisure",
  "Other",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export type Expense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amountMinor: number;
  date: string;
};

export type ExpenseFields = Omit<Expense, "id">;

export const apiCategoryByLabel: Record<ExpenseCategory, string> = {
  "Food & drink": "food",
  Transport: "transport",
  Home: "housing",
  Utilities: "utilities",
  Health: "healthcare",
  Shopping: "shopping",
  Leisure: "entertainment",
  Other: "other",
};

const labelByApiCategory = Object.fromEntries(
  Object.entries(apiCategoryByLabel).map(([label, category]) => [category, label]),
) as Record<string, ExpenseCategory>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function expenseFromApi(value: unknown): Expense {
  if (!isRecord(value)) throw new Error("Invalid expense response.");

  const id = typeof value._id === "string" ? value._id : null;
  const description = typeof value.description === "string" ? value.description : null;
  const category = typeof value.category === "string" ? labelByApiCategory[value.category] : null;
  const amountMinor = value.amountMinor;
  const apiDate = typeof value.date === "string" ? new Date(value.date) : null;

  if (
    !id || !description || !category ||
    typeof amountMinor !== "number" || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 ||
    !apiDate || !Number.isFinite(apiDate.getTime())
  ) {
    throw new Error("Invalid expense response.");
  }

  return {
    id,
    description,
    category,
    amountMinor,
    date: apiDate.toISOString().slice(0, 10),
  };
}

export function formatRupees(amountMinor: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatExpenseDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function rupeesToMinorUnits(value: string): number | null {
  const match = /^(?:(\d+)(?:\.(\d{1,2}))?|\.(\d{1,2}))$/.exec(value.trim());
  if (!match) return null;

  const wholeRupees = BigInt(match[1] ?? "0");
  const fraction = match[2] ?? match[3] ?? "";
  const paise = BigInt(fraction.padEnd(2, "0") || "0");
  const amountMinor = wholeRupees * BigInt(100) + paise;

  if (amountMinor <= BigInt(0) || amountMinor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(amountMinor);
}
