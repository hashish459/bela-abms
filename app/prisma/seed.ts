/**
 * Seed: platform reference data reproduced from the Bela / Nepal E-Billing
 * reference app (Docs/DISCOVERY-LOG.md) + one demo company/admin for local dev.
 *
 * Idempotent: safe to re-run. Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  NFRS_ACCOUNT_HEADS,
  NFRS_GROUPS,
  NFRS_LEDGERS,
} from "./data/nfrs-coa";

const db = new PrismaClient();

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** group key/name -> ordered module labels (from Settings › User & Permissions). */
const PERMISSION_CATALOGUE: Array<{ key: string; name: string; modules: string[] }> = [
  { key: "dashboard", name: "Dashboard", modules: ["Dashboard"] },
  {
    key: "sales",
    name: "Sales",
    modules: [
      "Sales Invoice", "Quotation", "Proforma Invoice", "Sales Order", "Chalani",
      "Receipt", "Cheque", "Credit Note", "Receivable Amount", "Printing Cost Register",
    ],
  },
  {
    key: "purchase",
    name: "Purchase",
    modules: [
      "Purchase Invoice", "Purchase Order", "Expenses", "Debit Notes", "Payment",
      "Payable Amount", "Goods Received", "Imports",
    ],
  },
  {
    key: "inventory",
    name: "Inventory",
    modules: [
      "Product / Item", "Product Category", "Units of Measurement", "Warehouse Transfer",
      "Inventory Adjustment", "Warehouse", "Inventory Transfer",
    ],
  },
  {
    key: "crm",
    name: "CRM",
    modules: ["Dashboard", "Clients", "Partners", "Follow Ups", "Reports", "User Filter"],
  },
  {
    key: "vouchers",
    name: "Vouchers",
    modules: ["Journal Voucher", "Contra Voucher", "Stock Journal"],
  },
  {
    key: "fixed_assets",
    name: "Fixed Assets",
    modules: ["Asset Register", "Depreciation"],
  },
  {
    key: "manufacturing",
    name: "Manufacturing",
    modules: ["Bill of Materials", "Production Order"],
  },
  {
    key: "workshop",
    name: "Workshop",
    modules: ["Job Card", "Technician"],
  },
  {
    key: "accounts",
    name: "Accounts",
    modules: ["Charts of Accounts", "Cash & Bank Account", "Contacts", "Balance Confirmation"],
  },
  { key: "token", name: "Token", modules: ["Token"] },
  { key: "documents", name: "Documents", modules: ["Documents"] },
  {
    key: "budget",
    name: "Budget",
    modules: ["Budget Heading", "Budget", "Allocation", "Fund"],
  },
  {
    key: "reports",
    name: "Reports",
    modules: [
      "Accounting Reports", "Sales Reports", "Purchase Reports", "Receivable Reports",
      "Payable Reports", "Tax Reports", "Inventory Reports", "System Reports", "Budget Reports",
    ],
  },
  {
    key: "store_builder",
    name: "Store Builder",
    modules: ["Theme Settings", "Hero Sliders", "Offer Ads", "Reviews"],
  },
  {
    key: "settings",
    name: "Settings",
    modules: [
      "Signin & Security", "Company Info", "Backup Data", "Users", "Roles & Permissions",
      "Bill Footer", "Bank Detail", "Fiscal Year", "Custom Fields", "Banks", "Custom Status",
      "Tax", "Barcode", "Invoice Setting", "Printing Templates", "Invoice Import Setting", "Tour",
    ],
  },
  {
    key: "notification",
    name: "Notification & Reminder",
    modules: ["Notification", "Reminder"],
  },
  {
    key: "help",
    name: "Help",
    modules: ["User Manuals"],
  },
  {
    key: "system",
    name: "System",
    modules: ["System Info", "Database Console"],
  },
];

/** Primary + secondary navigation (Docs/DISCOVERY-LOG.md). permissionKey -> PermissionModule.key */
type MenuSeed = {
  title: string;
  route?: string;
  icon?: string;
  permissionKey?: string;
  children?: MenuSeed[];
};

