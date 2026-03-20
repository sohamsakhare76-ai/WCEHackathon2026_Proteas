// backend/src/routes/projects.js
const router = require("express").Router();
const db     = require("../utils/db");
const { calculateCarbon } = require("../utils/carbonCalculator");
const { authenticate, requireRole } = require("../middleware/auth");

// POST /api/projects  — Register new project
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, description, locationText, latitude, longitude,
            areaHectares, ecosystemType, growthYears, notes } = req.body;

    if (!name || !areaHectares || !ecosystemType)
      return res.status(400).json({ error: "name, areaHectares, ecosystemType required" });

    const calc = calculateCarbon(
      parseFloat(areaHectares), ecosystemType, parseInt(growthYears) || 1
    );

    const { rows } = await db.query(
      `INSERT INTO projects
        (owner_id, name, description, location_text, latitude, longitude,
         area_hectares, ecosystem_type, growth_years, carbon_tonnes, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.user.id, name, description, locationText, latitude, longitude,
       areaHectares, ecosystemType.toUpperCase(), growthYears || 1,
       calc.carbonTonnes, notes]
    );

    res.status(201).json({ project: rows[0], carbonCalc: calc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects  — List projects (admin sees all, user sees own)
router.get("/", authenticate, async (req, res) => {
  try {
    const isPrivileged = ["admin", "verifier"].includes(req.user.role);
    const query = isPrivileged
      ? `SELECT p.*, u.name AS owner_name, u.organisation
         FROM projects p JOIN users u ON p.owner_id = u.id
         ORDER BY p.created_at DESC`
      : `SELECT p.*, u.name AS owner_name, u.organisation
         FROM projects p JOIN users u ON p.owner_id = u.id
         WHERE p.owner_id = $1 ORDER BY p.created_at DESC`;

    const { rows } = isPrivileged
      ? await db.query(query)
      : await db.query(query, [req.user.id]);

    res.json({ projects: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.name AS owner_name, u.organisation, u.wallet_address
       FROM projects p JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Project not found" });

    const { rows: images } = await db.query(
      "SELECT * FROM drone_images WHERE project_id=$1 ORDER BY created_at DESC",
      [req.params.id]
    );

    res.json({ project: rows[0], images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/verify  — Admin/Verifier approves or rejects
router.post("/:id/verify", authenticate, requireRole("admin", "verifier"), async (req, res) => {
  try {
    const { action, notes } = req.body;
    if (!["approve", "reject"].includes(action))
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });

    const newStatus = action === "approve" ? "verified" : "rejected";
    const { rows } = await db.query(
      `UPDATE projects
       SET status=$1, verified_by=$2, verified_at=NOW(), notes=COALESCE($3,notes), updated_at=NOW()
       WHERE id=$4 AND status='pending'
       RETURNING *`,
      [newStatus, req.user.id, notes, req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Project not found or already processed" });

    res.json({ project: rows[0], message: `Project ${newStatus}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
