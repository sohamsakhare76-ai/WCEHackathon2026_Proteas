// backend/src/routes/users.js
const router = require("express").Router();
const db     = require("../utils/db");
const { authenticate, requireRole } = require("../middleware/auth");

// GET /api/users  — Admin: list all users
router.get("/", authenticate, requireRole("admin", "verifier"), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, uuid, name, email, role, organisation, wallet_address,
              bct_balance, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/wallet  — Update wallet address
router.put("/:id/wallet", authenticate, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });

    const { walletAddress } = req.body;
    const { rows } = await db.query(
      "UPDATE users SET wallet_address=$1 WHERE id=$2 RETURNING id, wallet_address",
      [walletAddress, req.params.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id/balance  — BCT balance
router.get("/:id/balance", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT bct_balance, wallet_address FROM users WHERE id=$1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
