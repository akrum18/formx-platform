#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface FrontendRefactorResult {
  api_endpoints_created: boolean
  react_query_hooks_implemented: boolean
  ui_patterns_preserved: boolean
  validation_errors: string[]
  success_criteria: {
    api_endpoints_created: boolean
    react_query_hooks_implemented: boolean
    ui_patterns_preserved: boolean
  }
}

async function validateFrontendRefactor(): Promise<FrontendRefactorResult> {
  console.log('🔍 Starting frontend module refactoring validation...')
  
  const result: FrontendRefactorResult = {
    api_endpoints_created: false,
    react_query_hooks_implemented: false,
    ui_patterns_preserved: false,
    validation_errors: [],
    success_criteria: {
      api_endpoints_created: false,
      react_query_hooks_implemented: false,
      ui_patterns_preserved: false
    }
  }

  try {
    // Check API endpoints
    console.log('🌐 Checking API endpoints...')
    const requiredEndpoints = [
      'apps/frontend/app/api/v2/parts/route.ts',
      'apps/frontend/app/api/v2/pricing/calculate/route.ts'
    ]

    let allEndpointsExist = true
    for (const endpoint of requiredEndpoints) {
      const endpointPath = join(process.cwd(), endpoint)
      if (existsSync(endpointPath)) {
        const content = readFileSync(endpointPath, 'utf-8')
        const hasAuth = content.includes('requireAuth')
        const hasPrisma = content.includes('prisma')
        
        if (hasAuth && hasPrisma) {
          console.log(`✅ Endpoint ${endpoint} properly implemented`)
        } else {
          result.validation_errors.push(`Endpoint ${endpoint} missing auth or database integration`)
          allEndpointsExist = false
        }
      } else {
        result.validation_errors.push(`Endpoint ${endpoint} not found`)
        allEndpointsExist = false
      }
    }

    if (allEndpointsExist) {
      result.api_endpoints_created = true
      result.success_criteria.api_endpoints_created = true
    }

    // Check React Query hooks
    console.log('⚛️  Checking React Query hooks...')
    const hooksFiles = [
      'apps/frontend/lib/api/parts.ts',
      'apps/frontend/lib/api/pricing.ts'
    ]

    let allHooksExist = true
    for (const hookFile of hooksFiles) {
      const hookPath = join(process.cwd(), hookFile)
      if (existsSync(hookPath)) {
        const content = readFileSync(hookPath, 'utf-8')
        const hasUseQuery = content.includes('useQuery')
        const hasUseMutation = content.includes('useMutation')
        
        if (hasUseQuery || hasUseMutation) {
          console.log(`✅ Hook file ${hookFile} properly implemented`)
        } else {
          result.validation_errors.push(`Hook file ${hookFile} missing React Query hooks`)
          allHooksExist = false
        }
      } else {
        result.validation_errors.push(`Hook file ${hookFile} not found`)
        allHooksExist = false
      }
    }

    if (allHooksExist) {
      result.react_query_hooks_implemented = true
      result.success_criteria.react_query_hooks_implemented = true
    }

    // Check React Query provider setup
    console.log('📦 Checking React Query provider setup...')
    const queryProviderPath = join(process.cwd(), 'apps/frontend/components/providers/query-provider.tsx')
    const layoutPath = join(process.cwd(), 'apps/frontend/app/layout.tsx')

    if (existsSync(queryProviderPath) && existsSync(layoutPath)) {
      const providerContent = readFileSync(queryProviderPath, 'utf-8')
      const layoutContent = readFileSync(layoutPath, 'utf-8')
      
      if (providerContent.includes('QueryClientProvider') && layoutContent.includes('QueryProvider')) {
        console.log('✅ React Query provider properly set up')
      } else {
        result.validation_errors.push('React Query provider setup incomplete')
      }
    } else {
      result.validation_errors.push('React Query provider files missing')
    }

    // Check for preserved UI patterns (simplified check)
    console.log('🎨 Checking UI patterns preservation...')
    const quoteClientPath = join(process.cwd(), 'apps/frontend/app/quote/quote-client.tsx')
    
    if (existsSync(quoteClientPath)) {
      const content = readFileSync(quoteClientPath, 'utf-8')
      
      // Check for key UI components
      const uiComponents = ['Card', 'Button', 'FileUploader', 'Tabs']
      const hasAllComponents = uiComponents.every(component => content.includes(component))
      
      if (hasAllComponents) {
        result.ui_patterns_preserved = true
        result.success_criteria.ui_patterns_preserved = true
        console.log('✅ UI patterns preserved in quote client')
      } else {
        result.validation_errors.push('Some UI components missing from quote client')
        console.log('❌ Some UI components missing from quote client')
      }
    } else {
      result.validation_errors.push('Quote client file not found')
    }

    // Check package.json dependencies
    console.log('📋 Checking package dependencies...')
    const packageJsonPath = join(process.cwd(), 'apps/frontend/package.json')
    
    if (existsSync(packageJsonPath)) {
      const packageContent = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      
      const requiredDeps = ['@tanstack/react-query', '@formx/database', '@formx/auth']
      const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep])
      
      if (missingDeps.length === 0) {
        console.log('✅ All required dependencies present')
      } else {
        result.validation_errors.push(`Missing dependencies: ${missingDeps.join(', ')}`)
      }
    }

  } catch (error) {
    result.validation_errors.push(`Unexpected error: ${error.message}`)
    console.log('❌ Unexpected error during frontend refactor validation:', error.message)
  }

  return result
}

async function main() {
  console.log('🚀 FormX API Migration - Frontend Module Refactoring Validation')
  console.log('==============================================================')
  
  const result = await validateFrontendRefactor()
  
  console.log('\n📊 Frontend Refactoring Validation Results:')
  console.log('============================================')
  console.log(`API endpoints created: ${result.api_endpoints_created ? '✅' : '❌'}`)
  console.log(`React Query hooks implemented: ${result.react_query_hooks_implemented ? '✅' : '❌'}`)
  console.log(`UI patterns preserved: ${result.ui_patterns_preserved ? '✅' : '❌'}`)
  
  if (result.validation_errors.length > 0) {
    console.log('\n❌ Validation Errors:')
    result.validation_errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`)
    })
  }
  
  const success = result.api_endpoints_created && result.react_query_hooks_implemented && result.ui_patterns_preserved
  
  console.log('\n📋 Success Criteria Check:')
  console.log('===========================')
  console.log(`✓ api_endpoints_created: ${result.success_criteria.api_endpoints_created}`)
  console.log(`✓ react_query_hooks_implemented: ${result.success_criteria.react_query_hooks_implemented}`) 
  console.log(`✓ ui_patterns_preserved: ${result.success_criteria.ui_patterns_preserved}`)
  
  if (success) {
    console.log('\n🎉 Step 4 validation completed successfully!')
    console.log('✅ Frontend module refactoring is complete')
    console.log('✅ Ready to proceed with Step 5: Data Migration')
    return true
  } else {
    console.log('\n💥 Step 4 validation failed!')
    console.log('❌ Please fix the issues above before proceeding')
    return false
  }
}

if (require.main === module) {
  main()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}