const MENU: MenuSeed[] = [
  { title: "Dashboard", route: "/dashboard", icon: "layout-dashboard", permissionKey: "dashboard.dashboard" },
  {
    title: "Sales", route: "/dashboard/sales/invoice", icon: "receipt-text",
    children: [
      { title: "Quotation", route: "/dashboard/sales/quotation", permissionKey: "sales.quotation" },
      { title: "Proforma Invoice", route: "/dashboard/sales/proforma-invoice", permissionKey: "sales.proforma_invoice" },
      { title: "Sales Order", route: "/dashboard/sales/sales-order", permissionKey: "sales.sales_order" },
      { title: "Sales Invoice", route: "/dashboard/sales/invoice", permissionKey: "sales.sales_invoice" },
      { title: "Receipts", route: "/dashboard/sales/receipt", permissionKey: "sales.receipt" },
      { title: "Credit Note", route: "/dashboard/sales/credit-note", permissionKey: "sales.credit_note" },
      { title: "Chalani", route: "/dashboard/sales/chalani", permissionKey: "sales.chalani" },
      { title: "Cheque", route: "/dashboard/sales/cheque", permissionKey: "sales.cheque" },
      { title: "Receivable Amount", route: "/dashboard/sales/receivable", permissionKey: "sales.receivable_amount" },
      { title: "Printing Cost Register", route: "/dashboard/sales/printing-cost", permissionKey: "sales.printing_cost_register" },
    ],
  },
  {
    title: "Purchase", route: "/dashboard/purchase/purchase-bills", icon: "shopping-cart",
    children: [
      { title: "Purchase Order", route: "/dashboard/purchase/purchase-order", permissionKey: "purchase.purchase_order" },
      { title: "Purchase Invoice", route: "/dashboard/purchase/purchase-bills", permissionKey: "purchase.purchase_invoice" },
      { title: "Expenses", route: "/dashboard/purchase/expenses", permissionKey: "purchase.expenses" },
      { title: "Debit Notes", route: "/dashboard/purchase/debit-note", permissionKey: "purchase.debit_notes" },
      { title: "Payments", route: "/dashboard/purchase/supplier-payment", permissionKey: "purchase.payment" },
      { title: "Payable Amount", route: "/dashboard/purchase/payable", permissionKey: "purchase.payable_amount" },
      { title: "Goods Received", route: "/dashboard/purchase/goods-received", permissionKey: "purchase.goods_received" },
      { title: "Imports", route: "/dashboard/purchase/imports", permissionKey: "purchase.imports" },
    ],
  },
  {
    title: "Inventory", route: "/dashboard/inventory/products", icon: "package",
    children: [
      { title: "Product Category", route: "/dashboard/inventory/product-category", permissionKey: "inventory.product_category" },
      { title: "Products", route: "/dashboard/inventory/products", permissionKey: "inventory.product_item" },
      { title: "Units of Measurement", route: "/dashboard/inventory/unit-measurement", permissionKey: "inventory.units_of_measurement" },
      { title: "Warehouse", route: "/dashboard/inventory/warehouse", permissionKey: "inventory.warehouse" },
      { title: "Warehouse Transfer", route: "/dashboard/inventory/warehouse-transfer", permissionKey: "inventory.warehouse_transfer" },
      { title: "Inventory Adjustment", route: "/dashboard/inventory/inventory-adjustment", permissionKey: "inventory.inventory_adjustment" },
      { title: "Inventory Transfer", route: "/dashboard/inventory/inventory-transfer", permissionKey: "inventory.inventory_transfer" },
    ],
  },
  {
    title: "CRM", route: "/dashboard/crm", icon: "users",
    children: [
      { title: "Dashboard", route: "/dashboard/crm", permissionKey: "crm.dashboard" },
      { title: "Clients", route: "/dashboard/crm/clients", permissionKey: "crm.clients" },
      { title: "Partners", route: "/dashboard/crm/partners", permissionKey: "crm.partners" },
      { title: "Follow Ups", route: "/dashboard/crm/follow-ups", permissionKey: "crm.follow_ups" },
      { title: "Reports", route: "/dashboard/crm/reports", permissionKey: "crm.reports" },
    ],
  },
  {
    title: "Vouchers", route: "/dashboard/vouchers/journal-voucher", icon: "book",
    children: [
      { title: "Journal Voucher", route: "/dashboard/vouchers/journal-voucher", permissionKey: "vouchers.journal_voucher" },
      { title: "Contra Voucher", route: "/dashboard/vouchers/contra-voucher", permissionKey: "vouchers.contra_voucher" },
      { title: "Stock Journal", route: "/dashboard/vouchers/stock-journal", permissionKey: "vouchers.stock_journal" },
    ],
  },
  {
    title: "Fixed Assets", route: "/dashboard/fixed-assets/register", icon: "building-2",
    children: [
      { title: "Asset Register", route: "/dashboard/fixed-assets/register", permissionKey: "fixed_assets.asset_register" },
      { title: "Depreciation", route: "/dashboard/fixed-assets/depreciation", permissionKey: "fixed_assets.depreciation" },
    ],
  },
  {
    title: "Manufacturing", route: "/dashboard/manufacturing/bom", icon: "factory",
    children: [
      { title: "Bill of Materials", route: "/dashboard/manufacturing/bom", permissionKey: "manufacturing.bill_of_materials" },
      { title: "Production Order", route: "/dashboard/manufacturing/production-order", permissionKey: "manufacturing.production_order" },
    ],
  },
  {
    title: "Workshop", route: "/dashboard/workshop/job-card", icon: "wrench",
    children: [
      { title: "Job Card", route: "/dashboard/workshop/job-card", permissionKey: "workshop.job_card" },
      { title: "Technician", route: "/dashboard/workshop/technician", permissionKey: "workshop.technician" },
    ],
  },
  {
    title: "Accounts", route: "/dashboard/accounts/charts-of-accounts", icon: "landmark",
    children: [
      { title: "Charts of Accounts", route: "/dashboard/accounts/charts-of-accounts", permissionKey: "accounts.charts_of_accounts" },
      { title: "Cash & Bank Account", route: "/dashboard/accounts/cash-bank", permissionKey: "accounts.cash_and_bank_account" },
      { title: "Contacts", route: "/dashboard/accounts/contacts", permissionKey: "accounts.contacts" },
      { title: "Balance Confirmation", route: "/dashboard/accounts/balance-confirmation", permissionKey: "accounts.balance_confirmation" },
    ],
  },
  {
    title: "Budget", route: "/dashboard/budget/budget-heading", icon: "wallet",
    children: [
      { title: "Budget Heading", route: "/dashboard/budget/budget-heading", permissionKey: "budget.budget_heading" },
      { title: "Budget", route: "/dashboard/budget/budget", permissionKey: "budget.budget" },
      { title: "Allocation", route: "/dashboard/budget/allocation", permissionKey: "budget.allocation" },
      { title: "Fund", route: "/dashboard/budget/fund", permissionKey: "budget.fund" },
    ],
  },
  { title: "Token", route: "/dashboard/token", icon: "ticket", permissionKey: "token.token" },
  { title: "Documents", route: "/dashboard/documents/document", icon: "folder", permissionKey: "documents.documents" },
  { title: "Reports", route: "/dashboard/reports", icon: "bar-chart-3", permissionKey: "reports.accounting_reports" },
  {
    title: "Store Builder", route: "/dashboard/store-builder/theme", icon: "store",
    children: [
      { title: "Theme Settings", route: "/dashboard/store-builder/theme", permissionKey: "store_builder.theme_settings" },
      { title: "Hero Sliders", route: "/dashboard/store-builder/hero-sliders", permissionKey: "store_builder.hero_sliders" },
      { title: "Offer Ads", route: "/dashboard/store-builder/offer-ads", permissionKey: "store_builder.offer_ads" },
      { title: "Reviews", route: "/dashboard/store-builder/reviews", permissionKey: "store_builder.reviews" },
    ],
  },
  {
    title: "Settings", route: "/dashboard/settings/signin-security", icon: "settings",
    children: [
      { title: "Signin & Security", route: "/dashboard/settings/signin-security", permissionKey: "settings.signin_and_security" },
      { title: "Company Info", route: "/dashboard/settings/company-info", permissionKey: "settings.company_info" },
      { title: "User & Permissions", route: "/dashboard/settings/users", permissionKey: "settings.users" },
      { title: "Fiscal Year", route: "/dashboard/settings/fiscal-year", permissionKey: "settings.fiscal_year" },
      { title: "Tax", route: "/dashboard/settings/tax", permissionKey: "settings.tax" },
      { title: "Custom Fields", route: "/dashboard/settings/custom-fields", permissionKey: "settings.custom_fields" },
      { title: "Banks", route: "/dashboard/settings/banks", permissionKey: "settings.banks" },
      { title: "Bill Footer", route: "/dashboard/settings/bill-footer", permissionKey: "settings.bill_footer" },
      { title: "Bank Detail", route: "/dashboard/settings/bank-detail", permissionKey: "settings.bank_detail" },
      { title: "Barcode", route: "/dashboard/settings/barcode", permissionKey: "settings.barcode" },
      { title: "Invoice Setting", route: "/dashboard/settings/invoice-setting", permissionKey: "settings.invoice_setting" },
      { title: "Printing Templates", route: "/dashboard/settings/printing-templates", permissionKey: "settings.printing_templates" },
      { title: "Invoice Import Setting", route: "/dashboard/settings/invoice-import-setting", permissionKey: "settings.invoice_import_setting" },
      { title: "Custom Status", route: "/dashboard/settings/custom-status", permissionKey: "settings.custom_status" },
      { title: "Backup Data", route: "/dashboard/settings/backup", permissionKey: "settings.backup_data" },
      { title: "Tour", route: "/dashboard/settings/tour", permissionKey: "settings.tour" },
    ],
  },
  {
    title: "Help", route: "/dashboard/help/getting-started", icon: "book-open",
    children: [
      { title: "Getting Started", route: "/dashboard/help/getting-started", permissionKey: "help.user_manuals" },
      { title: "Accounts & GL", route: "/dashboard/help/accounts-gl", permissionKey: "help.user_manuals" },
      { title: "Sales", route: "/dashboard/help/sales", permissionKey: "help.user_manuals" },
      { title: "Purchase", route: "/dashboard/help/purchase", permissionKey: "help.user_manuals" },
      { title: "Inventory", route: "/dashboard/help/inventory", permissionKey: "help.user_manuals" },
      { title: "Reports", route: "/dashboard/help/reports", permissionKey: "help.user_manuals" },
      { title: "Roles & Permissions", route: "/dashboard/help/roles-permissions", permissionKey: "help.user_manuals" },
    ],
  },
  {
    title: "System", route: "/dashboard/system/info", icon: "activity",
    children: [
      { title: "System Info", route: "/dashboard/system/info", permissionKey: "system.system_info" },
      { title: "Database Console", route: "/dashboard/system/query", permissionKey: "system.database_console" },
    ],
  },
];

