import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

export interface BuildResult {
  app: string
  success: boolean
  duration: number
  errors: string[]
  warnings: string[]
}

export async function buildApp(appPath: string, appName: string): Promise<BuildResult> {
  console.log(`\n🔨 Building ${appName}...`)
  const startTime = Date.now()
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: appPath,
      env: { ...process.env, NODE_ENV: 'production' }
    })
    
    // Parse build output for errors and warnings
    const output = stdout + stderr
    const lines = output.split('\n')
    
    lines.forEach(line => {
      if (line.includes('Error:') || line.includes('ERROR')) {
        errors.push(line.trim())
      } else if (line.includes('Warning:') || line.includes('WARN')) {
        warnings.push(line.trim())
      }
    })
    
    // Check if .next directory was created
    const nextDirExists = await fs.access(path.join(appPath, '.next'))
      .then(() => true)
      .catch(() => false)
    
    return {
      app: appName,
      success: nextDirExists && errors.length === 0,
      duration: Date.now() - startTime,
      errors,
      warnings
    }
  } catch (error) {
    return {
      app: appName,
      success: false,
      duration: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings
    }
  }
}

export async function typeCheckApp(appPath: string, appName: string): Promise<boolean> {
  console.log(`\n📝 Type checking ${appName}...`)
  
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
      cwd: appPath
    })
    
    if (stderr && stderr.includes('error')) {
      console.log(`  ❌ Type errors found:`)
      console.log(stderr)
      return false
    }
    
    console.log(`  ✅ No type errors`)
    return true
  } catch (error) {
    console.log(`  ❌ Type check failed: ${error}`)
    return false
  }
}

export async function lintApp(appPath: string, appName: string): Promise<boolean> {
  console.log(`\n🔍 Linting ${appName}...`)
  
  try {
    const { stdout, stderr } = await execAsync('npm run lint', {
      cwd: appPath
    })
    
    if (stderr && stderr.includes('error')) {
      console.log(`  ❌ Lint errors found:`)
      console.log(stderr)
      return false
    }
    
    console.log(`  ✅ No lint errors`)
    return true
  } catch (error) {
    console.log(`  ❌ Linting failed: ${error}`)
    return false
  }
}

export async function checkBundleSize(appPath: string, appName: string): Promise<void> {
  console.log(`\n📦 Checking bundle size for ${appName}...`)
  
  try {
    const nextDir = path.join(appPath, '.next')
    const staticDir = path.join(nextDir, 'static')
    
    // Get total size of static directory
    const getDirectorySize = async (dir: string): Promise<number> => {
      let totalSize = 0
      try {
        const files = await fs.readdir(dir, { withFileTypes: true })
        
        for (const file of files) {
          const filePath = path.join(dir, file.name)
          if (file.isDirectory()) {
            totalSize += await getDirectorySize(filePath)
          } else {
            const stats = await fs.stat(filePath)
            totalSize += stats.size
          }
        }
      } catch {
        // Directory might not exist
      }
      return totalSize
    }
    
    const bundleSize = await getDirectorySize(staticDir)
    const bundleSizeMB = (bundleSize / 1024 / 1024).toFixed(2)
    
    console.log(`  Bundle size: ${bundleSizeMB} MB`)
    
    if (bundleSize > 5 * 1024 * 1024) { // 5MB warning threshold
      console.log(`  ⚠️ Large bundle size detected`)
    } else {
      console.log(`  ✅ Bundle size is reasonable`)
    }
  } catch (error) {
    console.log(`  ⚠️ Could not check bundle size: ${error}`)
  }
}

