import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);

  app.use(express.json());

  // Global Request Logger & No-Cache for API
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    if (!req.url.includes('internal')) {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/ping", (req, res) => res.send("pong"));

  // Global game state
  let globalEvent = {
    multiplier: 1,
    announcement: "",
    type: "none",
    active: false,
    endTime: 0
  };

  const apiRouter = express.Router();

  apiRouter.get("/global-event", (req, res) => {
    if (globalEvent.active && Date.now() > globalEvent.endTime) {
      globalEvent = { multiplier: 1, announcement: "", type: "none", active: false, endTime: 0 };
    }
    res.json(globalEvent);
  });

  apiRouter.get("/events/trigger", (req, res) => {
    res.json({ message: "API Trigger reachable" });
  });

  apiRouter.post("/events/trigger", (req, res) => {
    const { password, multiplier, announcement, type, durationMinutes } = req.body;
    if (password !== "salmon67") {
      return res.status(403).json({ error: "Invalid password" });
    }

    const m = parseFloat(multiplier);
    const d = parseInt(durationMinutes);

    globalEvent = {
      multiplier: isNaN(m) ? 1 : m,
      announcement: announcement || "",
      type: type || "none",
      active: true,
      endTime: Date.now() + (isNaN(d) ? 5 : d) * 60 * 1000
    };
    res.json({ success: true, event: globalEvent });
  });

  apiRouter.post("/events/clear", (req, res) => {
    if (req.body.password !== "salmon67") return res.status(403).json({ error: "Invalid password" });
    globalEvent = { multiplier: 1, announcement: "", type: "none", active: false, endTime: 0 };
    res.json({ success: true });
  });

  // Mount API router FIRST
  app.use("/api", apiRouter);

  // Production Setup - Support automated environments
  const isProd = process.env.NODE_ENV === "production" || process.env.SHARED === "true";
  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    console.log(`PRODUCTION MODE: Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (!req.url.startsWith('/api')) {
        res.sendFile(path.resolve(distPath, 'index.html'));
      } else {
        console.log(`API 404 falling through to catch-all: ${req.url}`);
        res.status(404).json({ error: "API route not found" });
      }
    });
  } else {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully listening on 0.0.0.0:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('SERVER ERROR:', err);
  });
}

startServer();
