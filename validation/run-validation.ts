#!/usr/bin/env tsx

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { prisma, cleanupTestData } from './api-tests/common-api.test'

// Import test suites
import runAdminAPITests from './api-tests/admin-api.test'
import runFrontendAPITests from './api-tests/frontend-api.test'
import runReactComponentTests from './react-tests/component-render.test'
import runBuildValidation from './nextjs-tests/build-validation'
import runPortValidation from './integration-tests/port-validation.test'

const execAsync = promisify(exec)

interface ValidationReport {
  timestamp: string
  duration: number
  results: {
    portValidation: { passed: boolean, details: string }
    adminAPI: { passed: boolean, details: string }
    frontendAPI: { passed: boolean, details: string }
    reactComponents: { passed: boolean, details: string }
    buildValidation: { passed: boolean, details: string }
  }
  summary: {
    totalTests: number
    passed: number
    failed: number
    successRate: string
  }
  systemInfo: {
    nodeVersion: string
    platform: string
    apps: {
      admin: { running: boolean, port: number }
      frontend: { running: boolean, port: number }
      erp: { running: boolean, port: number }
    }
  }
}

class ValidationOrchestrator {
  private report: ValidationReport
  private startTime: number
  private logOutput: string[] = []

  constructor() {
    this.startTime = Date.now()
    this.report = {
      timestamp: new Date().toISOString(),
      duration: 0,
      results: {
        portValidation: { passed: false, details: '' },
        adminAPI: { passed: false, details: '' },
        frontendAPI: { passed: false, details: '' },
        reactComponents: { passed: false, details: '' },
        buildValidation: { passed: false, details: '' }
      },
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        successRate: '0%'
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        apps: {
          admin: { running: false, port: 4000 },
          frontend: { running: false, port: 4001 },
          erp: { running: false, port: 4002 }
        }
      }
    }
  }

  private log(message: string) {
    console.log(message)
    this.logOutput.push(message)
  }

  private async checkAppsRunning(): Promise<boolean> {
    this.log('\n📡 Checking if apps are running...\n')
    
    const apps = [
      { name: 'admin', port: 4000 },
      { name: 'frontend', port: 4001 },
      { name: 'erp', port: 4002 }
    ]
    
    let allRunning = true
    
    for (const app of apps) {
      try {
        const response = await fetch(`http://localhost:${app.port}/api/health`)
        const isRunning = response.ok || response.status < 500
        
        this.report.systemInfo.apps[app.name as keyof typeof this.report.systemInfo.apps].running = isRunning
        
        if (isRunning) {
          this.log(`  ✅ ${app.name} is running on port ${app.port}`)
        } else {
          this.log(`  ❌ ${app.name} is not running on port ${app.port}`)
          allRunning = false
        }
      } catch {
        this.log(`  ❌ ${app.name} is not running on port ${app.port}`)
        this.report.systemInfo.apps[app.name as keyof typeof this.report.systemInfo.apps].running = false
        allRunning = false
      }
    }
    
    return allRunning
  }

  private async startApps(): Promise<void> {
    this.log('\n🚀 Starting applications...\n')
    
    // Start apps using pnpm scripts
    const startCommands = [
      { cmd: 'PORT=4000 npm run dev', cwd: 'apps/admin', name: 'Admin' },
      { cmd: 'PORT=4001 npm run dev', cwd: 'apps/frontend', name: 'Frontend' },
      { cmd: 'PORT=4002 npm run dev', cwd: 'apps/erp', name: 'ERP' }
    ]
    
    for (const { cmd, cwd, name } of startCommands) {
      this.log(`Starting ${name}...`)
      
      // Start app in background
      exec(cmd, {
        cwd: path.join(process.cwd(), cwd),
        env: { ...process.env }
      }, (error) => {
        if (error) {
          this.log(`Error starting ${name}: ${error.message}`)
        }
      })
    }
    
    // Wait for apps to start
    this.log('\n⏳ Waiting for apps to be ready...')
    await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
    
    // Verify apps started
    await this.checkAppsRunning()
  }

  private async runTestSuite(
    name: string,
    testFn: () => Promise<void>
  ): Promise<{ passed: boolean, details: string }> {
    this.log(`\n🧪 Running ${name}...\n`)
    
    const originalLog = console.log
    const testOutput: string[] = []
    
    // Capture test output
    console.log = (message: string) => {
      testOutput.push(message)
      originalLog(message)
    }
    
    try {
      await testFn()
      console.log = originalLog
      
      const output = testOutput.join('\n')
      const passed = !output.includes('❌') || output.includes('✅ Passed')
      
      return {
        passed,
        details: output.substring(0, 500) // Truncate for report
      }
    } catch (error) {
      console.log = originalLog
      return {
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async run(options: { skipBuild?: boolean, startApps?: boolean } = {}) {
    this.log('\n' + '='.repeat(70))
    this.log('🔍 FORMX PLATFORM VALIDATION SUITE')
    this.log('='.repeat(70))
    this.log(`Timestamp: ${this.report.timestamp}`)
    this.log(`Node Version: ${this.report.systemInfo.nodeVersion}`)
    this.log(`Platform: ${this.report.systemInfo.platform}`)
    this.log('='.repeat(70))
    
    // Check if apps are running
    const appsRunning = await this.checkAppsRunning()
    
    if (!appsRunning && options.startApps) {
      await this.startApps()
    } else if (!appsRunning) {
      this.log('\n⚠️ Apps are not running. Please start them manually or use --start flag')
      this.log('Run the following commands in separate terminals:')
      this.log('  cd apps/admin && PORT=4000 npm run dev')
      this.log('  cd apps/frontend && PORT=4001 npm run dev')
      this.log('  cd apps/erp && PORT=4002 npm run dev')
    }
    
    // Run validation suites
    if (appsRunning || options.startApps) {
      // Port validation
      this.report.results.portValidation = await this.runTestSuite(
        'Port Validation',
        runPortValidation
      )
      
      // API tests
      this.report.results.adminAPI = await this.runTestSuite(
        'Admin API Tests',
        runAdminAPITests
      )
      
      this.report.results.frontendAPI = await this.runTestSuite(
        'Frontend API Tests',
        runFrontendAPITests
      )
      
      // React component tests
      this.report.results.reactComponents = await this.runTestSuite(
        'React Component Tests',
        runReactComponentTests
      )
      
      // Build validation (optional)
      if (!options.skipBuild) {
        this.report.results.buildValidation = await this.runTestSuite(
          'Build Validation',
          runBuildValidation
        )
      }
    }
    
    // Clean up test data
    await cleanupTestData()
    await prisma.$disconnect()
    
    // Calculate summary
    this.report.duration = Date.now() - this.startTime
    const results = Object.values(this.report.results)
    this.report.summary.totalTests = results.length
    this.report.summary.passed = results.filter(r => r.passed).length
    this.report.summary.failed = results.filter(r => !r.passed).length
    this.report.summary.successRate = 
      `${((this.report.summary.passed / this.report.summary.totalTests) * 100).toFixed(1)}%`
    
    // Generate reports
    await this.generateReports()
    
    // Print final summary
    this.printSummary()
  }

  private async generateReports() {
    const reportsDir = path.join(process.cwd(), 'validation', 'reports')
    await fs.mkdir(reportsDir, { recursive: true })
    
    // Generate JSON report
    const jsonPath = path.join(reportsDir, `validation-${Date.now()}.json`)
    await fs.writeFile(jsonPath, JSON.stringify(this.report, null, 2))
    this.log(`\n📄 JSON report saved to: ${jsonPath}`)
    
    // Generate Markdown report
    const mdPath = path.join(reportsDir, `validation-${Date.now()}.md`)
    await fs.writeFile(mdPath, this.generateMarkdownReport())
    this.log(`📄 Markdown report saved to: ${mdPath}`)
    
    // Generate log file
    const logPath = path.join(reportsDir, `validation-${Date.now()}.log`)
    await fs.writeFile(logPath, this.logOutput.join('\n'))
    this.log(`📄 Log file saved to: ${logPath}`)
  }

  private generateMarkdownReport(): string {
    let md = '# FormX Platform Validation Report\n\n'
    md += `**Date:** ${this.report.timestamp}\n`
    md += `**Duration:** ${(this.report.duration / 1000).toFixed(2)}s\n`
    md += `**Success Rate:** ${this.report.summary.successRate}\n\n`
    
    md += '## Summary\n\n'
    md += `- Total Tests: ${this.report.summary.totalTests}\n`
    md += `- Passed: ${this.report.summary.passed}\n`
    md += `- Failed: ${this.report.summary.failed}\n\n`
    
    md += '## System Information\n\n'
    md += `- Node Version: ${this.report.systemInfo.nodeVersion}\n`
    md += `- Platform: ${this.report.systemInfo.platform}\n\n`
    
    md += '### Application Status\n\n'
    md += '| App | Port | Status |\n'
    md += '|-----|------|--------|\n'
    Object.entries(this.report.systemInfo.apps).forEach(([app, info]) => {
      md += `| ${app} | ${info.port} | ${info.running ? '✅ Running' : '❌ Not Running'} |\n`
    })
    
    md += '\n## Test Results\n\n'
    Object.entries(this.report.results).forEach(([test, result]) => {
      md += `### ${test}\n`
      md += `**Status:** ${result.passed ? '✅ Passed' : '❌ Failed'}\n\n`
      if (result.details) {
        md += '```\n'
        md += result.details.substring(0, 500)
        md += '\n```\n\n'
      }
    })
    
    return md
  }

  private printSummary() {
    this.log('\n' + '='.repeat(70))
    this.log('📊 VALIDATION SUMMARY')
    this.log('='.repeat(70))
    this.log(`Duration: ${(this.report.duration / 1000).toFixed(2)}s`)
    this.log(`Success Rate: ${this.report.summary.successRate}`)
    this.log('')
    
    Object.entries(this.report.results).forEach(([test, result]) => {
      this.log(`${result.passed ? '✅' : '❌'} ${test}`)
    })
    
    this.log('')
    
    if (this.report.summary.failed === 0) {
      this.log('🎉 All validation tests passed!')
    } else {
      this.log(`⚠️ ${this.report.summary.failed} test suite(s) failed. Check the reports for details.`)
    }
    
    this.log('='.repeat(70))
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const options = {
    skipBuild: args.includes('--skip-build'),
    startApps: args.includes('--start')
  }
  
  if (args.includes('--help')) {
    console.log(`
FormX Platform Validation Suite

Usage: tsx validation/run-validation.ts [options]

Options:
  --start       Start applications before running tests
  --skip-build  Skip build validation tests (faster)
  --help        Show this help message

Examples:
  tsx validation/run-validation.ts
  tsx validation/run-validation.ts --start
  tsx validation/run-validation.ts --skip-build
    `)
    process.exit(0)
  }
  
  const orchestrator = new ValidationOrchestrator()
  
  try {
    await orchestrator.run(options)
    process.exit(0)
  } catch (error) {
    console.error('❌ Validation failed with error:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export default ValidationOrchestrator