# Database Seeding for FormX Platform

This directory contains scripts to seed the FormX platform database with comprehensive mock data that matches the structure previously used in the admin module.

## Quick Start

### 1. Prerequisites
Make sure your PostgreSQL database is running and accessible:
- Host: `localhost:5532`
- Database: `formx_platform`
- User: `ai`
- Password: `ai`

### 2. Generate Prisma Client
```bash
cd /home/austin/codes/FormX/formx-platform
npx prisma generate
```

### 3. Run the Seeding Script
```bash
npx tsx scripts/seed-database.ts
```

## What Gets Seeded

The seeding script creates comprehensive mock data including:

### Core Manufacturing Data
- **6 Finishes**: Anodized Clear, Black Oxide, Powder Coat Black, Zinc Plating, Chrome Plating, Sandblasting
- **8 Materials**: Aluminum 6061, Steel 1018, Stainless Steel 304, ABS/PLA Plastic, Brass, Copper, Titanium
- **8 Processes**: CNC Machining, Laser Cutting, 3D Printing, Waterjet, EDM Wire, Turning, Milling, Injection Molding
- **4 Routings**: Standard CNC Route, Laser Cut Route, 3D Printing Route, Precision EDM Route
- **Material-Process Relationships**: Realistic combinations of which materials work with which processes

### Pricing & Configuration
- **Pricing Configuration**: Volume breaks (1-10, 11-50, 51-100, 101+), tier multipliers (economy 0.85x, standard 1.0x, rush 1.35x)
- **Routing Pricing**: Base costs and markups for each routing category
- **Feature Flags**: 5 feature toggles including rush orders, coating options, volume discounts

### Test Data
- **Admin User**: `admin@formx.com` / `admin123`
- **Test Customer**: John Smith from Acme Engineering
- **5 Sample Parts**: Various materials, processes, and finishes for testing workflows

## Data Structure

The seeded data follows the same patterns that existed in the admin module mock data:

### Materials → Processes Relationships
- **Aluminum 6061**: CNC, Laser, Waterjet, Turning, Milling
- **Steel 1018**: All machining processes including EDM
- **ABS Plastic**: 3D Printing, Injection Molding, CNC

### Routing Categories
- **Machining**: Higher setup times, premium pricing
- **Cutting**: Fast turnaround, moderate pricing  
- **Additive**: Low setup, material-dependent pricing
- **EDM**: Precision processes, highest costs

## Integration with Admin Module

This seeded data is designed to work seamlessly with the admin module's API v2 endpoints:

- `/api/v2/materials` - Returns all seeded materials with process relationships
- `/api/v2/processes` - Returns all manufacturing processes with categories
- `/api/v2/routings` - Returns routing configurations with steps and pricing
- `/api/v2/finishes` - Returns surface finish options
- `/api/v2/pricing-config` - Returns active pricing configuration
- `/api/v2/feature-flags` - Returns feature toggle states

## Additional Seeding Scripts

### Frontend-Specific Data
Run the frontend seed script to create RFQ/Quote/Order workflows:
```bash
npx tsx scripts/seed-frontend-data.ts
```

### Migration Data
For historical migration data patterns:
```bash
npx tsx scripts/data-migration.ts
```

## Verification

After seeding, verify the data was created correctly:

### Check Core Counts
```sql
SELECT 'materials' as table_name, COUNT(*) FROM "Material"
UNION ALL
SELECT 'processes', COUNT(*) FROM "Process"
UNION ALL
SELECT 'routings', COUNT(*) FROM "Routing"
UNION ALL
SELECT 'finishes', COUNT(*) FROM "Finish";
```

### Test Authentication
Try logging into the admin panel with:
- Email: `admin@formx.com`
- Password: `admin123`

### Verify Relationships
Check that materials are properly connected to processes:
```sql
SELECT m.name as material, COUNT(mp.A) as process_count 
FROM "Material" m
LEFT JOIN "_MaterialToProcess" mp ON m.id = mp.A
GROUP BY m.id, m.name;
```

## Re-running the Script

The seeding script is idempotent - it checks for existing data and skips creation if records already exist. You can safely run it multiple times.

To start fresh, you can truncate tables (be careful with this in production):
```sql
-- Clear all seeded data (run in order due to foreign keys)
TRUNCATE TABLE "RoutingStep", "RoutingPricing", "_MaterialToProcess", "Part", "Routing", "Process", "Material", "Finish", "PricingConfiguration", "FeatureFlag", "Customer" CASCADE;
```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'bcryptjs'"**
   - Make sure dependencies are installed: `pnpm install`

2. **Database connection errors**
   - Verify PostgreSQL is running on localhost:5532
   - Check database credentials in prisma/schema.prisma

3. **Prisma client errors**
   - Regenerate Prisma client: `npx prisma generate`
   - Push latest schema: `npx prisma db push`

### Reset Database
If you need to completely reset:
```bash
npx prisma db push --force-reset
npx tsx scripts/seed-database.ts
```