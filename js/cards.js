/**
 * Dynamic Card Renderer for Guides
 * Loads guides from guides.json and dynamically renders them as cards
 */

import * as storage from './storage.js';
import * as share from './share.js';
import * as recentlyViewed from './recently-viewed.js';
import * as collections from './collections.js';
import * as practiceMode from './practice-mode.js';
import * as notifications from './notifications.js';
import { escapeHtml } from './utils.js';

// Store guides data for access by other modules
let _guidesData = null;

/**
 * Get the cached guides data (available after initializeCards completes)
 * @returns {Array|null} Guides data array or null if not yet loaded
 */
export function getGuidesData() {
  return _guidesData;
}

/**
 * Fetch and parse the guides data
 */
async function fetchGuidesData() {
  try {
    const response = await fetch('data/guides.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch guides: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching guides.json:', error);
    throw error;
  }
}

/**
 * Create a guide card element from guide data
 * @param {Object} guide - Guide data object
 * @param {Array} allGuides - All guides for prerequisite lookup (optional)
 * @returns {HTMLElement} Card element
 */
function createCardElement(guide, allGuides = []) {
  // Create the card container (anchor element)
  const card = document.createElement('a');
  card.className = 'card';
  card.href = guide.url || `guides/${guide.id}.html`;
  card.setAttribute('data-guide', guide.id);
  card.setAttribute('tabindex', '0');

  // Build tags string
  const tagsArray = Array.isArray(guide.tags) ? guide.tags : [];
  card.setAttribute('data-tags', tagsArray.join(' '));

  // Add category attribute for category-based filtering (e.g., "tools")
  if (guide.category) {
    card.setAttribute('data-category', guide.category);
  }

  // Add difficulty attribute for filtering
  if (guide.difficulty) {
    card.setAttribute('data-difficulty', guide.difficulty);
  }

  // Store prerequisites as data attribute if they exist
  if (guide.prerequisites && guide.prerequisites.length > 0) {
    card.setAttribute('data-prerequisites', guide.prerequisites.join(','));
  }

  // Create inner HTML
  let innerHTML = '<span class="read-check" aria-hidden="true">✓</span>';

  // Add difficulty badge
  if (guide.difficulty) {
    const difficultyLabel = guide.difficulty.charAt(0).toUpperCase() + guide.difficulty.slice(1);
    innerHTML += `<span class="difficulty-badge difficulty-${guide.difficulty}" title="Difficulty: ${difficultyLabel}">${difficultyLabel}</span>`;
  }

  // Add icon if present
  if (guide.icon) {
    innerHTML += `<span class="icon">${guide.icon}</span>`;
  }

  // Add title
  if (guide.title) {
    innerHTML += `<h3>${escapeHtml(guide.title)}</h3>`;
  }

  // Add description
  if (guide.description) {
    innerHTML += `<p>${escapeHtml(guide.description)}</p>`;
  }

  // Add reading time indicator
  if (guide.readingTime) {
    innerHTML += `<span class="reading-time">~${guide.readingTime} min read</span>`;
  }

  // Add tags as tag elements
  if (tagsArray.length > 0) {
    for (const tag of tagsArray) {
      const tagText = formatTagText(tag);
      innerHTML += `<span class="tag ${tag}">${tagText}</span>`;
    }
  }

  // Add prerequisites section if they exist
  if (guide.prerequisites && guide.prerequisites.length > 0) {
    // Create a guide ID to guide object map for quick lookup
    const guideMap = {};
    allGuides.forEach(g => {
      guideMap[g.id] = g;
    });

    // Build prerequisites display
    const prereqTexts = guide.prerequisites
      .map(prereqId => {
        const prereqGuide = guideMap[prereqId];
        return prereqGuide ? `${prereqGuide.icon || '📘'} ${escapeHtml(prereqGuide.title)}` : prereqId;
      });

    const prereqClass = guide.prerequisites.length === 1 ? 'prerequisites prerequisites-single' : 'prerequisites';
    innerHTML += `<div class="${prereqClass}"><strong>Prerequisites:</strong> ${prereqTexts.join(', ')}</div>`;
  }

  card.innerHTML = innerHTML;

  // Add share button to card
  share.addShareButtonToCard(card);

  // Add collection button to card
  addCollectionButtonToCard(card, guide.id);

  // Add notification badges
  notifications.addBadgesToCard(card, guide, allGuides);

  return card;
}

