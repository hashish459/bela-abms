// Minimal env access with fail-fast for required secrets.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? "15m",
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "7"),
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  isProd: (process.env.NODE_ENV ?? "development") === "production",
};
