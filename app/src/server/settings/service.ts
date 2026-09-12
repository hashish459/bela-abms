import "server-only";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { encryptSecret } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { toIsoDate } from "@/lib/bs-date";
import { hashPassword, verifyPassword } from "@/lib/password";
import { revokeRefreshTokenById } from "@/lib/session";
import type {
  CompanyInfoUpdate,
  FiscalYearCreate,
  TaxRateCreate,
  ChangePassword,
  UserCreate,
  UserUpdate,
  RoleCreate,
  RoleUpdate,
  BranchCreate,
  BankCreate,
  BankUpdate,
  BankAccountCreate,
  BankAccountUpdate,
  CustomFieldCreate,
  CustomFieldUpdate,
  CustomStatusCreate,
  CustomStatusUpdate,
  BarcodeSettingUpdate,
  InvoiceSettingUpdate,
  PrintingTemplateUpdate,
  ReceiptTemplateUpdate,
  InvoiceImportTemplateCreate,
  InvoiceImportTemplateUpdate,
  BillFooterUpdate,
} from "./schemas";

/* ─────────────────────────────  Fiscal years  ───────────────────────────── */

export async function listFiscalYears(companyId: string) {
  const rows = await db.fiscalYear.findMany({
    where: { companyId },
    orderBy: { startDate: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: toIsoDate(r.startDate),
    endDate: toIsoDate(r.endDate),
    description: r.description,
    active: r.active,
    isClosed: r.isClosed,
  }));
}

export async function createFiscalYear(
  companyId: string,
  actorId: string,
  input: FiscalYearCreate,
) {
  const dup = await db.fiscalYear.findUnique({
    where: { companyId_name: { companyId, name: input.name } },
  });
  if (dup) throw errors.conflict(`Fiscal year "${input.name}" already exists`);

  const created = await db.$transaction(async (tx) => {
    if (input.active) {
      await tx.fiscalYear.updateMany({ where: { companyId }, data: { active: false } });
    }
    return tx.fiscalYear.create({
      data: {
        companyId,
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        description: input.description || null,
        active: input.active ?? false,
      },
    });
  });

  await writeAudit({
    userId: actorId, companyId, action: "CREATE",
    entity: "FiscalYear", entityId: created.id, meta: { name: created.name },
  });
  return created;
}

export async function updateFiscalYear(
  companyId: string,
  actorId: string,
  id: string,
  input: Partial<FiscalYearCreate>,
) {
  const existing = await db.fiscalYear.findFirst({ where: { id, companyId } });
  if (!existing) throw errors.notFound("Fiscal year not found");

  const updated = await db.$transaction(async (tx) => {
    if (input.active) {
      await tx.fiscalYear.updateMany({
        where: { companyId, id: { not: id } },
        data: { active: false },
      });
    }
    return tx.fiscalYear.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        description: input.description === undefined ? undefined : input.description || null,
        active: input.active ?? undefined,
      },
    });
  });

  await writeAudit({
    userId: actorId, companyId, action: "UPDATE",
    entity: "FiscalYear", entityId: id, meta: { name: updated.name },
  });
  return updated;
}

/* ─────────────────────────────  Tax rates  ──────────────────────────────── */

export async function listTaxRates(companyId: string) {
  return db.taxRate.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true, name: true, ratePct: true, isNoTax: true, isSystem: true, isActive: true,
    },
  });
}

export async function createTaxRate(
  companyId: string,
  actorId: string,
  input: TaxRateCreate,
) {
  const dup = await db.taxRate.findFirst({
    where: { companyId, name: input.name, deletedAt: null },
  });
  if (dup) throw errors.conflict(`Tax "${input.name}" already exists`);

  const created = await db.taxRate.create({
    data: {
      companyId,
      name: input.name,
      ratePct: input.ratePct,
      isNoTax: input.isNoTax ?? input.ratePct === 0,
      isActive: input.isActive ?? true,
      isSystem: false,
    },
  });
  await writeAudit({
    userId: actorId, companyId, action: "CREATE",
    entity: "TaxRate", entityId: created.id, meta: { name: created.name },
  });
  return created;
}