async function seedPermissions() {
  let order = 0;
  const created: string[] = [];
  for (const group of PERMISSION_CATALOGUE) {
    for (const label of group.modules) {
      const key = `${group.key}.${slug(label)}`;
      await db.permissionModule.upsert({
        where: { key },
        create: { key, label, groupKey: group.key, groupName: group.name, order: order++ },
        update: { label, groupKey: group.key, groupName: group.name, order: order++ },
      });
      created.push(key);
    }
  }
  return created;
}

async function seedMenu() {
  let order = 0;
  const walk = async (nodes: MenuSeed[], parentId: string | null) => {
    for (const n of nodes) {
      const s = slug(n.title) + (parentId ? "" : "_root");
      const row = await db.menuItem.upsert({
        where: { slug: s },
        create: {
          slug: s, title: n.title, route: n.route ?? null, icon: n.icon ?? null,
          order: order++, parentId, permissionKey: n.permissionKey ?? null,
        },
        update: {
          title: n.title, route: n.route ?? null, icon: n.icon ?? null,
          order: order++, parentId, permissionKey: n.permissionKey ?? null,
        },
      });
      if (n.children) await walk(n.children, row.id);
    }
  };
  await walk(MENU, null);
}

/** Every value here can be overridden by an env var of the same-named
 * `SEED_*` key (see automation/db-fresh.sh) so a real VPS deployment seeds
 * an actual client's company identity instead of the demo one — the
 * defaults below (and the whole shape of what gets seeded: NFRS chart of
 * accounts, permission modules, menu tree, an Administrator role) are
 * unchanged either way. This is the "company philosophy" scaffold: no
 * transactions, just the blank ledger structure and RBAC every company
 * needs on day one. */
