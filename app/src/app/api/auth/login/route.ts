import { z } from "zod";
import { db } from "@/lib/db";
import { ok, errors, handler } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { issueSession } from "@/lib/session";
import { writeAudit, clientIp } from "@/lib/audit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Basic brute-force throttle: max 8 failed attempts / 15 min per email+ip.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

export const POST = handler(async (req: Request) => {
  const { email, password } = Body.parse(await req.json());
  const ip = clientIp(req);
  const emailNorm = email.toLowerCase().trim();

  const recentFails = await db.loginAttempt.count({
    where: {
      email: emailNorm,
      success: false,
      createdAt: { gt: new Date(Date.now() - WINDOW_MS) },
    },
  });
  if (recentFails >= MAX_FAILS) throw errors.rateLimited();

  const user = await db.user.findFirst({
    where: { email: emailNorm, deletedAt: null },
    include: { companyLinks: true },
  });

  const valid = user && (await verifyPassword(password, user.passwordHash));

  if (!user || !valid || user.status !== "ACTIVE") {
    await db.loginAttempt.create({ data: { email: emailNorm, ip, success: false } });
    throw errors.unauthorized("Invalid email or password");
  }

  await db.loginAttempt.create({ data: { email: emailNorm, ip, success: true } });

  const companyId =
    user.companyLinks.find((l) => l.isDefault)?.companyId ??
    user.companyLinks[0]?.companyId ??
    null;

  const { cookies } = await issueSession({
    userId: user.id,
    companyId,
    userType: user.userType,
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({ userId: user.id, companyId, action: "LOGIN", ip });

  const res = ok({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  });
  for (const c of cookies) res.cookies.set(c);
  return res;
});