export async function updateTaxRate(
  companyId: string,
  actorId: string,
  id: string,
  input: Partial<TaxRateCreate>,
) {
  const existing = await db.taxRate.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Tax rate not found");
  if (existing.isSystem && input.name && input.name !== existing.name)
    throw errors.badRequest("System tax rates cannot be renamed");

  const updated = await db.taxRate.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      ratePct: input.ratePct ?? undefined,
      isNoTax: input.isNoTax ?? undefined,
      isActive: input.isActive ?? undefined,
    },
  });
  await writeAudit({
    userId: actorId, companyId, action: "UPDATE", entity: "TaxRate", entityId: id,
  });
  return updated;
}

export async function deleteTaxRate(companyId: string, actorId: string, id: string) {
  const existing = await db.taxRate.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Tax rate not found");
  if (existing.isSystem) throw errors.badRequest("System tax rates cannot be deleted");

  await db.taxRate.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    userId: actorId, companyId, action: "DELETE", entity: "TaxRate", entityId: id,
  });
}

/* ────────────────────────────  Company info  ───────────────────────────── */

export async function getCompanyInfo(companyId: string) {
  const info = await db.companyInfo.findUnique({ where: { companyId } });
  if (!info) return null;
  // Never return the CBMS password; just whether one is set.
  const { cbmsPasswordCiphertext, ...rest } = info;
  return { ...rest, cbmsPasswordSet: Boolean(cbmsPasswordCiphertext) };
}

export async function upsertCompanyInfo(
  companyId: string,
  actorId: string,
  input: CompanyInfoUpdate,
) {
  const cbms =
    input.cbmsPassword && input.cbmsPassword.length > 0
      ? { cbmsPasswordCiphertext: encryptSecret(input.cbmsPassword) }
      : {};

  const data = {
    legalName: input.legalName,
    displayName: input.displayName || null,
    phone: input.phone,
    phone2: input.phone2 || null,
    email: input.email,
    website: input.website || null,
    panNumber: input.panNumber,
    eximCode: input.eximCode || null,
    cbmsUsername: input.cbmsUsername || null,
    registeredWithVat: input.registeredWithVat,
    separatePurchaseSalesTax: input.separatePurchaseSalesTax,
    syncWithIrd: input.syncWithIrd,
    registeredAddress: input.registeredAddress,
    registeredAddress2: input.registeredAddress2 || null,
    ...cbms,
  };

  const saved = await db.companyInfo.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });
  await writeAudit({
    userId: actorId, companyId, action: "UPDATE",
    entity: "CompanyInfo", entityId: saved.id,
  });
  return getCompanyInfo(companyId);
}

/* ───────────────────────────  Signin & Security  ────────────────────────── */

export async function changeUserPassword(userId: string, input: ChangePassword) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw errors.notFound("User not found");
  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) throw errors.badRequest("Current password is incorrect");
  const passwordHash = await hashPassword(input.newPassword);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  await writeAudit({ userId, action: "CHANGE_PASSWORD", entity: "User", entityId: userId });
}

export async function listUserSessions(userId: string) {
  const rows = await db.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    ip: r.ip ?? "—",
    userAgent: r.userAgent ?? "—",
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));
}

export async function revokeUserSession(userId: string, sessionId: string) {
  const row = await db.refreshToken.findFirst({ where: { id: sessionId, userId } });
  if (!row) throw errors.notFound("Session not found");
  await revokeRefreshTokenById(sessionId);
  await writeAudit({ userId, action: "REVOKE_SESSION", entity: "RefreshToken", entityId: sessionId });
}

/* ────────────────────────────────  Users  ────────────────────────────────── */

