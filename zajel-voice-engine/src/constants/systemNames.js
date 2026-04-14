/**
 * System Name Constants
 * Accepts both "Zagel" and "Zajel" as valid OS names
 */

export const SYSTEM_NAMES = {
  PRIMARY: 'Zajel',      // Modern spelling
  ALTERNATE: 'Zagel',     // Alternative spelling
  ALL: ['Zajel', 'Zagel'], // All accepted variations
};

/**
 * Normalize system name input
 * Accepts both "Zagel" and "Zajel" (case-insensitive)
 */
export const normalizeSystemName = (input) => {
  if (!input || typeof input !== 'string') return null;
  
  const normalized = input.trim().toLowerCase();
  
  if (normalized === 'zajel' || normalized === 'zajel') return SYSTEM_NAMES.PRIMARY;
  if (normalized === 'zagel' || normalized === 'zagel') return SYSTEM_NAMES.ALTERNATE;
  
  return null;
};

/**
 * Check if input is a valid system name
 */
export const isValidSystemName = (input) => {
  return normalizeSystemName(input) !== null;
};

/**
 * Get all system name variants for regex matching
 */
export const getSystemNamePattern = () => {
  return new RegExp(`\\b(${SYSTEM_NAMES.ALL.join('|')})\\b`, 'gi');
};