const cfg = {
  subdomain: process.env.SEED_COMPANY_SUBDOMAIN ?? "bela",
  companyName: process.env.SEED_COMPANY_NAME ?? "Bela Nepal (Demo)",
  companyAddress: process.env.SEED_COMPANY_ADDRESS ?? "Kathmandu, Nepal",
  legalName: process.env.SEED_LEGAL_NAME ?? "Bela Nepal Industries (Demo)",
  displayName: process.env.SEED_DISPLAY_NAME ?? "Bela Nepal Industries",
  phone: process.env.SEED_COMPANY_PHONE ?? "9800000000",
  email: process.env.SEED_COMPANY_EMAIL ?? "info@bela.local",
  website: process.env.SEED_COMPANY_WEBSITE ?? "https://belanepal.com.np",
  panNumber: process.env.SEED_COMPANY_PAN ?? "600000000",
  registeredAddress: process.env.SEED_REGISTERED_ADDRESS ?? "Chhauni-15, Kathmandu, Nepal",
  adminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@bela.local",
  adminPassword: process.env.SEED_ADMIN_PASSWORD ?? "password123",
  adminFirstName: process.env.SEED_ADMIN_FIRST_NAME ?? "Demo",
  adminLastName: process.env.SEED_ADMIN_LAST_NAME ?? "Admin",
  adminPhone: process.env.SEED_ADMIN_PHONE ?? "9800000000",
  // Set SEED_SKIP_DEMO_USERS=1 for a real deployment — skips the second
  // "cashier@bela.local / password123" login; the Cashier ROLE (a useful
  // limited-permission template) is still created either way.
  skipDemoUsers: process.env.SEED_SKIP_DEMO_USERS === "1",
};

