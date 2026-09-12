import { z } from "zod";

export const budgetHeadingCreate = z.object({
  name: z.string().min(1).max(120),
  sourceType: z.enum(["MANUAL", "COA_GROUP"]),
  accountGroupId: z.string().optional().or(z.literal("")),
});
export const budgetHeadingUpdate = budgetHeadingCreate.partial().extend({ isActive: z.boolean().optional() });

export const budgetFundCreate = z.object({ name: z.string().min(1).max(120) });
export const budgetFundUpdate = z.object({ name: z.string().min(1).max(120).optional(), isActive: z.boolean().optional() });

export const budgetCreate = z.object({
  fiscalYearId: z.string().min(1),
  name: z.string().min(1).max(120),
  fundId: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export const budgetUpdate = z.object({
  name: z.string().min(1).max(120).optional(),
  fundId: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const allocationSet = z.object({
  allocations: z.array(z.object({ budgetHeadingId: z.string().min(1), amount: z.coerce.number().min(0) })),
});

export type BudgetHeadingCreate = z.infer<typeof budgetHeadingCreate>;
export type BudgetHeadingUpdate = z.infer<typeof budgetHeadingUpdate>;
export type BudgetFundCreate = z.infer<typeof budgetFundCreate>;
export type BudgetFundUpdate = z.infer<typeof budgetFundUpdate>;
export type BudgetCreate = z.infer<typeof budgetCreate>;
export type BudgetUpdate = z.infer<typeof budgetUpdate>;
export type AllocationSet = z.infer<typeof allocationSet>;
