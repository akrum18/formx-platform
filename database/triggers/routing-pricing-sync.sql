-- Database Triggers and Functions for Routing-Pricing Synchronization
-- These ensure pricing configurations stay in sync with routing workflow changes

-- Function: Calculate base cost from routing steps
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
            rs."complexityMultiplier",
            rs."runtimeMultiplier"
        FROM "RoutingStep" rs 
        WHERE rs."routingId" = routing_id
        ORDER BY rs."sequence"
    LOOP
        -- Calculate step cost: (setupTime/60 * hourlyRate * complexityMultiplier) + minimumCost
        total_cost := total_cost + 
            ((step_record."setupTime"::NUMERIC / 60.0) * 
             step_record."hourlyRate" * 
             step_record."complexityMultiplier" * 
             step_record."runtimeMultiplier") + 
            step_record."minimumCost";
    END LOOP;
    
    RETURN COALESCE(total_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Sync routing pricing when routing changes
CREATE OR REPLACE FUNCTION sync_routing_pricing() 
RETURNS TRIGGER AS $$
BEGIN
    -- Update non-overridden pricing configurations when routing changes
    IF TG_OP = 'UPDATE' THEN
        -- Sync material markup for non-overridden records
        IF OLD."materialMarkup" != NEW."materialMarkup" THEN
            UPDATE "RoutingPricing" 
            SET 
                "materialMarkup" = NEW."materialMarkup",
                "updatedAt" = now()
            WHERE "routingId" = NEW.id 
              AND "isMarkupOverridden" = false;
        END IF;
        
        -- Sync finishing cost for non-overridden records
        IF OLD."finishingCost" != NEW."finishingCost" THEN
            UPDATE "RoutingPricing" 
            SET 
                "finishingCost" = NEW."finishingCost",
                "updatedAt" = now()
            WHERE "routingId" = NEW.id 
              AND "isFinishingOverridden" = false;
        END IF;
        
        -- Sync lead time for non-overridden records
        IF OLD."estimatedLeadTime" != NEW."estimatedLeadTime" THEN
            UPDATE "RoutingPricing" 
            SET 
                "leadTime" = NEW."estimatedLeadTime",
                "updatedAt" = now()
            WHERE "routingId" = NEW.id 
              AND "isLeadTimeOverridden" = false;
        END IF;
        
        -- Update category if it changed
        IF OLD."category" != NEW."category" THEN
            UPDATE "RoutingPricing" 
            SET 
                "category" = NEW."category",
                "updatedAt" = now()
            WHERE "routingId" = NEW.id;
        END IF;
        
        -- Log the sync operation
        INSERT INTO "AuditLog" ("action", "entityType", "entityId", "changes", "userId", "timestamp", "metadata")
        VALUES (
            'auto_sync',
            'RoutingPricing',
            NEW.id,
            jsonb_build_object(
                'trigger', 'routing_update',
                'changes_synced', jsonb_build_object(
                    'materialMarkup', CASE WHEN OLD."materialMarkup" != NEW."materialMarkup" THEN true ELSE false END,
                    'finishingCost', CASE WHEN OLD."finishingCost" != NEW."finishingCost" THEN true ELSE false END,
                    'leadTime', CASE WHEN OLD."estimatedLeadTime" != NEW."estimatedLeadTime" THEN true ELSE false END,
                    'category', CASE WHEN OLD."category" != NEW."category" THEN true ELSE false END
                )
            ),
            'system',
            now(),
            jsonb_build_object('trigger_type', 'routing_pricing_sync')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Sync routing pricing when routing steps change
CREATE OR REPLACE FUNCTION sync_routing_pricing_on_steps() 
RETURNS TRIGGER AS $$
DECLARE
    new_base_cost NUMERIC;
BEGIN
    -- Calculate new base cost when steps change
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        -- Get the routing ID from the appropriate record
        DECLARE
            target_routing_id TEXT;
        BEGIN
            IF TG_OP = 'DELETE' THEN
                target_routing_id := OLD."routingId";
            ELSE
                target_routing_id := NEW."routingId";
            END IF;
            
            -- Calculate new base cost
            new_base_cost := calculate_routing_base_cost(target_routing_id);
            
            -- Update non-overridden routing pricing records
            UPDATE "RoutingPricing" 
            SET 
                "baseCost" = new_base_cost,
                "updatedAt" = now()
            WHERE "routingId" = target_routing_id 
              AND "isBaseCostOverridden" = false;
            
            -- Log the recalculation
            INSERT INTO "AuditLog" ("action", "entityType", "entityId", "changes", "userId", "timestamp", "metadata")
            VALUES (
                'auto_recalculate',
                'RoutingPricing',
                target_routing_id,
                jsonb_build_object(
                    'trigger', 'routing_steps_change',
                    'new_base_cost', new_base_cost,
                    'operation', TG_OP
                ),
                'system',
                now(),
                jsonb_build_object('trigger_type', 'routing_steps_sync')
            );
        END;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS routing_pricing_sync_trigger ON "Routing";
CREATE TRIGGER routing_pricing_sync_trigger
    AFTER UPDATE ON "Routing"
    FOR EACH ROW
    EXECUTE FUNCTION sync_routing_pricing();

DROP TRIGGER IF EXISTS routing_steps_pricing_sync_trigger ON "RoutingStep";
CREATE TRIGGER routing_steps_pricing_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "RoutingStep"
    FOR EACH ROW
    EXECUTE FUNCTION sync_routing_pricing_on_steps();

-- Function: Create routing pricing entry for new configurations
CREATE OR REPLACE FUNCTION create_routing_pricing_for_configuration(
    p_configuration_id TEXT,
    p_routing_id TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    routing_record RECORD;
    base_cost NUMERIC;
BEGIN
    -- If specific routing provided, create pricing for just that routing
    IF p_routing_id IS NOT NULL THEN
        SELECT * INTO routing_record FROM "Routing" WHERE id = p_routing_id AND active = true;
        
        IF FOUND THEN
            base_cost := calculate_routing_base_cost(routing_record.id);
            
            INSERT INTO "RoutingPricing" (
                "routingId", 
                "category", 
                "baseCost", 
                "materialMarkup", 
                "finishingCost", 
                "leadTime",
                "configurationId",
                "createdBy"
            ) VALUES (
                routing_record.id,
                routing_record.category,
                base_cost,
                routing_record."materialMarkup",
                routing_record."finishingCost",
                routing_record."estimatedLeadTime",
                p_configuration_id,
                'system'
            );
        END IF;
    ELSE
        -- Create pricing entries for all active routings
        FOR routing_record IN 
            SELECT * FROM "Routing" WHERE active = true
        LOOP
            base_cost := calculate_routing_base_cost(routing_record.id);
            
            -- Only insert if not already exists
            INSERT INTO "RoutingPricing" (
                "routingId", 
                "category", 
                "baseCost", 
                "materialMarkup", 
                "finishingCost", 
                "leadTime",
                "configurationId",
                "createdBy"
            )
            SELECT 
                routing_record.id,
                routing_record.category,
                base_cost,
                routing_record."materialMarkup",
                routing_record."finishingCost",
                routing_record."estimatedLeadTime",
                p_configuration_id,
                'system'
            WHERE NOT EXISTS (
                SELECT 1 FROM "RoutingPricing" 
                WHERE "routingId" = routing_record.id 
                  AND "configurationId" = p_configuration_id
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate pricing configuration integrity
CREATE OR REPLACE FUNCTION validate_pricing_configuration_integrity(
    p_configuration_id TEXT
) RETURNS TABLE(
    issue_type TEXT,
    routing_id TEXT,
    routing_name TEXT,
    description TEXT
) AS $$
BEGIN
    -- Check for missing routing pricing entries
    RETURN QUERY
    SELECT 
        'missing_pricing'::TEXT,
        r.id,
        r.name,
        'Active routing has no pricing configuration'::TEXT
    FROM "Routing" r
    LEFT JOIN "RoutingPricing" rp ON r.id = rp."routingId" AND rp."configurationId" = p_configuration_id
    WHERE r.active = true AND rp.id IS NULL;
    
    -- Check for pricing entries with inactive routings
    RETURN QUERY
    SELECT 
        'inactive_routing'::TEXT,
        r.id,
        r.name,
        'Pricing configuration exists for inactive routing'::TEXT
    FROM "RoutingPricing" rp
    JOIN "Routing" r ON rp."routingId" = r.id
    WHERE rp."configurationId" = p_configuration_id AND r.active = false;
    
    -- Check for significant cost discrepancies (where not overridden)
    RETURN QUERY
    SELECT 
        'cost_discrepancy'::TEXT,
        r.id,
        r.name,
        'Base cost significantly differs from calculated cost: ' || 
        rp."baseCost"::TEXT || ' vs ' || calculate_routing_base_cost(r.id)::TEXT
    FROM "RoutingPricing" rp
    JOIN "Routing" r ON rp."routingId" = r.id
    WHERE rp."configurationId" = p_configuration_id 
      AND rp."isBaseCostOverridden" = false
      AND ABS(rp."baseCost" - calculate_routing_base_cost(r.id)) > 1.0;
END;
$$ LANGUAGE plpgsql;