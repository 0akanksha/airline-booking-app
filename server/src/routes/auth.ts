import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../auth/tokens.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

// No public signup route: passenger booking is guest-only (see bookings.ts),
// and admin accounts are seeded from ADMIN_EMAIL/ADMIN_PASSWORD at startup
// (see lib/ensureAdmin.ts) rather than self-registered.
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const [user] = await db.select().from(users).where(eq(users.email, String(email).toLowerCase()));
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
});