/**
 * Format tag text for display (e.g., "start-here" -> "Start Here")
 * @param {string} tag - Tag name
 * @returns {string} Formatted tag text
 */
function formatTagText(tag) {
  const tagTexts = {
    'start-here': 'Start Here',
    'new-guide': 'New',
    'critical': 'Critical',
    'essential': 'Essential',
    'important': 'Important',
    'practical': 'Practical',
    'new': 'New',
    'rebuild': 'Rebuild',
    'technology': 'Technology',
    'human': 'Human',
    'medical': 'Medical',
    'winter': 'Winter',
  };

  return tagTexts[tag] || tag.charAt(0).toUpperCase() + tag.slice(1);
}

// escapeHtml imported from utils.js

/**
 * Group guides by category
 * @param {Array} guides - Array of guide objects
 * @returns {Object} Guides grouped by category
 */
function groupByCategory(guides) {
  const grouped = {};

  for (const guide of guides) {
    const category = guide.category || 'uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(guide);
  }

  return grouped;
}

/**
 * Get category display name and icon
 * @param {string} category - Category ID
 * @returns {Object} {name, icon}
 */
function getCategoryDisplay(category) {
  const categoryMap = {
    'zth-modules': { name: 'Core Modules', icon: '🎓' },
    'survival': { name: 'Immediate Survival', icon: '🔥' },
    'medical': { name: 'Medical & Health', icon: '🏥' },
    'agriculture': { name: 'Food & Agriculture', icon: '🌾' },
    'building': { name: 'Building & Engineering', icon: '🔨' },
    'crafts': { name: 'Crafts & Trade Skills', icon: '⚒️' },
    'communications': { name: 'Communications', icon: '📡' },
    'defense': { name: 'Security & Defense', icon: '🛡️' },
    'sciences': { name: 'Foundational Sciences', icon: '🔬' },
    'chemistry': { name: 'Industrial Chemistry', icon: '🏭' },
    'society': { name: 'Society & Culture', icon: '🏛️' },
    'tools': { name: 'Tools & Interactive', icon: '🛠️' },
    'salvage': { name: 'Scavenging & Salvage', icon: '♻️' },
    'reference': { name: 'Master Reference', icon: '📚' },
    'specialized': { name: 'Specialized', icon: '🔧' },
    'metalworking': { name: 'Metalworking', icon: '⚒️' },
    'primitive-technology': { name: 'Primitive Technology', icon: '🪨' },
    'power-generation': { name: 'Power Generation', icon: '⚡' },
    'transportation': { name: 'Transportation', icon: '🚗' },
    'resource-management': { name: 'Resource Management', icon: '📦' },
    'culture-knowledge': { name: 'Culture & Knowledge', icon: '📖' },
    'biology': { name: 'Biology', icon: '🧬' },
    'utility': { name: 'Utilities', icon: '⚙️' },
  };

  return categoryMap[category] || { name: category, icon: '📄' };
}

/**
 * Create section heading with category info
 * @param {string} category - Category ID
 * @returns {HTMLElement} Section heading element
 */
function createSectionHeading(category) {
  const { name, icon } = getCategoryDisplay(category);

  const heading = document.createElement('h2');
  heading.className = 'section-heading';
  heading.id = `sec-${category}`;
  heading.textContent = `${icon} ${name}`;

  return heading;
}

// Estimated card height for placeholder sizing (px per card row, ~3 cards per row)
const ESTIMATED_CARD_ROW_HEIGHT = 220;
const CARDS_PER_ROW = 3;

// Track the IntersectionObserver for cleanup
let _sectionObserver = null;

// Module-level cache for grouped guides data (used by forceRenderSection)
let _groupedGuides = null;

/**
 * Render guides to the guides-container using lazy section rendering.
 * Only the first 2-3 visible sections are rendered immediately;
 * remaining sections use IntersectionObserver to render on scroll.
 * @param {Array} guides - Array of guide objects
 */
