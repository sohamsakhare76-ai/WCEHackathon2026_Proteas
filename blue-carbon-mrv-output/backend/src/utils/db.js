// backend/src/utils/db.js
const { Pool } = require("pg");

const pool = new Pool({
 connectionString: "postgresql://carbon_db_d6h1_user:3nMaDlNOV8YC6msjT3kxPlAhASXt1afi@dpg-d6uoanf5gffc73ct2t8g-a/carbon_db_d6h1",
  ssl: {
    rejectUnauthorized: false,
  },
}); 

pool.on("connect", () => console.log("✅ PostgreSQL connected"));
pool.on("error",   (err) => console.error("❌ PostgreSQL error:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
