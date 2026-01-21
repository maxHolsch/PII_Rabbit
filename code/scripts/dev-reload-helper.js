#!/usr/bin/env node

/**
 * Development reload helper script
 *
 * Displays clear instructions for properly reloading the Chrome extension
 * after a build. This ensures developers follow the correct process to
 * avoid Chrome's aggressive caching.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the current version from manifest.json
const manifestPath = path.resolve(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;

// Display reload instructions
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                                                                ║');
console.log('║  ✅ Build Complete! Extension is ready to reload              ║');
console.log('║                                                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`📦 Extension: PII Shield v${version}\n`);

console.log('🔄 RELOAD INSTRUCTIONS (IMPORTANT - Follow in order):\n');

console.log('   1. Open Chrome DevTools on ChatGPT tab:');
console.log('      Right-click page → Inspect\n');

console.log('   2. In DevTools, open Network tab and check:');
console.log('      ☑️ "Disable cache" (checkbox at top)\n');

console.log('   3. Navigate to:');
console.log('      chrome://extensions/\n');

console.log('   4. Find "PII Shield" in the extensions list\n');

console.log('   5. Click the "Remove" button');
console.log('      ⚠️  DO NOT use the "Reload" button - it doesn\'t clear all caches\n');

console.log('   6. Click "Load unpacked" (top left corner)\n');

console.log('   7. Navigate to and select:');
console.log(`      ${path.resolve(__dirname, '../dist')}\n`);

console.log('   8. Refresh ChatGPT tabs with DevTools open');
console.log('      (Chrome only reloads fresh files when DevTools is open with cache disabled)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 WHY THIS PROCESS?\n');
console.log('   Chrome caches extensions aggressively:');
console.log('   • Service worker cache (background scripts)');
console.log('   • Content script cache');
console.log('   • Extension resources\n');
console.log('   The "Reload" button doesn\'t always clear these caches.');
console.log('   Remove + Re-add ensures a completely fresh load.\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🔍 VERIFY YOUR CHANGES:\n');
console.log('   1. Check the extension version in chrome://extensions/');
console.log(`      Should show: v${version}\n`);

console.log('   2. Open ChatGPT and test PII redaction functionality\n');

console.log('   3. Check DevTools Console for any errors:');
console.log('      • Right-click on ChatGPT page → Inspect');
console.log('      • Go to Console tab');
console.log('      • Look for PII Shield logs\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🐛 STILL NOT WORKING? Try these additional steps:\n');

console.log('   1. Clear service worker cache:');
console.log('      chrome://serviceworker-internals/');
console.log('      Find "PII Shield" and click "Unregister"\n');

console.log('   2. Hard refresh ChatGPT tabs:');
console.log('      Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)\n');

console.log('   3. Restart Chrome completely\n');

console.log('   4. Check for TypeScript errors:');
console.log('      npm run type-check\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📚 For more information, see README.md\n');