export async function listUsers(companyId: string) {
  const links = await db.userCompany.findMany({
    where: { companyId },
    include: {
      user: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          userType: true, status: true, lastLoginAt: true, deletedAt: true,
          roleLinks: { include: { role: { select: { id: true, name: true, companyId: true } } } },
        },
      },
    },
  });
  return links
    .filter((l) => !l.user.deletedAt)
    .map((l) => ({
      id: l.user.id,
      firstName: l.user.firstName,
      lastName: l.user.lastName,
      email: l.user.email,
      phone: l.user.phone,
      userType: l.user.userType,
      status: l.user.status,
      lastLoginAt: l.user.lastLoginAt ? l.user.lastLoginAt.toISOString() : null,
      roles: l.user.roleLinks.filter((rl) => rl.role.companyId === companyId).map((rl) => ({ id: rl.role.id, name: rl.role.name })),
    }));
}

export async function createUser(companyId: string, actorId: string, input: UserCreate) {
  const dup = await db.user.findUnique({ where: { email: input.email } });
  if (dup) throw errors.conflict(`A user with email "${input.email}" already exists`);

  const roles = input.roleIds.length
    ? await db.role.findMany({ where: { id: { in: input.roleIds }, companyId }, select: { id: true } })
    : [];

  const passwordHash = await hashPassword(input.password);
  const created = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: input.firstName, lastName: input.lastName, email: input.email,
        phone: input.phone || null, passwordHash, userType: input.userType,
      },
    });
    await tx.userCompany.create({ data: { userId: user.id, companyId, isDefault: true } });
    if (roles.length) {
      await tx.userRole.createMany({ data: roles.map((r) => ({ userId: user.id, roleId: r.id })) });
    }
    return user;
  });

  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "User", entityId: created.id, meta: { email: created.email } });
  return created;
}

export async function updateUser(companyId: string, actorId: string, id: string, input: UserUpdate) {
  const link = await db.userCompany.findFirst({ where: { userId: id, companyId } });
  if (!link) throw errors.notFound("User not found");

  if (input.status === "DISABLED") {
    if (id === actorId) throw errors.badRequest("You cannot disable your own account");
    const activeAdmins = await db.user.count({
      where: { userType: "ADMIN", status: "ACTIVE", deletedAt: null, companyLinks: { some: { companyId } } },
    });
    const target = await db.user.findUnique({ where: { id }, select: { userType: true, status: true } });
    if (target?.userType === "ADMIN" && target.status === "ACTIVE" && activeAdmins <= 1) {
      throw errors.badRequest("Cannot disable the last active admin");
    }
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        firstName: input.firstName, lastName: input.lastName,
        phone: input.phone === undefined ? undefined : input.phone || null,
        status: input.status,
      },
    });
    if (input.roleIds) {
      const roles = input.roleIds.length
        ? await tx.role.findMany({ where: { id: { in: input.roleIds }, companyId }, select: { id: true } })
        : [];
      const existing = await tx.userRole.findMany({ where: { userId: id, role: { companyId } }, select: { id: true } });
      if (existing.length) await tx.userRole.deleteMany({ where: { id: { in: existing.map((e) => e.id) } } });
      if (roles.length) await tx.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });
    }
  });

  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "User", entityId: id });
}

/* ────────────────────────────  Roles & Permissions  ─────────────────────── */

export async function getPermissionModules() {
  const rows = await db.permissionModule.findMany({ orderBy: { order: "asc" } });
  const byGroup = new Map<string, { groupKey: string; groupName: string; modules: { id: string; key: string; label: string }[] }>();
  for (const r of rows) {
    if (!byGroup.has(r.groupKey)) byGroup.set(r.groupKey, { groupKey: r.groupKey, groupName: r.groupName, modules: [] });
    byGroup.get(r.groupKey)!.modules.push({ id: r.id, key: r.key, label: r.label });
  }
  return [...byGroup.values()];
}

