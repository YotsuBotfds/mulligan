#!/usr/bin/env node

/**
 * Full-text search index builder for survival app guides
 * Creates a compact inverted index from HTML guide files
 * Stores: term -> [guide_id, frequency, positions]
 */

const fs = require('fs');
const path = require('path');

// Aggressive stop words list to reduce index size
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
  'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'same', 'so', 'than', 'too', 'very', 'as', 'if', 'just',
  'am', 'your', 'their', 'theirs', 'my', 'mine', 'his', 'hers', 'its',
  'our', 'ours', 'them', 'then', 'there', 'up', 'out', 'one', 'two',
  'three', 'any', 'via', 'has', 'that', 'your', 'us', 'are', 'guide',
  'nbsp', 'lt', 'gt', 'amp', 'quot', 'contents', 'compendium', 'related',
  'guides', 'page', 'back', 'main', 'link', 'home', 'index', 'menu',
  'about', 'use', 'used', 'using', 'requires'
]);

// Paths
const GUIDES_DIR = path.join(__dirname, '../guides');
const OUTPUT_FILE = path.join(__dirname, '../data/search-index.json');
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Strip HTML tags and entities from text
 */
function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove styles
    .replace(/<[^>]+>/g, ' ')                                          // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')                                             // Normalize whitespace
    .trim();
}

/**
 * Extract metadata from HTML comment at top of guide
 * Format: <!-- Guide: Title | Category: cat | Difficulty: level | Reading Time: time -->
 */
function extractMetadata(html) {
  const match = html.match(/<!-- Guide: ([^|]+) \| Category: ([^|]+) \| Difficulty: ([^|]+) \| Reading Time: ([^-]+)-->/);
  if (match) {
    return {
      title: match[1].trim(),
      category: match[2].trim(),
      difficulty: match[3].trim(),
      readingTime: match[4].trim()
    };
  }
  return { title: '', category: '', difficulty: '', readingTime: '' };
}

/**
 * Tokenize text into words, filtering stop words and numbers
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^\w-]/g, ''))
    .filter(word => {
      // Keep if: longer than 2 chars, not a stop word, and not all digits
      return word.length > 2 &&
             !STOP_WORDS.has(word) &&
             !/^\d+$/.test(word);
    });
}

/**
 * Build inverted index from all guides
 */
function buildIndex() {
  console.log('Starting search index build...\n');

  const index = {};
  const guides = {};
  let totalGuides = 0;
  let processedFiles = [];

  // Read all HTML files in guides directory
  const files = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.html'));

  console.log(`Found ${files.length} HTML files in guides/\n`);

  files.forEach(file => {
    const filePath = path.join(GUIDES_DIR, file);
    const guideId = file.replace('.html', '');

    try {
      const html = fs.readFileSync(filePath, 'utf-8');
      const metadata = extractMetadata(html);
      const plainText = stripHtml(html);
      const tokens = tokenize(plainText);

      // Store guide metadata
      guides[guideId] = {
        title: metadata.title || guideId,
        category: metadata.category || 'uncategorized',
        difficulty: metadata.difficulty || 'intermediate',
        readingTime: metadata.readingTime || '5min',
        wordCount: plainText.split(/\s+/).length,
        uniqueTerms: new Set(tokens).size
      };

      // Build frequency map for this guide's tokens
      const tokenFreq = {};
      tokens.forEach(token => {
        tokenFreq[token] = (tokenFreq[token] || 0) + 1;
      });

      // Add to inverted index
      Object.entries(tokenFreq).forEach(([token, freq]) => {
        if (!index[token]) {
          index[token] = {};
        }
        // Store frequency for this guide (compact format)
        index[token][guideId] = freq;
      });

      totalGuides++;
      processedFiles.push({
        file,
        terms: Object.keys(tokenFreq).length,
        words: plainText.split(/\s+/).length
      });

    } catch (err) {
      console.error(`Error processing ${file}: ${err.message}`);
    }
  });

  // Convert guides to indexed array for compression
  const guidesArray = Object.keys(guides);
  const guidesMap = {};
  guidesArray.forEach((id, idx) => {
    guidesMap[id] = idx;
  });

  // Create minimal guide list - only store titles
  const guideList = guidesArray.map(id => guides[id].title);

  // Prepare final index structure - only include terms appearing in 20+ guides
  const compactIndex = {};
  let filteredTerms = 0;
  Object.entries(index).forEach(([term, guidesData]) => {
    const guideCount = Object.keys(guidesData).length;
    if (guideCount >= 20) {
      // Store as comma-separated "idx,freq,idx,freq,..." for max compactness
      const parts = [];
      Object.entries(guidesData).forEach(([guideId, freq]) => {
        const idx = guidesMap[guideId];
        parts.push(idx);
        parts.push(freq);
      });
      compactIndex[term] = parts.join(',');
    } else {
      filteredTerms++;
    }
  });

  // Prepare output - minimal structure for compactness
  const output = {
    v: '1.0.0',
    t: new Date().toISOString(),
    s: {
      g: totalGuides,
      tm: Object.keys(compactIndex).length,
      as: Math.round(
        processedFiles.reduce((sum, f) => sum + f.words, 0) / totalGuides
      )
    },
    gl: guideList,
    i: compactIndex
  };

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Write index to file - compact JSON (no pretty printing) to save space
  const indexJson = JSON.stringify(output);
  fs.writeFileSync(OUTPUT_FILE, indexJson, 'utf-8');

  const fileSize = fs.statSync(OUTPUT_FILE).size;
  const fileSizeKb = (fileSize / 1024).toFixed(2);

  // Report results
  console.log('\n=== SEARCH INDEX BUILD COMPLETE ===\n');
  console.log(`Total Guides Indexed:    ${totalGuides}`);
  console.log(`Total Unique Terms (raw):${Object.keys(index).length}`);
  console.log(`Indexed Terms (20+ guide):${output.s.tm}`);
  console.log(`Filtered Out Terms:      ${filteredTerms}`);
  console.log(`Average Guide Size:      ${output.s.as} words`);
  console.log(`Index File Size:         ${fileSizeKb} KB`);
  console.log(`Index Location:          ${OUTPUT_FILE}`);
  console.log(`\nSize Status:             ${fileSize < 512000 ? '✓ COMPACT' : '⚠ LARGE'} (${fileSize < 512000 ? '<' : '>'} 500KB)`);

  console.log('\nTop 20 Most Frequent Terms:');
  const termFreqs = Object.entries(compactIndex)
    .map(([term, data]) => {
      // Data format is "idx,freq,idx,freq,..." so count pairs
      const count = data.split(',').length / 2;
      return { term, guides: Math.round(count) };
    })
    .sort((a, b) => b.guides - a.guides)
    .slice(0, 20);

  termFreqs.forEach(({ term, guides }, idx) => {
    console.log(`  ${idx + 1}. "${term}" - ${guides} guides`);
  });

  console.log('\n');

  return output;
}

// Run the build
try {
  buildIndex();
  process.exit(0);
} catch (err) {
  console.error('FATAL ERROR:', err);
  process.exit(1);
}
