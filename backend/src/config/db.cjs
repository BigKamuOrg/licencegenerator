const { Pool } = require("pg");

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const pool = new Pool({
  host: DB_HOST || "localhost",
  port: Number(DB_PORT) || 5432,
  user: DB_USER || "postgres",
  password: DB_PASSWORD || "123456",
  database: DB_NAME || "biglicence"
});

module.exports = pool;


