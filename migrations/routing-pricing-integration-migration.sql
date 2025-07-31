-- Migration: Integrate RoutingPricing with Routing via Foreign Key
-- This migration safely transforms the existing RoutingPricing model to use proper FK relationships
-- while preserving all existing pricing data and configurations

-- Step 1: Create backup tables for rollback capability
CREATE TABLE "RoutingPricing_backup" AS SELECT * FROM "RoutingPricing";
CREATE TABLE "Routing_backup" AS SELECT * FROM "Routing";

-- Step 2: Add temporary columns to RoutingPricing for new fields
ALTER TABLE "RoutingPricing" 
ADD COLUMN "isBaseCostOverridden" BOOLEAN DEFAULT false,
ADD COLUMN "isMarkupOverridden" BOOLEAN DEFAULT false,
ADD COLUMN "isFinishingOverridden" BOOLEAN DEFAULT false,
ADD COLUMN "isLeadTimeOverridden" BOOLEAN DEFAULT false;

-- Step 3: Validate that all routingId values in RoutingPricing have corresponding Routing records
-- This query should return 0 rows - if it returns rows, manual intervention is needed
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM "RoutingPricing" rp
    LEFT JOIN "Routing" r ON rp."routingId" = r.id
    WHERE r.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned RoutingPricing records with no matching Routing. Manual cleanup required.', orphaned_count;
    END IF;
    
    RAISE NOTICE 'Data validation passed: All RoutingPricing records have valid routing references';
END $$;

-- Step 4: Sync pricing data with routing values where they differ
-- Mark as overridden if RoutingPricing values differ from Routing values
UPDATE "RoutingPricing" 
SET "isMarkupOverridden" = true
FROM "Routing" 
WHERE "RoutingPricing"."routingId" = "Routing".id 
  AND "RoutingPricing"."materialMarkup" != "Routing"."materialMarkup";

UPDATE "RoutingPricing" 
SET "isFinishingOverridden" = true
FROM "Routing" 
WHERE "RoutingPricing"."routingId" = "Routing".id 
  AND "RoutingPricing"."finishingCost" != "Routing"."finishingCost";

UPDATE "RoutingPricing" 
SET "isLeadTimeOverridden" = true
FROM "Routing" 
WHERE "RoutingPricing"."routingId" = "Routing".id 
  AND "RoutingPricing"."leadTime" != "Routing"."estimatedLeadTime";

-- Step 5: Calculate base costs from routing steps for records that don't have overrides
-- This creates a temporary function to calculate base cost from routing steps
CREATE OR REPLACE FUNCTION calculate_routing_base_cost(routing_id TEXT) 
RETURNS NUMERIC AS $$
DECLARE
    total_cost NUMERIC := 0;
    step_record RECORD;
BEGIN
    FOR step_record IN 
        SELECT 
            rs."setupTime",
            rs."hourlyRate", 
            rs."minimumCost",
            rs."complexityMultiplier"
        FROM "RoutingStep" rs 
        WHERE rs."routingId" = routing_id
        ORDER BY rs."sequence"
    LOOP
        -- Calculate step cost: (setupTime/60 * hourlyRate * complexityMultiplier) + minimumCost
        total_cost := total_cost + 
            ((step_record."setupTime"::NUMERIC / 60.0) * 
             step_record."hourlyRate" * 
             step_record."complexityMultiplier") + 
            step_record."minimumCost";
    END LOOP;
    
    RETURN COALESCE(total_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update base costs for non-overridden records
-- Mark as overridden if current baseCost significantly differs from calculated cost
UPDATE "RoutingPricing" 
SET 
    "isBaseCostOverridden" = CASE 
        WHEN ABS("baseCost" - calculate_routing_base_cost("routingId")) > 0.01 
        THEN true 
        ELSE false 
    END;

-- Step 7: Update non-overridden records to match routing values
UPDATE "RoutingPricing" 
SET 
    "materialMarkup" = r."materialMarkup",
    "finishingCost" = r."finishingCost",
    "leadTime" = r."estimatedLeadTime"
FROM "Routing" r
WHERE "RoutingPricing"."routingId" = r.id
  AND ("RoutingPricing"."isMarkupOverridden" = false 
       OR "RoutingPricing"."isFinishingOverridden" = false 
       OR "RoutingPricing"."isLeadTimeOverridden" = false);

-- Step 8: Remove the redundant routingName column
ALTER TABLE "RoutingPricing" DROP COLUMN "routingName";

-- Step 9: Create the foreign key constraint
ALTER TABLE "RoutingPricing" 
ADD CONSTRAINT "RoutingPricing_routingId_fkey" 
FOREIGN KEY ("routingId") REFERENCES "Routing"("id") ON DELETE CASCADE;

-- Step 10: Add unique constraint to prevent duplicate routing-configuration pairs
ALTER TABLE "RoutingPricing" 
ADD CONSTRAINT "RoutingPricing_routingId_configurationId_key" 
UNIQUE ("routingId", "configurationId");

-- Step 11: Create indexes for performance
CREATE INDEX "RoutingPricing_routingId_idx" ON "RoutingPricing"("routingId");

-- Step 12: Clean up temporary function
DROP FUNCTION calculate_routing_base_cost(TEXT);

-- Step 13: Log migration completion
INSERT INTO "MigrationBackup" ("name", "data", "timestamp") 
VALUES (
    'routing_pricing_integration_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'),
    jsonb_build_object(
        'migration_type', 'routing_pricing_integration',
        'backup_tables', array['RoutingPricing_backup', 'Routing_backup'],
        'affected_records', (SELECT COUNT(*) FROM "RoutingPricing"),
        'timestamp', now()
    ),
    now()
);

-- Validation queries to run after migration
-- These should be run manually to verify migration success:
-- 
-- 1. Verify all foreign key relationships are valid:
-- SELECT COUNT(*) FROM "RoutingPricing" rp JOIN "Routing" r ON rp."routingId" = r.id;
--
-- 2. Check override flags are set correctly:
-- SELECT COUNT(*) FROM "RoutingPricing" WHERE "isBaseCostOverridden" = true;
--
-- 3. Verify unique constraint works:
-- SELECT "routingId", "configurationId", COUNT(*) 
-- FROM "RoutingPricing" 
-- GROUP BY "routingId", "configurationId" 
-- HAVING COUNT(*) > 1;