export async function listRoles(companyId: string) {
  const roles = await db.role.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      permissions: { include: { module: { select: { key: true } } } },
      userLinks: { select: { id: true } },
    },
  });
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    isSystem: r.isSystem,
    userCount: r.userLinks.length,
    permissions: Object.fromEntries(
      r.permissions.map((p) => [p.module.key, { canCreate: p.canCreate, canRead: p.canRead, canUpdate: p.canUpdate, canDelete: p.canDelete }]),
    ),
  }));
}

export async function createRole(companyId: string, actorId: string, input: RoleCreate) {
  const dup = await db.role.findFirst({ where: { companyId, name: input.name, deletedAt: null } });
  if (dup) throw errors.conflict(`Role "${input.name}" already exists`);

  const moduleKeys = Object.keys(input.permissions);
  const modules = moduleKeys.length
    ? await db.permissionModule.findMany({ where: { key: { in: moduleKeys } }, select: { id: true, key: true } })
    : [];
  const moduleIdByKey = new Map(modules.map((m) => [m.key, m.id]));

  const created = await db.$transaction(async (tx) => {
    const role = await tx.role.create({ data: { companyId, name: input.name } });
    const rows = moduleKeys
      .map((key) => {
        const moduleId = moduleIdByKey.get(key);
        if (!moduleId) return null;
        const a = input.permissions[key];
        return { roleId: role.id, moduleId, canCreate: a.canCreate, canRead: a.canRead, canUpdate: a.canUpdate, canDelete: a.canDelete };
      })
      .filter((r): r is NonNullable<typeof r> => !!r && (r.canCreate || r.canRead || r.canUpdate || r.canDelete));
    if (rows.length) await tx.rolePermission.createMany({ data: rows });
    return role;
  });

  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Role", entityId: created.id, meta: { name: created.name } });
  return created;
}

export async function updateRole(companyId: string, actorId: string, id: string, input: RoleUpdate) {
  const existing = await db.role.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Role not found");
  if (existing.isSystem) throw errors.badRequest("System roles cannot be modified");

  await db.$transaction(async (tx) => {
    if (input.name) await tx.role.update({ where: { id }, data: { name: input.name } });
    if (input.permissions) {
      const moduleKeys = Object.keys(input.permissions);
      const modules = moduleKeys.length
        ? await tx.permissionModule.findMany({ where: { key: { in: moduleKeys } }, select: { id: true, key: true } })
        : [];
      const moduleIdByKey = new Map(modules.map((m) => [m.key, m.id]));
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      const rows = moduleKeys
        .map((key) => {
          const moduleId = moduleIdByKey.get(key);
          if (!moduleId) return null;
          const a = input.permissions![key];
          return { roleId: id, moduleId, canCreate: a.canCreate, canRead: a.canRead, canUpdate: a.canUpdate, canDelete: a.canDelete };
        })
        .filter((r): r is NonNullable<typeof r> => !!r && (r.canCreate || r.canRead || r.canUpdate || r.canDelete));
      if (rows.length) await tx.rolePermission.createMany({ data: rows });
    }
  });

  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Role", entityId: id });
}

export async function deleteRole(companyId: string, actorId: string, id: string) {
  const existing = await db.role.findFirst({ where: { id, companyId, deletedAt: null }, include: { userLinks: true } });
  if (!existing) throw errors.notFound("Role not found");
  if (existing.isSystem) throw errors.badRequest("System roles cannot be deleted");
  if (existing.userLinks.length) throw errors.conflict("Unassign this role from all users before deleting it");

  await db.role.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "Role", entityId: id });
}

/* ──────────────────────────────  Branches  ───────────────────────────────── */

export async function listBranches(companyId: string) {
  return db.branch.findMany({ where: { companyId, deletedAt: null }, orderBy: { name: "asc" } });
}

export async function createBranch(companyId: string, actorId: string, input: BranchCreate) {
  const dup = await db.branch.findFirst({ where: { companyId, name: input.name, deletedAt: null } });
  if (dup) throw errors.conflict(`Branch "${input.name}" already exists`);
  const created = await db.branch.create({ data: { companyId, name: input.name, address: input.address || null } });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Branch", entityId: created.id });
  return created;
}