async function seedDemoCompany(allPermKeys: string[]) {
  const company = await db.company.upsert({
    where: { subdomain: cfg.subdomain },
    create: { name: cfg.companyName, subdomain: cfg.subdomain, address: cfg.companyAddress },
    update: {},
  });

  const branch = await db.branch.upsert({
    where: { companyId_name: { companyId: company.id, name: "Head Office" } },
    create: { companyId: company.id, name: "Head Office", address: "Kathmandu" },
    update: {},
  });

  // Fiscal years mirror the reference (BS label + AD dates).
  const fiscalYears = [
    { name: "2081-82", startDate: "2024-07-16", endDate: "2025-07-15", active: false },
    { name: "2082-83", startDate: "2025-07-17", endDate: "2026-07-16", active: false },
    { name: "2083-84", startDate: "2026-07-17", endDate: "2027-07-16", active: true },
  ];
  for (const fy of fiscalYears) {
    await db.fiscalYear.upsert({
      where: { companyId_name: { companyId: company.id, name: fy.name } },
      create: {
        companyId: company.id, name: fy.name,
        startDate: new Date(fy.startDate), endDate: new Date(fy.endDate), active: fy.active,
      },
      update: { active: fy.active },
    });
  }

  // Tax rates — Nepal IRD standard set (system rows, not deletable).
  const taxRates = [
    { name: "VAT 13%", ratePct: "13.0000", isNoTax: false },
    { name: "VAT Exempt (0%)", ratePct: "0.0000", isNoTax: true },
    { name: "Non-Taxable", ratePct: "0.0000", isNoTax: true },
  ];
  for (const t of taxRates) {
    await db.taxRate.upsert({
      where: { companyId_name: { companyId: company.id, name: t.name } },
      create: {
        companyId: company.id, name: t.name, ratePct: t.ratePct,
        isNoTax: t.isNoTax, isSystem: true, isActive: true,
      },
      update: { ratePct: t.ratePct, isNoTax: t.isNoTax, isSystem: true },
    });
  }

  // Company profile (Settings › Company Info).
  await db.companyInfo.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      legalName: cfg.legalName,
      displayName: cfg.displayName,
      phone: cfg.phone,
      email: cfg.email,
      website: cfg.website,
      panNumber: cfg.panNumber,
      registeredWithVat: true,
      separatePurchaseSalesTax: false,
      syncWithIrd: false,
      registeredAddress: cfg.registeredAddress,
    },
    update: {},
  });

  // System "Administrator" role with full CRUD on every module.
  const adminRole = await db.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "Administrator" } },
    create: { companyId: company.id, name: "Administrator", isSystem: true },
    update: { isSystem: true },
  });

  const modules = await db.permissionModule.findMany({
    where: { key: { in: allPermKeys } },
    select: { id: true },
  });
  for (const m of modules) {
    await db.rolePermission.upsert({
      where: { roleId_moduleId: { roleId: adminRole.id, moduleId: m.id } },
      create: {
        roleId: adminRole.id, moduleId: m.id,
        canCreate: true, canRead: true, canUpdate: true, canDelete: true,
      },
      update: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    });
  }

  // A limited "Cashier" role: read dashboard + sales, create sales invoice/receipt.
  const cashierRole = await db.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "Cashier" } },
    create: { companyId: company.id, name: "Cashier" },
    update: {},
  });
  const cashierGrants: Record<string, Partial<Record<"canCreate" | "canRead" | "canUpdate" | "canDelete", boolean>>> = {
    "dashboard.dashboard": { canRead: true },
    "sales.sales_invoice": { canRead: true, canCreate: true },
    "sales.quotation": { canRead: true, canCreate: true },
    "sales.receipt": { canRead: true, canCreate: true },
    "accounts.contacts": { canRead: true },
    "inventory.product_item": { canRead: true },
    "help.user_manuals": { canRead: true },
  };
  for (const [key, grant] of Object.entries(cashierGrants)) {
    const mod = await db.permissionModule.findUnique({ where: { key }, select: { id: true } });
    if (!mod) continue;
    await db.rolePermission.upsert({
      where: { roleId_moduleId: { roleId: cashierRole.id, moduleId: mod.id } },
      create: {
        roleId: cashierRole.id, moduleId: mod.id,
        canCreate: !!grant.canCreate, canRead: !!grant.canRead,
        canUpdate: !!grant.canUpdate, canDelete: !!grant.canDelete,
      },
      update: {
        canCreate: !!grant.canCreate, canRead: !!grant.canRead,
        canUpdate: !!grant.canUpdate, canDelete: !!grant.canDelete,
      },
    });
  }

  const adminPasswordHash = await bcrypt.hash(cfg.adminPassword, 12);
  const admin = await db.user.upsert({
    where: { email: cfg.adminEmail },
    create: {
      email: cfg.adminEmail, firstName: cfg.adminFirstName, lastName: cfg.adminLastName,
      phone: cfg.adminPhone, passwordHash: adminPasswordHash, userType: "ADMIN", status: "ACTIVE",
    },
    update: { passwordHash: adminPasswordHash, userType: "ADMIN" },
  });

  // The second demo login ("cashier@bela.local / password123") is dev-only —
  // skip it for a real deployment via SEED_SKIP_DEMO_USERS=1. The Cashier
  // ROLE itself (a useful limited-permission template) is always created.
  const users = [admin];
  if (!cfg.skipDemoUsers) {
    const cashierPasswordHash = await bcrypt.hash("password123", 12);
    const cashier = await db.user.upsert({
      where: { email: "cashier@bela.local" },
      create: {
        email: "cashier@bela.local", firstName: "Demo", lastName: "Cashier",
        phone: "9800000001", passwordHash: cashierPasswordHash, userType: "STAFF", status: "ACTIVE",
      },
      update: { passwordHash: cashierPasswordHash, userType: "STAFF" },
    });
    users.push(cashier);
    await db.userRole.upsert({
      where: { userId_roleId: { userId: cashier.id, roleId: cashierRole.id } },
      create: { userId: cashier.id, roleId: cashierRole.id },
      update: {},
    });
  }

  for (const u of users) {
    await db.userCompany.upsert({
      where: { userId_companyId: { userId: u.id, companyId: company.id } },
      create: { userId: u.id, companyId: company.id, isDefault: true },
      update: { isDefault: true },
    });
  }
  await db.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { userId: admin.id, roleId: adminRole.id },
    update: {},
  });

  const coa = await seedChartOfAccounts(company.id);
  const inv = await seedInventoryBasics(company.id);

  return { company: company.name, branch: branch.name, coa, inv };
}

