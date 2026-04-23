import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Global game state (stored in memory for this instance)
  let globalEvent = {
    multiplier: 1,
    announcement: "",
    type: "none", // e.g., 'none', 'salmon_rain'
    active: false,
    endTime: 0
  };

  // API Routes
  app.get("/api/global-event", (req, res) => {
    // If event has expired, reset it
    if (globalEvent.active && Date.now() > globalEvent.endTime) {
      globalEvent = { multiplier: 1, announcement: "", type: "none", active: false, endTime: 0 };
    }
    res.json(globalEvent);
  });

  app.post("/api/admin/trigger-event", (req, res) => {
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

  app.post("/api/admin/clear-event", (req, res) => {
    const { password } = req.body;
    if (password !== "salmon67") return res.status(403).json({ error: "Invalid password" });

    globalEvent = { multiplier: 1, announcement: "", type: "none", active: false, endTime: 0 };
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