function renderGuides(guides) {
  const container = document.getElementById('guides-container');

  if (!container) {
    console.error('guides-container element not found');
    return;
  }

  // Clean up previous observer
  if (_sectionObserver) {
    _sectionObserver.disconnect();
  }

  // Clear loading state and any previous content
  container.innerHTML = '';

  // Add What's New section if there are new/updated guides
  const whatsNewSection = notifications.createWhatsNewSection(guides);
  if (whatsNewSection) {
    container.appendChild(whatsNewSection);
  }

  // Group guides by category
  const grouped = groupByCategory(guides);
  _groupedGuides = grouped;

  // Define category order (core first, then by topic, then alphabetical for the rest)
  const categoryOrder = [
    'zth-modules',
    'survival',
    'medical',
    'agriculture',
    'building',
    'crafts',
    'metalworking',
    'communications',
    'defense',
    'sciences',
    'chemistry',
    'power-generation',
    'transportation',
    'society',
    'resource-management',
    'salvage',
    'tools',
    'reference',
    'specialized',
  ];

  // Add categories in order, then any remaining categories alphabetically
  const orderedCategories = [
    ...categoryOrder.filter((cat) => cat in grouped),
    ...Object.keys(grouped)
      .filter((cat) => !categoryOrder.includes(cat))
      .sort(),
  ];

  // Number of initial sections to render eagerly (above the fold)
  const EAGER_SECTIONS = 3;

  // Set up IntersectionObserver for lazy rendering
  _sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionDiv = entry.target;
        if (!sectionDiv.dataset.rendered) {
          const category = sectionDiv.dataset.category;
          const categoryGuides = grouped[category];
          if (categoryGuides) {
            renderSectionCards(sectionDiv, categoryGuides, guides);
            // Apply any active filter to newly rendered cards
            applyCurrentFilterToSection(sectionDiv);
          }
          sectionDiv.dataset.rendered = 'true';
          sectionDiv.style.minHeight = ''; // Remove placeholder height
          _sectionObserver.unobserve(sectionDiv);
        }
      }
    });
  }, {
    rootMargin: '300px 0px', // Pre-render 300px before visible
  });

  // Render each category section
  let sectionIndex = 0;
  for (const category of orderedCategories) {
    if (category === '' || category === 'uncategorized') {
      continue;
    }

    const categoryGuides = grouped[category];

    // Add section heading
    const heading = createSectionHeading(category);
    container.appendChild(heading);

    // Create section container for cards
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'card-section';
    sectionDiv.dataset.category = category;
    sectionDiv.setAttribute('data-section', category);

    if (sectionIndex < EAGER_SECTIONS) {
      // Render first sections eagerly (above the fold)
      renderSectionCards(sectionDiv, categoryGuides, guides);
      sectionDiv.dataset.rendered = 'true';
    } else {
      // Set placeholder height and observe for lazy rendering
      const rows = Math.ceil(categoryGuides.length / CARDS_PER_ROW);
      sectionDiv.style.minHeight = `${rows * ESTIMATED_CARD_ROW_HEIGHT}px`;
      _sectionObserver.observe(sectionDiv);
    }

    container.appendChild(sectionDiv);
    sectionIndex++;
  }

  // Handle uncategorized guides if any
  if (grouped[''] && grouped[''].length > 0) {
    const heading = document.createElement('h2');
    heading.className = 'section-heading';
    heading.textContent = '📄 Other Guides';
    container.appendChild(heading);

    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'card-section';
    sectionDiv.dataset.category = 'uncategorized';
    sectionDiv.setAttribute('data-section', 'uncategorized');
    renderSectionCards(sectionDiv, grouped[''], guides);
    sectionDiv.dataset.rendered = 'true';
    container.appendChild(sectionDiv);
  }
}

/**
 * Render cards for a single category section
 * @param {HTMLElement} sectionDiv - Container div for the section
 * @param {Array} categoryGuides - Guides in this category
 * @param {Array} allGuides - All guides for prerequisite lookup
 */
