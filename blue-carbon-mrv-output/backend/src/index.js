// backend/src/index.js
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const authRoutes    = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const uploadRoutes  = require("./routes/uploads");
const creditRoutes  = require("./routes/credits");
const userRoutes    = require("./routes/users");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static: uploaded images ──────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Static: serve frontend HTML files ───────────────────
// Admin Dashboard  → http://localhost:3001/admin
// Mobile App       → http://localhost:3001/mobile
const frontendPath = path.join(__dirname, "../../frontend");
app.use("/admin",  express.static(path.join(frontendPath, "admin")));
app.use("/mobile", express.static(path.join(frontendPath, "mobile")));

// ── API Routes ───────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/upload",   uploadRoutes);
app.use("/api/credits",  creditRoutes);
app.use("/api/users",    userRoutes);

// ── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", ts: new Date(), version: "1.0.0" })
);

// ── Root: show links ─────────────────────────────────────
app.get("/", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blue Carbon MRV</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:sans-serif;background:#050d1a;color:#dce8ff;
             display:flex;align-items:center;justify-content:center;height:100vh}
        .wrap{text-align:center}
        h1{font-size:28px;margin-bottom:8px}
        p{color:#5a7aaa;margin-bottom:32px;font-size:14px}
        .links{display:flex;gap:16px;justify-content:center}
        a{display:block;padding:16px 28px;border-radius:12px;font-size:15px;
          font-weight:700;text-decoration:none;transition:.2s}
        .admin{background:linear-gradient(135deg,#f0b429,#fcd34d);color:#000}
        .mobile{background:linear-gradient(135deg,#3b82f6,#22d3ee);color:#fff}
        a:hover{transform:translateY(-2px);opacity:.9}
        .api{margin-top:20px;font-size:12px;color:#3d5a8a}
        .api a{display:inline;padding:0;color:#14b8a6;background:none;font-weight:400;font-size:12px}
      </style>
    </head>
    <body>
      <div class="wrap">
        <div style="font-size:48px;margin-bottom:12px">🌊</div>
        <h1>Blue Carbon MRV Platform</h1>
        <p>National Centre for Coastal Research</p>
        <div class="links">
          <a class="admin" href="/admin">⚙️ Admin Dashboard</a>
          <a class="mobile" href="/mobile">📱 Field Worker App</a>
        </div>
        <div class="api">
          API running at <a href="/health">/health</a> &nbsp;|&nbsp;
          Docs at <a href="/api">/api</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ── 404 for API routes ────────────────────────────────────
app.use("/api", (_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Error Handler ─────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
    const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RENDER_EXTERNAL_HOSTNAME
    ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
    : `http://localhost:${PORT}`);

    console.log(`\n🌊 Blue Carbon MRV Platform running!\n`);
    console.log(`🏠 Home: ${BASE_URL}`);
    console.log(`🛠 Admin Dashboard: ${BASE_URL}/admin`);
    console.log(`📱 Mobile App: ${BASE_URL}/mobile`);
    console.log(`❤️ API Health: ${BASE_URL}/health\n`);
});

module.exports = app;