export async function deleteBranch(companyId: string, actorId: string, id: string) {
  const existing = await db.branch.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Branch not found");
  await db.branch.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "Branch", entityId: id });
}

/* ────────────────────────────────  Banks  ────────────────────────────────── */

export async function listBanks(companyId: string) {
  return db.bank.findMany({ where: { companyId, deletedAt: null }, orderBy: { name: "asc" } });
}

export async function createBank(companyId: string, actorId: string, input: BankCreate) {
  const dup = await db.bank.findFirst({ where: { companyId, name: input.name, deletedAt: null } });
  if (dup) throw errors.conflict(`Bank "${input.name}" already exists`);
  const created = await db.bank.create({ data: { companyId, name: input.name } });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "Bank", entityId: created.id });
  return created;
}

export async function updateBank(companyId: string, actorId: string, id: string, input: BankUpdate) {
  const existing = await db.bank.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Bank not found");
  const updated = await db.bank.update({ where: { id }, data: { name: input.name, isActive: input.isActive } });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "Bank", entityId: id });
  return updated;
}

export async function deleteBank(companyId: string, actorId: string, id: string) {
  const existing = await db.bank.findFirst({ where: { id, companyId, deletedAt: null }, include: { accounts: true } });
  if (!existing) throw errors.notFound("Bank not found");
  if (existing.accounts.some((a) => !a.deletedAt)) throw errors.conflict("Remove this bank's accounts before deleting it");
  await db.bank.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "Bank", entityId: id });
}

/* ─────────────────────────────  Bank accounts  ──────────────────────────── */

export async function listBankAccounts(companyId: string) {
  const rows = await db.bankAccount.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { accountName: "asc" }],
    include: { bank: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id, bankId: r.bankId, bankName: r.bank.name, accountName: r.accountName,
    accountNumber: r.accountNumber, branch: r.branch, swiftCode: r.swiftCode,
    ledgerId: r.ledgerId, isDefault: r.isDefault, isActive: r.isActive,
  }));
}

export async function createBankAccount(companyId: string, actorId: string, input: BankAccountCreate) {
  const bank = await db.bank.findFirst({ where: { id: input.bankId, companyId, deletedAt: null } });
  if (!bank) throw errors.badRequest("Select a valid bank");

  const created = await db.$transaction(async (tx) => {
    if (input.isDefault) await tx.bankAccount.updateMany({ where: { companyId }, data: { isDefault: false } });
    return tx.bankAccount.create({
      data: {
        companyId, bankId: input.bankId, accountName: input.accountName, accountNumber: input.accountNumber,
        branch: input.branch || null, swiftCode: input.swiftCode || null, ledgerId: input.ledgerId || null,
        isDefault: input.isDefault ?? false,
      },
    });
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "BankAccount", entityId: created.id });
  return created;
}

export async function updateBankAccount(companyId: string, actorId: string, id: string, input: BankAccountUpdate) {
  const existing = await db.bankAccount.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Bank account not found");

  await db.$transaction(async (tx) => {
    if (input.isDefault) await tx.bankAccount.updateMany({ where: { companyId }, data: { isDefault: false } });
    await tx.bankAccount.update({
      where: { id },
      data: {
        bankId: input.bankId, accountName: input.accountName, accountNumber: input.accountNumber,
        branch: input.branch === undefined ? undefined : input.branch || null,
        swiftCode: input.swiftCode === undefined ? undefined : input.swiftCode || null,
        ledgerId: input.ledgerId === undefined ? undefined : input.ledgerId || null,
        isDefault: input.isDefault, isActive: (input as { isActive?: boolean }).isActive,
      },
    });
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "BankAccount", entityId: id });
}

