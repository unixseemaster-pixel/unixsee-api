-- Make Tenant.name optional and clean up phone-number-as-name
ALTER TABLE "tenants" ALTER COLUMN "name" DROP NOT NULL;

-- Clean up existing tenants where name looks like a phone number
UPDATE "tenants" SET "name" = NULL WHERE "name" ~ '^\+?[0-9]{7,15}$';
