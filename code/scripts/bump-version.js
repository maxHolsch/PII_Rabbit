#!/usr/bin/env node

/**
 * Auto-increment version script for Chrome extension development
 *
 * This script automatically bumps the patch version in both manifest.json
 * and package.json to force Chrome to reload the extension with fresh code.
 *
 * Why this is needed:
 * - Chrome caches extensions aggressively based on the version field
 * - Even with Vite's content hashing, Chrome may serve cached content
 * - Auto-bumping ensures every build has a unique version number
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const manifestPath = path.resolve(__dirname, '../manifest.json');
const packagePath = path.resolve(__dirname, '../package.json');

/**
 * Increment the patch version (e.g., "0.1.5" -> "0.1.6")
 */
function bumpVersion(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }

  const [major, minor, patch] = parts;
  const newPatch = parseInt(patch, 10) + 1;

  return `${major}.${minor}.${newPatch}`;
}

/**
 * Update version in a JSON file
 */
function updateJsonVersion(filePath, newVersion) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);

    const oldVersion = json.version;
    json.version = newVersion;

    // Write back with 2-space indentation (matching existing format)
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');

    return { oldVersion, newVersion };
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Main execution
try {
  console.log('🔄 Bumping extension version...\n');

  // Read current version from manifest.json
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const currentVersion = manifest.version;

  // Calculate new version
  const newVersion = bumpVersion(currentVersion);

  // Update both files
  const manifestResult = updateJsonVersion(manifestPath, newVersion);
  const packageResult = updateJsonVersion(packagePath, newVersion);

  console.log('✅ Version bumped successfully!');
  console.log(`   ${manifestResult.oldVersion} → ${manifestResult.newVersion}`);
  console.log(`\n📦 Updated files:`);
  console.log(`   - manifest.json`);
  console.log(`   - package.json`);
  console.log('');

} catch (error) {
  console.error('❌ Version bump failed:', error.message);
  process.exit(1);
}
