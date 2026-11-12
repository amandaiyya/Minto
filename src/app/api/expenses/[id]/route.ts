import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedOwnerId } from "@/lib/auth-session";
import { validateExpenseMutationOrigin } from "@/lib/expense-csrf";
import ExpenseModel, { EXPENSE_CATEGORIES } from "@/models/expense";
import { isObjectIdOrHexString } from "mongoose";
import { z } from "zod";

const EXPENSE_FIELDS = {
  _id: 1,
  amountMinor: 1,
  description: 1,
  category: 1,
  date: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

const editableExpenseFields = {
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
};

const updateExpenseSchema = z
  .strictObject(editableExpenseFields)
  .partial()
  .refine((fields) => Object.keys(fields).length > 0);

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function invalidIdResponse(): Response {
  return errorResponse(400, "INVALID_ID", "Expense ID must be a valid ObjectId.");
}

function validationResponse(error: z.ZodError): Response {
  const issues = error.issues.map((issue) => {
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
                : "At least one valid expense field is required.";

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

type ExpenseResponseSource = {
  _id: unknown;
  amountMinor: number;
  description: string;
  category: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

function serializeExpense(expense: ExpenseResponseSource) {
  return {
    _id: String(expense._id),
    amountMinor: expense.amountMinor,
    description: expense.description,
    category: expense.category,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

async function getValidId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  return isObjectIdOrHexString(id) ? id : null;
}

function unauthorizedResponse(): Response {
  return errorResponse(401, "UNAUTHORIZED", "Authentication is required.");
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  let ownerId;
  try {
    ownerId = await getAuthenticatedOwnerId(request);
  } catch {
    return errorResponse(500, "RETRIEVE_FAILED", "Unable to retrieve expense.");
  }
  if (!ownerId) return unauthorizedResponse();

  const id = await getValidId(context);
  if (!id) return invalidIdResponse();

  try {
    await connectToDatabase();
    const expense = await ExpenseModel.findOne({ _id: id, ownerId })
      .select(EXPENSE_FIELDS)
      .lean()
      .exec();

    if (Array.isArray(expense)) {
      return errorResponse(500, "RETRIEVE_FAILED", "Unable to retrieve expense.");
    }
    if (!expense) {
      return errorResponse(404, "NOT_FOUND", "Expense not found.");
    }

    return Response.json(serializeExpense(expense as unknown as ExpenseResponseSource), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return errorResponse(500, "RETRIEVE_FAILED", "Unable to retrieve expense.");
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const originError = validateExpenseMutationOrigin(request);
  if (originError) return originError;

  let ownerId;
  try {
    ownerId = await getAuthenticatedOwnerId(request);
  } catch {
    return errorResponse(500, "UPDATE_FAILED", "Unable to update expense.");
  }
  if (!ownerId) return unauthorizedResponse();

  const id = await getValidId(context);
  if (!id) return invalidIdResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    await connectToDatabase();
    const expense = await ExpenseModel.findOneAndUpdate(
      { _id: id, ownerId },
      { $set: parsed.data },
      { new: true, runValidators: true },
    )
      .select(EXPENSE_FIELDS)
      .lean()
      .exec();

    if (Array.isArray(expense)) {
      return errorResponse(500, "UPDATE_FAILED", "Unable to update expense.");
    }
    if (!expense) {
      return errorResponse(404, "NOT_FOUND", "Expense not found.");
    }

    return Response.json(serializeExpense(expense as unknown as ExpenseResponseSource), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return errorResponse(500, "UPDATE_FAILED", "Unable to update expense.");
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const originError = validateExpenseMutationOrigin(request);
  if (originError) return originError;

  let ownerId;
  try {
    ownerId = await getAuthenticatedOwnerId(request);
  } catch {
    return errorResponse(500, "DELETE_FAILED", "Unable to delete expense.");
  }
  if (!ownerId) return unauthorizedResponse();

  const id = await getValidId(context);
  if (!id) return invalidIdResponse();

  try {
    await connectToDatabase();
    const deleted = await ExpenseModel.findOneAndDelete({ _id: id, ownerId }).exec();

    if (!deleted) {
      return errorResponse(404, "NOT_FOUND", "Expense not found.");
    }

    return Response.json(
      { message: "Expense deleted successfully." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return errorResponse(500, "DELETE_FAILED", "Unable to delete expense.");
  }
}
