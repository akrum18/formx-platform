-- Rollback Script: Routing-Pricing Integration Migration
-- This script rolls back the routing-pricing integration migration
-- Use this if the migration fails or needs to be reverted

-- Step 1: Drop foreign key constraint
ALTER TABLE "RoutingPricing" DROP CONSTRAINT IF EXISTS "RoutingPricing_routingId_fkey";

-- Step 2: Drop unique constraint
ALTER TABLE "RoutingPricing" DROP CONSTRAINT IF EXISTS "RoutingPricing_routingId_configurationId_key";

-- Step 3: Drop new indexes
DROP INDEX IF EXISTS "RoutingPricing_routingId_idx";

-- Step 4: Restore RoutingPricing table from backup
DROP TABLE IF EXISTS "RoutingPricing";
CREATE TABLE "RoutingPricing" AS SELECT * FROM "RoutingPricing_backup";

-- Step 5: Restore original indexes
CREATE INDEX "RoutingPricing_category_idx" ON "RoutingPricing"("category");
CREATE INDEX "RoutingPricing_configurationId_idx" ON "RoutingPricing"("configurationId");

-- Step 6: Restore foreign key to PricingConfiguration
ALTER TABLE "RoutingPricing" 
ADD CONSTRAINT "RoutingPricing_configurationId_fkey" 
FOREIGN KEY ("configurationId") REFERENCES "PricingConfiguration"("id") ON DELETE CASCADE;

-- Step 7: Restore Routing table if needed
-- Uncomment if Routing table was also modified
-- DROP TABLE IF EXISTS "Routing";
-- CREATE TABLE "Routing" AS SELECT * FROM "Routing_backup";

-- Step 8: Clean up backup tables (optional)
-- DROP TABLE IF EXISTS "RoutingPricing_backup";
-- DROP TABLE IF EXISTS "Routing_backup";

-- Step 9: Log rollback
INSERT INTO "MigrationBackup" ("name", "data", "timestamp") 
VALUES (
    'rollback_routing_pricing_integration_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'),
    jsonb_build_object(
        'migration_type', 'rollback_routing_pricing_integration',
        'timestamp', now(),
        'status', 'completed'
    ),
    now()
);

-- Validation: Check that rollback was successful
SELECT 'Rollback validation' as check_type, COUNT(*) as record_count 
FROM "RoutingPricing";

-- Check that routingName column exists again
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'RoutingPricing' 
  AND column_name = 'routingName';