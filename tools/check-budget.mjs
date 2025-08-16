#!/usr/bin/env node
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const sizeReportScript = join(__dirname, 'size-report.mjs');

// Get assets path from command line or default
const assetsPath = process.argv[2] || join(projectRoot, 'client/dist/assets');

console.log('🔍 Checking asset size budget...\n');

try {
  // Run size report and capture output
  const output = execSync(`node "${sizeReportScript}" "${assetsPath}"`, { encoding: 'utf8' });
  console.log(output);
  
  // Extract total gzipped size from last line
  const lines = output.trim().split('\n');
  const totalLine = lines[lines.length - 1];
  const match = totalLine.match(/gz\s+([0-9.]+)\s+KB$/);
  
  if (!match) {
    console.log('❌ Could not parse total size from output');
    process.exit(1);
  }
  
  const totalSizeKB = parseFloat(match[1]);
  const totalSizeMB = totalSizeKB / 1024;
  const budgetMB = 10.0;
  const budgetKB = budgetMB * 1024;
  
  console.log('\n📊 Budget Analysis');
  console.log('===================');
  console.log(`Current size: ${totalSizeMB.toFixed(2)} MB (${totalSizeKB.toFixed(1)} KB)`);
  console.log(`Budget limit: ${budgetMB.toFixed(1)} MB (${budgetKB.toFixed(0)} KB)`);
  
  if (totalSizeKB > budgetKB) {
    const overage = totalSizeMB - budgetMB;
    console.log(`Overage: +${overage.toFixed(2)} MB`);
    console.log('\n❌ SIZE BUDGET EXCEEDED!');
    console.log('\nSuggestions to reduce size:');
    console.log('• Enable asset compression (KTX2, Draco, Meshopt)');
    console.log('• Remove unused assets');
    console.log('• Optimize textures and models');
    console.log('• Use lazy loading for non-critical assets');
    process.exit(1);
  } else {
    const remaining = budgetMB - totalSizeMB;
    console.log(`Remaining: ${remaining.toFixed(2)} MB available`);
    console.log('\n✅ SIZE BUDGET OK!');
    
    // Warn if getting close to budget
    if (totalSizeMB > budgetMB * 0.8) {
      console.log('⚠️  Warning: Approaching budget limit (>80% used)');
    }
  }
  
} catch (error) {
  console.error('❌ Failed to check size budget:', error.message);
  process.exit(1);
}
