/* Seed script: örnek ADMIN kullanıcı ve roller
 *
 * Çalıştırma:
 *   cd backend
 *   npm run seed:admin
 *
 * Giriş bilgileri:
 *   email: admin@example.com
 *   password: Admin123!
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/config/db.cjs");

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Roller
    const roles = [
      { name: "ADMIN", description: "System administrator" },
      { name: "OPERATOR", description: "License operator" },
      { name: "VIEWER", description: "Read-only user" }
    ];

    for (const r of roles) {
      await client.query(
        `
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING;
      `,
        [r.name, r.description]
      );
    }

    // 2) Basit permission set (isteğe bağlı kullanılır)
    const permissions = [
      { code: "LICENSE_VIEW", description: "View licenses" },
      { code: "LICENSE_EDIT", description: "Create and edit licenses" },
      { code: "USER_MANAGE", description: "Manage users and roles" }
    ];

    for (const p of permissions) {
      await client.query(
        `
        INSERT INTO permissions (code, description)
        VALUES ($1, $2)
        ON CONFLICT (code) DO NOTHING;
      `,
        [p.code, p.description]
      );
    }

    // 3) ADMIN rolüne tüm permission'ları bağla
    const { rows: adminRoleRows } = await client.query(
      "SELECT id FROM roles WHERE name = 'ADMIN';"
    );
    const adminRoleId = adminRoleRows[0]?.id;

    if (adminRoleId) {
      const { rows: permRows } = await client.query(
        "SELECT id FROM permissions;"
      );
      for (const perm of permRows) {
        await client.query(
          `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING;
        `,
          [adminRoleId, perm.id]
        );
      }
    }

    // 4) Örnek admin kullanıcı
    const email = "admin@example.com";
    const plainPassword = "Admin123!";

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const { rows: existing } = await client.query(
      "SELECT id FROM app_users WHERE email = $1",
      [email]
    );

    let userId;

    if (!existing.length) {
      const { rows } = await client.query(
        `
        INSERT INTO app_users (email, password_hash, full_name, base_role)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `,
        [email, passwordHash, "Admin User", "ADMIN"]
      );
      userId = rows[0].id;
      console.log("Yeni admin kullanıcısı oluşturuldu.");
    } else {
      userId = existing[0].id;
      console.log("Admin kullanıcısı zaten mevcut, user_id:", userId);
    }

    // 5) Kullanıcıya ADMIN rolünü bağla
    if (adminRoleId && userId) {
      await client.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      `,
        [userId, adminRoleId]
      );
    }

    await client.query("COMMIT");

    console.log("Seed tamamlandı.");
    console.log("Login için:");
    console.log("  email: admin@example.com");
    console.log("  password: Admin123!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed hatası:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();


