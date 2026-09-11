/**
 * Demo transaction data: a realistic month-and-a-half of activity across every
 * built module (Inventory, Accounts/GL, Sales, Purchase, Vouchers) so Reports,
 * Aging, and the Dashboard all show something meaningful out of the box.
 *
 * Runs against a LIVE dev server (not direct Prisma writes) so every record is
 * created through the same service layer + validation + GL/stock posting a real
 * user would trigger — the same guarantee of correctness as clicking through
 * the UI, just scripted. Idempotent by name/SKU: safe to re-run against a DB
 * that already has this demo data (skips anything that already exists).
 *
 * Usage: `npm run dev` in one terminal, then `npm run db:seed-demo` in another.
 */

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000";

let cookie = "";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(",").map((c) => c.split(";")[0]).join("; ");
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} ${path} -> ${json.error.code}: ${json.error.message}`);
  return json.data as T;
}

async function login() {
  await call("POST", "/api/auth/login", { email: "admin@bela.local", password: "password123" });
}

// ── lookups ────────────────────────────────────────────────────────────────

async function findLedgerId(search: string): Promise<string> {
  const { ledgers } = await call<{ ledgers: { id: string; code: string; name: string }[] }>(
    "GET",
    `/api/accounts/ledgers?search=${encodeURIComponent(search)}`,
  );
  const hit = ledgers.find((l) => l.code === search) ?? ledgers[0];
  if (!hit) throw new Error(`Ledger not found: ${search}`);
  return hit.id;
}

async function findTaxRateId(name: string): Promise<string> {
  const { taxRates } = await call<{ taxRates: { id: string; name: string }[] }>(
    "GET",
    "/api/settings/tax-rates",
  );
  const hit = taxRates.find((t) => t.name === name);
  if (!hit) throw new Error(`Tax rate not found: ${name}`);
  return hit.id;
}

async function findDefaultWarehouseId(): Promise<string> {
  const { warehouses } = await call<{ warehouses: { id: string; isDefault: boolean }[] }>(
    "GET",
    "/api/inventory/warehouses",
  );
  return (warehouses.find((w) => w.isDefault) ?? warehouses[0]).id;
}

async function findUnitId(name: string): Promise<string> {
  const { units } = await call<{ units: { id: string; name: string }[] }>(
    "GET",
    "/api/inventory/units",
  );
  const hit = units.find((u) => u.name === name);
  if (!hit) throw new Error(`Unit not found: ${name}`);
  return hit.id;
}

// ── idempotent creators ──────────────────────────────────────────────────

async function ensureCategory(name: string): Promise<string> {
  const { categories } = await call<{ categories: { id: string; name: string }[] }>(
    "GET",
    "/api/inventory/categories",
  );
  const existing = categories.find((c) => c.name === name);
  if (existing) return existing.id;
  const { category } = await call<{ category: { id: string } }>("POST", "/api/inventory/categories", { name });
  return category.id;
}

async function ensureContact(
  name: string,
  contactKind: "CUSTOMER" | "SUPPLIER",
  opening?: { amount: number; type: "DR" | "CR" },
): Promise<string> {
  const { contacts } = await call<{ contacts: { id: string; name: string }[] }>(
    "GET",
    `/api/accounts/contacts?kind=${contactKind}`,
  );
  const existing = contacts.find((c) => c.name === name);
  if (existing) return existing.id;
  const { contact } = await call<{ contact: { id: string } }>("POST", "/api/accounts/contacts", {
    name,
    contactKind,
    openingBalance: opening?.amount ?? 0,
    openingType: opening?.type ?? "DR",
  });
  return contact.id;
}

type ProductSpec = {
  kind: "GOODS" | "SERVICE" | "EXPENSE";
  name: string;
  sku: string;
  categoryId?: string;
  unitId: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRateId?: string;
  isNonTaxable?: boolean;
  openingQty?: number;
  openingWarehouseId?: string;
};

async function ensureProduct(spec: ProductSpec): Promise<string> {
  const { rows } = await call<{ rows: { id: string; sku: string }[] }>(
    "GET",
    `/api/inventory/products?kind=${spec.kind}&search=${encodeURIComponent(spec.sku)}`,
  );
  const existing = rows.find((r) => r.sku === spec.sku);
  if (existing) return existing.id;
  const { product } = await call<{ product: { id: string } }>("POST", "/api/inventory/products", spec);
  return product.id;
}

async function main() {
  console.log(`Seeding demo transactions against ${BASE_URL} ...`);
  await login();

  const wh = await findDefaultWarehouseId();
  const vat13 = await findTaxRateId("VAT 13%");
  const pieces = await findUnitId("Pieces");
  const packet = await findUnitId("Packet");
  const cash = await findLedgerId("CCE-02-0001"); // Cash In Hand
  const bank = await findLedgerId("CCE-01-0001"); // Bank Account
  const officeRent = await findLedgerId("ADE-19-0001"); // Office Rent (expense)

  // ── master data ──────────────────────────────────────────────────────
  const catFurniture = await ensureCategory("Furniture");
  const catElectronics = await ensureCategory("Electronics");
  const catStationery = await ensureCategory("Stationery");

  const chair = await ensureProduct({
    kind: "GOODS", name: "Office Chair", sku: "CHR-001", categoryId: catFurniture,
    unitId: pieces, purchasePrice: 3500, sellingPrice: 4500, taxRateId: vat13, openingQty: 50, openingWarehouseId: wh,
  });
  const desk = await ensureProduct({
    kind: "GOODS", name: "Office Desk", sku: "DSK-001", categoryId: catFurniture,
    unitId: pieces, purchasePrice: 8000, sellingPrice: 10500, taxRateId: vat13, openingQty: 20, openingWarehouseId: wh,
  });
  const paper = await ensureProduct({
    kind: "GOODS", name: "A4 Paper Ream", sku: "PPR-001", categoryId: catStationery,
    unitId: packet, purchasePrice: 350, sellingPrice: 450, taxRateId: vat13, openingQty: 300, openingWarehouseId: wh,
  });
  const bulb = await ensureProduct({
    kind: "GOODS", name: "LED Bulb 9W", sku: "LED-001", categoryId: catElectronics,
    unitId: pieces, purchasePrice: 120, sellingPrice: 180, taxRateId: vat13, openingQty: 500, openingWarehouseId: wh,
  });
  const handicraft = await ensureProduct({
    kind: "GOODS", name: "Exported Handicraft", sku: "HND-001", categoryId: catStationery,
    unitId: pieces, purchasePrice: 800, sellingPrice: 1200, isNonTaxable: true, openingQty: 40, openingWarehouseId: wh,
  });
  const install = await ensureProduct({
    kind: "SERVICE", name: "Installation Service", sku: "SVC-001",
    unitId: pieces, purchasePrice: 0, sellingPrice: 500, taxRateId: vat13,
  });

  const custHimalayan = await ensureContact("Himalayan Traders Pvt. Ltd.", "CUSTOMER", { amount: 15000, type: "DR" });
  const custEverest = await ensureContact("Everest Retail Store", "CUSTOMER");
  const suppWholesale = await ensureContact("Nepal Wholesale Suppliers", "SUPPLIER", { amount: 20000, type: "CR" });
  const suppStationery = await ensureContact("Local Stationery Depot", "SUPPLIER");

  console.log("Master data ready — products, categories, customers, suppliers.");

  // ── Sales: Quotation -> Sales Order -> Invoice (chair restock for Everest) ─
  const { doc: quo } = await call<{ doc: { id: string; number: string } }>("POST", "/api/sales/quotations", {
    date: "2026-07-20",
    customerLedgerId: custEverest,
    lines: [{ productId: chair, description: "Office Chair", warehouseId: wh, qty: 5, rate: 4500, taxRateId: vat13 }],
  });
  const { doc: so } = await call<{ doc: { id: string; number: string } }>("POST", "/api/sales/orders", {
    date: "2026-07-22",
    customerLedgerId: custEverest,
    convertedFromId: quo.id,
    lines: [{ productId: chair, description: "Office Chair", warehouseId: wh, qty: 5, rate: 4500, taxRateId: vat13 }],
  });
  const { invoice: saEverest } = await call<{ invoice: { id: string; number: string } }>("POST", "/api/sales/invoices", {
    date: "2026-07-24",
    customerLedgerId: custEverest,
    convertedFromId: so.id,
    paymentMode: "CREDIT",
    lines: [{ productId: chair, description: "Office Chair", warehouseId: wh, qty: 5, rate: 4500, taxRateId: vat13 }],
  });
  console.log(`Quotation ${quo.number} -> Sales Order ${so.number} -> Invoice ${saEverest.number}`);

  // Partial receipt, then a partial return -> status RETURNED
  await call("POST", "/api/sales/receipts", {
    date: "2026-08-15", customerLedgerId: custEverest, paymentLedgerId: cash,
    againstDocId: saEverest.id, amount: 10000, paymentMode: "CASH",
  });
  await call("POST", "/api/sales/credit-notes", {
    date: "2026-08-20", reversesDocId: saEverest.id,
    lines: [{ productId: chair, description: "Office Chair", warehouseId: wh, qty: 1, rate: 4500, taxRateId: vat13 }],
  });

  // Credit invoice to Himalayan Traders — desks + installation service, still fully open
  await call("POST", "/api/sales/invoices", {
    date: "2026-08-01", customerLedgerId: custHimalayan, paymentMode: "CREDIT",
    lines: [
      { productId: desk, description: "Office Desk", warehouseId: wh, qty: 2, rate: 10500, taxRateId: vat13 },
      { productId: install, description: "Installation Service", qty: 1, rate: 500, taxRateId: vat13 },
    ],
  });

  // Cash sale — walk-in, paper + bulbs (fully paid immediately)
  await call("POST", "/api/sales/invoices", {
    date: "2026-09-11", customerName: "Walk-in Customer", paymentMode: "CASH", paymentLedgerId: cash,
    lines: [
      { productId: paper, description: "A4 Paper Ream", warehouseId: wh, qty: 10, rate: 450, taxRateId: vat13 },
      { productId: bulb, description: "LED Bulb 9W", warehouseId: wh, qty: 2, rate: 180, taxRateId: vat13 },
    ],
  });

  // Non-taxable export sale — bank payment
  await call("POST", "/api/sales/invoices", {
    date: "2026-08-05", customerName: "Export Buyer", paymentMode: "BANK", paymentLedgerId: bank,
    lines: [{ productId: handicraft, description: "Exported Handicraft", warehouseId: wh, qty: 3, rate: 1200, isNonTaxable: true }],
  });
  console.log("Sales cycle done: quotation->order->invoice, receipt, credit note, cash sale, non-taxable export sale.");

  // ── Purchase: Order -> Invoice (with duty) -> Payment -> Debit Note ───────
  const { doc: po } = await call<{ doc: { id: string; number: string } }>("POST", "/api/purchase/orders", {
    date: "2026-07-18", supplierLedgerId: suppWholesale,
    lines: [
      { productId: chair, description: "Office Chair", warehouseId: wh, qty: 20, rate: 3500 },
      { productId: desk, description: "Office Desk", warehouseId: wh, qty: 10, rate: 8000 },
    ],
  });
  const { invoice: puWholesale } = await call<{ invoice: { id: string; number: string } }>(
    "POST", "/api/purchase/invoices", {
      date: "2026-07-21", supplierLedgerId: suppWholesale, supplierInvoiceNumber: "NWS-INV-2044",
      convertedFromId: po.id, paymentMode: "CREDIT",
      lines: [
        { productId: chair, description: "Office Chair", warehouseId: wh, qty: 20, rate: 3500, exciseDuty: 500, taxRateId: vat13 },
        { productId: desk, description: "Office Desk", warehouseId: wh, qty: 10, rate: 8000, exciseDuty: 1000, customDuty: 500, taxRateId: vat13 },
      ],
    },
  );
  console.log(`Purchase Order ${po.number} -> Purchase Invoice ${puWholesale.number} (with excise/custom duty)`);

  await call("POST", "/api/purchase/payments", {
    date: "2026-09-01", supplierLedgerId: suppWholesale, paymentLedgerId: bank,
    againstDocId: puWholesale.id, amount: 60000, paymentMode: "BANK",
  });
  await call("POST", "/api/purchase/debit-notes", {
    date: "2026-09-05", reversesDocId: puWholesale.id,
    lines: [{ productId: desk, description: "Office Desk (defective)", warehouseId: wh, qty: 1, rate: 8000, exciseDuty: 100, customDuty: 50, taxRateId: vat13 }],
  });

  // Cash purchase — stationery, includes a non-goods EXPENSE-style line via the paper SKU itself as goods
  await call("POST", "/api/purchase/invoices", {
    date: "2026-08-10", supplierLedgerId: suppStationery, supplierInvoiceNumber: "LSD-778",
    paymentMode: "CASH", paymentLedgerId: cash,
    lines: [{ productId: paper, description: "A4 Paper Ream", warehouseId: wh, qty: 100, rate: 320, taxRateId: vat13 }],
  });
  console.log("Purchase cycle done: order->invoice with duty, payment, debit note, cash purchase.");

  // ── Manual vouchers: Journal (rent) + Contra (cash -> bank transfer) ─────
  await call("POST", "/api/accounts/vouchers", {
    type: "JOURNAL", date: "2026-08-12", narration: "August office rent",
    lines: [
      { ledgerId: officeRent, debit: 25000, narration: "Office rent — August" },
      { ledgerId: bank, credit: 25000, narration: "Paid by bank transfer" },
    ],
  });
  await call("POST", "/api/accounts/vouchers", {
    type: "CONTRA", date: "2026-08-18", narration: "Cash deposited into bank",
    lines: [
      { ledgerId: bank, debit: 15000, narration: "Cash deposit" },
      { ledgerId: cash, credit: 15000, narration: "Deposited to bank" },
    ],
  });
  console.log("Manual Journal + Contra vouchers posted.");

  // ── Inventory Adjustment: a few bulbs damaged in the warehouse ──────────
  await call("POST", "/api/inventory/adjustments", {
    date: "2026-08-22", type: "DAMAGE", warehouseId: wh, notes: "Water damage in storage",
    lines: [{ productId: bulb, qty: -5 }],
  });
  console.log("Inventory adjustment posted (5 bulbs damaged).");

  console.log("\nDemo data seeding complete. Explore Reports / Dashboard / Aging to see it.");
}

main().catch((e) => {
  console.error("Demo seed failed:", e.message ?? e);
  process.exit(1);
});
