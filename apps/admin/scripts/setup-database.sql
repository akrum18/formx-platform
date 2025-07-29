-- FormX Admin Integration Database Setup
-- Run this script to set up the integration database

-- Create database (run as superuser)
-- CREATE DATABASE formx_integration;
-- CREATE USER formx_user WITH PASSWORD 'FormX2024!';
-- GRANT ALL PRIVILEGES ON DATABASE formx_integration TO formx_user;

-- Connect to formx_integration database and run the following:

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions on schemas
GRANT ALL ON SCHEMA public TO formx_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO formx_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO formx_user;

-- The Prisma schema will be applied using: npx prisma db push
-- This includes all tables: Material, Process, Routing, RoutingStep, etc.

-- Sample data insertion (optional)
-- You can populate with sample data after running prisma db push

-- Verify setup
SELECT 
    schemaname,
    tablename,
    tableowner 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;