/** Seed default units of measurement + a default warehouse (mirrors the reference). */
async function seedInventoryBasics(companyId: string) {
  const units = [
    { name: "Unit", shortName: "Unit", acceptFraction: false },
    { name: "Pieces", shortName: "Pcs", acceptFraction: false },
    { name: "Kilogram", shortName: "Kg", acceptFraction: true },
    { name: "Gram", shortName: "Gm", acceptFraction: true },
    { name: "Liter", shortName: "Lt", acceptFraction: true },
    { name: "Mililiter", shortName: "Ml", acceptFraction: true },
    { name: "Sack", shortName: "Sack", acceptFraction: true },
    { name: "Carton", shortName: "Crt", acceptFraction: true },
    { name: "Packet", shortName: "Pkg", acceptFraction: true },
  ];
  for (const u of units) {
    await db.unit.upsert({
      where: { companyId_name: { companyId, name: u.name } },
      create: { companyId, ...u, isSystem: true },
      update: { shortName: u.shortName, acceptFraction: u.acceptFraction, isSystem: true },
    });
  }

  await db.warehouse.upsert({
    where: { companyId_name: { companyId, name: "Default Warehouse" } },
    create: { companyId, name: "Default Warehouse", isDefault: true, address: "Head Office" },
    update: {},
  });

  return { units: units.length };
}

