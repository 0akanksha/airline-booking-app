import "dotenv/config";
// Patches Express's router so rejected promises in async route handlers are
// forwarded to next(err) automatically — without this, Express 4 lets an
// async handler's rejection become an unhandled rejection, which crashes
// the whole process (Node terminates on unhandled rejection by default).
import "express-async-errors";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import { publicFlightsRouter, adminFlightsRouter } from "./routes/flights.js";
import { publicBookingsRouter, adminBookingsRouter } from "./routes/bookings.js";
import { authRouter } from "./routes/auth.js";
import { checkoutRouter } from "./routes/checkout.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { ensureAdminSeeded } from "./lib/ensureAdmin.js";

const app = express();
app.set("trust proxy", 1);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Mounted before express.json() — Stripe's signature verification needs the
// raw request body, which express.json() would otherwise have consumed.
app.use("/api/webhooks", webhooksRouter);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/flights", publicFlightsRouter);
app.use("/api/admin/flights", requireAuth, requireAdmin, adminFlightsRouter);
app.use("/api/bookings", publicBookingsRouter);
app.use("/api/admin/bookings", requireAuth, requireAdmin, adminBookingsRouter);
app.use("/api/checkout", checkoutRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await ensureAdminSeeded();

  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(import.meta.dirname, "../../dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    // configFile: false + inline plugins (mirroring vite.config.ts) avoids
    // Vite recompiling vite.config.ts into node_modules/.vite-temp on every
    // restart, which otherwise fights tsx watch's file watcher into a loop.
    const [{ createServer: createViteServer }, { default: react }, { default: tailwindcss }] = await Promise.all([
      import("vite"),
      import("@vitejs/plugin-react"),
      import("@tailwindcss/vite"),
    ]);
    const vite = await createViteServer({
      configFile: false,
      root: path.resolve(import.meta.dirname, "../.."),
      plugins: [react(), tailwindcss()],
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start();
