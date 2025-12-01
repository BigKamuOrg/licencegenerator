const express = require("express");
const pool = require("../../config/db.cjs");
const { authRequired } = require("../../middleware/auth.cjs");
const { sendLicenseEmail } = require("../../config/email.cjs");

const router = express.Router();

// GET /api/licenses?status=DRAFT
router.get("/", authRequired, async (req, res) => {
  const { status } = req.query;
  const params = [];
  let query = "SELECT * FROM licenses";

  if (status) {
    query += " WHERE status = $1";
    params.push(status);
  }

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/licenses - yeni taslak lisans
router.post("/", authRequired, async (req, res) => {
  const {
    license_type,
    company_name,
    company_id,
    customer_email,
    expiry_date,
    max_users,
    max_assets,
    environment,
    support_level,
    data_center,
    license_key_prefix
  } = req.body;

  const created_by = req.user.email;

  const query = `
    INSERT INTO licenses (
      license_type, company_name, company_id, customer_email, expiry_date,
      max_users, max_assets, environment, support_level,
      data_center, license_key_prefix, created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [
      license_type,
      company_name,
      company_id,
      customer_email,
      expiry_date,
      max_users,
      max_assets,
      environment,
      support_level,
      data_center,
      license_key_prefix,
      created_by
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/licenses/bulk - Excel'den gelen çoklu lisans ekleme
router.post("/bulk", authRequired, async (req, res) => {
  const items = req.body?.licenses;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "licenses array is required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inserted = [];

    for (const item of items) {
      const {
        license_type,
        company_name,
        company_id,
        customer_email,
        expiry_date,
        max_users,
        max_assets = 1000,
        environment = "PRODUCTION",
        support_level = "STANDARD",
        data_center = "EU",
        license_key_prefix
      } = item;

      if (
        !license_type ||
        !company_name ||
        !company_id ||
        !expiry_date ||
        !max_users ||
        !license_key_prefix
      ) {
        throw new Error("Missing required fields in one of the licenses");
      }

      const created_by = req.user.email;

      const insertQuery = `
        INSERT INTO licenses (
          license_type, company_name, company_id, customer_email, expiry_date,
          max_users, max_assets, environment, support_level,
          data_center, license_key_prefix, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *;
      `;

      const { rows } = await client.query(insertQuery, [
        license_type,
        company_name,
        company_id,
        customer_email || null,
        expiry_date,
        max_users,
        max_assets,
        environment,
        support_level,
        data_center,
        license_key_prefix,
        created_by
      ]);

      inserted.push(rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      count: inserted.length,
      licenses: inserted
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Bulk insert failed" });
  } finally {
    client.release();
  }
});

// PUT /api/licenses/:id - lisans güncelle
router.put("/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const {
    license_type,
    company_name,
    company_id,
    customer_email,
    expiry_date,
    max_users,
    max_assets,
    environment,
    support_level,
    data_center,
    license_key_prefix,
    status
  } = req.body;

  const query = `
    UPDATE licenses
    SET
      license_type = $1,
      company_name = $2,
      company_id = $3,
      customer_email = $4,
      expiry_date = $5,
      max_users = $6,
      max_assets = $7,
      environment = $8,
      support_level = $9,
      data_center = $10,
      license_key_prefix = $11,
      status = COALESCE($12, status)
    WHERE id = $13
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [
      license_type,
      company_name,
      company_id,
      customer_email,
      expiry_date,
      max_users,
      max_assets,
      environment,
      support_level,
      data_center,
      license_key_prefix,
      status,
      id
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "License not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/licenses/:id - lisans sil
router.delete("/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM licenses WHERE id = $1",
      [id]
    );
    if (!rowCount) {
      return res.status(404).json({ message: "License not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/licenses/:id/send-email - lisans detaylarını müşteriye mail at
router.post("/:id/send-email", authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM licenses WHERE id = $1",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "License not found" });
    }
    const lic = rows[0];

    if (lic.status !== "SIGNED") {
      return res
        .status(400)
        .json({ message: "Only SIGNED licenses can have emails sent" });
    }

    const email = lic.customer_email?.trim();
    if (!email || email === "-") {
      return res
        .status(400)
        .json({ message: "customer_email is not set for this license" });
    }

    const subject = `Lisans Bilgileriniz - ${lic.company_name}`;
    const text = `Merhaba,

Şirketiniz için oluşturulan lisans detayları aşağıdadır:

Şirket Adı : ${lic.company_name}
Şirket ID  : ${lic.company_id}
Lisans Tipi: ${lic.license_type}
Maks. Kullanıcı: ${lic.max_users}
Bitiş Tarihi: ${lic.expiry_date}
Durum       : ${lic.status}

Anahtar Ön Eki: ${lic.license_key_prefix}

İyi çalışmalar.
`;

    await sendLicenseEmail(email, subject, text);

    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Send email error:", err);
    if (err.code === "SMTP_NOT_CONFIGURED") {
      return res.status(503).json({ 
        message: "Email service not configured. Please contact administrator.",
        error: err.message 
      });
    }
    res.status(500).json({ 
      message: "Failed to send email",
      error: err.message || "Server error" 
    });
  }
});

// GET /api/licenses/stats - dashboard için özet istatistikler
router.get("/stats/summary", authRequired, async (req, res) => {
  try {
    const [
      { rows: totalRows },
      { rows: activeRows },
      { rows: expiringRows },
      { rows: customerRows },
      { rows: byStatusRows },
      { rows: createdPerMonthRows },
      { rows: expiringPerMonthRows }
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM licenses"),
      pool.query("SELECT COUNT(*) AS active FROM licenses WHERE status = 'SIGNED'"),
      pool.query(
        `SELECT COUNT(*) AS expiring
         FROM licenses
         WHERE expiry_date >= CURRENT_DATE
           AND expiry_date < (CURRENT_DATE + INTERVAL '1 month')`
      ),
      pool.query("SELECT COUNT(DISTINCT company_id) AS customers FROM licenses"),
      pool.query(
        "SELECT status, COUNT(*) AS count FROM licenses GROUP BY status ORDER BY status"
      ),
      // Son 12 ay için oluşturulan lisanslar
      pool.query(
        `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                COUNT(*) AS count
         FROM licenses
         WHERE created_at >= (date_trunc('month', CURRENT_DATE) - INTERVAL '11 months')
         GROUP BY month
         ORDER BY month`
      ),
      // Son 12 ay için bitecek lisanslar
      pool.query(
        `SELECT to_char(date_trunc('month', expiry_date), 'YYYY-MM') AS month,
                COUNT(*) AS count
         FROM licenses
         WHERE expiry_date >= date_trunc('month', CURRENT_DATE)
           AND expiry_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '12 months')
         GROUP BY month
         ORDER BY month`
      )
    ]);

    res.json({
      total: Number(totalRows[0].total),
      active: Number(activeRows[0].active),
      expiring: Number(expiringRows[0].expiring),
      customers: Number(customerRows[0].customers),
      byStatus: byStatusRows.map((r) => ({
        status: r.status,
        count: Number(r.count)
      })),
      createdPerMonth: createdPerMonthRows.map((r) => ({
        month: r.month,
        count: Number(r.count)
      })),
      expiringPerMonth: expiringPerMonthRows.map((r) => ({
        month: r.month,
        count: Number(r.count)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

