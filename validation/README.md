# FormX Platform Validation Suite

A comprehensive validation system for testing API endpoints, React components, and Next.js functionality across all FormX applications.

## Overview

This validation suite ensures that all FormX applications (Admin, Frontend, ERP) are running correctly on their designated ports (4000-4002) and that all functionality works as expected.

## Quick Start

### Prerequisites

1. Install dependencies:
```bash
cd /home/austin/codes/FormX/formx-platform
pnpm install
pnpm add -D tsx concurrently
```

2. Build shared packages:
```bash
pnpm build:packages
```

3. Ensure database is running:
```bash
# PostgreSQL should be running on localhost:5532
# Database: formx_platform
# User: ai, Password: ai
```

### Running Validation

#### Full Validation (Apps must be running)
```bash
# Start apps first (in separate terminals):
pnpm dev:admin    # Port 4000
pnpm dev:frontend # Port 4001
pnpm dev:erp      # Port 4002

# Then run validation:
pnpm validate
```

#### Validation with Auto-Start
```bash
# This will attempt to start all apps automatically
pnpm validate:start
```

#### Quick Validation (Skip Build Tests)
```bash
# Faster validation, skips build tests
pnpm validate:quick
```

#### Individual Test Suites
```bash
pnpm validate:ports   # Test port configuration
pnpm validate:api     # Test API endpoints
pnpm validate:react   # Test React components
pnpm validate:build   # Test Next.js builds
```

## Test Suites

### 1. Port Validation (`integration-tests/port-validation.test.ts`)
- Verifies each app runs on correct port (4000-4002)
- Checks for port conflicts
- Tests cross-app communication
- Validates environment isolation

### 2. API Testing

#### Admin API (`api-tests/admin-api.test.ts`)
- Tests all CRUD operations for:
  - Materials
  - Processes
  - Routings
  - Finishes
  - Pricing Config
  - Feature Flags
  - Dashboard
- Authentication/authorization testing
- Error handling validation
- Pagination and filtering tests

#### Frontend API (`api-tests/frontend-api.test.ts`)
- Cart operations
- RFQ/Quote workflows
- Customer management
- Order processing
- Authentication endpoints
- Security testing (CORS, XSS, SQL injection)
- Performance testing

### 3. React Component Validation (`react-tests/component-render.test.ts`)
- Page rendering tests for all routes
- React hydration validation
- Client-side routing checks
- Error boundary testing

### 4. Next.js Build Validation (`nextjs-tests/build-validation.ts`)
- TypeScript compilation
- ESLint validation
- Production builds
- Bundle size analysis
- Environment variable checks
- Next.js configuration validation

## Health Check Endpoints

All apps expose a health check endpoint at `/api/health`:

```json
{
  "status": "healthy",
  "app": "admin",
  "port": 4000,
  "timestamp": "2024-01-20T10:00:00Z",
  "checks": {
    "database": true,
    "api": true,
    "auth": true
  },
  "version": "1.0.0",
  "uptime": 3600,
  "responseTime": 15
}
```

## Reports

Validation generates three types of reports in `validation/reports/`:

### 1. JSON Report
Complete validation results in JSON format for programmatic processing.

### 2. Markdown Report
Human-readable report with summary, test results, and system information.

### 3. Log File
Complete console output from the validation run.

## Report Structure

```json
{
  "timestamp": "2024-01-20T10:00:00Z",
  "duration": 45000,
  "results": {
    "portValidation": { "passed": true, "details": "..." },
    "adminAPI": { "passed": true, "details": "..." },
    "frontendAPI": { "passed": true, "details": "..." },
    "reactComponents": { "passed": true, "details": "..." },
    "buildValidation": { "passed": true, "details": "..." }
  },
  "summary": {
    "totalTests": 5,
    "passed": 5,
    "failed": 0,
    "successRate": "100%"
  },
  "systemInfo": {
    "nodeVersion": "v18.0.0",
    "platform": "linux",
    "apps": {
      "admin": { "running": true, "port": 4000 },
      "frontend": { "running": true, "port": 4001 },
      "erp": { "running": true, "port": 4002 }
    }
  }
}
```

## Troubleshooting

### Apps Not Running
```bash
# Check if apps are running on correct ports
curl http://localhost:4000/api/health  # Admin
curl http://localhost:4001/api/health  # Frontend
curl http://localhost:4002/api/health  # ERP
```

### Database Connection Issues
```bash
# Test database connection
PGPASSWORD=ai psql -h localhost -p 5532 -U ai -d formx_platform -c "SELECT 1"
```

### Port Conflicts
```bash
# Check what's using a port
lsof -i :4000
lsof -i :4001
lsof -i :4002
```

### Build Failures
```bash
# Clear Next.js cache
rm -rf apps/*/next
rm -rf apps/*/.next

# Reinstall dependencies
pnpm install
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: pnpm install

- name: Build packages
  run: pnpm build:packages

- name: Start apps
  run: pnpm dev:all &
  
- name: Wait for apps
  run: sleep 30

- name: Run validation
  run: pnpm validate

- name: Upload reports
  uses: actions/upload-artifact@v2
  with:
    name: validation-reports
    path: validation/reports/
```

## Expected Success Criteria

For the validation to pass:

1. **Port Validation**: All apps must be running on correct ports (4000-4002)
2. **API Tests**: All endpoints must respond with correct status codes
3. **React Components**: All pages must render without errors
4. **Build Validation**: All apps must build successfully
5. **Performance**: Response times should be under 500ms for critical endpoints

## Extending the Validation Suite

To add new tests:

1. Create a new test file in the appropriate directory
2. Export a default function that runs the tests
3. Import and call it from `run-validation.ts`
4. Update this README with the new test documentation

## Support

For issues or questions about the validation suite, check:
- Validation reports in `validation/reports/`
- Application logs
- Health check endpoints
- Database connection status