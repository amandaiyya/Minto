import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedOwnerId } from "@/lib/auth-session";
import { validateExpenseMutationOrigin } from "@/lib/expense-csrf";
import ExpenseModel, { EXPENSE_CATEGORIES } from "@/models/expense";
import { z } from "zod";

const MAX_EXPENSES = 100;
const EXPENSE_FIELDS = {
  _id: 1,
  amountMinor: 1,
  description: 1,
  category: 1,
  date: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

const createExpenseSchema = z.strictObject({
  amountMinor: z
    .number()
    .int()
    .positive()
    .refine(Number.isSafeInteger),
  description: z.string().trim().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  date: z
    .union([z.iso.date(), z.iso.datetime({ offset: true })])
    .transform((value) => new Date(value)),
});

function unauthorizedResponse(): Response {
  return Response.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      },
    },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const ownerId = await getAuthenticatedOwnerId(request);
    if (!ownerId) return unauthorizedResponse();

    await connectToDatabase();

    const expenses = await ExpenseModel.find({ ownerId })
      .select(EXPENSE_FIELDS)
      .sort({ date: -1 })
      .limit(MAX_EXPENSES)
      .lean()
      .exec();

    return Response.json(expenses, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Unable to retrieve expenses." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const originError = validateExpenseMutationOrigin(request);
  if (originError) return originError;

  let ownerId;

  try {
    ownerId = await getAuthenticatedOwnerId(request);
  } catch {
    return Response.json(
      {
        error: {
          code: "CREATE_FAILED",
          message: "Unable to create expense.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!ownerId) return unauthorizedResponse();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = createExpenseSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const field = issue.path.join(".") || "body";
      const message =
        field === "amountMinor"
          ? "Amount must be a positive safe integer."
          : field === "description"
            ? "Description must not be empty."
            : field === "category"
              ? "Category is not supported."
              : field === "date"
                ? "Date must be a valid ISO date or datetime."
                : issue.code === "unrecognized_keys"
                  ? "Unexpected fields are not allowed."
                  : "Invalid request body.";

      return { field, code: issue.code, message };
    });

    return Response.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Request validation failed.",
          issues,
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await connectToDatabase();

    const expense = await ExpenseModel.create({ ...parsed.data, ownerId });

    return Response.json(
      {
        _id: expense._id.toString(),
        amountMinor: expense.amountMinor,
        description: expense.description,
        category: expense.category,
        date: expense.date.toISOString(),
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: {
          code: "CREATE_FAILED",
          message: "Unable to create expense.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
