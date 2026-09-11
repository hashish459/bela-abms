import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const paymentMode = z.enum(["CREDIT", "CASH", "BANK", "CHEQUE", "WALLET"]);

export const technicianCreate = z.object({
  name: z.string().min(1).max(160),
  phone: z.string().max(30).optional().or(z.literal("")),
  specialization: z.string().max(120).optional().or(z.literal("")),
});
export const technicianUpdate = technicianCreate.partial().extend({
  isActive: z.boolean().optional(),
});

const jobCardItem = z.object({
  itemType: z.enum(["PART", "LABOR"]),
  productId: z.string().optional().or(z.literal("")),
  technicianId: z.string().optional().or(z.literal("")),
  description: z.string().min(1).max(300),
  qty: z.coerce.number().positive(),
  rate: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  taxRateId: z.string().optional().or(z.literal("")),
  isNonTaxable: z.boolean().default(false),
});

export const jobCardCreate = z
  .object({
    date: isoDate,
    customerLedgerId: z.string().optional().or(z.literal("")),
    customerName: z.string().max(160).optional().or(z.literal("")),
    customerPhone: z.string().max(30).optional().or(z.literal("")),
    vehicleRegNo: z.string().min(1, "Vehicle registration number is required").max(40),
    vehicleMake: z.string().max(60).optional().or(z.literal("")),
    vehicleModel: z.string().max(60).optional().or(z.literal("")),
    odometerReading: z.coerce.number().min(0).optional(),
    complaint: z.string().min(1, "Describe the complaint / work requested").max(500),
    notes: z.string().max(1000).optional().or(z.literal("")),
    items: z.array(jobCardItem).default([]),
  })
  .refine((v) => v.customerLedgerId || v.customerName, {
    message: "Select a customer or enter a walk-in name",
    path: ["customerLedgerId"],
  });

export const jobCardBill = z
  .object({
    paymentMode,
    paymentLedgerId: z.string().optional().or(z.literal("")),
    invoiceDiscount: z.coerce.number().min(0).default(0),
    items: z.array(jobCardItem).min(1, "Add at least one part or labor line before billing"),
  })
  .refine((v) => v.paymentMode === "CREDIT" || !!v.paymentLedgerId, {
    message: "Select the cash / bank account that received payment",
    path: ["paymentLedgerId"],
  });

export type TechnicianCreate = z.infer<typeof technicianCreate>;
export type JobCardCreate = z.infer<typeof jobCardCreate>;
export type JobCardBill = z.infer<typeof jobCardBill>;
