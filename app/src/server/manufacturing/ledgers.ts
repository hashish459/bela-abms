/**
 * Every code here is a REAL ledger scraped from the reference app's own chart of accounts
 * (session 5 — Docs/DATABASE.md), not invented. Manufacturing is the classic three-bucket
 * inventory flow: Raw Material -> WIP -> Finished Goods.
 */
export const MFG_LEDGER = {
  FINISHED_INVENTORY: "INV-01-0001", // "Finished Inventory" — same ledger Sales/Purchase already use
  RAW_MATERIAL_INVENTORY: "INV-02-0001", // "Raw Material Inventory"
  WIP_INVENTORY: "INV-03-0001", // "WIP Inventory"
  DIRECT_LABOR: "COS-02-0004", // "Salary & Wages" under the "Direct Cost" group
};
