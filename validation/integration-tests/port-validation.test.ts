import { TEST_CONFIG, testEndpoint, waitForApp } from '../api-tests/common-api.test'

export interface PortTestResult {
  app: string
  expectedPort: number
  actualPort?: number
  isRunning: boolean
  correctPort: boolean
  healthCheck: boolean
}

const PORT_MAP = {
  admin: 4000,
  frontend: 4001,
  erp: 4002
}

export async function validatePort(appName: string, expectedPort: number): Promise<PortTestResult> {
  console.log(`\n🔌 Validating ${appName} on port ${expectedPort}...`)
  
  const url = `http://localhost:${expectedPort}`
  const result: PortTestResult = {
    app: appName,
    expectedPort,
    isRunning: false,
    correctPort: false,
    healthCheck: false
  }
  
  // Check if app is running
  const isRunning = await waitForApp(url, 3)
  result.isRunning = isRunning
  
  if (!isRunning) {
    console.log(`  ❌ ${appName} is not running on port ${expectedPort}`)
    return result
  }
  
  // Check health endpoint
  const healthResult = await testEndpoint(url, 'GET', '/api/health')
  result.healthCheck = healthResult.success
  
  if (healthResult.data) {
    // Check if the app reports the correct port
    const reportedPort = healthResult.data.port
    result.actualPort = parseInt(reportedPort) || expectedPort
    result.correctPort = result.actualPort === expectedPort
    
    if (result.correctPort) {
      console.log(`  ✅ ${appName} is running on correct port ${expectedPort}`)
    } else {
      console.log(`  ❌ ${appName} reports port ${result.actualPort} but expected ${expectedPort}`)
    }
    
    // Verify it's the correct app
    if (healthResult.data.app !== appName) {
      console.log(`  ⚠️ App identifies as '${healthResult.data.app}' but expected '${appName}'`)
      result.correctPort = false
    }
  }
  
  return result
}

export async function checkPortConflicts(): Promise<void> {
  console.log('\n🔍 Checking for port conflicts...\n')
  
  const portsToCheck = [4000, 4001, 4002, 3000, 3001, 3002, 8000]
  
  for (const port of portsToCheck) {
    try {
      const response = await fetch(`http://localhost:${port}`)
      const isFormXPort = port >= 4000 && port <= 4002
      
      if (response.ok || response.status < 500) {
        if (isFormXPort) {
          console.log(`  ✅ Port ${port}: FormX app running`)
        } else {
          console.log(`  ⚠️ Port ${port}: Something is running (potential conflict)`)
        }
      }
    } catch {
      if (port >= 4000 && port <= 4002) {
        console.log(`  ❌ Port ${port}: FormX app should be running but isn't`)
      } else {
        console.log(`  ✅ Port ${port}: Available`)
      }
    }
  }
}

export async function validateCrossAppCommunication(): Promise<void> {
  console.log('\n🔗 Testing Cross-App Communication...\n')
  
  // Test if apps can communicate with each other
  // For example, frontend calling admin API
  
  try {
    // Frontend should be able to call its own API
    const frontendApiTest = await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/health')
    console.log(`  Frontend → Frontend API: ${frontendApiTest.success ? '✅' : '❌'}`)
    
    // Admin should be able to call its own API
    const adminApiTest = await testEndpoint(TEST_CONFIG.adminUrl, 'GET', '/api/health')
    console.log(`  Admin → Admin API: ${adminApiTest.success ? '✅' : '❌'}`)
    
    // ERP should be able to call its own API
    const erpApiTest = await testEndpoint(TEST_CONFIG.erpUrl, 'GET', '/api/health')
    console.log(`  ERP → ERP API: ${erpApiTest.success ? '✅' : '❌'}`)
    
    // Note: In production, you might have cross-app API calls
    // Add those tests here if applicable
  } catch (error) {
    console.log(`  ❌ Cross-app communication error: ${error}`)
  }
}

export async function validateEnvironmentIsolation(): Promise<void> {
  console.log('\n🔒 Testing Environment Isolation...\n')
  
  // Check that each app has its own isolated environment
  const healthChecks = await Promise.all([
    testEndpoint(TEST_CONFIG.adminUrl, 'GET', '/api/health'),
    testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/health'),
    testEndpoint(TEST_CONFIG.erpUrl, 'GET', '/api/health')
  ])
  
  const apps = ['admin', 'frontend', 'erp']
  const uniqueApps = new Set()
  
  healthChecks.forEach((check, index) => {
    if (check.data?.app) {
      uniqueApps.add(check.data.app)
      console.log(`  ${apps[index]}: Identifies as '${check.data.app}'`)
    }
  })
  
  if (uniqueApps.size === 3) {
    console.log(`  ✅ All apps have unique identities`)
  } else {
    console.log(`  ❌ Apps may not be properly isolated`)
  }
}

export async function testPortFailover(): Promise<void> {
  console.log('\n🔄 Testing Port Failover Behavior...\n')
  
  // Test what happens when preferred port is unavailable
  // This would require stopping and starting apps, which we'll simulate
  
  console.log('  ℹ️ Port failover testing would require app restart capabilities')
  console.log('  ℹ️ In production, consider implementing automatic port fallback')
}

export function formatPortResults(results: PortTestResult[]): string {
  const running = results.filter(r => r.isRunning).length
  const correctPorts = results.filter(r => r.correctPort).length
  const healthPassed = results.filter(r => r.healthCheck).length
  
  let output = `\n🔌 Port Validation Results\n`
  output += `${'='.repeat(50)}\n`
  output += `🟢 Running: ${running}/3\n`
  output += `🎯 Correct Port: ${correctPorts}/3\n`
  output += `💚 Health Check: ${healthPassed}/3\n`
  output += `${'='.repeat(50)}\n\n`
  
  results.forEach(result => {
    const status = result.isRunning && result.correctPort && result.healthCheck ? '✅' : '❌'
    output += `${status} ${result.app}:\n`
    output += `  Expected Port: ${result.expectedPort}\n`
    if (result.actualPort) {
      output += `  Actual Port: ${result.actualPort}\n`
    }
    output += `  Running: ${result.isRunning ? 'Yes' : 'No'}\n`
    output += `  Health Check: ${result.healthCheck ? 'Passed' : 'Failed'}\n\n`
  })
  
  return output
}

// Main port validation runner
export async function runPortValidation(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🔌 PORT VALIDATION SUITE')
  console.log('='.repeat(60))
  
  const results: PortTestResult[] = []
  
  // Validate each app's port
  for (const [appName, port] of Object.entries(PORT_MAP)) {
    const result = await validatePort(appName, port)
    results.push(result)
  }
  
  // Additional checks
  await checkPortConflicts()
  await validateCrossAppCommunication()
  await validateEnvironmentIsolation()
  await testPortFailover()
  
  // Print summary
  console.log(formatPortResults(results))
  
  // Overall status
  const allCorrect = results.every(r => r.isRunning && r.correctPort && r.healthCheck)
  if (allCorrect) {
    console.log('🎉 All apps are running on the correct ports!')
  } else {
    console.log('⚠️ Some apps are not configured correctly. Please check the results above.')
  }
  
  return
}

// Export for use in main validation script
export default runPortValidation