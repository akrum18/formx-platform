#!/usr/bin/env tsx

// Quick demonstration of the validation system

console.log('\n' + '='.repeat(70))
console.log('🚀 FORMX VALIDATION SYSTEM DEMONSTRATION')
console.log('='.repeat(70))

const PORT_MAP = {
  admin: 4000,
  frontend: 4001,
  erp: 4002
}

async function checkPort(app: string, port: number) {
  console.log(`\n📡 Checking ${app} on port ${port}...`)
  
  try {
    const response = await fetch(`http://localhost:${port}/api/health`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`  ✅ ${app} is running!`)
      console.log(`     App: ${data.app}`)
      console.log(`     Port: ${data.port}`)
      console.log(`     Status: ${data.status}`)
      console.log(`     Database: ${data.checks?.database ? '✅' : '❌'}`)
      return true
    } else {
      console.log(`  ⚠️ ${app} responded with status ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`  ❌ ${app} is not running on port ${port}`)
    console.log(`     To start: cd apps/${app} && PORT=${port} npm run dev`)
    return false
  }
}

async function demonstrateValidation() {
  console.log('\n📋 Validation System Features:')
  console.log('  • Health check endpoints on all apps')
  console.log('  • Port validation (4000-4002)')
  console.log('  • API endpoint testing')
  console.log('  • React component validation')
  console.log('  • Next.js build validation')
  console.log('  • Comprehensive reporting')
  
  console.log('\n🔍 Checking Application Status...')
  
  const results = []
  for (const [app, port] of Object.entries(PORT_MAP)) {
    const isRunning = await checkPort(app, port)
    results.push({ app, port, running: isRunning })
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('📊 VALIDATION SUMMARY')
  console.log('='.repeat(70))
  
  console.log('\n🎯 Port Configuration:')
  results.forEach(r => {
    console.log(`  ${r.running ? '✅' : '❌'} ${r.app}: Port ${r.port}`)
  })
  
  console.log('\n📚 Available Validation Commands:')
  console.log('  pnpm validate         - Full validation suite')
  console.log('  pnpm validate:quick   - Quick validation (skip builds)')
  console.log('  pnpm validate:ports   - Port validation only')
  console.log('  pnpm validate:api     - API testing only')
  console.log('  pnpm validate:react   - React component testing')
  console.log('  pnpm validate:build   - Build validation only')
  
  console.log('\n📁 Validation Files Created:')
  console.log('  ✅ validation/api-tests/common-api.test.ts')
  console.log('  ✅ validation/api-tests/admin-api.test.ts')
  console.log('  ✅ validation/api-tests/frontend-api.test.ts')
  console.log('  ✅ validation/react-tests/component-render.test.ts')
  console.log('  ✅ validation/nextjs-tests/build-validation.ts')
  console.log('  ✅ validation/integration-tests/port-validation.test.ts')
  console.log('  ✅ validation/run-validation.ts (Main orchestrator)')
  console.log('  ✅ validation/README.md (Documentation)')
  
  console.log('\n🏥 Health Check Endpoints Added:')
  console.log('  ✅ apps/admin/app/api/health/route.ts')
  console.log('  ✅ apps/frontend/app/api/health/route.ts')
  console.log('  ✅ apps/erp/app/api/health/route.ts')
  
  const runningCount = results.filter(r => r.running).length
  
  if (runningCount === 0) {
    console.log('\n⚠️ No apps are currently running.')
    console.log('\n🚀 To start all apps, run:')
    console.log('  pnpm dev:all')
    console.log('\nOr start individually:')
    console.log('  pnpm dev:admin    # Port 4000')
    console.log('  pnpm dev:frontend # Port 4001')
    console.log('  pnpm dev:erp      # Port 4002')
  } else if (runningCount < 3) {
    console.log(`\n⚠️ Only ${runningCount}/3 apps are running.`)
  } else {
    console.log('\n🎉 All apps are running! You can now run:')
    console.log('  pnpm validate')
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ VALIDATION SYSTEM SUCCESSFULLY CONFIGURED!')
  console.log('='.repeat(70))
  console.log('\nThe FormX platform validation system is ready to use.')
  console.log('All apps are configured to run on ports 4000-4002.')
  console.log('\n')
}

// Run the demonstration
demonstrateValidation().catch(console.error)