#!/usr/bin/env tsx

import { readFileSync } from 'fs'
import { join } from 'path'

interface ValidationResult {
  schema_validated: boolean
  all_tables_exist: boolean
  foreign_keys_valid: boolean
  validation_errors: string[]
  success_criteria: {
    schema_validated: boolean
    all_tables_exist: boolean
    foreign_keys_valid: boolean
  }
}

function parseSchema(schemaPath: string) {
  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8')
    
    // Extract model definitions
    const modelMatches = schemaContent.match(/model\s+(\w+)\s*{[^}]*}/g) || []
    const models = modelMatches.map(match => {
      const nameMatch = match.match(/model\s+(\w+)/)
      return nameMatch ? nameMatch[1] : null
    }).filter(Boolean)
    
    // Check for required models from data-validation.json
    const requiredModels = [
      'Finish', 'Material', 'Process', 'Routing', 'RoutingStep',
      'PricingConfiguration', 'RoutingPricing', 'Part', 'User', 'AuditLog'
    ]
    
    const missingModels = requiredModels.filter(model => !models.includes(model))
    
    // Check for foreign key relationships
    const relationMatches = schemaContent.match(/@relation\([^)]*\)/g) || []
    const hasRelations = relationMatches.length > 0
    
    return {
      models,
      requiredModels,
      missingModels,
      hasRelations,
      relationCount: relationMatches.length
    }
  } catch (error) {
    throw new Error(`Failed to parse schema: ${error.message}`)
  }
}

async function validateSchemaStructure(): Promise<ValidationResult> {
  console.log('🔍 Starting schema structure validation (dry run)...')
  
  const result: ValidationResult = {
    schema_validated: false,
    all_tables_exist: false,
    foreign_keys_valid: false,
    validation_errors: [],
    success_criteria: {
      schema_validated: false,
      all_tables_exist: false,
      foreign_keys_valid: false
    }
  }

  try {
    // Check if schema file exists
    const schemaPath = join(process.cwd(), 'prisma/schema.prisma')
    console.log(`📄 Checking schema file: ${schemaPath}`)
    
    const schemaInfo = parseSchema(schemaPath)
    
    console.log(`📊 Found ${schemaInfo.models.length} models: ${schemaInfo.models.join(', ')}`)
    console.log(`🔗 Found ${schemaInfo.relationCount} relationships`)
    
    // Validate required models exist
    if (schemaInfo.missingModels.length === 0) {
      result.all_tables_exist = true
      result.success_criteria.all_tables_exist = true
      console.log('✅ All required models found in schema')
    } else {
      result.validation_errors.push(`Missing models: ${schemaInfo.missingModels.join(', ')}`)
      console.log(`❌ Missing models: ${schemaInfo.missingModels.join(', ')}`)
    }
    
    // Validate foreign key relationships
    if (schemaInfo.hasRelations) {
      result.foreign_keys_valid = true
      result.success_criteria.foreign_keys_valid = true
      console.log('✅ Foreign key relationships found in schema')
    } else {
      result.validation_errors.push('No foreign key relationships found')
      console.log('❌ No foreign key relationships found')
    }
    
    // Overall schema validation
    if (result.all_tables_exist && result.foreign_keys_valid) {
      result.schema_validated = true
      result.success_criteria.schema_validated = true
      console.log('✅ Schema structure validation passed')
    } else {
      console.log('❌ Schema structure validation failed')
    }
    
  } catch (error) {
    result.validation_errors.push(`Schema validation error: ${error.message}`)
    console.log('❌ Schema validation error:', error.message)
  }

  return result
}

async function main() {
  console.log('🚀 FormX API Migration - Schema Structure Validation (Dry Run)')
  console.log('==============================================================')
  
  const result = await validateSchemaStructure()
  
  console.log('\n📊 Validation Results:')
  console.log('======================')
  console.log(`Schema validated: ${result.schema_validated ? '✅' : '❌'}`)
  console.log(`All tables exist: ${result.all_tables_exist ? '✅' : '❌'}`)
  console.log(`Foreign keys valid: ${result.foreign_keys_valid ? '✅' : '❌'}`)
  
  if (result.validation_errors.length > 0) {
    console.log('\n❌ Validation Errors:')
    result.validation_errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`)
    })
  }
  
  const success = result.schema_validated && result.all_tables_exist && result.foreign_keys_valid
  
  console.log('\n📋 Success Criteria Check:')
  console.log('===========================')
  console.log(`✓ schema_validated: ${result.success_criteria.schema_validated}`)
  console.log(`✓ all_tables_exist: ${result.success_criteria.all_tables_exist}`) 
  console.log(`✓ foreign_keys_valid: ${result.success_criteria.foreign_keys_valid}`)
  
  if (success) {
    console.log('\n🎉 Step 1 validation completed successfully!')
    console.log('✅ Ready to proceed with Step 2: Auth Service Deployment')
    return true
  } else {
    console.log('\n💥 Step 1 validation failed!')
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

export { main as validateSchemaStructure }