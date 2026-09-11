import "server-only";
import os from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Diagnostic snapshot: process/host stats, DB round-trip latency, and a
 * per-module record count so a support person can see "is the app up, is the
 * database reachable, and how much data does each module hold" at a glance.
 */
export async function getSystemInfo(companyId: string) {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    version: string;
    dependencies: Record<string, string>;
  };

  // DB latency: three round-trips of a trivial query, min/avg in ms.
  const pings: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await db.$queryRaw`SELECT 1`;
    pings.push(performance.now() - t0);
  }

  const [dbSizeRow] = await db.$queryRaw<{ size: string }[]>`
    SELECT pg_size_pretty(pg_database_size(current_database())) AS size
  `;
  const [pgVersionRow] = await db.$queryRaw<{ version: string }[]>`SELECT version()`;

  const moduleCounts = await Promise.all([
    countModule("Users", db.user.count()),
    countModule("Roles", db.role.count({ where: { companyId } })),
    countModule("Products", db.product.count({ where: { companyId, deletedAt: null } })),
    countModule("Warehouses", db.warehouse.count({ where: { companyId, deletedAt: null } })),
    countModule("Stock Movements", db.stockMovement.count({ where: { companyId } })),
    countModule("Ledgers (Chart of Accounts)", db.ledger.count({ where: { companyId, deletedAt: null } })),
    countModule("Vouchers (GL entries)", db.voucher.count({ where: { companyId } })),
    countModule("Sales Documents", db.salesDoc.count({ where: { companyId } })),
    countModule("Purchase Documents", db.purchaseDoc.count({ where: { companyId } })),
    countModule("Receipts", db.receipt.count({ where: { companyId } })),
    countModule("Supplier Payments", db.supplierPayment.count({ where: { companyId } })),
    countModule("Audit Log Entries", db.auditLog.count({ where: { companyId } })),
  ]);

  const nets = os.networkInterfaces();
  const addresses = Object.entries(nets)
    .flatMap(([name, ifaces]) => (ifaces ?? []).map((i) => ({ name, address: i.address, family: i.family, internal: i.internal })))
    .filter((a) => !a.internal);

  return {
    app: {
      version: pkg.version,
      nextVersion: pkg.dependencies.next,
      reactVersion: pkg.dependencies.react,
      prismaVersion: pkg.dependencies["@prisma/client"],
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    },
    process: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage(),
    },
    host: {
      hostname: os.hostname(),
      cpuModel: os.cpus()[0]?.model ?? "unknown",
      cpuCount: os.cpus().length,
      totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemMB: Math.round(os.freemem() / 1024 / 1024),
      loadAvg: os.loadavg(),
      uptimeSeconds: Math.round(os.uptime()),
    },
    network: { addresses, port: process.env.PORT ?? "3000" },
    database: {
      pingsMs: pings.map((p) => Math.round(p * 100) / 100),
      avgLatencyMs: Math.round((pings.reduce((a, b) => a + b, 0) / pings.length) * 100) / 100,
      size: dbSizeRow?.size ?? "unknown",
      serverVersion: (pgVersionRow?.version ?? "unknown").split(",")[0],
    },
    modules: moduleCounts,
  };
}

async function countModule(name: string, p: Promise<number>) {
  return { name, count: await p };
}

export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  elapsedMs: number;
};

const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|execute|call|copy|vacuum|merge|into|lock|reindex|comment|security|password)\b/i;

/**
 * Read-only diagnostic SQL console. Defense in depth, in order:
 *  1. Must start with SELECT or WITH, no semicolons (blocks stacked statements).
 *  2. Blocklist of write/DDL/admin keywords as whole words.
 *  3. Wrapped as `SELECT * FROM (<query>) AS _diag LIMIT 200` — this is the
 *     real backstop: only a single SELECT-shaped expression can legally sit
 *     inside a FROM-clause subquery, so anything that slipped past 1-2 still
 *     fails to parse rather than executing.
 *  4. Runs inside a transaction with a short statement_timeout, and the
 *     transaction is always rolled back regardless of outcome.
 */
export async function runDiagnosticQuery(sql: string, actorId: string, companyId: string): Promise<QueryResult> {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!trimmed) throw new Error("Query is empty");
  if (trimmed.includes(";")) throw new Error("Only a single statement is allowed (no semicolons)");
  if (!/^(select|with)\b/i.test(trimmed)) throw new Error("Only SELECT / WITH queries are allowed");
  if (FORBIDDEN_KEYWORDS.test(trimmed)) throw new Error("Query contains a disallowed keyword");

  const wrapped = `SELECT * FROM (${trimmed}) AS _diag LIMIT 200`;
  const t0 = performance.now();

  const { writeAudit } = await import("@/lib/audit");
  await writeAudit({
    userId: actorId, companyId, action: "DB_QUERY", entity: "System",
    meta: { sql: trimmed.slice(0, 500) },
  });

  try {
    const rows = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '3000ms'`);
      await tx.$executeRawUnsafe(`SET TRANSACTION READ ONLY`);
      return tx.$queryRawUnsafe<Record<string, unknown>[]>(wrapped);
    });
    const elapsedMs = Math.round((performance.now() - t0) * 100) / 100;
    const columns = rows.length ? Object.keys(rows[0]) : [];
    return { columns, rows: rows.map(serializeRow), rowCount: rows.length, elapsedMs };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError || e instanceof Error) {
      throw new Error(cleanPgError(e.message));
    }
    throw e;
  }
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "bigint" ? v.toString() : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

function cleanPgError(message: string): string {
  // Strip Prisma's verbose wrapper, keep the actual Postgres error line.
  const match = message.match(/error:\s*(.+)/i);
  return (match?.[1] ?? message).split("\n")[0].trim();
}
