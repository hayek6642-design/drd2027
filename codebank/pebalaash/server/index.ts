import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// ── Auto-migration: ensure balloon_points column & balloon_logs table exist ─
async function runMigrations() {
  const client = await pool.connect();
  try {
    log("Running schema migrations...", "db");
    await client.query(`
      ALTER TABLE wallets
        ADD COLUMN IF NOT EXISTS balloon_points BIGINT NOT NULL DEFAULT 0;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS balloon_logs (
        id         SERIAL PRIMARY KEY,
        user_id    UUID    NOT NULL,
        amount     INTEGER NOT NULL,
        option_key TEXT,
        new_total  BIGINT  NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_balloon_logs_user    ON balloon_logs(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_balloon_logs_created ON balloon_logs(created_at DESC);
    `);
    log("Migrations complete ✓", "db");
  } catch (err: any) {
    log(`Migration error: ${err.message}`, "db");
  } finally {
    client.release();
  }
}

(async () => {
  // Run migrations before starting routes
  await runMigrations();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => { log(`serving on port ${port}`); },
  );
})();
