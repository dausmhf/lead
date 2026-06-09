import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import type { CookieOptions, NextFunction, Request, Response, Router } from "express";
import { z } from "zod";

const sessionCookie = "crm_session";
const csrfCookie = "crm_csrf";
const sessionTtlMs = 1000 * 60 * 60 * 8;
const adminEmail = process.env.ADMIN_EMAIL ?? "dausmhf@gmail.com";
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
  ?? "scrypt$16384$8$1$Sjv5iswjoDjik-vK6p6yFw$NNh-yXS1TQ8hO8w6d_oSSqZ8rVIovBCELJmWKfijXm_pYWZzO9m5duyx7TXgEQ4wSCu0-an4WSHM9mdq8eCFVg";

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1).max(256)
});

interface SessionPayload {
  sub: string;
  email: string;
  role: "admin";
  sid: string;
  csrf: string;
  exp: number;
}

const loginAttempts = new Map<string, { count: number; lockedUntil: number; firstAttemptAt: number }>();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET wajib diisi minimal 32 karakter untuk production.");
  }
  return "dev-only-change-this-session-secret-minimum-32-chars";
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const chunk of header.split(";")) {
    const [rawName, ...rawValue] = chunk.trim().split("=");
    if (!rawName || rawValue.length === 0) continue;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  }
  return cookies;
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function encodeSession(payload: SessionPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (signatureBytes.length !== expectedBytes.length || !timingSafeEqual(signatureBytes, expectedBytes)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, nRaw, rRaw, pRaw, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !nRaw || !rRaw || !pRaw || !salt || !hash) return false;

  const derived = scryptSync(password, salt, 64, {
    N: Number(nRaw),
    r: Number(rRaw),
    p: Number(pRaw)
  });
  const expected = Buffer.from(hash, "base64url");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function attemptKey(req: Request, email: string): string {
  return `${req.ip ?? "unknown"}:${email}`;
}

function isLocked(key: string): boolean {
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (attempt.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return false;
  }
  return true;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  const next = !attempt || now - attempt.firstAttemptAt > 1000 * 60 * 15
    ? { count: 1, firstAttemptAt: now, lockedUntil: 0 }
    : { ...attempt, count: attempt.count + 1 };

  if (next.count >= 5) {
    next.lockedUntil = now + 1000 * 60 * 15;
  }
  loginAttempts.set(key, next);
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

function cookieOptions(httpOnly: boolean, maxAgeMs: number): CookieOptions {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeMs
  };
}

export function currentSession(req: Request): SessionPayload | null {
  const session = verifySession(parseCookies(req.headers.cookie)[sessionCookie]);
  if (!session) return null;
  if (session.email.toLowerCase() !== adminEmail.toLowerCase()) return null;
  return session;
}

export function registerAuthRoutes(router: Router): void {
  router.post("/auth/login", async (req, res) => {
    const parsed = loginSchema.parse(req.body);
    const key = attemptKey(req, parsed.email);

    if (isLocked(key)) {
      return res.status(429).json({ error: "Terlalu banyak percobaan login. Coba lagi nanti." });
    }

    const validEmail = parsed.email === adminEmail.toLowerCase();
    const validPassword = verifyPassword(parsed.password, adminPasswordHash);
    if (!validEmail || !validPassword) {
      recordFailedAttempt(key);
      await new Promise((resolve) => setTimeout(resolve, 350));
      return res.status(401).json({ error: "Email atau password salah." });
    }

    clearAttempts(key);
    const csrf = randomBytes(32).toString("base64url");
    const payload: SessionPayload = {
      sub: "admin",
      email: adminEmail,
      role: "admin",
      sid: randomBytes(24).toString("base64url"),
      csrf,
      exp: Date.now() + sessionTtlMs
    };

    res.cookie(sessionCookie, encodeSession(payload), cookieOptions(true, sessionTtlMs));
    res.cookie(csrfCookie, csrf, cookieOptions(false, sessionTtlMs));
    return res.json({ user: { email: payload.email, role: payload.role }, csrfToken: csrf });
  });

  router.get("/auth/me", (req, res) => {
    const session = currentSession(req);
    if (!session) return res.status(401).json({ authenticated: false });
    res.cookie(csrfCookie, session.csrf, cookieOptions(false, Math.max(0, session.exp - Date.now())));
    return res.json({
      authenticated: true,
      user: { email: session.email, role: session.role },
      csrfToken: session.csrf
    });
  });

  router.post("/auth/logout", (req, res) => {
    res.clearCookie(sessionCookie, { path: "/" });
    res.clearCookie(csrfCookie, { path: "/" });
    return res.json({ ok: true });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/health") return next();

  const session = currentSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const csrfHeader = req.get("x-csrf-token");
    if (!csrfHeader || csrfHeader !== session.csrf) {
      res.status(403).json({ error: "CSRF token invalid" });
      return;
    }
  }

  next();
}
