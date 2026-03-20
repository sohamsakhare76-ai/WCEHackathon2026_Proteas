// backend/src/routes/credits.js
const router = require("express").Router();
const db     = require("../utils/db");
const { authenticate, requireRole } = require("../middleware/auth");

// GET /api/credits  — All minted carbon credits
router.get("/", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cc.*, p.name AS project_name, p.ecosystem_type, p.area_hectares,
              u.name AS owner_name, u.organisation
       FROM carbon_credits cc
       JOIN projects p ON cc.project_id = p.id
       JOIN users u ON cc.owner_id = u.id
       ORDER BY cc.minted_at DESC`
    );
    const total = rows.reduce((sum, r) => sum + parseFloat(r.amount_tonnes || 0), 0);
    res.json({ credits: rows, totalTonnesCO2: Math.round(total * 100) / 100 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/credits/mint  — Admin mints credits after blockchain tx
router.post("/mint", authenticate, requireRole("admin", "verifier"), async (req, res) => {
  try {
    const { projectId, txHash } = req.body;

    const { rows: proj } = await db.query(
      "SELECT * FROM projects WHERE id=$1 AND status='verified'",
      [projectId]
    );
    if (!proj.length)
      return res.status(404).json({ error: "Verified project not found" });
    const p = proj[0];

    const { rows } = await db.query(
      `INSERT INTO carbon_credits (project_id, owner_id, amount_tonnes, tx_hash)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (project_id) DO UPDATE SET tx_hash=$4
       RETURNING *`,
      [p.id, p.owner_id, p.carbon_tonnes, txHash]
    );

    await db.query(
      "UPDATE projects SET status='minted', tx_hash=$1, updated_at=NOW() WHERE id=$2",
      [txHash, p.id]
    );

    // Update user BCT balance
    await db.query(
      "UPDATE users SET bct_balance = bct_balance + $1 WHERE id = $2",
      [p.carbon_tonnes, p.owner_id]
    );

    res.status(201).json({ credit: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/credits/stats
router.get("/stats", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM projects)                         AS total_projects,
        (SELECT COUNT(*) FROM projects WHERE status='pending')  AS pending,
        (SELECT COUNT(*) FROM projects WHERE status='verified') AS verified,
        (SELECT COUNT(*) FROM projects WHERE status='minted')   AS minted,
        (SELECT COALESCE(SUM(amount_tonnes),0) FROM carbon_credits) AS total_credits_tonnes,
        (SELECT COUNT(*) FROM users)                            AS total_users,
        (SELECT COUNT(*) FROM drone_images WHERE status='pending_review') AS pending_uploads
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
