/**
 * Seed: platform reference data reproduced from the Bela / Nepal E-Billing
 * reference app (Docs/DISCOVERY-LOG.md) + one demo company/admin for local dev.
 *
 * Idempotent: safe to re-run. Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
      "Tax", "Barcode", "Invoice Setting", "Invoice Import Setting", "Tour",
    ],
  },
  {
    key: "notification",
    name: "Notification & Reminder",
    modules: ["Notification", "Reminder"],
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
      { title: "Units of Measurement", route: "/dashboard/inventory/units", permissionKey: "inventory.units_of_measurement" },
      { title: "Warehouse", route: "/dashboard/inventory/warehouse", permissionKey: "inventory.warehouse" },
      { title: "Warehouse Transfer", route: "/dashboard/inventory/warehouse-transfer", permissionKey: "inventory.warehouse_transfer" },
      { title: "Inventory Adjustment", route: "/dashboard/inventory/adjustment", permissionKey: "inventory.inventory_adjustment" },
      { title: "Inventory Transfer", route: "/dashboard/inventory/transfer", permissionKey: "inventory.inventory_transfer" },
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
      { title: "Invoice Import Setting", route: "/dashboard/settings/invoice-import-setting", permissionKey: "settings.invoice_import_setting" },
      { title: "Custom Status", route: "/dashboard/settings/custom-status", permissionKey: "settings.custom_status" },
      { title: "Backup Data", route: "/dashboard/settings/backup", permissionKey: "settings.backup_data" },
      { title: "Tour", route: "/dashboard/settings/tour", permissionKey: "settings.tour" },
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

async function seedDemoCompany(allPermKeys: string[]) {
  const company = await db.company.upsert({
    where: { subdomain: "bela" },
    create: { name: "Bela Nepal (Demo)", subdomain: "bela", address: "Kathmandu, Nepal" },
    update: {},
  });

  const branch = await db.branch.upsert({
    where: { companyId_name: { companyId: company.id, name: "Head Office" } },
    create: { companyId: company.id, name: "Head Office", address: "Kathmandu" },
    update: {},
  });

  await db.fiscalYear.upsert({
    where: { companyId_name: { companyId: company.id, name: "2083-84" } },
    create: {
      companyId: company.id, name: "2083-84",
      startDate: new Date("2026-07-17"), endDate: new Date("2027-07-16"), active: true,
    },
    update: { active: true },
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

  // Demo users (password: "password123") — dev only.
  const passwordHash = await bcrypt.hash("password123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@bela.local" },
    create: {
      email: "admin@bela.local", firstName: "Demo", lastName: "Admin",
      phone: "9800000000", passwordHash, userType: "ADMIN", status: "ACTIVE",
    },
    update: { passwordHash, userType: "ADMIN" },
  });
  const cashier = await db.user.upsert({
    where: { email: "cashier@bela.local" },
    create: {
      email: "cashier@bela.local", firstName: "Demo", lastName: "Cashier",
      phone: "9800000001", passwordHash, userType: "STAFF", status: "ACTIVE",
    },
    update: { passwordHash, userType: "STAFF" },
  });

  for (const u of [admin, cashier]) {
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
  await db.userRole.upsert({
    where: { userId_roleId: { userId: cashier.id, roleId: cashierRole.id } },
    create: { userId: cashier.id, roleId: cashierRole.id },
    update: {},
  });

  return { company: company.name, branch: branch.name };
}

async function main() {
  const permKeys = await seedPermissions();
  await seedMenu();
  const demo = await seedDemoCompany(permKeys);
  console.log(
    `Seeded ${permKeys.length} permission modules, menu tree, and demo company ` +
      `"${demo.company}" / branch "${demo.branch}".`,
  );
  console.log("Demo logins (dev only): admin@bela.local / cashier@bela.local — password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
