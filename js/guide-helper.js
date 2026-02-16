/**
 * Guide Helper Module - Shared utilities for guide pages
 * Provides consistent progress and notes management with auto-backup
 */

/**
 * Save progress for a guide with auto-backup
 * @param {string} guideId - The guide identifier
 * @param {boolean} completed - Whether the guide is completed
 */
export function saveGuideProgress(guideId, completed = true) {
  const progress = JSON.parse(localStorage.getItem('compendium-progress') || '{}');

  progress[guideId] = {
    completed,
    date: new Date().toISOString()
  };

  localStorage.setItem('compendium-progress', JSON.stringify(progress));

  // Trigger auto-backup to IndexedDB
  autoBackupProgress();
}

/**
 * Save notes for a guide with auto-backup
 * @param {string} guideId - The guide identifier
 * @param {string} notes - The notes content
 */
export function saveGuideNotes(guideId, notes) {
  const notesKey = 'compendium-notes-' + guideId;
  localStorage.setItem(notesKey, notes);

  // Trigger auto-backup to IndexedDB
  autoBackupProgress();
}

/**
 * Auto-backup to IndexedDB
 * Safely calls the import-export module's auto-backup function
 */
async function autoBackupProgress() {
  try {
    // Use dynamic import to avoid circular dependencies
    const importExport = await import('./import-export.js');
    if (importExport.autoBackupProgress) {
      await importExport.autoBackupProgress();
    }
  } catch (error) {
    console.warn('Failed to auto-backup progress:', error);
  }
}
