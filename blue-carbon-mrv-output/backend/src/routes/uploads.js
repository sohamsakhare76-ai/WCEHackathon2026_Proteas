// backend/src/routes/uploads.js
const router = require("express").Router();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const db     = require("../utils/db");
const { authenticate } = require("../middleware/auth");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const safe = Date.now() + "-" + file.originalname.replace(/\s/g, "_");
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|tiff|pdf/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// POST /api/upload/drone  — Upload image for a project
router.post("/drone", authenticate, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { projectId, imageType, latitude, longitude, capturedAt } = req.body;

    // In production: pin to IPFS and get real CID
    // const ipfsHash = await pinToIPFS(req.file.path);
    const ipfsHash = `Qm${Math.random().toString(36).slice(2,48)}`; // simulated CID

    const { rows } = await db.query(
      `INSERT INTO drone_images
         (project_id, uploader_id, filename, file_path, ipfs_hash, image_type,
          latitude, longitude, captured_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_review')
       RETURNING *`,
      [projectId, req.user.id, req.file.filename,
       `/uploads/${req.file.filename}`, ipfsHash,
       imageType || "drone", latitude, longitude, capturedAt || new Date()]
    );

    // Update project's latest IPFS hash
    if (projectId) {
      await db.query(
        "UPDATE projects SET ipfs_image_hash=$1, updated_at=NOW() WHERE id=$2",
        [ipfsHash, projectId]
      );
    }

    res.status(201).json({
      image:   rows[0],
      ipfsHash,
      fileUrl: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload/images/:projectId
router.get("/images/:projectId", authenticate, async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM drone_images WHERE project_id=$1 ORDER BY created_at DESC",
    [req.params.projectId]
  );
  res.json({ images: rows });
});

// GET /api/upload/pending  — Admin: all pending review images
router.get("/pending", authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT d.*, p.name AS project_name, u.name AS uploader_name, u.organisation
     FROM drone_images d
     JOIN projects p ON d.project_id = p.id
     JOIN users u ON d.uploader_id = u.id
     WHERE d.status = 'pending_review'
     ORDER BY d.created_at DESC`
  );
  res.json({ images: rows, count: rows.length });
});

// POST /api/upload/:id/review  — Admin: approve or reject an upload
router.post("/:id/review", authenticate, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' | 'reject'
    const status = action === "approve" ? "approved" : "rejected";
    const { rows } = await db.query(
      `UPDATE drone_images SET status=$1, reviewed_by=$2, reviewed_at=NOW()
       WHERE id=$3 RETURNING *`,
      [status, req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Image not found" });

    // If approved, also verify the project
    if (action === "approve") {
      await db.query(
        `UPDATE projects SET status='verified', verified_by=$1, verified_at=NOW()
         WHERE id=$2 AND status='pending'`,
        [req.user.id, rows[0].project_id]
      );
    }
    res.json({ image: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
