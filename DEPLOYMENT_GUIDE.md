# Routing-Pricing Integration Deployment Guide

## Overview
This guide outlines the complete process for integrating the `Routing` and `RoutingPricing` models with proper foreign key relationships while preserving all existing data.

## Pre-Deployment Checklist

### 1. Environment Preparation
- [ ] **Backup Production Database**: Create full database backup before any changes
- [ ] **Test Environment Setup**: Ensure staging environment mirrors production
- [ ] **Migration Testing**: Test complete migration process in staging
- [ ] **Rollback Plan**: Verify rollback procedures work correctly
- [ ] **Downtime Window**: Schedule maintenance window (estimated 15-30 minutes)

### 2. Data Validation
```sql
-- Check current data state
SELECT COUNT(*) as total_routing_pricing FROM "RoutingPricing";
SELECT COUNT(*) as total_routings FROM "Routing" WHERE active = true;

-- Identify potential orphaned records
SELECT COUNT(*) as orphaned_pricing
FROM "RoutingPricing" rp
LEFT JOIN "Routing" r ON rp."routingId" = r.id
WHERE r.id IS NULL;
```

### 3. Dependencies Check
- [ ] **Application Deployment**: Ensure application code is updated to use new schema
- [ ] **API Changes**: Update API endpoints to handle new relationships
- [ ] **Frontend Updates**: Modify UI to work with integrated pricing model

## Deployment Steps

### Phase 1: Schema Migration (Estimated Time: 10-15 minutes)

1. **Apply Prisma Schema Changes**
   ```bash
   # Update the schema file with integrated model
   npx prisma db push --preview-feature
   ```

2. **Run Integration Migration**
   ```bash
   # Execute the main migration script
   psql -d formx_platform -f migrations/routing-pricing-integration-migration.sql
   ```

3. **Verify Migration Success**
   ```sql
   -- Check foreign key constraints
   SELECT constraint_name, table_name 
   FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND table_name = 'RoutingPricing';
   
   -- Verify data integrity
   SELECT * FROM generate_routing_pricing_integrity_report();
   ```

### Phase 2: Trigger Installation (Estimated Time: 5 minutes)

1. **Install Synchronization Triggers**
   ```bash
   psql -d formx_platform -f database/triggers/routing-pricing-sync.sql
   ```

2. **Test Trigger Functionality**
   ```sql
   -- Test routing update propagation
   UPDATE "Routing" SET "materialMarkup" = "materialMarkup" + 0.01 
   WHERE id = (SELECT id FROM "Routing" LIMIT 1);
   
   -- Verify sync occurred
   SELECT * FROM "AuditLog" 
   WHERE "entityType" = 'RoutingPricing' 
   AND "action" = 'auto_sync' 
   ORDER BY timestamp DESC LIMIT 5;
   ```

### Phase 3: Data Integrity Setup (Estimated Time: 5 minutes)

1. **Install Integrity Monitoring**
   ```bash
   psql -d formx_platform -f database/maintenance/data-integrity-checks.sql
   ```

2. **Run Initial Integrity Check**
   ```sql
   SELECT * FROM generate_routing_pricing_integrity_report();
   ```

3. **Setup Automated Maintenance** (Optional)
   ```sql
   -- Schedule daily maintenance (requires pg_cron extension)
   SELECT cron.schedule('routing-pricing-maintenance', '0 2 * * *', 
                        'SELECT run_daily_routing_pricing_maintenance()');
   ```

## Post-Deployment Validation

### 1. Functional Testing
```sql
-- Test 1: Create new routing and verify pricing auto-creation
INSERT INTO "Routing" (name, description, category, totalSetupTime, estimatedLeadTime, materialMarkup, finishingCost, createdBy)
VALUES ('Test Routing', 'Test Description', 'test', 30, 7, 1.2, 50.0, 'deployment_test');

-- Test 2: Update routing and verify pricing sync
UPDATE "Routing" SET materialMarkup = 1.3 WHERE name = 'Test Routing';

-- Test 3: Verify pricing updates propagated
SELECT rp.*, r.name, r.materialMarkup 
FROM "RoutingPricing" rp 
JOIN "Routing" r ON rp."routingId" = r.id 
WHERE r.name = 'Test Routing';
```

