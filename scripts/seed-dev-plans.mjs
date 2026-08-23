/**
 * Dev-only bootstrap: upsert the four published Phase 1 plan tiers.
 * Usage from backend/:
 *   pnpm seed:dev-plans
 *   node --env-file=.env.development scripts/seed-dev-plans.mjs
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const backendRoot = resolve(fileURLToPath(import.meta.url), '../..');
config({ path: resolve(backendRoot, '.env.development') });

const PLANS = [
  {
    code: 'unix-core',
    nameFa: 'یونیکس کور',
    nameEn: 'UNIX CORE',
    descriptionFa: 'مناسب یک وب‌سایت وردپرس در حال رشد.',
    descriptionEn: 'For a single WordPress site getting started.',
    sortOrder: 10,
  },
  {
    code: 'unix-scale',
    nameFa: 'یونیکس اسکیل',
    nameEn: 'UNIX SCALE',
    descriptionFa: 'مناسب فروشگاه‌ها و سایت‌های در حال مقیاس.',
    descriptionEn: 'For growing stores that need more room.',
    sortOrder: 20,
  },
  {
    code: 'unix-peak',
    nameFa: 'یونیکس پیک',
    nameEn: 'UNIX PEAK',
    descriptionFa: 'مناسب ترافیک بالا و تیم‌های عملیاتی.',
    descriptionEn: 'For high-traffic sites and production teams.',
    sortOrder: 30,
  },
  {
    code: 'unix-enterprise',
    nameFa: 'یونیکس اینترپرایز',
    nameEn: 'UNIX ENTERPRISE',
    descriptionFa: 'مناسب سازمان‌ها با نیاز اختصاصی.',
    descriptionEn: 'For organizations needing a dedicated footprint.',
    sortOrder: 40,
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

try {
  for (const plan of PLANS) {
    const result = await pool.query(
      `INSERT INTO plans (
         id, code, name_fa, name_en, description_fa, description_en,
         is_published, sort_order, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW()
       )
       ON CONFLICT (code) DO UPDATE SET
         name_fa = EXCLUDED.name_fa,
         name_en = EXCLUDED.name_en,
         description_fa = EXCLUDED.description_fa,
         description_en = EXCLUDED.description_en,
         is_published = true,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING id, code`,
      [
        plan.code,
        plan.nameFa,
        plan.nameEn,
        plan.descriptionFa,
        plan.descriptionEn,
        plan.sortOrder,
      ],
    );
    console.log(`Upserted plan ${result.rows[0].code} (${result.rows[0].id})`);
  }
} finally {
  await pool.end();
}
