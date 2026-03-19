#!/usr/bin/env node

/**
 * Migration Helper: Find all components using the old insecure role reference
 * 
 * Usage:
 *   node scripts/findInsecureRoleUsage.js
 * 
 * This script searches for places where actualRole is accessed via useUserStore
 * (the insecure way) and suggests updates.
 */

const fs = require('fs');
const path = require('path');

const INSECURE_PATTERNS = [
  /useUserStore\(\)\.actualRole/g,
  /const\s*{\s*actualRole\s*}\s*=\s*useUserStore\(\)/g,
];

const SECURE_ALTERNATIVES = [
  'useAuthStore().actualRole',
  'const { actualRole } = useAuthStore()',
];

function findInsecureRoleUsage(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const results = [];

  function walkDir(currentPath) {
    try {
      const files = fs.readdirSync(currentPath);

      for (const file of files) {
        // Skip common directories
        if (['node_modules', '.git', '__tests__', 'build', 'dist', '.next'].includes(file)) {
          continue;
        }

        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (extensions.some(ext => filePath.endsWith(ext))) {
          const content = fs.readFileSync(filePath, 'utf-8');
          let found = false;

          for (let i = 0; i < INSECURE_PATTERNS.length; i++) {
            if (INSECURE_PATTERNS[i].test(content)) {
              found = true;
              const lines = content.split('\n');
              lines.forEach((line, lineNum) => {
                if (INSECURE_PATTERNS[i].test(line)) {
                  const relativePath = path.relative(process.cwd(), filePath);
                  results.push({
                    file: relativePath,
                    line: lineNum + 1,
                    code: line.trim(),
                    pattern: i,
                  });
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error in ${currentPath}:`, error.message);
    }
  }

  walkDir(dir);
  return results;
}

function main() {
  const projectRoot = process.cwd();
  const appDir = path.join(projectRoot, 'app');
  const hooksDir = path.join(projectRoot, 'hooks');
  const utilsDir = path.join(projectRoot, 'utils');
  const componentsDir = path.join(projectRoot, 'components');

  console.log('🔍 Scanning for insecure role usage...\n');

  const results = [
    ...findInsecureRoleUsage(appDir),
    ...findInsecureRoleUsage(hooksDir),
    ...findInsecureRoleUsage(utilsDir),
    ...findInsecureRoleUsage(componentsDir),
  ];

  if (results.length === 0) {
    console.log('✅ No insecure role usage found! Your app is secure.');
    return;
  }

  console.log(`⚠️  Found ${results.length} instance(s) of insecure role usage:\n`);

  results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.file}:${result.line}`);
    console.log(`   Code: ${result.code}`);
    console.log(`   Fix:  Replace useUserStore() with useAuthStore()`);
    console.log(`   Alternative: ${SECURE_ALTERNATIVES[result.pattern]}\n`);
  });

  console.log(`\n📋 Summary:`);
  console.log(`   Total issues: ${results.length}`);
  console.log(`   Action: Replace all useUserStore() references with useAuthStore()`);
  console.log(`   Note: Import useAuthStore from '@/store/useAuthStore'\n`);
}

main();
