/**
 * Full demo dataset: "EcoPanel Structures Pvt. Ltd." — a structural insulated
 * panel (SIP) manufacturer and modular prefab home supplier — across the
 * PREVIOUS fiscal year (2082-83, a full year of history) and the CURRENT
 * fiscal year (2083-84, in progress). Exercises almost every module this
 * project has built: Inventory, Manufacturing (BOM/Production Order), Sales
 * (Quotation/Proforma/Order/Invoice/Receipt/Credit Note/Chalani/Cheque),
 * Purchase (Order/Invoice/Payment/Debit Note/Goods Received/Imports),
 * Warehouse Transfer, Fixed Assets + Depreciation, Workshop (site
 * installation crews), Budget, Vouchers, Balance Confirmation, and Custom
 * Fields — all through the real HTTP API (never direct Prisma writes), so
 * every record gets the same validation/GL/stock-posting a real user
 * triggers clicking through the UI.
 *
 * Requires a fresh database (run automation/db-fresh.sh first) and a
 * running server — see automation/seed-demo.sh, which wires both together.
 * NOT idempotent by design (unlike prisma/seed-demo.ts): this is meant to
 * run exactly once against a fresh company. Re-running against a database
 * that already has this data will fail on the first duplicate (a SKU/
 * contact-name collision) rather than silently doubling every transaction.
 */

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@bela.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "password123";

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
  await call("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
}

// ── lookups ──────────────────────────────────────────────────────────────

async function findLedgerId(search: string): Promise<string> {
  const { ledgers } = await call<{ ledgers: { id: string; code: string; name: string }[] }>(
    "GET", `/api/accounts/ledgers?search=${encodeURIComponent(search)}`,
  );
  const hit = ledgers.find((l) => l.code === search) ?? ledgers[0];
  if (!hit) throw new Error(`Ledger not found: ${search}`);
  return hit.id;
}

async function findTaxRateId(name: string): Promise<string> {
  const { taxRates } = await call<{ taxRates: { id: string; name: string }[] }>("GET", "/api/settings/tax-rates");
  const hit = taxRates.find((t) => t.name === name);
  if (!hit) throw new Error(`Tax rate not found: ${name}`);
  return hit.id;
}

async function findUnitId(name: string): Promise<string> {
  const { units } = await call<{ units: { id: string; name: string }[] }>("GET", "/api/inventory/units");
  const hit = units.find((u) => u.name === name);
  if (!hit) throw new Error(`Unit not found: ${name}`);
  return hit.id;
}

async function findWarehouseId(name: string): Promise<string> {
  const { warehouses } = await call<{ warehouses: { id: string; name: string; isDefault: boolean }[] }>(
    "GET", "/api/inventory/warehouses",
  );
  const hit = warehouses.find((w) => w.name === name) ?? warehouses.find((w) => w.isDefault);
  if (!hit) throw new Error(`Warehouse not found: ${name}`);
  return hit.id;
}

async function findFiscalYearId(name: string): Promise<string> {
  const { fiscalYears } = await call<{ fiscalYears: { id: string; name: string }[] }>(
    "GET", "/api/settings/fiscal-years",
  );
  const hit = fiscalYears.find((f) => f.name === name);
  if (!hit) throw new Error(`Fiscal year not found: ${name}`);
  return hit.id;
}

async function setActiveFiscalYear(name: string): Promise<void> {
  const id = await findFiscalYearId(name);
  await call("PATCH", `/api/settings/fiscal-years/${id}`, { active: true });
  console.log(`  (switched active fiscal year -> ${name})`);
}

// ── creators ─────────────────────────────────────────────────────────────

async function createCategory(name: string): Promise<string> {
  const { category } = await call<{ category: { id: string } }>("POST", "/api/inventory/categories", { name });
  return category.id;
}

async function createWarehouse(name: string, address: string): Promise<string> {
  const { warehouse } = await call<{ warehouse: { id: string } }>("POST", "/api/inventory/warehouses", { name, address });
  return warehouse.id;
}

