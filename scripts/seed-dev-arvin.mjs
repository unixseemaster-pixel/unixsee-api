/**
 * Dev-only bootstrap: upsert Arvin test user (+989361599686) with four websites.
 * Usage from backend/: pnpm exec dotenv -e .env.development -- node scripts/seed-dev-arvin.mjs
 */
import pg from 'pg';

const PHONE_INPUT = '09361599686';
const FULL_NAME = 'Arvin';
const DEV_SERVER_NAME = 'dev-local-server';
const DEV_VPS_MACHINE_ID = 'dev-local-machine';
const DEV_VPS_NAME = 'Dev Local VPS';

const WEBSITES = [
  { domain: 'arvin-store.dev.unixsee', displayName: 'Arvin Store' },
  { domain: 'arvin-studio.dev.unixsee', displayName: 'Arvin Studio' },
  { domain: 'arvin-labs.dev.unixsee', displayName: 'Arvin Labs' },
  { domain: 'arvin-blog.dev.unixsee', displayName: 'Arvin Blog' },
];

function toE164IranPhone(input) {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '').replace(/^0/, '');
  if (digits.startsWith('98')) {
    return `+${digits}`;
  }
  return `+98${digits}`;
}

const PHONE_NUMBER = toE164IranPhone(PHONE_INPUT);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function ensureUser(client) {
  const existing = await client.query(
    `SELECT id, full_name FROM users WHERE phone_number = $1 LIMIT 1`,
    [PHONE_NUMBER],
  );

  if (existing.rows[0]) {
    const { id, full_name: fullName } = existing.rows[0];
    if (fullName !== FULL_NAME) {
      await client.query(
        `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2`,
        [FULL_NAME, id],
      );
    }
    console.log(`Using user ${id} (${PHONE_NUMBER})`);
    return id;
  }

  const created = await client.query(
    `INSERT INTO users (
       id, phone_number, full_name, role, status, locale, created_at, updated_at
     ) VALUES (
       gen_random_uuid(), $1, $2, 'USER', 'ACTIVE', 'fa', NOW(), NOW()
     )
     RETURNING id`,
    [PHONE_NUMBER, FULL_NAME],
  );
  const userId = created.rows[0].id;
  console.log(`Created user ${userId} (${PHONE_NUMBER})`);
  return userId;
}

async function ensurePersonalTenant(client, userId) {
  const membership = await client.query(
    `SELECT m.tenant_id
     FROM memberships m
     WHERE m.user_id = $1
     ORDER BY m.created_at ASC
     LIMIT 1`,
    [userId],
  );

  if (membership.rows[0]) {
    const tenantId = membership.rows[0].tenant_id;
    console.log(`Using tenant ${tenantId}`);
    return tenantId;
  }

  const tenant = await client.query(
    `INSERT INTO tenants (id, name, display_name, status, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $1, 'ACTIVE', NOW(), NOW())
     RETURNING id`,
    [FULL_NAME],
  );
  const tenantId = tenant.rows[0].id;

  await client.query(
    `INSERT INTO memberships (id, user_id, tenant_id, role, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW(), NOW())`,
    [userId, tenantId],
  );

  console.log(`Created tenant ${tenantId} with OWNER membership`);
  return tenantId;
}

async function ensureDevVpsNode(client, userId) {
  const serverResult = await client.query(
    `INSERT INTO servers (id, name, ip_address, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, '127.0.0.1', NOW(), NOW())
     ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [DEV_SERVER_NAME],
  );
  const serverId = serverResult.rows[0].id;

  const vpsResult = await client.query(
    `INSERT INTO vps_nodes (
       id, server_id, user_id, machine_id, name, secret_key, status,
       created_at, updated_at
     ) VALUES (
       gen_random_uuid(), $1, $2, $3, $4, 'dev-seed-secret', 'ONLINE', NOW(), NOW()
     )
     ON CONFLICT (machine_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       server_id = EXCLUDED.server_id,
       name = EXCLUDED.name,
       status = 'ONLINE',
       updated_at = NOW()
     RETURNING id`,
    [serverId, userId, DEV_VPS_MACHINE_ID, DEV_VPS_NAME],
  );

  const vpsNodeId = vpsResult.rows[0].id;
  console.log(`Using VPS node ${vpsNodeId} on server ${serverId}`);
  return vpsNodeId;
}

async function upsertWebsites(client, { userId, tenantId, vpsNodeId }) {
  for (const site of WEBSITES) {
    const result = await client.query(
      `INSERT INTO websites (
         id, user_id, tenant_id, vps_node_id, domain, display_name,
         is_active, status, last_is_up, last_status_code, last_response_time_ms, last_probe_at,
         created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5,
         true, 'ACTIVE', true, 200, 120, NOW(),
         NOW(), NOW()
       )
       ON CONFLICT (domain) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         tenant_id = EXCLUDED.tenant_id,
         vps_node_id = EXCLUDED.vps_node_id,
         display_name = EXCLUDED.display_name,
         is_active = true,
         status = 'ACTIVE',
         last_is_up = true,
         last_status_code = 200,
         last_response_time_ms = 120,
         last_probe_at = NOW(),
         updated_at = NOW()
       RETURNING id, domain`,
      [userId, tenantId, vpsNodeId, site.domain, site.displayName],
    );
    console.log(`Upserted website ${result.rows[0].domain} (${result.rows[0].id})`);
  }
}

const client = await pool.connect();

try {
  await client.query('BEGIN');
  const userId = await ensureUser(client);
  const tenantId = await ensurePersonalTenant(client, userId);
  const vpsNodeId = await ensureDevVpsNode(client, userId);
  await upsertWebsites(client, { userId, tenantId, vpsNodeId });
  await client.query('COMMIT');
  console.log(`Done. ${FULL_NAME} (${PHONE_NUMBER}) has ${WEBSITES.length} websites.`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