### 2. Performance Testing
```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM "RoutingPricing" WHERE "routingId" = 'some_id';

-- Monitor trigger performance
SELECT * FROM "AuditLog" 
WHERE metadata->>'trigger_type' IS NOT NULL 
ORDER BY timestamp DESC LIMIT 10;
```

### 3. Application Integration Testing
- [ ] **API Endpoints**: Test all routing and pricing API endpoints
- [ ] **Data Loading**: Verify frontend loads pricing data correctly
- [ ] **CRUD Operations**: Test create, update, delete operations
- [ ] **Tier Pricing**: Verify tier override functionality works

## Rollback Procedures

### Emergency Rollback (If Issues Occur)
```bash
# Execute rollback script
psql -d formx_platform -f migrations/rollback-routing-pricing-integration.sql

# Restore application to previous version
git checkout previous_stable_version
npm run deploy
```

### Partial Rollback (Remove Triggers Only)
```sql
-- Drop triggers while keeping data changes
DROP TRIGGER IF EXISTS routing_pricing_sync_trigger ON "Routing";
DROP TRIGGER IF EXISTS routing_steps_pricing_sync_trigger ON "RoutingStep";
```

## Monitoring and Maintenance

### Daily Monitoring Queries
```sql
-- Check sync status
SELECT * FROM routing_pricing_sync_status WHERE routing_active = true;

-- Monitor override usage
SELECT override_status, COUNT(*) FROM routing_pricing_overrides GROUP BY override_status;

-- Check for integrity issues
SELECT check_name, status, issue_count FROM generate_routing_pricing_integrity_report() WHERE status != 'PASS';
```

### Weekly Maintenance
```sql
-- Run comprehensive integrity check and repairs
SELECT run_daily_routing_pricing_maintenance();

-- Review audit logs for system-generated changes
SELECT * FROM "AuditLog" 
WHERE "userId" = 'system' 
AND timestamp > current_date - interval '7 days'
ORDER BY timestamp DESC;
```

### Monthly Reviews
- Review override usage patterns
- Analyze pricing calculation accuracy
- Check for any manual interventions needed
- Update base cost calculations if process rates change

## Troubleshooting

### Common Issues and Solutions

1. **Foreign Key Constraint Violations**
   ```sql
   -- Find and fix orphaned records
   SELECT * FROM "RoutingPricing" rp 
   LEFT JOIN "Routing" r ON rp."routingId" = r.id 
   WHERE r.id IS NULL;
   ```

2. **Sync Issues After Routing Updates**
   ```sql
   -- Manual sync repair
   SELECT * FROM repair_routing_pricing_sync();
   ```

3. **Performance Issues with Triggers**
   ```sql
   -- Monitor trigger execution time
   SELECT * FROM "AuditLog" 
   WHERE metadata->>'trigger_type' IS NOT NULL 
   AND timestamp > now() - interval '1 hour';
   ```

4. **Base Cost Calculation Discrepancies**
   ```sql
   -- Recalculate all base costs
   UPDATE "RoutingPricing" 
   SET "baseCost" = calculate_routing_base_cost("routingId") 
   WHERE "isBaseCostOverridden" = false;
   ```

## Support Contacts
- **Database Team**: database-team@formx.com
- **Development Team**: dev-team@formx.com
- **On-Call**: +1-555-FORMX-DB

## Success Criteria
- [ ] All existing pricing data preserved
- [ ] Foreign key relationships established successfully
- [ ] Automatic synchronization working correctly
- [ ] No performance degradation observed
- [ ] All application features functioning normally
- [ ] Data integrity checks passing
- [ ] Rollback procedures verified and documented