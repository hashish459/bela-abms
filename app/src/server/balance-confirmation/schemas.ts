import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const balanceConfirmationCreate = z.object({
  ledgerId: z.string().min(1, "Select an account"),
  asOfDate: isoDate,
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const balanceConfirmationStatusUpdate = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "DISPUTED"]),
});

export type BalanceConfirmationCreate = z.infer<typeof balanceConfirmationCreate>;
export type BalanceConfirmationStatusUpdate = z.infer<typeof balanceConfirmationStatusUpdate>;
