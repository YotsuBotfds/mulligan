/**
 * Table of Contents Module
 * Handles TOC anchor link clicks and ensures lazy-loaded sections are rendered
 * before attempting to scroll to them.
 *
 * Uses cards.forceRenderSection() to directly render lazy sections rather than
 * relying on IntersectionObserver triggering, which avoids race conditions.
 */

import { forceRenderSection } from './cards.js';

/**
 * Initialize TOC link handlers.
 * Must be called after cards.initializeCards() has rendered the section headings.
 */
export function initializeTOC() {
  const tocLinks = document.querySelectorAll('.toc-item[href^="#sec-"]');

  tocLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault(); // Prevent default anchor jump

      const href = link.getAttribute('href');
      const category = href.substring(5); // "#sec-foo" → "foo"

      // Force-render the section's cards if not already rendered
      forceRenderSection(category);

      // Give the DOM a frame to settle after rendering
      await new Promise(r => requestAnimationFrame(r));

      // Scroll to the section heading
      const target = document.getElementById(href.substring(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL hash without triggering another scroll
        history.replaceState(null, '', href);
      }
    });
  });
}
