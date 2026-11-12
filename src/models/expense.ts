import { model, models, Schema } from "mongoose";
import type { InferSchemaType } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "utilities",
  "healthcare",
  "shopping",
  "entertainment",
  "other",
] as const;

const expenseSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: [1, "Amount must be a positive integer in minor units."],
      validate: {
        validator: Number.isSafeInteger,
        message: "Amount must be a positive integer in minor units.",
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [...EXPENSE_CATEGORIES],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      validate: {
        validator: (value: Date) => Number.isFinite(value.getTime()),
        message: "Date must be valid.",
      },
    },
  },
  { timestamps: true },
);

expenseSchema.index({ ownerId: 1, date: -1 });

export type ExpenseDocument = InferSchemaType<typeof expenseSchema>;

const ExpenseModel = models.Expense ?? model("Expense", expenseSchema);

export default ExpenseModel;