function renderSectionCards(sectionDiv, categoryGuides, allGuides) {
  const fragment = document.createDocumentFragment();
  for (const guide of categoryGuides) {
    const card = createCardElement(guide, allGuides);
    fragment.appendChild(card);
  }
  sectionDiv.appendChild(fragment);
}

/**
 * Apply the currently active filter to a newly rendered section's cards.
 * Reads the active filter button state from the DOM.
 * @param {HTMLElement} sectionDiv - The section container with newly rendered cards
 */
function applyCurrentFilterToSection(sectionDiv) {
  const activeFilter = document.querySelector('.filter-btn.active');
  const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';

  if (filter === 'all') return; // No filtering needed

  const progress = storage.getProgress();
  const cards = sectionDiv.querySelectorAll('.card[data-guide]');

  cards.forEach(card => {
    const tags = card.getAttribute('data-tags') || '';
    const guideId = card.getAttribute('data-guide');
    const category = card.getAttribute('data-category') || '';
    const difficulty = card.getAttribute('data-difficulty') || '';
    const isRead = progress[guideId]?.completed;
    let show = true;

    if (filter === 'critical') show = tags.includes('critical');
    else if (filter === 'essential') show = tags.includes('essential');
    else if (filter === 'rebuild') show = tags.includes('rebuild');
    else if (filter === 'new') show = tags.includes('new');
    else if (filter === 'unread') show = !isRead;
    else if (filter === 'completed') show = isRead;
    else if (filter === 'beginner') show = difficulty === 'beginner';
    else if (filter === 'intermediate') show = difficulty === 'intermediate';
    else if (filter === 'advanced') show = difficulty === 'advanced';
    else if (filter === 'tools') show = category === 'tools';

    card.style.display = show ? '' : 'none';
  });
}

/**
 * Show loading state
 */
function showLoadingState() {
  const container = document.getElementById('guides-container');
  if (container) {
    container.innerHTML = '<div class="loading-state">Loading guides...</div>';
  }
}

/**
 * Show error state
 * @param {string} message - Error message
 */
function showErrorState(message) {
  const container = document.getElementById('guides-container');
  if (container) {
    container.innerHTML = `<div class="error-state"><p>Error loading guides: ${escapeHtml(message)}</p><p>Please refresh the page to try again.</p></div>`;
  }
}

/**
 * Force-render a lazy-loaded section by category name.
 * Called by the TOC module to ensure a section's cards are in the DOM
 * before scrolling to it, bypassing the IntersectionObserver.
 * @param {string} category - Category ID (e.g., 'metalworking')
 * @returns {boolean} True if the section was rendered (or already rendered)
 */
export function forceRenderSection(category) {
  const sectionDiv = document.querySelector(`[data-section="${category}"]`);
  if (!sectionDiv) return false;

  // Already rendered
  if (sectionDiv.dataset.rendered === 'true') return true;

  // Render the cards directly
  if (_groupedGuides && _groupedGuides[category] && _guidesData) {
    renderSectionCards(sectionDiv, _groupedGuides[category], _guidesData);
    applyCurrentFilterToSection(sectionDiv);
    sectionDiv.dataset.rendered = 'true';
    sectionDiv.style.minHeight = '';
    // Stop observing since we've rendered it
    if (_sectionObserver) {
      _sectionObserver.unobserve(sectionDiv);
    }
    return true;
  }

  return false;
}

/**
 * Initialize the card renderer
 * Fetches guides data and renders cards
 */
export async function initializeCards() {
  try {
    // Show loading state
    showLoadingState();

    // Fetch guides data
    const guides = await fetchGuidesData();

    // Cache guides data for other modules
    _guidesData = guides;

    // Render guides
    renderGuides(guides);

    // Initialize card-dependent features after cards are rendered
    // This allows other modules to find the cards in the DOM
    if (document.readyState === 'loading') {
      // If still loading, wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', () => {
        share.initShareButtons();
        window.dispatchEvent(new CustomEvent('cardsRendered'));
      });
    } else {
      // Already loaded, dispatch event immediately
      share.initShareButtons();
      window.dispatchEvent(new CustomEvent('cardsRendered'));
    }
  } catch (error) {
    console.error('Failed to initialize cards:', error);
    showErrorState(error.message || 'Unknown error');
  }
}