/** Seed the NFRS 3-level chart of accounts (AccountHead → AccountGroup → Ledger). */
async function seedChartOfAccounts(companyId: string) {
  const headByCode = new Map<string, string>();
  for (const h of NFRS_ACCOUNT_HEADS) {
    const row = await db.accountHead.upsert({
      where: { companyId_code: { companyId, code: h.code } },
      create: {
        companyId, code: h.code, name: h.name,
        accountType: h.accountType, currentType: h.currentType,
        financialType: h.financialType, isSystem: true,
      },
      update: { name: h.name, accountType: h.accountType, currentType: h.currentType, financialType: h.financialType },
    });
    headByCode.set(h.code, row.id);
  }

  const groupByCode = new Map<string, string>();
  for (const g of NFRS_GROUPS) {
    const headId = headByCode.get(g.headCode);
    if (!headId) continue;
    const row = await db.accountGroup.upsert({
      where: { companyId_code: { companyId, code: g.code } },
      create: { companyId, code: g.code, name: g.name, accountHeadId: headId, isSystem: true },
      update: { name: g.name, accountHeadId: headId },
    });
    groupByCode.set(g.code, row.id);
  }

  let ledgerCount = 0;
  for (const l of NFRS_LEDGERS) {
    const groupId = groupByCode.get(l.groupCode);
    if (!groupId) continue;
    await db.ledger.upsert({
      where: { companyId_code: { companyId, code: l.code } },
      create: { companyId, code: l.code, name: l.name, accountGroupId: groupId, isSystem: true },
      update: { name: l.name, accountGroupId: groupId },
    });
    ledgerCount++;
  }

  // Suspense account so opening balances always post a balanced OPENING voucher.
  const rsGroup = groupByCode.get("R&S-02"); // Reserve & Surplus / P&L group
  if (rsGroup) {
    await db.ledger.upsert({
      where: { companyId_code: { companyId, code: "R&S-02-0002" } },
      create: {
        companyId, code: "R&S-02-0002", name: "Opening Balance Adjustment",
        accountGroupId: rsGroup, isSystem: true,
      },
      update: {},
    });
    ledgerCount++;
  }

  // Perpetual-inventory Cost of Goods Sold ledger (the reference COA has no clean one).
  const cosGroup = groupByCode.get("COS-01"); // Consumption Cost
  if (cosGroup) {
    await db.ledger.upsert({
      where: { companyId_code: { companyId, code: "COS-01-0100" } },
      create: {
        companyId, code: "COS-01-0100", name: "Cost of Goods Sold",
        accountGroupId: cosGroup, isSystem: true,
      },
      update: {},
    });
    ledgerCount++;
  }

  return {
    heads: headByCode.size,
    groups: groupByCode.size,
    ledgers: ledgerCount,
  };
}

async function main() {
  const permKeys = await seedPermissions();
  await seedMenu();
  const demo = await seedDemoCompany(permKeys);
  console.log(
    `Seeded ${permKeys.length} permission modules, menu tree, and demo company ` +
      `"${demo.company}" / branch "${demo.branch}".`,
  );
  console.log(
    `NFRS chart of accounts: ${demo.coa.heads} heads, ${demo.coa.groups} groups, ${demo.coa.ledgers} ledgers.`,
  );
  console.log(`Inventory: ${demo.inv.units} units + Default Warehouse.`);
  if (cfg.skipDemoUsers) {
    console.log(`Admin login: ${cfg.adminEmail} (password set via SEED_ADMIN_PASSWORD)`);
  } else {
    console.log(`Demo logins (dev only): ${cfg.adminEmail} / cashier@bela.local — ${cfg.adminPassword}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