export async function deleteBankAccount(companyId: string, actorId: string, id: string) {
  const existing = await db.bankAccount.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Bank account not found");
  await db.bankAccount.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "BankAccount", entityId: id });
}

/* ─────────────────────────────  Custom fields  ──────────────────────────── */

export async function listCustomFields(companyId: string) {
  return db.customField.findMany({ where: { companyId, deletedAt: null }, orderBy: [{ module: "asc" }, { order: "asc" }] });
}

export async function createCustomField(companyId: string, actorId: string, input: CustomFieldCreate) {
  const count = await db.customField.count({ where: { companyId, module: input.module, deletedAt: null } });
  const created = await db.customField.create({
    data: {
      companyId, module: input.module, label: input.label, fieldType: input.fieldType,
      options: input.options ?? undefined, required: input.required ?? false, order: count,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "CustomField", entityId: created.id });
  return created;
}

export async function updateCustomField(companyId: string, actorId: string, id: string, input: CustomFieldUpdate) {
  const existing = await db.customField.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Custom field not found");
  await db.customField.update({
    where: { id },
    data: {
      module: input.module, label: input.label, fieldType: input.fieldType,
      options: input.options ?? undefined, required: input.required, isActive: input.isActive,
    },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "CustomField", entityId: id });
}

export async function deleteCustomField(companyId: string, actorId: string, id: string) {
  const existing = await db.customField.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Custom field not found");
  await db.customField.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "CustomField", entityId: id });
}

/* ─────────────────────────────  Custom status  ──────────────────────────── */

export async function listCustomStatuses(companyId: string) {
  return db.customStatus.findMany({ where: { companyId, deletedAt: null }, orderBy: [{ module: "asc" }, { order: "asc" }] });
}

export async function createCustomStatus(companyId: string, actorId: string, input: CustomStatusCreate) {
  const count = await db.customStatus.count({ where: { companyId, module: input.module, deletedAt: null } });
  const created = await db.customStatus.create({
    data: { companyId, module: input.module, label: input.label, color: input.color ?? "#64748b", order: count },
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "CustomStatus", entityId: created.id });
  return created;
}

export async function updateCustomStatus(companyId: string, actorId: string, id: string, input: CustomStatusUpdate) {
  const existing = await db.customStatus.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Custom status not found");
  await db.customStatus.update({
    where: { id },
    data: { module: input.module, label: input.label, color: input.color, isActive: input.isActive },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "CustomStatus", entityId: id });
}

export async function deleteCustomStatus(companyId: string, actorId: string, id: string) {
  const existing = await db.customStatus.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Custom status not found");
  await db.customStatus.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "CustomStatus", entityId: id });
}

/* ─────────────────────────────────  Barcode  ─────────────────────────────── */

export async function getBarcodeSetting(companyId: string) {
  const row = await db.barcodeSetting.findUnique({ where: { companyId } });
  return (
    row ?? {
      companyId, symbology: "CODE128", prefix: null, nextNumber: 1,
      labelWidthMm: 40, labelHeightMm: 25, showPrice: true, showName: true,
    }
  );
}

export async function upsertBarcodeSetting(companyId: string, actorId: string, input: BarcodeSettingUpdate) {
  const data = {
    symbology: input.symbology, prefix: input.prefix || null, nextNumber: input.nextNumber,
    labelWidthMm: input.labelWidthMm, labelHeightMm: input.labelHeightMm,
    showPrice: input.showPrice, showName: input.showName,
  };
  const saved = await db.barcodeSetting.upsert({ where: { companyId }, create: { companyId, ...data }, update: data });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "BarcodeSetting", entityId: saved.id });
  return saved;
}

/* ─────────────────────────────  Invoice setting  ────────────────────────── */

export async function getInvoiceSetting(companyId: string) {
  const row = await db.invoiceSetting.findUnique({ where: { companyId } });
  return (
    row ?? {
      companyId, showHsCode: true, showDiscountColumn: true, showBankDetails: true,
      showQrCode: true, template: "CLASSIC", receiptTemplate: "CLASSIC",
      defaultTermsText: null, defaultNotes: null,
    }
  );
}

