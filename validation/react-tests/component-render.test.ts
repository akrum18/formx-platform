import { TEST_CONFIG } from '../api-tests/common-api.test'

export interface ComponentTestResult {
  component: string
  app: string
  rendered: boolean
  hasErrors: boolean
  errorMessage?: string
  responseTime: number
}

async function testPageRender(url: string, pagePath: string): Promise<ComponentTestResult> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${url}${pagePath}`)
    const html = await response.text()
    
    // Check for React error indicators
    const hasErrors = html.includes('Error:') || 
                     html.includes('Cannot read') || 
                     html.includes('is not defined') ||
                     html.includes('Unhandled Runtime Error')
    
    // Check if React app mounted
    const hasReactRoot = html.includes('__next') || html.includes('root')
    
    return {
      component: pagePath,
      app: url.includes('4000') ? 'admin' : url.includes('4001') ? 'frontend' : 'erp',
      rendered: response.ok && hasReactRoot,
      hasErrors,
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      component: pagePath,
      app: url.includes('4000') ? 'admin' : url.includes('4001') ? 'frontend' : 'erp',
      rendered: false,
      hasErrors: true,
      errorMessage: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime
    }
  }
}

export async function testAdminComponents(): Promise<ComponentTestResult[]> {
  console.log('\n🎨 Testing Admin React Components...\n')
  const results: ComponentTestResult[] = []
  
  const adminPages = [
    '/',                // Dashboard
    '/materials',       // Materials page
    '/processes',       // Processes page
    '/routings',        // Routings page
    '/finishes',        // Finishes page
    '/margins',         // Margins page
    '/versions',        // Versions page
    '/features',        // Feature flags page
    '/login',          // Login page
  ]
  
  for (const page of adminPages) {
    console.log(`Testing ${page}...`)
    const result = await testPageRender(TEST_CONFIG.adminUrl, page)
    results.push(result)
    
    if (!result.rendered) {
      console.log(`  ❌ Failed to render: ${result.errorMessage || 'Unknown error'}`)
    } else if (result.hasErrors) {
      console.log(`  ⚠️ Rendered with errors`)
    } else {
      console.log(`  ✅ Rendered successfully (${result.responseTime}ms)`)
    }
  }
  
  return results
}

export async function testFrontendComponents(): Promise<ComponentTestResult[]> {
  console.log('\n🛍️ Testing Frontend React Components...\n')
  const results: ComponentTestResult[] = []
  
  const frontendPages = [
    '/',                // Home page
    '/quote',           // Quote page
    '/cart',            // Cart page
    '/materials',       // Materials showcase
    '/services',        // Services page
    '/about',           // About page
    '/contact',         // Contact page
    '/dashboard',       // Customer dashboard
    '/orders',          // Orders page
    '/quotes',          // Quotes page
  ]
  
  for (const page of frontendPages) {
    console.log(`Testing ${page}...`)
    const result = await testPageRender(TEST_CONFIG.frontendUrl, page)
    results.push(result)
    
    if (!result.rendered) {
      console.log(`  ❌ Failed to render: ${result.errorMessage || 'Unknown error'}`)
    } else if (result.hasErrors) {
      console.log(`  ⚠️ Rendered with errors`)
    } else {
      console.log(`  ✅ Rendered successfully (${result.responseTime}ms)`)
    }
  }
  
  return results
}

export async function testERPComponents(): Promise<ComponentTestResult[]> {
  console.log('\n📊 Testing ERP React Components...\n')
  const results: ComponentTestResult[] = []
  
  const erpPages = [
    '/',                // Dashboard
    '/customers',       // Customers
    '/estimates',       // Estimates
    '/jobs',            // Jobs
    '/leads',           // Leads
    '/opportunities',   // Opportunities
    '/orders',          // Orders
    '/projects',        // Projects
    '/quality',         // Quality
    '/rfq',             // RFQs
    '/shipping',        // Shipping
    '/travelers',       // Travelers
    '/work-orders',     // Work Orders
  ]
  
  for (const page of erpPages) {
    console.log(`Testing ${page}...`)
    const result = await testPageRender(TEST_CONFIG.erpUrl, page)
    results.push(result)
    
    if (!result.rendered) {
      console.log(`  ❌ Failed to render: ${result.errorMessage || 'Unknown error'}`)
    } else if (result.hasErrors) {
      console.log(`  ⚠️ Rendered with errors`)
    } else {
      console.log(`  ✅ Rendered successfully (${result.responseTime}ms)`)
    }
  }
  
  return results
}

export async function testReactHydration(): Promise<void> {
  console.log('\n💧 Testing React Hydration...\n')
  
  // This tests if React properly hydrates on the client side
  const testUrls = [
    TEST_CONFIG.adminUrl,
    TEST_CONFIG.frontendUrl,
    TEST_CONFIG.erpUrl
  ]
  
  for (const url of testUrls) {
    const response = await fetch(url)
    const html = await response.text()
    
    // Check for React hydration markers
    const hasHydrationMarkers = html.includes('data-reactroot') || 
                                html.includes('__NEXT_DATA__')
    
    if (hasHydrationMarkers) {
      console.log(`✅ ${url} - Hydration markers present`)
    } else {
      console.log(`⚠️ ${url} - Missing hydration markers`)
    }
  }
}

export async function testClientSideRouting(): Promise<void> {
  console.log('\n🔀 Testing Client-Side Routing...\n')
  
  // Check if Next.js Link components are present
  const response = await fetch(TEST_CONFIG.adminUrl)
  const html = await response.text()
  
  const hasNextLink = html.includes('next/link') || 
                     html.includes('_next/static')
  
  if (hasNextLink) {
    console.log('✅ Client-side routing configured')
  } else {
    console.log('⚠️ Client-side routing may not be configured')
  }
}

export function formatComponentResults(results: ComponentTestResult[]): string {
  const successful = results.filter(r => r.rendered && !r.hasErrors).length
  const withErrors = results.filter(r => r.rendered && r.hasErrors).length
  const failed = results.filter(r => !r.rendered).length
  const avgResponseTime = results.reduce((acc, r) => acc + r.responseTime, 0) / results.length
  
  let output = `\n🎨 Component Test Results\n`
  output += `${'='.repeat(50)}\n`
  output += `✅ Successful: ${successful}\n`
  output += `⚠️ With Errors: ${withErrors}\n`
  output += `❌ Failed: ${failed}\n`
  output += `⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms\n`
  output += `${'='.repeat(50)}\n\n`
  
  if (failed > 0) {
    output += `Failed Components:\n`
    results.filter(r => !r.rendered).forEach(r => {
      output += `  ❌ ${r.app}${r.component}\n`
      if (r.errorMessage) output += `     Error: ${r.errorMessage}\n`
    })
  }
  
  return output
}

// Main test runner for React components
export async function runReactComponentTests(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('⚛️ REACT COMPONENT VALIDATION SUITE')
  console.log('='.repeat(60))
  
  const allResults: ComponentTestResult[] = []
  
  // Run all component tests
  allResults.push(...await testAdminComponents())
  allResults.push(...await testFrontendComponents())
  allResults.push(...await testERPComponents())
  
  // Test hydration and routing
  await testReactHydration()
  await testClientSideRouting()
  
  // Print summary
  console.log(formatComponentResults(allResults))
  
  return
}

// Export for use in main validation script
export default runReactComponentTests