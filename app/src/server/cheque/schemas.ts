import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const chequeCreate = z
  .object({
    chequeNo: z.string().min(1).max(40),
    bankName: z.string().min(1).max(120),
    chequeDate: isoDate,
    amount: z.coerce.number().positive(),
    customerLedgerId: z.string().optional().or(z.literal("")),
    customerName: z.string().max(160).optional().or(z.literal("")),
    salesDocId: z.string().optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((v) => v.customerLedgerId || v.customerName, {
    message: "Select a customer or enter a name",
    path: ["customerLedgerId"],
  });

export const chequeStatusUpdate = z.object({
  status: z.enum(["PENDING", "DEPOSITED", "CLEARED", "BOUNCED"]),
});

export type ChequeCreate = z.infer<typeof chequeCreate>;
export type ChequeStatusUpdate = z.infer<typeof chequeStatusUpdate>;
