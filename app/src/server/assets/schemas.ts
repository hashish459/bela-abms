import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const paymentMode = z.enum(["CREDIT", "CASH", "BANK", "CHEQUE", "WALLET"]);
const category = z.enum([
  "BUILDING", "COMPUTER", "FURNITURE_FIXTURE", "LAND", "LEASEHOLD_DEVELOPMENT",
  "OFFICE_EQUIPMENT", "OTHER_ASSETS", "PLANT_MACHINERY", "VEHICLES",
]);

export const fixedAssetCreate = z
  .object({
    name: z.string().min(1).max(160),
    category,
    serialNumber: z.string().max(60).optional().or(z.literal("")),
    location: z.string().max(160).optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
    acquisitionDate: isoDate,
    acquisitionCost: z.coerce.number().positive(),
    salvageValue: z.coerce.number().min(0).default(0),
    depreciationMethod: z.enum(["STRAIGHT_LINE", "WRITTEN_DOWN_VALUE"]).default("STRAIGHT_LINE"),
    usefulLifeMonths: z.coerce.number().int().positive().optional(),
    depreciationRatePct: z.coerce.number().min(0).max(100).optional(),
    paymentMode,
    paymentLedgerId: z.string().optional().or(z.literal("")),
    supplierLedgerId: z.string().optional().or(z.literal("")),
  })
  .refine((v) => v.category === "LAND" || v.depreciationMethod !== "STRAIGHT_LINE" || !!v.usefulLifeMonths, {
    message: "Useful life (months) is required for straight-line depreciation",
    path: ["usefulLifeMonths"],
  })
  .refine((v) => v.category === "LAND" || v.depreciationMethod !== "WRITTEN_DOWN_VALUE" || v.depreciationRatePct != null, {
    message: "Depreciation rate % is required for written-down-value depreciation",
    path: ["depreciationRatePct"],
  })
  .refine((v) => v.salvageValue < v.acquisitionCost, {
    message: "Salvage value must be less than acquisition cost",
    path: ["salvageValue"],
  })
  .refine((v) => v.paymentMode === "CREDIT" || !!v.paymentLedgerId, {
    message: "Select the cash / bank account paid from",
    path: ["paymentLedgerId"],
  })
  .refine((v) => v.paymentMode !== "CREDIT" || !!v.supplierLedgerId, {
    message: "Select the supplier this was purchased on credit from",
    path: ["supplierLedgerId"],
  });

export const depreciationRunCreate = z.object({
  asOfDate: isoDate,
  assetIds: z.array(z.string()).optional(), // omit = run for every due asset
});

export const disposeAssetCreate = z.object({
  disposalDate: isoDate,
  disposalType: z.enum(["SOLD", "SCRAPPED", "LOST_STOLEN_BROKEN"]),
  proceeds: z.coerce.number().min(0).default(0),
  disposalLedgerId: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
}).refine((v) => v.proceeds === 0 || !!v.disposalLedgerId, {
  message: "Select the cash / bank account receiving the proceeds",
  path: ["disposalLedgerId"],
});

export type FixedAssetCreate = z.infer<typeof fixedAssetCreate>;
export type DepreciationRunCreate = z.infer<typeof depreciationRunCreate>;
export type DisposeAssetCreate = z.infer<typeof disposeAssetCreate>;
