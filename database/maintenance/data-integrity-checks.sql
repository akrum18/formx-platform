-- Data Integrity Maintenance Scripts for Routing-Pricing Integration
-- Run these scripts regularly to maintain data consistency and identify issues

-- 1. COMPREHENSIVE INTEGRITY CHECK REPORT
CREATE OR REPLACE FUNCTION generate_routing_pricing_integrity_report()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    issue_count INTEGER,
    details JSONB
) AS $$
BEGIN
    -- Check 1: Foreign Key Integrity
    RETURN QUERY
    SELECT 
        'foreign_key_integrity'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(
            jsonb_build_object(
                'routing_pricing_id', rp.id,
                'invalid_routing_id', rp."routingId"
            )
        ) FILTER (WHERE r.id IS NULL)
    FROM "RoutingPricing" rp
    LEFT JOIN "Routing" r ON rp."routingId" = r.id
    WHERE r.id IS NULL;
    
    -- Check 2: Duplicate Routing-Configuration Pairs
    RETURN QUERY
    SELECT 
        'duplicate_routing_config_pairs'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(
            jsonb_build_object(
                'routing_id', "routingId",
                'configuration_id', "configurationId",
                'duplicate_count', cnt
            )
        ) FILTER (WHERE cnt > 1)
    FROM (
        SELECT "routingId", "configurationId", COUNT(*) as cnt
        FROM "RoutingPricing"
        GROUP BY "routingId", "configurationId"
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check 3: Sync Status - Non-overridden values match routing values
    RETURN QUERY
    SELECT 
        'sync_status_material_markup'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(
            jsonb_build_object(
                'routing_pricing_id', rp.id,
                'routing_id', rp."routingId",
                'pricing_markup', rp."materialMarkup",
                'routing_markup', r."materialMarkup"
            )
        ) FILTER (WHERE rp."materialMarkup" != r."materialMarkup")
    FROM "RoutingPricing" rp
    JOIN "Routing" r ON rp."routingId" = r.id
    WHERE rp."isMarkupOverridden" = false
      AND rp."materialMarkup" != r."materialMarkup";
    
    -- Check 4: Base Cost Calculation Accuracy
    RETURN QUERY
    SELECT 
        'base_cost_accuracy'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(
            jsonb_build_object(
                'routing_pricing_id', rp.id,
                'routing_id', rp."routingId",
                'stored_cost', rp."baseCost",
                'calculated_cost', calculated_cost,
                'difference', ABS(rp."baseCost" - calculated_cost)
            )
        ) FILTER (WHERE ABS(rp."baseCost" - calculated_cost) > 0.01)
    FROM "RoutingPricing" rp
    CROSS JOIN LATERAL calculate_routing_base_cost(rp."routingId") AS calculated_cost
    WHERE rp."isBaseCostOverridden" = false;
    
    -- Check 5: Active Routings Missing Pricing Configurations
    RETURN QUERY
    SELECT 
        'missing_pricing_configs'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(
            jsonb_build_object(
                'routing_id', r.id,
                'routing_name', r.name,
                'category', r.category
            )
        ) FILTER (WHERE rp.id IS NULL)
    FROM "Routing" r
    LEFT JOIN "RoutingPricing" rp ON r.id = rp."routingId"
    WHERE r.active = true AND rp.id IS NULL;
    
    -- Check 6: Tier Overrides JSON Structure Validation
    RETURN QUERY
    SELECT 
        'tier_overrides_structure'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(
            jsonb_build_object(
                'routing_pricing_id', id,
                'routing_id', "routingId",
                'invalid_tier_overrides', "tierOverrides"
            )
        ) FILTER (WHERE NOT is_valid_tier_override)
    FROM (
        SELECT 
            id,
            "routingId",
            "tierOverrides",
            CASE 
                WHEN "tierOverrides" IS NULL THEN true
                WHEN jsonb_typeof("tierOverrides") = 'object' AND
                     ("tierOverrides"->>'economy')::NUMERIC > 0 AND
                     ("tierOverrides"->>'standard')::NUMERIC > 0 AND
                     ("tierOverrides"->>'rush')::NUMERIC > 0 THEN true
                ELSE false
            END as is_valid_tier_override
        FROM "RoutingPricing"
        WHERE "tierOverrides" IS NOT NULL
    ) tier_validation
    WHERE NOT is_valid_tier_override;
END;
$$ LANGUAGE plpgsql;

-- 2. AUTO-REPAIR FUNCTIONS
CREATE OR REPLACE FUNCTION repair_routing_pricing_sync()
RETURNS TABLE(
    repair_action TEXT,
    affected_records INTEGER,
    details JSONB
) AS $$
DECLARE
    repair_count INTEGER;
BEGIN
    -- Repair 1: Sync non-overridden material markup
    UPDATE "RoutingPricing" 
    SET 
        "materialMarkup" = r."materialMarkup",
        "updatedAt" = now()
    FROM "Routing" r
    WHERE "RoutingPricing"."routingId" = r.id
      AND "RoutingPricing"."isMarkupOverridden" = false
      AND "RoutingPricing"."materialMarkup" != r."materialMarkup";
    
    GET DIAGNOSTICS repair_count = ROW_COUNT;
    
    RETURN QUERY
    SELECT 
        'sync_material_markup'::TEXT,
        repair_count,
        jsonb_build_object('repaired_records', repair_count);
    
    -- Repair 2: Sync non-overridden finishing cost
    UPDATE "RoutingPricing" 
    SET 
        "finishingCost" = r."finishingCost",
        "updatedAt" = now()
    FROM "Routing" r
    WHERE "RoutingPricing"."routingId" = r.id
      AND "RoutingPricing"."isFinishingOverridden" = false
      AND "RoutingPricing"."finishingCost" != r."finishingCost";
    
    GET DIAGNOSTICS repair_count = ROW_COUNT;
    
    RETURN QUERY
    SELECT 
        'sync_finishing_cost'::TEXT,
        repair_count,
        jsonb_build_object('repaired_records', repair_count);
    
    -- Repair 3: Sync non-overridden lead time
    UPDATE "RoutingPricing" 
    SET 
        "leadTime" = r."estimatedLeadTime",
        "updatedAt" = now()
    FROM "Routing" r
    WHERE "RoutingPricing"."routingId" = r.id
      AND "RoutingPricing"."isLeadTimeOverridden" = false
      AND "RoutingPricing"."leadTime" != r."estimatedLeadTime";
    
    GET DIAGNOSTICS repair_count = ROW_COUNT;
    
    RETURN QUERY
    SELECT 
        'sync_lead_time'::TEXT,
        repair_count,
        jsonb_build_object('repaired_records', repair_count);
    
    -- Repair 4: Recalculate non-overridden base costs
    UPDATE "RoutingPricing" 
    SET 
        "baseCost" = calculate_routing_base_cost("routingId"),
        "updatedAt" = now()
    WHERE "isBaseCostOverridden" = false
      AND ABS("baseCost" - calculate_routing_base_cost("routingId")) > 0.01;
    
    GET DIAGNOSTICS repair_count = ROW_COUNT;
    
    RETURN QUERY
    SELECT 
        'recalculate_base_costs'::TEXT,
        repair_count,
        jsonb_build_object('repaired_records', repair_count);
END;
$$ LANGUAGE plpgsql;

-- 3. MONITORING QUERIES
-- Query: Daily sync status check
CREATE OR REPLACE VIEW routing_pricing_sync_status AS
SELECT 
    r.id as routing_id,
    r.name as routing_name,
    r.category,
    r.active as routing_active,
    COUNT(rp.id) as pricing_config_count,
    COUNT(CASE WHEN rp."isMarkupOverridden" = false AND rp."materialMarkup" != r."materialMarkup" THEN 1 END) as markup_sync_issues,
    COUNT(CASE WHEN rp."isFinishingOverridden" = false AND rp."finishingCost" != r."finishingCost" THEN 1 END) as finishing_sync_issues,
    COUNT(CASE WHEN rp."isLeadTimeOverridden" = false AND rp."leadTime" != r."estimatedLeadTime" THEN 1 END) as leadtime_sync_issues,
    COUNT(CASE WHEN rp."isBaseCostOverridden" = false AND ABS(rp."baseCost" - calculate_routing_base_cost(r.id)) > 0.01 THEN 1 END) as basecost_sync_issues
FROM "Routing" r
LEFT JOIN "RoutingPricing" rp ON r.id = rp."routingId"
GROUP BY r.id, r.name, r.category, r.active;

-- Query: Override tracking
CREATE OR REPLACE VIEW routing_pricing_overrides AS
SELECT 
    rp.id,
    r.name as routing_name,
    rp."configurationId",
    rp."isBaseCostOverridden",
    rp."isMarkupOverridden", 
    rp."isFinishingOverridden",
    rp."isLeadTimeOverridden",
    CASE 
        WHEN rp."isBaseCostOverridden" OR rp."isMarkupOverridden" OR rp."isFinishingOverridden" OR rp."isLeadTimeOverridden" 
        THEN 'has_overrides' 
        ELSE 'no_overrides' 
    END as override_status,
    rp."updatedAt"
FROM "RoutingPricing" rp
JOIN "Routing" r ON rp."routingId" = r.id;

-- 4. SCHEDULED MAINTENANCE PROCEDURES
CREATE OR REPLACE FUNCTION run_daily_routing_pricing_maintenance()
RETURNS JSONB AS $$
DECLARE
    integrity_report JSONB;
    repair_report JSONB;
    maintenance_log JSONB;
BEGIN
    -- Run integrity check
    SELECT jsonb_agg(
        jsonb_build_object(
            'check_name', check_name,
            'status', status,
            'issue_count', issue_count,
            'details', details
        )
    ) INTO integrity_report
    FROM generate_routing_pricing_integrity_report();
    
    -- Run repairs if needed
    SELECT jsonb_agg(
        jsonb_build_object(
            'repair_action', repair_action,
            'affected_records', affected_records,
            'details', details
        )
    ) INTO repair_report
    FROM repair_routing_pricing_sync();
    
    -- Compile maintenance log
    maintenance_log := jsonb_build_object(
        'timestamp', now(),
        'integrity_report', integrity_report,
        'repair_report', repair_report,
        'status', 'completed'
    );
    
    -- Log to audit trail
    INSERT INTO "AuditLog" ("action", "entityType", "entityId", "changes", "userId", "timestamp", "metadata")
    VALUES (
        'maintenance',
        'RoutingPricing',
        'system',
        maintenance_log,
        'system',
        now(),
        jsonb_build_object('maintenance_type', 'daily_routing_pricing_maintenance')
    );
    
    RETURN maintenance_log;
END;
$$ LANGUAGE plpgsql;

-- Usage Examples:
-- SELECT * FROM generate_routing_pricing_integrity_report();
-- SELECT * FROM repair_routing_pricing_sync();
-- SELECT * FROM routing_pricing_sync_status WHERE routing_active = true;
-- SELECT run_daily_routing_pricing_maintenance();