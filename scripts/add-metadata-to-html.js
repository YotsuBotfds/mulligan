#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '../guides');
const GUIDES_JSON_PATH = path.join(__dirname, '../data/guides.json');

// Read guides.json
console.log('Reading guides.json...');
const guideContent = fs.readFileSync(GUIDES_JSON_PATH, 'utf-8');
const guides = JSON.parse(guideContent);

// Create a map of filename to guide metadata
const guideMap = {};
guides.forEach(guide => {
  if (guide.file) {
    const filename = path.basename(guide.file);
    guideMap[filename] = guide;
  }
});

console.log(`Found ${guides.length} guides in guides.json`);
console.log(`Mapped ${Object.keys(guideMap).length} guides by filename`);

// Read all HTML files in guides directory
console.log(`\nScanning ${GUIDES_DIR} for HTML files...`);
const files = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.html'));
console.log(`Found ${files.length} HTML files`);

let updated = 0;
let skipped = 0;

files.forEach(filename => {
  const filepath = path.join(GUIDES_DIR, filename);
  const guide = guideMap[filename];

  if (!guide) {
    console.warn(`  ⊘ No metadata found for ${filename}`);
    return;
  }

  try {
    let content = fs.readFileSync(filepath, 'utf-8');

    // Check if metadata comment already exists
    if (content.includes('<!-- Guide:')) {
      console.log(`  ✓ ${filename} - already has metadata`);
      skipped++;
      return;
    }

    // Create metadata comment
    const metadataComment = `<!-- Guide: ${guide.title} | Category: ${guide.category} | Difficulty: ${guide.difficulty} | Reading Time: ${guide.readingTime}min -->`;

    // Find where to insert (after DOCTYPE if present, otherwise at start)
    let insertPosition = 0;
    const doctypeMatch = content.match(/<!DOCTYPE[^>]*>/i);
    if (doctypeMatch) {
      insertPosition = doctypeMatch[0].length;
      // Add newline after DOCTYPE
      content = content.substring(0, insertPosition) + '\n' + metadataComment + '\n' + content.substring(insertPosition);
    } else {
      content = metadataComment + '\n' + content;
    }

    // Write back
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`  ✓ ${filename} - metadata added`);
    updated++;
  } catch (err) {
    console.error(`  ✗ Error processing ${filename}: ${err.message}`);
  }
});

console.log(`\n=== Summary ===`);
console.log(`Updated: ${updated} files`);
console.log(`Skipped: ${skipped} files (already have metadata)`);
console.log(`Not found: ${files.length - updated - skipped} files`);
