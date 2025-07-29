-- FormX Integration Database - Sample Data
-- Run this after setting up the database schema with Prisma

-- Materials
INSERT INTO "Material" (id, name, type, density, cost, unit, active, "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('mat-al-6061', 'Aluminum 6061', 'Aluminum', 2.7, 3.50, 'lb', true, 'system', NOW(), NOW(), 1),
  ('mat-al-7075', 'Aluminum 7075', 'Aluminum', 2.8, 4.25, 'lb', true, 'system', NOW(), NOW(), 1),
  ('mat-ss-304', 'Stainless Steel 304', 'Steel', 7.9, 6.50, 'lb', true, 'system', NOW(), NOW(), 1),
  ('mat-ss-316', 'Stainless Steel 316', 'Steel', 8.0, 8.25, 'lb', true, 'system', NOW(), NOW(), 1),
  ('mat-brass', 'Brass 360', 'Brass', 8.5, 5.75, 'lb', true, 'system', NOW(), NOW(), 1),
  ('mat-copper', 'Copper C110', 'Copper', 8.9, 9.50, 'lb', true, 'system', NOW(), NOW(), 1)
ON CONFLICT (id) DO NOTHING;

-- Processes
INSERT INTO "Process" (id, name, category, "hourlyRate", "setupTime", "minimumCost", "complexityMultiplier", active, "createdBy", "createdAt", "updatedAt", version)
VALUES 
  -- Primary Processes
  ('proc-laser', 'Laser Cutting', 'Primary', 95.00, 15, 50.00, 1.0, true, 'system', NOW(), NOW(), 1),
  ('proc-cnc-mill', 'CNC Milling', 'Primary', 85.00, 30, 75.00, 1.2, true, 'system', NOW(), NOW(), 1),
  ('proc-cnc-turn', 'CNC Turning', 'Primary', 75.00, 20, 60.00, 1.1, true, 'system', NOW(), NOW(), 1),
  ('proc-brake', 'Press Brake Bending', 'Primary', 65.00, 10, 40.00, 1.0, true, 'system', NOW(), NOW(), 1),
  -- Secondary Processes
  ('proc-tig', 'TIG Welding', 'Secondary', 90.00, 25, 80.00, 1.3, true, 'system', NOW(), NOW(), 1),
  ('proc-mig', 'MIG Welding', 'Secondary', 80.00, 20, 70.00, 1.2, true, 'system', NOW(), NOW(), 1),
  ('proc-deburr', 'Deburring', 'Secondary', 45.00, 5, 25.00, 1.0, true, 'system', NOW(), NOW(), 1),
  ('proc-tap', 'Tapping/Threading', 'Secondary', 60.00, 10, 35.00, 1.1, true, 'system', NOW(), NOW(), 1),
  -- Finishing Processes
  ('proc-anodize', 'Anodizing', 'Finishing', 70.00, 25, 100.00, 1.0, true, 'system', NOW(), NOW(), 1),
  ('proc-powder', 'Powder Coating', 'Finishing', 65.00, 20, 90.00, 1.0, true, 'system', NOW(), NOW(), 1),
  ('proc-plate', 'Plating', 'Finishing', 75.00, 30, 120.00, 1.1, true, 'system', NOW(), NOW(), 1)
ON CONFLICT (id) DO NOTHING;

-- Finishes
INSERT INTO "Finish" (id, name, type, "costPerSqIn", "leadTimeDays", active, "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('fin-anod-clear', 'Anodizing - Clear', 'Anodizing', 0.15, 3, true, 'system', NOW(), NOW(), 1),
  ('fin-anod-black', 'Anodizing - Black', 'Anodizing', 0.18, 3, true, 'system', NOW(), NOW(), 1),
  ('fin-anod-blue', 'Anodizing - Blue', 'Anodizing', 0.20, 4, true, 'system', NOW(), NOW(), 1),
  ('fin-powder-black', 'Powder Coating - Black', 'Powder Coating', 0.12, 2, true, 'system', NOW(), NOW(), 1),
  ('fin-powder-white', 'Powder Coating - White', 'Powder Coating', 0.12, 2, true, 'system', NOW(), NOW(), 1),
  ('fin-powder-custom', 'Powder Coating - Custom Color', 'Powder Coating', 0.16, 3, true, 'system', NOW(), NOW(), 1),
  ('fin-zinc-plate', 'Zinc Plating', 'Plating', 0.10, 2, true, 'system', NOW(), NOW(), 1),
  ('fin-nickel-plate', 'Nickel Plating', 'Plating', 0.22, 4, true, 'system', NOW(), NOW(), 1),
  ('fin-chrome-plate', 'Chrome Plating', 'Plating', 0.35, 5, true, 'system', NOW(), NOW(), 1)
ON CONFLICT (id) DO NOTHING;

-- Sample Routings
INSERT INTO "Routing" (id, name, description, category, "totalSetupTime", "estimatedLeadTime", active, "materialMarkup", "finishingCost", "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('route-simple-laser', 'Simple Laser Cut Parts', 'Basic laser cutting for flat parts', 'Standard', 15, 5, true, 30.0, 0.0, 'system', NOW(), NOW(), 1),
  ('route-complex-cnc', 'Complex CNC Machining', 'Multi-axis CNC milling with tight tolerances', 'Precision', 50, 10, true, 45.0, 0.0, 'system', NOW(), NOW(), 1),
  ('route-sheet-metal', 'Sheet Metal Fabrication', 'Laser cut, bend, and weld assembly', 'Fabrication', 50, 7, true, 35.0, 0.0, 'system', NOW(), NOW(), 1)
ON CONFLICT (id) DO NOTHING;

-- Routing Steps
INSERT INTO "RoutingStep" (id, "routingId", "processId", "processName", sequence, "setupTimeMultiplier", "runtimeMultiplier", "setupTime", "hourlyRate", "minimumCost", "complexityMultiplier", "createdBy", "createdAt", "updatedAt", version)
VALUES 
  -- Simple Laser Route
  ('step-1', 'route-simple-laser', 'proc-laser', 'Laser Cutting', 1, 1.0, 1.0, 15, 95.00, 50.00, 1.0, 'system', NOW(), NOW(), 1),
  ('step-2', 'route-simple-laser', 'proc-deburr', 'Deburring', 2, 1.0, 1.0, 5, 45.00, 25.00, 1.0, 'system', NOW(), NOW(), 1),
  -- Complex CNC Route
  ('step-3', 'route-complex-cnc', 'proc-cnc-mill', 'CNC Milling', 1, 1.0, 1.2, 30, 85.00, 75.00, 1.2, 'system', NOW(), NOW(), 1),
  ('step-4', 'route-complex-cnc', 'proc-cnc-turn', 'CNC Turning', 2, 1.0, 1.1, 20, 75.00, 60.00, 1.1, 'system', NOW(), NOW(), 1),
  ('step-5', 'route-complex-cnc', 'proc-deburr', 'Deburring', 3, 1.0, 1.0, 5, 45.00, 25.00, 1.0, 'system', NOW(), NOW(), 1),
  -- Sheet Metal Route
  ('step-6', 'route-sheet-metal', 'proc-laser', 'Laser Cutting', 1, 1.0, 1.0, 15, 95.00, 50.00, 1.0, 'system', NOW(), NOW(), 1),
  ('step-7', 'route-sheet-metal', 'proc-brake', 'Press Brake Bending', 2, 1.0, 1.0, 10, 65.00, 40.00, 1.0, 'system', NOW(), NOW(), 1),
  ('step-8', 'route-sheet-metal', 'proc-mig', 'MIG Welding', 3, 1.0, 1.2, 20, 80.00, 70.00, 1.2, 'system', NOW(), NOW(), 1),
  ('step-9', 'route-sheet-metal', 'proc-deburr', 'Deburring', 4, 1.0, 1.0, 5, 45.00, 25.00, 1.0, 'system', NOW(), NOW(), 1)
ON CONFLICT (id) DO NOTHING;

-- Initial Pricing Configuration
INSERT INTO "PricingConfiguration" (id, version, status, "defaultTierMultipliers", "volumeBreaks", "minimumOrderValue", "createdBy", "createdAt", "updatedAt")
VALUES 
  ('config-v1', 1, 'published', '{"economy": 0.85, "standard": 1.0, "rush": 1.5}', '[1, 10, 25, 50, 100, 250, 500]', 250.00, 'system', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Routing Pricing
INSERT INTO "RoutingPricing" (id, "configurationId", "routingId", "routingName", category, "baseCost", "materialMarkup", "finishingCost", "leadTime", "tierOverrides", "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('rp-1', 'config-v1', 'route-simple-laser', 'Simple Laser Cut Parts', 'Standard', 100.00, 30.0, 0.0, 5, null, 'system', NOW(), NOW(), 1),
  ('rp-2', 'config-v1', 'route-complex-cnc', 'Complex CNC Machining', 'Precision', 250.00, 45.0, 0.0, 10, '{"rush": {"multiplier": 1.75}}', 'system', NOW(), NOW(), 1),
  ('rp-3', 'config-v1', 'route-sheet-metal', 'Sheet Metal Fabrication', 'Fabrication', 180.00, 35.0, 0.0, 7, null, 'system', NOW(), NOW(), 1)
ON CONFLICT (id) DO NOTHING;

-- Feature Flags (all enabled for integration)
INSERT INTO "FeatureFlag" (id, name, description, enabled, "rolloutPercentage", category, "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('flag-5axis', '5-Axis CNC Quoting', 'Enable 5-axis CNC machining in the quoting system', true, 100, 'Processes', 'system', NOW(), NOW(), 1),
  ('flag-coating', 'Coating & Finishing Options', 'Show coating and finishing options in quotes', true, 100, 'Finishes', 'system', NOW(), NOW(), 1),
  ('flag-rush', 'Rush Order Pricing', 'Allow customers to request rush delivery with premium pricing', true, 100, 'Pricing', 'system', NOW(), NOW(), 1),
  ('flag-discounts', 'Volume Discount Display', 'Show volume-based pricing tiers to customers', true, 100, 'Pricing', 'system', NOW(), NOW(), 1)
ON CONFLICT (id) DO NOTHING;