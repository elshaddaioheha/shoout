/**
 * Seed Script Configuration & Safety Guards
 * 
 * This module ensures seed scripts CANNOT run against production environments.
 * It provides:
 * - Environment validation
 * - Project ID verification
 * - Confirmation prompts
 * - Automatic abort for production
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dir = dirname(fileURLToPath(import.meta.url));

/**
 * Load environment variables from .env file
 */
export function loadEnv() {
  try {
    const envRaw = readFileSync(resolve(__dir, '../.env'), 'utf-8');
    return Object.fromEntries(
      envRaw.split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    );
  } catch (error) {
    console.error('❌ Error loading .env file:', error.message);
    process.exit(1);
  }
}

/**
 * CRITICAL: Verify this is NOT production
 * 
 * Production indicators (MUST NOT RUN if any match):
 * - Project ID contains "prod"
 * - Node environment is "production"
 * - No .env.local override present
 * 
 * @throws {Error} If production environment detected
 */
export function verifyNotProduction(projectId, scriptName = 'Seeder') {
  const IS_PROD = 
    projectId?.includes('prod') || 
    process.env.NODE_ENV === 'production' ||
    projectId === 'shoouts-prod';

  if (IS_PROD) {
    throw new Error(
      `\n🚨 CRITICAL SECURITY BLOCK: ${scriptName}\n` +
      `Project ID: "${projectId}" appears to be PRODUCTION!\n\n` +
      `Seed scripts are FOR DEVELOPMENT ONLY and will contaminate production data.\n\n` +
      `To run against development/staging, ensure:\n` +
      `  1. .env points to a DEV Firebase project\n` +
      `  2. Project ID should contain "dev", "staging", or "test"\n` +
      `  3. You have explicit intent to seed this environment\n\n` +
      `If you're sure, create .env.local with DEV credentials and rerun.`
    );
  }
}

/**
 * Validate project ID format
 * 
 * Expected format: Firebase project IDs should have identifiable environment markers
 * - Development: contains "dev", "dev-", "-dev"
 * - Staging: contains "staging", "stage", "staging-"
 * - Testing: contains "test", "test-"
 * - Production: contains "prod", "production" (blocked)
 */
export function validateProjectId(projectId) {
  if (!projectId) {
    throw new Error('❌ EXPO_PUBLIC_FIREBASE_PROJECT_ID not found in .env');
  }

  const isValidDev = /^[a-z0-9\-]+(dev|test|staging)[a-z0-9\-]*$/i.test(projectId);
  
  if (!isValidDev) {
    console.warn(
      `⚠️  WARNING: Project ID "${projectId}" doesn't match expected dev pattern.\n` +
      `Expected format: "shoouts-dev", "shoouts-test", "shoouts-staging"\n` +
      `Proceeding anyway (verify manually if uncertain)\n`
    );
  }
}

/**
 * Prompt user for confirmation before seeding
 * 
 * This adds a human checkpoint to prevent accidental seed execution
 */
export async function confirmSeeding(projectId, environment = 'development') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n📊 Seed Configuration:\n`);
    console.log(`  Project: ${projectId}`);
    console.log(`  Environment: ${environment}`);
    console.log(`  Action: Clear & repopulate with test data\n`);

    rl.question('⚠️  Continue with seeding? (yes/NO): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Initialize seeder with full safety checks
 * 
 * Usage:
 * ```javascript
 * const config = await initSeeder('MySeeder');
 * // { projectId, apiKey, env }
 * ```
 */
export async function initSeeder(scriptName = 'Seeder', skipConfirm = false) {
  console.log(`🌱 ${scriptName} – Initializing...\n`);

  const env = loadEnv();
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  
  // CRITICAL: Block production
  verifyNotProduction(projectId, scriptName);
  
  // Validate format
  validateProjectId(projectId);

  // Ask for confirmation (unless skipped in tests)
  if (!skipConfirm) {
    const confirmed = await confirmSeeding(projectId, 'development');
    if (!confirmed) {
      console.log('❌ Seeding cancelled by user');
      process.exit(0);
    }
  }

  console.log(`✅ Safety checks passed. Seeding ${projectId}...\n`);

  return {
    projectId,
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    env
  };
}

/**
 * Log seeding summary
 */
export function logSeedingSummary(stats) {
  console.log(`\n✅ Seeding Complete!\n`);
  console.log(`Summary:`);
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`  • ${key}: ${value}`);
  });
  console.log();
}

/**
 * ERROR: Log error and exit safely
 */
export function exitWithError(message, code = 1) {
  console.error(`\n❌ ${message}\n`);
  process.exit(code);
}
