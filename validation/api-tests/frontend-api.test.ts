import { 
  TEST_CONFIG, 
  TestResult, 
  createTestToken, 
  testEndpoint,
  setupTestUser,
  formatTestResults 
} from './common-api.test'

export async function testFrontendAPI(): Promise<TestResult[]> {
  console.log('\n🛍️ Testing Frontend API Endpoints (Port 4001)...\n')
  const results: TestResult[] = []
  
  // Setup test user and get token
  const testUser = await setupTestUser()
  const token = createTestToken(testUser.id, testUser.email, 'user')
  
  // Test health endpoint
  console.log('Testing health endpoint...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/health'))
  
  // Test Cart API
  console.log('Testing Cart API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/cart', token))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/cart/items', token, {
    partId: 'test-part-id',
    quantity: 2
  }))
  
  // Test Cart Simple API (alternative implementation)
  console.log('Testing Cart Simple API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/cart-simple', token))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/cart-simple', token, {
    partId: 'test-part-id',
    quantity: 1
  }))
  
  // Test RFQ API
  console.log('Testing RFQ API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/rfqs', token))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/rfqs', token, {
    partName: 'Test Part',
    quantity: 100,
    material: 'Aluminum',
    process: 'CNC Machining',
    notes: 'Test RFQ for validation'
  }))
  
  // Test Quotes API
  console.log('Testing Quotes API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/quotes', token))
  
  // Test Orders API
  console.log('Testing Orders API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/orders', token))
  
  // Test Customer API
  console.log('Testing Customer API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/customers/profile', token))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'PUT', '/api/v2/customers/profile', token, {
    name: 'Test Customer',
    company: 'Test Company',
    phone: '123-456-7890'
  }))
  
  // Test Parts API
  console.log('Testing Parts API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/parts', token))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/parts', token, {
    partName: 'Test Part',
    materialId: 'test-material-id',
    processId: 'test-process-id',
    quantity: 50,
    notes: 'Test part for validation'
  }))
  
  // Test Dashboard API
  console.log('Testing Dashboard API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/dashboard', token))
  
  // Test Authentication endpoints
  console.log('Testing Authentication...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/auth/login', undefined, {
    email: 'validation@formx.com',
    password: 'validationpassword123'
  }))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/auth/register', undefined, {
    email: 'newuser@formx.com',
    password: 'newpassword123',
    name: 'New User'
  }))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/auth/me', token))
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/auth/logout', token))
  
  // Test Pricing API
  console.log('Testing Pricing API...')
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/pricing/calculate', token, {
    materialId: 'test-material-id',
    processId: 'test-process-id',
    quantity: 100,
    complexity: 'medium'
  }))
  
  return results
}

export async function testFrontendWorkflows(): Promise<TestResult[]> {
  console.log('\n🔄 Testing Frontend Workflows...\n')
  const results: TestResult[] = []
  
  const testUser = await setupTestUser()
  const token = createTestToken(testUser.id, testUser.email, 'user')
  
  // Test Quote Generation Workflow
  console.log('Testing Quote Generation Workflow...')
  
  // 1. Upload part
  const partResult = await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/parts', token, {
    partName: 'Workflow Test Part',
    materialId: 'mat1',
    processId: 'proc1',
    quantity: 25
  })
  results.push(partResult)
  
  // 2. Add to cart
  if (partResult.data?.id) {
    results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/cart/items', token, {
      partId: partResult.data.id,
      quantity: 1
    }))
  }
  
  // 3. Create RFQ
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/rfqs', token, {
    cartId: 'test-cart-id',
    notes: 'Workflow test RFQ'
  }))
  
  // 4. Get quote
  results.push(await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/quotes', token))
  
  return results
}

export async function testFrontendSecurity(): Promise<TestResult[]> {
  console.log('\n🔒 Testing Frontend Security...\n')
  const results: TestResult[] = []
  
  // Test CORS headers
  console.log('Testing CORS...')
  const corsResult = await testEndpoint(TEST_CONFIG.frontendUrl, 'OPTIONS', '/api/v2/cart')
  corsResult.success = corsResult.status === 200 || corsResult.status === 204
  results.push(corsResult)
  
  // Test rate limiting (if implemented)
  console.log('Testing Rate Limiting...')
  for (let i = 0; i < 5; i++) {
    await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/health')
  }
  // The last request might be rate limited
  const rateLimitTest = await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/health')
  results.push(rateLimitTest)
  
  // Test SQL injection protection
  console.log('Testing SQL Injection Protection...')
  const sqlInjectionTest = await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/v2/parts?id=1; DROP TABLE parts;--')
  sqlInjectionTest.success = sqlInjectionTest.status !== 500 // Should not crash
  results.push(sqlInjectionTest)
  
  // Test XSS protection
  console.log('Testing XSS Protection...')
  const testUser = await setupTestUser()
  const token = createTestToken(testUser.id, testUser.email, 'user')
  const xssTest = await testEndpoint(TEST_CONFIG.frontendUrl, 'POST', '/api/v2/parts', token, {
    partName: '<script>alert("XSS")</script>',
    materialId: 'test',
    processId: 'test',
    quantity: 1
  })
  results.push(xssTest)
  
  return results
}

export async function testFrontendPerformance(): Promise<TestResult[]> {
  console.log('\n⚡ Testing Frontend Performance...\n')
  const results: TestResult[] = []
  
  const testUser = await setupTestUser()
  const token = createTestToken(testUser.id, testUser.email, 'user')
  
  // Test response times for critical endpoints
  const criticalEndpoints = [
    '/api/health',
    '/api/v2/cart',
    '/api/v2/dashboard',
    '/api/v2/quotes',
    '/api/v2/orders'
  ]
  
  for (const endpoint of criticalEndpoints) {
    console.log(`Testing ${endpoint} performance...`)
    const result = await testEndpoint(TEST_CONFIG.frontendUrl, 'GET', endpoint, token)
    
    // Check if response time is acceptable (< 500ms for critical endpoints)
    if (result.responseTime > 500) {
      console.log(`  ⚠️ Slow response: ${result.responseTime}ms`)
    }
    
    results.push(result)
  }
  
  // Test concurrent requests
  console.log('Testing concurrent requests...')
  const concurrentPromises = []
  for (let i = 0; i < 10; i++) {
    concurrentPromises.push(testEndpoint(TEST_CONFIG.frontendUrl, 'GET', '/api/health'))
  }
  const concurrentResults = await Promise.all(concurrentPromises)
  results.push(...concurrentResults)
  
  return results
}

// Main test runner for frontend API
export async function runFrontendAPITests(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🛍️ FRONTEND API VALIDATION SUITE')
  console.log('='.repeat(60))
  
  const allResults: TestResult[] = []
  
  // Run all test suites
  allResults.push(...await testFrontendAPI())
  allResults.push(...await testFrontendWorkflows())
  allResults.push(...await testFrontendSecurity())
  allResults.push(...await testFrontendPerformance())
  
  // Print summary
  console.log(formatTestResults(allResults))
  
  return
}

// Export for use in main validation script
export default runFrontendAPITests