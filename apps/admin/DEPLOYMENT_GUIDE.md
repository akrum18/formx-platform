# FormX Admin - Integration Deployment Guide

This guide will help you deploy the FormX Admin application to an integration environment.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database access
- Node.js 18+ and pnpm installed
- A server or cloud platform for hosting

## Quick Start (Docker)

1. **Clone and prepare the repository**
   ```bash
   cd /path/to/formx-platform/apps/admin
   ```

2. **Set up environment variables**
   ```bash
   cp .env.integration .env
   # Edit .env with your actual database credentials
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.integration.yml up -d
   ```

4. **Initialize the database**
   ```bash
   # From the workspace root
   cd ../..
   npx prisma db push
   npx prisma db seed # If you have seed data
   ```

## Manual Deployment

### 1. Database Setup

Create a PostgreSQL database for the integration environment:

```sql
CREATE DATABASE formx_integration;
CREATE USER formx_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE formx_integration TO formx_user;
```

### 2. Build the Application

```bash
# Install dependencies
pnpm install

# Generate Prisma client
cd ../..
npx prisma generate
cd apps/admin

# Build the application
pnpm run build
```

### 3. Configure Environment

Update `.env.integration` with your actual values:

```env
DATABASE_URL="postgresql://formx_user:your-password@your-db-host:5432/formx_integration"
JWT_SECRET="your-secure-jwt-secret-minimum-32-characters"
NEXT_PUBLIC_API_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 4. Deploy to Server

#### Option A: Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "formx-admin" -- start
pm2 save
pm2 startup
```

#### Option B: Using systemd

Create `/etc/systemd/system/formx-admin.service`:

```ini
[Unit]
Description=FormX Admin Application
After=network.target

[Service]
Type=simple
User=formx
WorkingDirectory=/var/www/formx-admin
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=4000

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable formx-admin
sudo systemctl start formx-admin
```

### 5. Set up Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name admin.formx.com;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Migration

Initialize the database schema:

```bash
# From workspace root
cd ../..
DATABASE_URL="your-integration-db-url" npx prisma db push
```

## Sample Data (Optional)

Create initial data for testing:

```sql
-- Insert sample materials
INSERT INTO "Material" (id, name, type, density, cost, unit, active, "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('mat1', 'Aluminum 6061', 'Aluminum', 2.7, 3.50, 'lb', true, 'system', NOW(), NOW(), 1),
  ('mat2', 'Stainless Steel 316', 'Steel', 7.8, 8.25, 'lb', true, 'system', NOW(), NOW(), 1);

-- Insert sample processes
INSERT INTO "Process" (id, name, category, "hourlyRate", "setupTime", "minimumCost", "complexityMultiplier", active, "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('proc1', 'Laser Cutting', 'Primary', 95.00, 15, 50.00, 1.0, true, 'system', NOW(), NOW(), 1),
  ('proc2', 'CNC Milling', 'Primary', 85.00, 30, 75.00, 1.2, true, 'system', NOW(), NOW(), 1);

-- Insert sample finishes
INSERT INTO "Finish" (id, name, type, "costPerSqIn", "leadTimeDays", active, "createdBy", "createdAt", "updatedAt", version)
VALUES 
  ('fin1', 'Anodizing - Clear', 'Anodizing', 0.15, 3, true, 'system', NOW(), NOW(), 1),
  ('fin2', 'Powder Coating - Black', 'Powder Coating', 0.12, 2, true, 'system', NOW(), NOW(), 1);
```

## Monitoring

### Health Check

```bash
curl http://localhost:4000/api/v2/dashboard
```

### Logs

- Docker: `docker-compose logs -f admin`
- PM2: `pm2 logs formx-admin`
- systemd: `journalctl -u formx-admin -f`

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check firewall rules for PostgreSQL port (5432)
- Ensure database user has proper permissions

### Build Errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check Node.js version: `node --version` (should be 18+)

### Performance Issues
- Enable production optimizations in next.config.mjs
- Consider using a CDN for static assets
- Monitor server resources (CPU, memory)

## Security Checklist

- [ ] Use strong database password
- [ ] Generate secure JWT secret
- [ ] Enable HTTPS with SSL certificate
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Backup database regularly

## Support

For issues or questions:
- Check logs for error messages
- Review the ARCHITECTURE.md file
- Contact the development team