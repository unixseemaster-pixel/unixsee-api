/**
 * Dev-only bootstrap: upsert main ADMIN (username/password: admin / admin).
 * Usage from backend/: pnpm exec dotenv -e .env.development -- node scripts/seed-dev-admin.mjs
 */
import bcrypt from 'bcryptjs';
import pg from 'pg';

const USERNAME = 'admin';
const PASSWORD = 'admin';
const PHONE = '+989000000000';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const passwordHash = await bcrypt.hash(PASSWORD, 12);

try {
  const existing = await pool.query(
    `SELECT id, phone_number FROM users
     WHERE username = $1 OR phone_number = $2
     LIMIT 1`,
    [USERNAME, PHONE],
  );

  if (existing.rows[0]) {
    const { id } = existing.rows[0];
    await pool.query(
      `UPDATE users SET
         username = $1,
         password = $2,
         role = 'ADMIN',
         status = 'ACTIVE',
         full_name = COALESCE(full_name, 'Main Admin'),
         phone_number = COALESCE(NULLIF(phone_number, ''), $3),
         suspended_at = NULL,
         suspended_reason = NULL,
         updated_at = NOW()
       WHERE id = $4`,
      [USERNAME, passwordHash, PHONE, id],
    );
    console.log(`Updated ADMIN user ${id} (username=${USERNAME})`);
  } else {
    const created = await pool.query(
      `INSERT INTO users (
         id, phone_number, username, password, full_name, role, status, locale, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, 'Main Admin', 'ADMIN', 'ACTIVE', 'fa', NOW(), NOW()
       )
       RETURNING id`,
      [PHONE, USERNAME, passwordHash],
    );
    console.log(
      `Created ADMIN user ${created.rows[0].id} (username=${USERNAME})`,
    );
  }
} finally {
  await pool.end();
}
