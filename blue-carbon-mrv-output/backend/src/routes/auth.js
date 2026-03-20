// backend/src/routes/auth.js
const router  = require("express").Router();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const db      = require("../utils/db");

const JWT_SECRET = process.env.JWT_SECRET || "blue_carbon_dev_secret";
const ADMIN_KEY  = process.env.ADMIN_KEY  || "NCCR2024ADMIN";

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, organisation, adminKey } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email, password required" });

    // Admin/verifier registration requires the admin key
    const adminRoles = ["admin", "verifier"];
    if (adminRoles.includes(role) && adminKey !== ADMIN_KEY)
      return res.status(403).json({ error: "Invalid admin key" });

    const allowedRoles = ["admin", "verifier", "ngo_worker", "community"];
    const userRole = allowedRoles.includes(role) ? role : "ngo_worker";

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role, organisation)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, uuid, name, email, role, organisation, wallet_address, created_at`,
      [name, email, hash, userRole, organisation]
    );

    const user  = rows[0];
    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, email: user.email, role: user.role },
      JWT_SECRET, { expiresIn: "7d" }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, email: user.email, role: user.role },
      JWT_SECRET, { expiresIn: "7d" }
    );
    res.json({
      token,
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        organisation: user.organisation,
        wallet:       user.wallet_address,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", require("../middleware/auth").authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, uuid, name, email, role, organisation, wallet_address, created_at FROM users WHERE id=$1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
