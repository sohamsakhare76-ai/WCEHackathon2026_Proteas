// database/migrate.js
// Run: node database/migrate.js
require("dotenv").config({ path: "./backend/.env" });
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || "blue_carbon_mrv",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "password",
});

async function migrate() {
  try {
    const sqlFile = path.join(__dirname, "migrations", "001_initial_schema.sql");
    const sql = fs.readFileSync(sqlFile, "utf8");
    await pool.query(sql);
    console.log("✅ Database migrated successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
