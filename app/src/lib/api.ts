import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// Consistent API envelope: { ok:true, data } | { ok:false, error:{ code, message, details? } }
export type ApiError = { code: string; message: string; details?: unknown };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errors = {
  unauthorized: (m = "Authentication required") => new HttpError(401, "UNAUTHORIZED", m),
  forbidden: (m = "You do not have permission to perform this action") =>
    new HttpError(403, "FORBIDDEN", m),
  notFound: (m = "Resource not found") => new HttpError(404, "NOT_FOUND", m),
  conflict: (m = "Resource already exists") => new HttpError(409, "CONFLICT", m),
  validation: (details: unknown, m = "Validation failed") =>
    new HttpError(422, "VALIDATION", m, details),
  rateLimited: (m = "Too many attempts. Try again later.") =>
    new HttpError(429, "RATE_LIMITED", m),
  badRequest: (m = "Bad request") => new HttpError(400, "BAD_REQUEST", m),
};

// Wrap a route handler so thrown HttpError / ZodError become clean envelopes and
// unexpected errors never leak a stack trace to the client.
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse> | NextResponse,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.code, e.message, e.details);
      if (e instanceof ZodError)
        return fail(422, "VALIDATION", "Validation failed", e.flatten());
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // Friendlier than a bare 500 for the common cases, but never echo
        // Prisma's own message/meta — it can name internal column/table
        // identifiers that have no business being in a client response.
        console.error("[api] prisma error:", e.code, e.message);
        if (e.code === "P2002") return fail(409, "CONFLICT", "A record with this value already exists");
        if (e.code === "P2025") return fail(404, "NOT_FOUND", "Resource not found");
        if (e.code === "P2003") return fail(409, "CONFLICT", "This action conflicts with a related record");
        return fail(500, "INTERNAL", "Something went wrong");
      }
      console.error("[api] unhandled error:", e);
      return fail(500, "INTERNAL", "Something went wrong");
    }
  };
}