async function createContact(
  name: string,
  contactKind: "CUSTOMER" | "SUPPLIER",
): Promise<string> {
  const { contact } = await call<{ contact: { id: string } }>("POST", "/api/accounts/contacts", {
    name, contactKind, openingBalance: 0, openingType: "DR",
  });
  return contact.id;
}

type ProductSpec = {
  kind?: "GOODS" | "SERVICE";
  name: string; sku: string; categoryId?: string; unitId: string;
  purchasePrice: number; sellingPrice: number; taxRateId?: string;
  inventoryRole?: "FINISHED_GOODS" | "RAW_MATERIAL";
  madeImportedFrom?: string;
  openingQty?: number; openingWarehouseId?: string;
  customFields?: Record<string, string>;
};

async function createProduct(spec: ProductSpec): Promise<string> {
  const { product } = await call<{ product: { id: string } }>("POST", "/api/inventory/products", {
    kind: spec.kind ?? "GOODS", ...spec,
  });
  return product.id;
}

async function createCustomField(module: string, label: string, fieldType: string, options?: string[]) {
  await call("POST", "/api/settings/custom-fields", { module, label, fieldType, options, required: false });
}

async function main() {
  console.log(`Seeding EcoPanel Structures demo data against ${BASE_URL} ...\n`);
  await login();

  // ── 0. Company identity ────────────────────────────────────────────────
  await call("PUT", "/api/settings/company-info", {
    legalName: "EcoPanel Structures Pvt. Ltd.",
    displayName: "EcoPanel Structures",
    phone: "01-5970001",
    phone2: "9801122334",
    email: "info@ecopanel.com.np",
    website: "https://ecopanel.com.np",
    panNumber: "609887001",
    registeredWithVat: true,
    separatePurchaseSalesTax: false,
    syncWithIrd: false,
    registeredAddress: "Balkhu Industrial Area, Kathmandu, Nepal",
    registeredAddress2: "Ward No. 14, Kathmandu Metropolitan City",
  });
  console.log("Company identity set: EcoPanel Structures Pvt. Ltd. (structural insulated panels + modular prefab homes).");

  // Custom Fields — Product gets a Fire Rating select, Sales Invoice gets a
  // free-text construction-site reference.
  await createCustomField("PRODUCT", "Fire Rating", "SELECT", ["Class A", "Class B", "Class C"]);
  await createCustomField("SALES_INVOICE", "Project Site", "TEXT");
  console.log("Custom fields defined: Product > Fire Rating, Sales Invoice > Project Site.");

  // ── 1. Master data ──────────────────────────────────────────────────────
  const factoryWh = await findWarehouseId("Default Warehouse");
  const siteWh = await createWarehouse("Site Storage Yard - Bhaktapur", "Bhaktapur Industrial Estate, Nepal");
  const vat13 = await findTaxRateId("VAT 13%");
  const kg = await findUnitId("Kilogram");
  const pieces = await findUnitId("Pieces");
  const packet = await findUnitId("Packet");
  const cash = await findLedgerId("CCE-02-0001"); // Cash In Hand
  const bank = await findLedgerId("CCE-01-0001"); // Bank Account
  const officeRent = await findLedgerId("Office Rent");
  const repairMaintenance = await findLedgerId("Repair");
  const fuelTransport = await findLedgerId("Fuel");

  const catRaw = await createCategory("Raw Materials");
  const catPanels = await createCategory("Eco Panels");
  const catModular = await createCategory("Modular Units");

  const steel = await createProduct({
    name: "Galvanized Steel Sheet", sku: "GST-001", categoryId: catRaw, unitId: kg,
    purchasePrice: 185, sellingPrice: 0, inventoryRole: "RAW_MATERIAL", madeImportedFrom: "China",
  });
  const eps = await createProduct({
    name: "EPS Foam Core Board", sku: "EPS-001", categoryId: catRaw, unitId: pieces,
    purchasePrice: 850, sellingPrice: 0, inventoryRole: "RAW_MATERIAL",
  });
  const osb = await createProduct({
    name: "OSB Structural Board", sku: "OSB-001", categoryId: catRaw, unitId: pieces,
    purchasePrice: 1250, sellingPrice: 0, inventoryRole: "RAW_MATERIAL",
  });
  const wool = await createProduct({
    name: "Mineral Wool Insulation", sku: "MWI-001", categoryId: catRaw, unitId: packet,
    purchasePrice: 680, sellingPrice: 0, inventoryRole: "RAW_MATERIAL",
  });

  const wallPanel = await createProduct({
    name: "Eco Wall Panel 1220x2440mm", sku: "EWP-001", categoryId: catPanels, unitId: pieces,
    purchasePrice: 0, sellingPrice: 6800, taxRateId: vat13, inventoryRole: "FINISHED_GOODS",
  });
  const roofPanel = await createProduct({
    name: "Eco Roof Panel 1220x2440mm", sku: "ERP-001", categoryId: catPanels, unitId: pieces,
    purchasePrice: 0, sellingPrice: 7500, taxRateId: vat13, inventoryRole: "FINISHED_GOODS",
  });
  const bathroomPod = await createProduct({
    name: "Modular Bathroom Pod", sku: "MBP-001", categoryId: catModular, unitId: pieces,
    purchasePrice: 140000, sellingPrice: 195000, taxRateId: vat13, inventoryRole: "FINISHED_GOODS",
    openingQty: 5, openingWarehouseId: factoryWh,
  });
  const installService = await createProduct({
    kind: "SERVICE", name: "Site Installation & Assembly Service", sku: "INST-001", unitId: pieces,
    purchasePrice: 0, sellingPrice: 15000, taxRateId: vat13,
  });

  const suppSteel = await createContact("Global Steel Importers Pvt. Ltd.", "SUPPLIER");
  const suppFoam = await createContact("Nepal Foam Industries", "SUPPLIER");
  const suppTimber = await createContact("Himalaya Timber & Board Depot", "SUPPLIER");

  const custGreenline = await createContact("Greenline Builders Pvt. Ltd.", "CUSTOMER");
  const custKmh = await createContact("Kathmandu Modular Homes Co.", "CUSTOMER");
  const custSudip = await createContact("Sudip Gurung", "CUSTOMER");

  console.log("Master data ready: 2 warehouses, 4 raw materials, 3 finished panels/modules, 1 service, 3 suppliers, 3 customers.");

  // ── 2. Bill of Materials ────────────────────────────────────────────────
  const { bom: wallBom } = await call<{ bom: { id: string } }>("POST", "/api/manufacturing/boms", {
    outputProductId: wallPanel, name: "Eco Wall Panel - Standard Batch", outputQty: 1, laborCostPerBatch: 900,
    components: [
      { componentProductId: steel, qtyPerBatch: 12 },
      { componentProductId: eps, qtyPerBatch: 1 },
      { componentProductId: osb, qtyPerBatch: 1 },
    ],
  });
  const { bom: roofBom } = await call<{ bom: { id: string } }>("POST", "/api/manufacturing/boms", {
    outputProductId: roofPanel, name: "Eco Roof Panel - Standard Batch", outputQty: 1, laborCostPerBatch: 1050,
    components: [
      { componentProductId: steel, qtyPerBatch: 14 },
      { componentProductId: eps, qtyPerBatch: 1 },
      { componentProductId: wool, qtyPerBatch: 1 },
    ],
  });
  console.log("BOMs defined: Eco Wall Panel, Eco Roof Panel.");

  // ── 3. Fixed Assets ──────────────────────────────────────────────────────
  await call("POST", "/api/assets", {
    name: "Hydraulic Panel Press Machine", category: "PLANT_MACHINERY",
    acquisitionDate: "2025-08-01", acquisitionCost: 1850000, salvageValue: 150000,
    depreciationMethod: "STRAIGHT_LINE", usefulLifeMonths: 120, paymentMode: "BANK", paymentLedgerId: bank,
  });
  await call("POST", "/api/assets", {
    name: "CNC Steel Cutting Machine", category: "PLANT_MACHINERY",
    acquisitionDate: "2025-09-10", acquisitionCost: 950000, salvageValue: 50000,
    depreciationMethod: "STRAIGHT_LINE", usefulLifeMonths: 96, paymentMode: "BANK", paymentLedgerId: bank,
  });
  await call("POST", "/api/assets", {
    name: "Delivery Truck - Ba 2 Pa 5521", category: "VEHICLES",
    acquisitionDate: "2025-10-05", acquisitionCost: 3200000, salvageValue: 400000,
    depreciationMethod: "STRAIGHT_LINE", usefulLifeMonths: 96, paymentMode: "BANK", paymentLedgerId: bank,
  });
  await call("POST", "/api/assets", {
    name: "Factory Office Furniture Set", category: "FURNITURE_FIXTURE",
    acquisitionDate: "2025-08-15", acquisitionCost: 220000, salvageValue: 20000,
    depreciationMethod: "STRAIGHT_LINE", usefulLifeMonths: 60, paymentMode: "CASH", paymentLedgerId: cash,
  });
  console.log("Fixed assets registered: press machine, CNC cutter, delivery truck, office furniture.");

  // ── 4. Budget (Fund + Headings shared across both fiscal years) ─────────
  const { fund } = await call<{ fund: { id: string } }>("POST", "/api/budget/funds", {
    name: "Term Loan - Nepal Investment Mega Bank",
  });
  const { heading: rawMaterialHeading } = await call<{ heading: { id: string } }>("POST", "/api/budget/headings", {
    name: "Raw Material Procurement", sourceType: "MANUAL",
  });
  const { heading: laborHeading } = await call<{ heading: { id: string } }>("POST", "/api/budget/headings", {
    name: "Site Installation Labor", sourceType: "MANUAL",
  });
  console.log("Budget fund + headings created (allocated per fiscal year below).");

  // ══════════════════════════════════════════════════════════════════════
  // PREVIOUS FISCAL YEAR — 2082-83 (2025-07-17 to 2026-07-16)
  // ══════════════════════════════════════════════════════════════════════
  await setActiveFiscalYear("2082-83");
  console.log("\n--- Previous fiscal year (2082-83) ---");

  {
    const { budget } = await call<{ budget: { id: string } }>("POST", "/api/budget/budgets", {
      fiscalYearId: await findFiscalYearId("2082-83"), name: "FY 2082-83 Production Budget", fundId: fund,
    });
    await call("PUT", `/api/budget/budgets/${budget.id}/allocations`, {
      allocations: [
        { budgetHeadingId: rawMaterialHeading, amount: 3000000 },
        { budgetHeadingId: laborHeading, amount: 650000 },
      ],
    });
  }

  // Raw material inbound: steel arrives before its invoice (Goods Received + Import Shipment)
  await call("POST", "/api/purchase/goods-received", {
    date: "2025-08-05", supplierLedgerId: suppSteel,
    items: [{ description: "Galvanized Steel Sheet - container shipment", qtyOrdered: 2000, qtyReceived: 1980 }],
  });
  await call("POST", "/api/purchase/imports", {
    date: "2025-08-06", supplierLedgerId: suppSteel, countryOfOrigin: "China",
    billOfEntryNo: "BOE-2082-1147", portOfEntry: "Birgunj ICD",
  });
  const { invoice: steelInv } = await call<{ invoice: { id: string; number: string } }>("POST", "/api/purchase/invoices", {
    date: "2025-08-07", supplierLedgerId: suppSteel, supplierInvoiceNumber: "GSI-INV-8871", paymentMode: "CREDIT",
    lines: [{ productId: steel, description: "Galvanized Steel Sheet", warehouseId: factoryWh, qty: 1980, rate: 185, customDuty: 15, taxRateId: vat13 }],
  });
  await call("POST", "/api/purchase/invoices", {
    date: "2025-08-10", supplierLedgerId: suppFoam, supplierInvoiceNumber: "NFI-2231", paymentMode: "CREDIT",
    lines: [{ productId: eps, description: "EPS Foam Core Board", warehouseId: factoryWh, qty: 200, rate: 850, taxRateId: vat13 }],
  });
  await call("POST", "/api/purchase/invoices", {
    date: "2025-08-12", supplierLedgerId: suppTimber, supplierInvoiceNumber: "HTB-559", paymentMode: "CASH", paymentLedgerId: bank,
    lines: [{ productId: osb, description: "OSB Structural Board", warehouseId: factoryWh, qty: 150, rate: 1250, taxRateId: vat13 }],
  });
  await call("POST", "/api/purchase/invoices", {
    date: "2025-08-14", supplierLedgerId: suppTimber, supplierInvoiceNumber: "HTB-561", paymentMode: "CASH", paymentLedgerId: cash,
    lines: [{ productId: wool, description: "Mineral Wool Insulation", warehouseId: factoryWh, qty: 100, rate: 680, taxRateId: vat13 }],
  });
  console.log(`Raw material inbound: steel (${steelInv.number}, GRN + Import record) + EPS + OSB + wool invoices posted.`);

  // Manufacturing: turn raw material into finished panels
  await call("POST", "/api/manufacturing/production-orders", {
    date: "2025-08-20", bomId: wallBom, warehouseId: factoryWh, batches: 80,
  });
  await call("POST", "/api/manufacturing/production-orders", {
    date: "2025-08-22", bomId: roofBom, warehouseId: factoryWh, batches: 60,
  });
  console.log("Production orders: 80 Eco Wall Panels + 60 Eco Roof Panels manufactured.");

  // Sales cycle #1: Greenline Builders — quote -> invoice -> dispatch -> payment
  const { doc: proforma1 } = await call<{ doc: { id: string; number: string } }>("POST", "/api/sales/proforma-invoices", {
    date: "2025-09-01", customerLedgerId: custGreenline,
    lines: [
      { productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", qty: 40, rate: 6800, taxRateId: vat13 },
      { productId: roofPanel, description: "Eco Roof Panel 1220x2440mm", qty: 30, rate: 7500, taxRateId: vat13 },
    ],
  });
  await call("POST", "/api/inventory/warehouse-transfer", {
    date: "2025-09-03", fromWarehouseId: factoryWh, toWarehouseId: siteWh,
    items: [{ productId: wallPanel, qty: 40 }, { productId: roofPanel, qty: 30 }],
  });
  const { invoice: greenlineInv1 } = await call<{ invoice: { id: string; number: string } }>("POST", "/api/sales/invoices", {
    date: "2025-09-05", customerLedgerId: custGreenline, paymentMode: "CREDIT", convertedFromId: proforma1.id,
    customFields: { [await customFieldIdFor("SALES_INVOICE", "Project Site")]: "Greenline Housing Block A, Lalitpur" },
    lines: [
      { productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", warehouseId: siteWh, qty: 40, rate: 6800, taxRateId: vat13 },
      { productId: roofPanel, description: "Eco Roof Panel 1220x2440mm", warehouseId: siteWh, qty: 30, rate: 7500, taxRateId: vat13 },
    ],
  });
  await call("POST", "/api/sales/chalani", {
    date: "2025-09-06", customerLedgerId: custGreenline, salesDocId: greenlineInv1.id,
    vehicleNo: "Ba 2 Pa 5521", driverName: "Rajendra Karki",
    items: [
      { productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", qty: 40 },
      { productId: roofPanel, description: "Eco Roof Panel 1220x2440mm", qty: 30 },
    ],
  });
  await call("POST", "/api/sales/receipts", {
    date: "2025-10-10", customerLedgerId: custGreenline, paymentLedgerId: bank,
    againstDocId: greenlineInv1.id, amount: 250000, paymentMode: "BANK",
  });
  const { cheque } = await call<{ cheque: { id: string } }>("POST", "/api/sales/cheque", {
    chequeNo: "445210", bankName: "Nabil Bank", chequeDate: "2025-11-01", amount: 138500,
    customerLedgerId: custGreenline, salesDocId: greenlineInv1.id, notes: "Remaining balance on Housing Block A order",
  });
  await call("PATCH", `/api/sales/cheque/${cheque.id}`, { status: "CLEARED" });
  console.log(`Greenline Builders: Proforma ${proforma1.number} -> Invoice ${greenlineInv1.number} -> Chalani dispatch -> Receipt + cleared cheque.`);

  // Sales cycle #2: Kathmandu Modular Homes — bathroom pods + on-site assembly
  const { invoice: kmhInv1 } = await call<{ invoice: { id: string; number: string } }>("POST", "/api/sales/invoices", {
    date: "2025-11-10", customerLedgerId: custKmh, paymentMode: "CREDIT",
    lines: [{ productId: bathroomPod, description: "Modular Bathroom Pod", warehouseId: factoryWh, qty: 2, rate: 195000, taxRateId: vat13 }],
  });
  const { technician: bikash } = await call<{ technician: { id: string } }>("POST", "/api/workshop/technicians", {
    name: "Bikash Thapa", phone: "9841122334", specialization: "Modular unit assembly & plumbing",
  });
  const { jobCard: kmhJobCard } = await call<{ jobCard: { id: string } }>("POST", "/api/workshop/job-cards", {
    date: "2025-11-15", customerLedgerId: custKmh,
    vehicleRegNo: "Ba 2 Cha 7788", vehicleMake: "Modular Pod", vehicleModel: "Bathroom Unit x2",
    complaint: "On-site assembly and plumbing connection for 2 modular bathroom pods",
    items: [{ itemType: "LABOR", technicianId: bikash, description: "Assembly + plumbing labor", qty: 2, rate: 7500 }],
  });
  await call("POST", `/api/workshop/job-cards/${kmhJobCard.id}/bill`, {
    paymentMode: "CREDIT",
    items: [{ itemType: "LABOR", technicianId: bikash, description: "Assembly + plumbing labor", qty: 2, rate: 7500 }],
  });
  console.log(`Kathmandu Modular Homes: Invoice ${kmhInv1.number} (2 bathroom pods) + billed installation job card.`);

  // Sales cycle #3: retail — Sudip Gurung, small home-extension order (cash)
  await call("POST", "/api/sales/invoices", {
    date: "2025-12-02", customerLedgerId: custSudip, paymentMode: "CASH", paymentLedgerId: cash,
    lines: [{ productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", warehouseId: factoryWh, qty: 4, rate: 6800, taxRateId: vat13 }],
  });

  // Corrections: a credit note (defective panels returned) and a debit note (defective steel returned)
  await call("POST", "/api/sales/credit-notes", {
    date: "2026-01-10", reversesDocId: greenlineInv1.id,
    lines: [{ productId: wallPanel, description: "Eco Wall Panel 1220x2440mm (defective, returned)", warehouseId: siteWh, qty: 2, rate: 6800, taxRateId: vat13 }],
  });
  await call("POST", "/api/purchase/debit-notes", {
    date: "2026-02-05", reversesDocId: steelInv.id,
    lines: [{ productId: steel, description: "Galvanized Steel Sheet (below spec, returned)", warehouseId: factoryWh, qty: 50, rate: 185, customDuty: 15, taxRateId: vat13 }],
  });
  console.log("Corrections posted: credit note (2 defective wall panels) + debit note (50kg substandard steel).");

  // Overheads: rent, cash-to-bank contra, a maintenance expense, an inventory write-off
  await call("POST", "/api/accounts/vouchers", {
    type: "JOURNAL", date: "2025-09-30", narration: "Factory rent - September 2082",
    lines: [{ ledgerId: officeRent, debit: 85000 }, { ledgerId: bank, credit: 85000 }],
  });
  await call("POST", "/api/accounts/vouchers", {
    type: "CONTRA", date: "2025-10-20", narration: "Cash deposited into bank",
    lines: [{ ledgerId: bank, debit: 50000 }, { ledgerId: cash, credit: 50000 }],
  });
  await call("POST", "/api/accounts/vouchers", {
    type: "EXPENSE", date: "2025-12-15", narration: "Hydraulic press annual maintenance service",
    lines: [{ ledgerId: repairMaintenance, debit: 25000 }, { ledgerId: cash, credit: 25000 }],
  });
  await call("POST", "/api/inventory/adjustments", {
    date: "2026-01-20", type: "DAMAGE", warehouseId: factoryWh, notes: "Water damage to stored EPS boards",
    lines: [{ productId: eps, qty: -5 }],
  });
  console.log("Overheads posted: rent, cash-to-bank contra, maintenance expense, EPS damage write-off.");

  // Balance confirmation + depreciation as the year closes
  await call("POST", "/api/accounts/balance-confirmation", { ledgerId: custGreenline, asOfDate: "2026-07-01" });
  await call("POST", "/api/assets/depreciation-runs", { asOfDate: "2026-07-16" });
  console.log("Balance confirmation sent to Greenline; year-end depreciation run posted.");

  // ══════════════════════════════════════════════════════════════════════
  // CURRENT FISCAL YEAR — 2083-84 (2026-07-17 onward, in progress)
  // ══════════════════════════════════════════════════════════════════════
  await setActiveFiscalYear("2083-84");
  console.log("\n--- Current fiscal year (2083-84, in progress) ---");

  {
    const { budget } = await call<{ budget: { id: string } }>("POST", "/api/budget/budgets", {
      fiscalYearId: await findFiscalYearId("2083-84"), name: "FY 2083-84 Production Budget", fundId: fund,
    });
    await call("PUT", `/api/budget/budgets/${budget.id}/allocations`, {
      allocations: [
        { budgetHeadingId: rawMaterialHeading, amount: 3500000 },
        { budgetHeadingId: laborHeading, amount: 800000 },
      ],
    });
  }

  // Restock raw material for the new year
  const { doc: steelPo } = await call<{ doc: { id: string; number: string } }>("POST", "/api/purchase/orders", {
    date: "2026-07-20", supplierLedgerId: suppSteel,
    lines: [{ productId: steel, description: "Galvanized Steel Sheet", warehouseId: factoryWh, qty: 1500, rate: 190 }],
  });
  await call("POST", "/api/purchase/invoices", {
    date: "2026-07-25", supplierLedgerId: suppSteel, supplierInvoiceNumber: "GSI-INV-9042",
    convertedFromId: steelPo.id, paymentMode: "CREDIT",
    lines: [{ productId: steel, description: "Galvanized Steel Sheet", warehouseId: factoryWh, qty: 1500, rate: 190, customDuty: 15, taxRateId: vat13 }],
  });
  await call("POST", "/api/purchase/invoices", {
    date: "2026-07-26", supplierLedgerId: suppFoam, supplierInvoiceNumber: "NFI-2298", paymentMode: "CREDIT",
    lines: [{ productId: eps, description: "EPS Foam Core Board", warehouseId: factoryWh, qty: 100, rate: 860, taxRateId: vat13 }],
  });
  await call("POST", "/api/purchase/invoices", {
    date: "2026-07-27", supplierLedgerId: suppTimber, supplierInvoiceNumber: "HTB-604", paymentMode: "CASH", paymentLedgerId: bank,
    lines: [{ productId: osb, description: "OSB Structural Board", warehouseId: factoryWh, qty: 80, rate: 1280, taxRateId: vat13 }],
  });
  // A shipment that's physically arrived but not yet invoiced — a real GRN-only in-progress state
  await call("POST", "/api/purchase/goods-received", {
    date: "2026-09-12", supplierLedgerId: suppSteel,
    items: [{ description: "Galvanized Steel Sheet - new container, invoice pending", qtyOrdered: 1000, qtyReceived: 1000 }],
  });
  console.log(`Current-year restock: PO ${steelPo.number} -> invoice, EPS + OSB invoices, and one un-invoiced GRN.`);

  await call("POST", "/api/manufacturing/production-orders", {
    date: "2026-08-01", bomId: wallBom, warehouseId: factoryWh, batches: 30,
  });

  // A pending quote — deliberately left un-converted to show the Proforma list mid-pipeline
  const { doc: proforma2 } = await call<{ doc: { id: string; number: string } }>("POST", "/api/sales/proforma-invoices", {
    date: "2026-08-05", customerLedgerId: custKmh,
    lines: [
      { productId: roofPanel, description: "Eco Roof Panel 1220x2440mm", qty: 20, rate: 7500, taxRateId: vat13 },
      { productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", qty: 25, rate: 6800, taxRateId: vat13 },
    ],
  });

  // Greenline top-up order, completed end to end
  await call("POST", "/api/inventory/warehouse-transfer", {
    date: "2026-08-09", fromWarehouseId: factoryWh, toWarehouseId: siteWh,
    items: [{ productId: wallPanel, qty: 15 }],
  });
  const { invoice: greenlineInv2 } = await call<{ invoice: { id: string; number: string } }>("POST", "/api/sales/invoices", {
    date: "2026-08-10", customerLedgerId: custGreenline, paymentMode: "CREDIT",
    lines: [{ productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", warehouseId: siteWh, qty: 15, rate: 6800, taxRateId: vat13 }],
  });
  await call("POST", "/api/sales/chalani", {
    date: "2026-08-11", customerLedgerId: custGreenline, salesDocId: greenlineInv2.id,
    vehicleNo: "Ba 2 Pa 5521", driverName: "Rajendra Karki",
    items: [{ productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", qty: 15 }],
  });
  await call("POST", "/api/sales/receipts", {
    date: "2026-09-01", customerLedgerId: custGreenline, paymentLedgerId: bank,
    againstDocId: greenlineInv2.id, amount: 60000, paymentMode: "BANK",
  });

  // Small cash sale + a pending cheque from KMH
  await call("POST", "/api/sales/invoices", {
    date: "2026-09-05", customerName: "Walk-in Customer", paymentMode: "CASH", paymentLedgerId: cash,
    lines: [{ productId: wallPanel, description: "Eco Wall Panel 1220x2440mm", warehouseId: factoryWh, qty: 3, rate: 6800, taxRateId: vat13 }],
  });
  await call("POST", "/api/sales/cheque", {
    chequeNo: "778102", bankName: "Himalayan Bank", chequeDate: "2026-09-25", amount: 50000,
    customerLedgerId: custKmh, notes: "On-account payment, cheque not yet deposited",
  });

  // Overheads + confirmations for the in-progress year
  await call("POST", "/api/accounts/vouchers", {
    type: "JOURNAL", date: "2026-08-30", narration: "Factory rent - August 2083",
    lines: [{ ledgerId: officeRent, debit: 90000 }, { ledgerId: bank, credit: 90000 }],
  });
  await call("POST", "/api/accounts/vouchers", {
    type: "EXPENSE", date: "2026-09-02", narration: "Delivery truck fuel - August/September",
    lines: [{ ledgerId: fuelTransport, debit: 12000 }, { ledgerId: cash, credit: 12000 }],
  });
  const { doc: confirmation } = await call<{ doc: { id: string } }>("POST", "/api/accounts/balance-confirmation", {
    ledgerId: custGreenline, asOfDate: "2026-09-10",
  });
  await call("PATCH", `/api/accounts/balance-confirmation/${confirmation.id}`, { status: "CONFIRMED" });
  await call("POST", "/api/assets/depreciation-runs", { asOfDate: "2026-09-13" });
  console.log(`Current-year overheads posted; Greenline balance confirmation ${confirmation.id} marked CONFIRMED; depreciation run to date.`);
  console.log(`Pending items left visible on purpose: Proforma ${proforma2.number} (not yet converted), the un-invoiced GRN, and the KMH cheque (PENDING).`);

  console.log("\nEcoPanel Structures demo data seeding complete.");
  console.log("Explore Dashboard / Reports / Aging for FY 2082-83 vs 2083-84, and the Sales/Purchase/Inventory/Workshop/Budget modules for the full story.");
}

/** installService is referenced only to keep the compiler honest that every
 * created id is used somewhere — it's intentionally not sold in this script
 * (a service the company offers but hasn't been ordered yet is a realistic,
 * demonstrable "not everything is used" state). */
function _unused() {
  return installService;
}

// customFieldIdFor: the custom-field id isn't returned by the product/invoice
// endpoints, so resolve it once from the definitions list when needed.
async function customFieldIdFor(module: string, label: string): Promise<string> {
  const { fields } = await call<{ fields: { id: string; module: string; label: string }[] }>(
    "GET", `/api/custom-fields?module=${encodeURIComponent(module)}`,
  );
  const hit = fields.find((f) => f.label === label);
  if (!hit) throw new Error(`Custom field not found: ${module} > ${label}`);
  return hit.id;
}

main().catch((e) => {
  console.error("EcoPanel demo seed failed:", e.message ?? e);
  process.exit(1);
});
