import type { AssetCategory } from "@prisma/client";

/**
 * Category -> real NFRS ledger codes, scraped from the reference app's own chart of
 * accounts (Docs/DATABASE.md session 5) — not invented. Land is never depreciated
 * (no accumDep / depExpense ledger under NFRS PPE-04).
 */
export const CATEGORY_LEDGER: Record<
  AssetCategory,
  { label: string; asset: string; accumDep: string | null; depExpense: string | null }
> = {
  BUILDING: { label: "Building", asset: "PPE-01-0001", accumDep: "PPE-01-0002", depExpense: "ADE-06-0001" },
  COMPUTER: { label: "Computer", asset: "PPE-02-0001", accumDep: "PPE-02-0002", depExpense: "ADE-06-0002" },
  FURNITURE_FIXTURE: { label: "Furniture & Fixture", asset: "PPE-03-0001", accumDep: "PPE-03-0002", depExpense: "ADE-06-0003" },
  LAND: { label: "Land", asset: "PPE-04-0001", accumDep: null, depExpense: null },
  LEASEHOLD_DEVELOPMENT: { label: "Leasehold Development", asset: "PPE-05-0001", accumDep: "PPE-05-0002", depExpense: "ADE-06-0008" },
  OFFICE_EQUIPMENT: { label: "Office Equipment", asset: "PPE-06-0001", accumDep: "PPE-06-0002", depExpense: "ADE-06-0004" },
  OTHER_ASSETS: { label: "Other Assets", asset: "PPE-07-0001", accumDep: "PPE-07-0002", depExpense: "ADE-06-0006" },
  PLANT_MACHINERY: { label: "Plant & Machinery", asset: "PPE-08-0001", accumDep: "PPE-08-0002", depExpense: "ADE-06-0007" },
  VEHICLES: { label: "Vehicles", asset: "PPE-09-0001", accumDep: "PPE-09-0002", depExpense: "ADE-06-0005" },
};

export const DISPOSAL_LEDGER = {
  GAIN: "OIC-01-0002", // Profit On Sale Of Assets (Income)
  LOSS: "ADE-17-0001", // Loss On Sale Of Assets (Expense)
};