export async function validateNextConfig(appPath: string, appName: string): Promise<boolean> {
  console.log(`\n⚙️ Validating Next.js config for ${appName}...`)
  
  try {
    const configPath = path.join(appPath, 'next.config.mjs')
    const configExists = await fs.access(configPath)
      .then(() => true)
      .catch(() => false)
    
    if (!configExists) {
      console.log(`  ⚠️ No next.config.mjs found`)
      return false
    }
    
    const configContent = await fs.readFile(configPath, 'utf-8')
    
    // Check for important configurations
    const checks = {
      'Standalone output': configContent.includes("output: 'standalone'"),
      'Image optimization': configContent.includes('images:'),
      'TypeScript strict': !configContent.includes('ignoreBuildErrors: true'),
      'ESLint enabled': !configContent.includes('ignoreDuringBuilds: true')
    }
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '⚠️'} ${check}`)
    })
    
    return Object.values(checks).every(Boolean)
  } catch (error) {
    console.log(`  ❌ Config validation failed: ${error}`)
    return false
  }
}

export async function checkEnvironmentVariables(appPath: string, appName: string): Promise<boolean> {
  console.log(`\n🔐 Checking environment variables for ${appName}...`)
  
  try {
    const envExamplePath = path.join(appPath, '.env.example')
    const envLocalPath = path.join(appPath, '.env.local')
    
    const exampleExists = await fs.access(envExamplePath)
      .then(() => true)
      .catch(() => false)
    
    const localExists = await fs.access(envLocalPath)
      .then(() => true)
      .catch(() => false)
    
    if (!exampleExists) {
      console.log(`  ⚠️ No .env.example found`)
    }
    
    if (!localExists) {
      console.log(`  ⚠️ No .env.local found`)
      return false
    }
    
    const envContent = await fs.readFile(envLocalPath, 'utf-8')
    
    // Check for required variables
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET'
    ]
    
    const missingVars = requiredVars.filter(varName => 
      !envContent.includes(varName)
    )
    
    if (missingVars.length > 0) {
      console.log(`  ❌ Missing environment variables: ${missingVars.join(', ')}`)
      return false
    }
    
    console.log(`  ✅ All required environment variables present`)
    return true
  } catch (error) {
    console.log(`  ❌ Environment check failed: ${error}`)
    return false
  }
}

export function formatBuildResults(results: BuildResult[]): string {
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0) / 1000 // Convert to seconds
  
  let output = `\n🏗️ Build Validation Results\n`
  output += `${'='.repeat(50)}\n`
  output += `✅ Successful: ${successful}\n`
  output += `❌ Failed: ${failed}\n`
  output += `⏱️  Total Duration: ${totalDuration.toFixed(2)}s\n`
  output += `${'='.repeat(50)}\n\n`
  
  results.forEach(result => {
    output += `${result.app}: ${result.success ? '✅' : '❌'} (${(result.duration / 1000).toFixed(2)}s)\n`
    
    if (result.errors.length > 0) {
      output += `  Errors:\n`
      result.errors.forEach(error => {
        output += `    - ${error}\n`
      })
    }
    
    if (result.warnings.length > 0) {
      output += `  Warnings:\n`
      result.warnings.forEach(warning => {
        output += `    - ${warning}\n`
      })
    }
  })
  
  return output
}

// Main build validation runner
export async function runBuildValidation(): Promise<void> {
  console.log('\n' + '='.repeat(60))
  console.log('🏗️ NEXT.JS BUILD VALIDATION SUITE')
  console.log('='.repeat(60))
  
  const apps = [
    { path: '/home/austin/codes/FormX/formx-platform/apps/admin', name: 'Admin' },
    { path: '/home/austin/codes/FormX/formx-platform/apps/frontend', name: 'Frontend' },
    { path: '/home/austin/codes/FormX/formx-platform/apps/erp', name: 'ERP' }
  ]
  
  const buildResults: BuildResult[] = []
  
  for (const app of apps) {
    console.log(`\n${'='.repeat(40)}`)
    console.log(`Testing ${app.name} App`)
    console.log('='.repeat(40))
    
    // Check environment variables
    await checkEnvironmentVariables(app.path, app.name)
    
    // Validate Next.js config
    await validateNextConfig(app.path, app.name)
    
    // Type check
    await typeCheckApp(app.path, app.name)
    
    // Lint
    await lintApp(app.path, app.name)
    
    // Build
    const buildResult = await buildApp(app.path, app.name)
    buildResults.push(buildResult)
    
    // Check bundle size if build succeeded
    if (buildResult.success) {
      await checkBundleSize(app.path, app.name)
    }
  }
  
  // Print summary
  console.log(formatBuildResults(buildResults))
  
  return
}

// Export for use in main validation script
export default runBuildValidation