export async function upsertInvoiceSetting(companyId: string, actorId: string, input: InvoiceSettingUpdate) {
  const data = {
    showHsCode: input.showHsCode, showDiscountColumn: input.showDiscountColumn,
    showBankDetails: input.showBankDetails, showQrCode: input.showQrCode,
    defaultTermsText: input.defaultTermsText || null, defaultNotes: input.defaultNotes || null,
  };
  const saved = await db.invoiceSetting.upsert({ where: { companyId }, create: { companyId, ...data }, update: data });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "InvoiceSetting", entityId: saved.id });
  return saved;
}

/** Settings › Printing Templates — a single active template selection, shared
 * by Sales and Purchase Invoice print pages (src/components/invoice-templates). */
export async function updatePrintingTemplate(companyId: string, actorId: string, input: PrintingTemplateUpdate) {
  const saved = await db.invoiceSetting.upsert({
    where: { companyId },
    create: { companyId, template: input.template },
    update: { template: input.template },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "InvoiceSetting", entityId: saved.id, meta: { template: input.template } });
  return saved;
}

/** Settings › Printing Templates (Receipt tab) — a single active template
 * selection for the Receipt print page (src/components/receipt-templates). */
export async function updateReceiptTemplate(companyId: string, actorId: string, input: ReceiptTemplateUpdate) {
  const saved = await db.invoiceSetting.upsert({
    where: { companyId },
    create: { companyId, receiptTemplate: input.receiptTemplate },
    update: { receiptTemplate: input.receiptTemplate },
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "InvoiceSetting", entityId: saved.id, meta: { receiptTemplate: input.receiptTemplate } });
  return saved;
}

/* ─────────────────────────  Invoice import template  ────────────────────── */

export async function listInvoiceImportTemplates(companyId: string) {
  return db.invoiceImportTemplate.findMany({ where: { companyId, deletedAt: null }, orderBy: { name: "asc" } });
}

export async function createInvoiceImportTemplate(companyId: string, actorId: string, input: InvoiceImportTemplateCreate) {
  const created = await db.$transaction(async (tx) => {
    if (input.isDefault) await tx.invoiceImportTemplate.updateMany({ where: { companyId }, data: { isDefault: false } });
    return tx.invoiceImportTemplate.create({
      data: { companyId, name: input.name, columnMap: input.columnMap, isDefault: input.isDefault ?? false },
    });
  });
  await writeAudit({ userId: actorId, companyId, action: "CREATE", entity: "InvoiceImportTemplate", entityId: created.id });
  return created;
}

export async function updateInvoiceImportTemplate(companyId: string, actorId: string, id: string, input: InvoiceImportTemplateUpdate) {
  const existing = await db.invoiceImportTemplate.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Template not found");
  await db.$transaction(async (tx) => {
    if (input.isDefault) await tx.invoiceImportTemplate.updateMany({ where: { companyId }, data: { isDefault: false } });
    await tx.invoiceImportTemplate.update({
      where: { id },
      data: { name: input.name, columnMap: input.columnMap, isDefault: input.isDefault },
    });
  });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "InvoiceImportTemplate", entityId: id });
}

export async function deleteInvoiceImportTemplate(companyId: string, actorId: string, id: string) {
  const existing = await db.invoiceImportTemplate.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Template not found");
  await db.invoiceImportTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ userId: actorId, companyId, action: "DELETE", entity: "InvoiceImportTemplate", entityId: id });
}

/* ─────────────────────────────────  Bill footer  ─────────────────────────── */

