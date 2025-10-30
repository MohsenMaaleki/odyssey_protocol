#!/usr/bin/env node
/**
 * Pre-deployment validation script
 * Checks that all required files and configurations are in place
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const errors = [];
const warnings = [];
const success = [];

console.log('🚀 Odyssey Protocol - Pre-Deployment Validation\n');

// Check devvit.json
console.log('📋 Checking devvit.json...');
try {
  const devvitPath = 'devvit.json';
  if (!existsSync(devvitPath)) {
    errors.push('devvit.json not found');
  } else {
    const devvit = JSON.parse(readFileSync(devvitPath, 'utf-8'));
    
    // Check required fields
    if (!devvit.name) errors.push('devvit.json: missing "name" field');
    if (!devvit.post) errors.push('devvit.json: missing "post" configuration');
    if (!devvit.server) errors.push('devvit.json: missing "server" configuration');
    
    // Check permissions
    const requiredPermissions = ['identity', 'read', 'edit', 'modposts', 'structuredData'];
    const permissions = devvit.permissions || [];
    
    requiredPermissions.forEach(perm => {
      if (!permissions.includes(perm)) {
        warnings.push(`devvit.json: missing recommended permission "${perm}"`);
      } else {
        success.push(`Permission "${perm}" configured`);
      }
    });
    
    // Check realtime
    if (devvit.realtime === true) {
      success.push('Realtime enabled');
    } else {
      warnings.push('Realtime not enabled - HUD updates will use polling only');
    }
    
    // Check scheduler
    if (devvit.scheduler && devvit.scheduler.tasks) {
      const tasks = Object.keys(devvit.scheduler.tasks);
      success.push(`Scheduler configured with ${tasks.length} tasks: ${tasks.join(', ')}`);
    } else {
      warnings.push('Scheduler not configured - countdowns will not auto-execute');
    }
  }
} catch (err) {
  errors.push(`devvit.json: ${err.message}`);
}

// Check package.json
console.log('📦 Checking package.json...');
try {
  const pkgPath = 'package.json';
  if (!existsSync(pkgPath)) {
    errors.push('package.json not found');
  } else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    
    if (pkg.name !== 'odyssey-protocol') {
      warnings.push(`package.json: name is "${pkg.name}", expected "odyssey-protocol"`);
    }
    
    // Check required dependencies
    const requiredDeps = ['@devvit/web', 'devvit', 'express', 'react', 'react-dom'];
    requiredDeps.forEach(dep => {
      if (pkg.dependencies && pkg.dependencies[dep]) {
        success.push(`Dependency "${dep}" installed`);
      } else {
        errors.push(`Missing required dependency: ${dep}`);
      }
    });
    
    // Check scripts
    const requiredScripts = ['build', 'build:client', 'build:server', 'deploy'];
    requiredScripts.forEach(script => {
      if (pkg.scripts && pkg.scripts[script]) {
        success.push(`Script "${script}" configured`);
      } else {
        errors.push(`Missing required script: ${script}`);
      }
    });
  }
} catch (err) {
  errors.push(`package.json: ${err.message}`);
}

// Check source structure
console.log('📁 Checking source structure...');
const requiredDirs = [
  'src/client',
  'src/server',
  'src/shared',
];

requiredDirs.forEach(dir => {
  if (existsSync(dir)) {
    success.push(`Directory "${dir}" exists`);
  } else {
    errors.push(`Missing required directory: ${dir}`);
  }
});

// Check key files
const requiredFiles = [
  'src/client/main.tsx',
  'src/client/index.html',
  'src/server/index.ts',
  'src/shared/types/mission.ts',
  'src/server/utils/missionInit.ts',
];

requiredFiles.forEach(file => {
  if (existsSync(file)) {
    success.push(`File "${file}" exists`);
  } else {
    errors.push(`Missing required file: ${file}`);
  }
});

// Check build output (if exists)
console.log('🔨 Checking build output...');
if (existsSync('dist/client/index.html')) {
  success.push('Client build output exists');
} else {
  warnings.push('Client not built yet - run "npm run build:client"');
}

if (existsSync('dist/server/index.cjs')) {
  success.push('Server build output exists');
} else {
  warnings.push('Server not built yet - run "npm run build:server"');
}

// Print results
console.log('\n' + '='.repeat(60));
console.log('📊 Validation Results\n');

if (success.length > 0) {
  console.log('✅ Success (' + success.length + ' checks passed)');
  if (process.env.VERBOSE) {
    success.forEach(msg => console.log('  ✓', msg));
  }
  console.log();
}

if (warnings.length > 0) {
  console.log('⚠️  Warnings (' + warnings.length + ' issues)');
  warnings.forEach(msg => console.log('  ⚠', msg));
  console.log();
}

if (errors.length > 0) {
  console.log('❌ Errors (' + errors.length + ' critical issues)');
  errors.forEach(msg => console.log('  ✗', msg));
  console.log();
}

console.log('='.repeat(60));

if (errors.length > 0) {
  console.log('\n❌ Pre-deployment validation FAILED');
  console.log('Please fix the errors above before deploying.\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  Pre-deployment validation passed with warnings');
  console.log('Review warnings above - deployment may succeed but features may be limited.\n');
  process.exit(0);
} else {
  console.log('\n✅ Pre-deployment validation PASSED');
  console.log('Ready to deploy! Run: npm run deploy\n');
  process.exit(0);
}
