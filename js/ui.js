/**
 * UI Module - Theme toggle, filters, and back-to-top button
 */

import * as storage from './storage.js';
import * as practiceMode from './practice-mode.js';

/**
 * Initialize theme toggle
 */
export function initializeThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const savedTheme = storage.getTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);
  toggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    storage.setTheme(next);
    toggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/**
 * Initialize filter buttons
 * Re-queries cards from the DOM on each click so it works with dynamically rendered cards.
 */
export function initializeFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');

      // Re-query cards fresh from the DOM each time (handles dynamic re-renders)
      const cards = document.querySelectorAll('.card[data-guide]');
      const progress = storage.getProgress();

      cards.forEach(card => {
        const tags = card.getAttribute('data-tags') || '';
        const guideId = card.getAttribute('data-guide');
        const category = card.getAttribute('data-category') || '';
        const difficulty = card.getAttribute('data-difficulty') || '';
        const isRead = progress[guideId]?.completed;
        const practiceStatus = practiceMode.getPracticeStatus(guideId);
        const isPracticed = practiceStatus?.practiced === true;
        let show = true;

        if (filter === 'all') show = true;
        else if (filter === 'critical') show = tags.includes('critical');
        else if (filter === 'essential') show = tags.includes('essential');
        else if (filter === 'rebuild') show = tags.includes('rebuild');
        else if (filter === 'new') show = tags.includes('new');
        else if (filter === 'unread') show = !isRead;
        else if (filter === 'completed') show = isRead;
        else if (filter === 'practiced') show = isPracticed;
        else if (filter === 'unpracticed') show = !isPracticed;
        else if (filter === 'beginner') show = difficulty === 'beginner';
        else if (filter === 'intermediate') show = difficulty === 'intermediate';
        else if (filter === 'advanced') show = difficulty === 'advanced';
        else if (filter === 'tools') show = category === 'tools';

        card.style.display = show ? '' : 'none';
      });

      // Hide/show section headings based on whether they have visible cards
      updateSectionHeadingVisibility();

      // Announce filter change to screen readers
      const guidesContainer = document.getElementById('guides-container');
      if (guidesContainer) {
        const visibleCount = document.querySelectorAll('.card[data-guide]:not([style*="display: none"])').length;
        guidesContainer.setAttribute('aria-live', 'polite');
        guidesContainer.setAttribute('aria-label', `Showing ${visibleCount} guides filtered by ${filter}`);
      }
    });

    // Add keyboard support for filter buttons
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
}

/**
 * Update section heading visibility based on whether they have any visible cards.
 * Works with both flat card layout (legacy) and card-section containers (virtual scroll).
 */
function updateSectionHeadingVisibility() {
  const container = document.getElementById('guides-container');
  if (!container) return;

  const children = Array.from(container.children);
  let currentHeading = null;
  let currentSection = null;

  for (const child of children) {
    if (child.classList.contains('section-heading') || child.tagName === 'H2') {
      // Before moving to next section, update the previous heading
      if (currentHeading && currentSection) {
        const visibleCards = currentSection.querySelectorAll('.card:not([style*="display: none"])');
        currentHeading.style.display = visibleCards.length > 0 ? '' : 'none';
        currentSection.style.display = visibleCards.length > 0 ? '' : 'none';
      }
      currentHeading = child;
      currentSection = null;
    } else if (child.classList.contains('card-section')) {
      currentSection = child;
    } else if (child.classList.contains('card')) {
      // Legacy flat layout fallback
      if (!currentSection) {
        if (child.style.display !== 'none' && currentHeading) {
          currentHeading.style.display = '';
        }
      }
    }
  }

  // Handle the last section
  if (currentHeading && currentSection) {
    const visibleCards = currentSection.querySelectorAll('.card:not([style*="display: none"])');
    currentHeading.style.display = visibleCards.length > 0 ? '' : 'none';
    currentSection.style.display = visibleCards.length > 0 ? '' : 'none';
  }

  // Also hide the "What's New" section if present and filter is active
  const whatsNewSection = container.querySelector('.whats-new-section');
  if (whatsNewSection) {
    const activeFilter = document.querySelector('.filter-btn.active');
    const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    whatsNewSection.style.display = filter === 'all' ? '' : 'none';
  }
}

/**
 * Initialize back-to-top button
 */
export function initializeBackToTop() {
  const backBtn = document.getElementById('back-to-top');
  if (!backBtn) return;

  window.addEventListener('scroll', () => {
    backBtn.style.display = window.scrollY > 400 ? 'block' : 'none';
  });

  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Update progress display
 * @param {NodeList} cards - Card elements from DOM
 */
export function updateProgressDisplay(cards) {
  const progress = storage.getProgress();
  let readCount = 0;

  cards.forEach(card => {
    const guideId = card.getAttribute('data-guide');
    const check = card.querySelector('.read-check');
    if (progress[guideId] && progress[guideId].completed) {
      if (check) check.classList.add('done');
      readCount++;
    }
  });

  const progressCount = document.getElementById('progress-count');
  const totalGuides = document.getElementById('total-guides');
  if (progressCount) progressCount.textContent = readCount;
  if (totalGuides) totalGuides.textContent = cards.length;
}