/**
 * Get all rendered cards
 * @returns {NodeList} Card elements
 */
export function getCards() {
  return document.querySelectorAll('.card[data-guide]');
}

/**
 * Re-render cards (useful for filtering/searching)
 * @param {Array} guides - Guides to render (optional, will fetch if not provided)
 */
export async function rerenderCards(guides) {
  try {
    if (!guides) {
      guides = await fetchGuidesData();
    }
    renderGuides(guides);
    share.initShareButtons();
    window.dispatchEvent(new CustomEvent('cardsRerendered'));
  } catch (error) {
    console.error('Failed to rerender cards:', error);
    showErrorState(error.message || 'Unknown error');
  }
}

/**
 * Add collection button to a card
 * @param {HTMLElement} card - Card element
 * @param {string} guideId - Guide ID
 */
function addCollectionButtonToCard(card, guideId) {
  const button = document.createElement('button');
  button.className = 'add-to-collection-btn';
  button.title = 'Add to collection';
  button.textContent = '📌';
  button.type = 'button';
  button.setAttribute('aria-label', 'Add to collection');

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCollectionDropdown(button, guideId);
  });

  card.appendChild(button);
}

/**
 * Show collection dropdown menu
 * @param {HTMLElement} button - The trigger button
 * @param {string} guideId - Guide ID to add
 */
function showCollectionDropdown(button, guideId) {
  // Close any existing dropdowns
  document.querySelectorAll('.collection-dropdown').forEach(d => d.remove());

  const dropdown = document.createElement('div');
  dropdown.className = 'collection-dropdown';

  const collectionsList = collections.getCollectionsSorted();

  if (collectionsList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'collection-empty';
    empty.textContent = 'No collections yet. Create one below.';
    dropdown.appendChild(empty);
  } else {
    collectionsList.forEach(col => {
      const item = document.createElement('div');
      item.className = 'collection-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `col-${col.id}`;
      checkbox.checked = collections.isGuideInCollection(col.id, guideId);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          collections.addToCollection(col.id, guideId);
        } else {
          collections.removeFromCollection(col.id, guideId);
        }
        updateCollectionCounts();
      });

      const label = document.createElement('label');
      label.htmlFor = `col-${col.id}`;
      const progress = collections.getCollectionProgress(col.id);
      label.innerHTML = `<span class="col-icon">${col.icon}</span> <span class="col-name">${escapeHtml(col.name)}</span> <span class="col-count">${progress.read}/${progress.total}</span>`;

      item.appendChild(checkbox);
      item.appendChild(label);
      dropdown.appendChild(item);
    });
  }

  // Add create collection option
  const createSection = document.createElement('div');
  createSection.className = 'collection-create-section';

  const createBtn = document.createElement('button');
  createBtn.className = 'create-collection-btn';
  createBtn.textContent = '+ New Collection';
  createBtn.type = 'button';
  createBtn.addEventListener('click', () => {
    const name = prompt('Collection name:');
    if (name && name.trim()) {
      const col = collections.createCollection(name.trim());
      collections.addToCollection(col.id, guideId);
      showCollectionDropdown(button, guideId); // Refresh dropdown
      updateCollectionCounts();
      window.dispatchEvent(new CustomEvent('collectionsUpdated'));
    }
  });

  createSection.appendChild(createBtn);
  dropdown.appendChild(createSection);

  // Position dropdown
  const rect = button.getBoundingClientRect();
  dropdown.style.top = (rect.bottom + 5) + 'px';
  dropdown.style.left = (rect.left - 10) + 'px';

  document.body.appendChild(dropdown);

  // Close dropdown when clicking outside
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target) && e.target !== button) {
        dropdown.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 0);
}

/**
 * Update collection counts in dropdowns
 */
function updateCollectionCounts() {
  document.querySelectorAll('.col-count').forEach(el => {
    const label = el.parentElement;
    const checkbox = label.previousElementSibling;
    if (checkbox && checkbox.id) {
      const collectionId = checkbox.id.replace('col-', '');
      const progress = collections.getCollectionProgress(collectionId);
      el.textContent = `${progress.read}/${progress.total}`;
    }
  });
}