export async function getBillFooter(companyId: string) {
  const row = await db.billFooterSetting.findUnique({
    where: { companyId },
    include: { bankAccount: { include: { bank: { select: { name: true } } } } },
  });
  if (!row) return { companyId, termsAndConditions: null, bankAccountId: null, authorizedSignatory: null, footerNote: null };
  return {
    companyId: row.companyId,
    termsAndConditions: row.termsAndConditions,
    bankAccountId: row.bankAccountId,
    authorizedSignatory: row.authorizedSignatory,
    footerNote: row.footerNote,
  };
}

/** What the invoice detail/print pages actually read — resolved bank account text, ready to print. */
export async function getBillFooterForPrint(companyId: string) {
  const row = await db.billFooterSetting.findUnique({
    where: { companyId },
    include: { bankAccount: { include: { bank: { select: { name: true } } } } },
  });
  if (!row) return null;
  return {
    termsAndConditions: row.termsAndConditions,
    authorizedSignatory: row.authorizedSignatory,
    footerNote: row.footerNote,
    bankAccount: row.bankAccount
      ? {
          bankName: row.bankAccount.bank.name,
          accountName: row.bankAccount.accountName,
          accountNumber: row.bankAccount.accountNumber,
          branch: row.bankAccount.branch,
        }
      : null,
  };
}

export async function upsertBillFooter(companyId: string, actorId: string, input: BillFooterUpdate) {
  if (input.bankAccountId) {
    const acc = await db.bankAccount.findFirst({ where: { id: input.bankAccountId, companyId, deletedAt: null } });
    if (!acc) throw errors.badRequest("Select a valid bank account");
  }
  const data = {
    termsAndConditions: input.termsAndConditions || null,
    bankAccountId: input.bankAccountId || null,
    authorizedSignatory: input.authorizedSignatory || null,
    footerNote: input.footerNote || null,
  };
  const saved = await db.billFooterSetting.upsert({ where: { companyId }, create: { companyId, ...data }, update: data });
  await writeAudit({ userId: actorId, companyId, action: "UPDATE", entity: "BillFooterSetting", entityId: saved.id });
  return saved;
}

/* ─────────────────────────────────  Backup  ──────────────────────────────── */

/** On-demand full data export — every company-scoped table, as one JSON document. */
export async function exportCompanyBackup(companyId: string) {
  const [
    companyInfo, fiscalYears, taxRates, accountHeads, accountGroups, ledgers, vouchers,
    productCategories, units, warehouses, products, salesDocs, receipts, purchaseDocs,
    supplierPayments, fixedAssets, billOfMaterials, productionOrders, contacts,
  ] = await Promise.all([
    db.companyInfo.findUnique({ where: { companyId } }),
    db.fiscalYear.findMany({ where: { companyId } }),
    db.taxRate.findMany({ where: { companyId } }),
    db.accountHead.findMany({ where: { companyId } }),
    db.accountGroup.findMany({ where: { companyId } }),
    db.ledger.findMany({ where: { companyId } }),
    db.voucher.findMany({ where: { companyId }, include: { lines: true } }),
    db.productCategory.findMany({ where: { companyId } }),
    db.unit.findMany({ where: { companyId } }),
    db.warehouse.findMany({ where: { companyId } }),
    db.product.findMany({ where: { companyId } }),
    db.salesDoc.findMany({ where: { companyId }, include: { items: true } }),
    db.receipt.findMany({ where: { companyId } }),
    db.purchaseDoc.findMany({ where: { companyId }, include: { items: true } }),
    db.supplierPayment.findMany({ where: { companyId } }),
    db.fixedAsset.findMany({ where: { companyId } }),
    db.billOfMaterial.findMany({ where: { companyId }, include: { components: true } }),
    db.productionOrder.findMany({ where: { companyId } }),
    db.ledger.findMany({ where: { companyId, contactKind: { not: null } } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    companyId,
    companyInfo, fiscalYears, taxRates, accountHeads, accountGroups, ledgers, vouchers,
    productCategories, units, warehouses, products, salesDocs, receipts, purchaseDocs,
    supplierPayments, fixedAssets, billOfMaterials, productionOrders, contacts,
  };
}
