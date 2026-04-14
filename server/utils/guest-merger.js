/**
 * Guest Data Merger Utility
 * Handles merging guest session data into authenticated user accounts
 */

/**
 * Merge guest data into user data
 * Handles conflicts with configurable strategies
 */
function mergeGuestDataIntoUser(userData, guestData, options = {}) {
  const {
    guestId,
    mergeTimestamp = new Date(),
    conflictStrategy = 'user-priority' // 'user-priority', 'guest-priority', 'newer-priority'
  } = options;
  
  const merged = { ...userData };
  
  // Track what was merged for audit
  const mergeLog = {
    guestId,
    mergeTimestamp,
    strategy: conflictStrategy,
    itemsMerged: [],
    itemsSkipped: []
  };
  
  if (!guestData) {
    return { merged, mergeLog };
  }
  
  // Merge each top-level key
  for (const [key, guestValue] of Object.entries(guestData)) {
    if (key === 'id' || key === 'userId') {
      // Skip identity fields
      mergeLog.itemsSkipped.push({ key, reason: 'identity-field' });
      continue;
    }
    
    const userValue = merged[key];
    
    if (userValue === undefined) {
      // No conflict - add guest data
      merged[key] = guestValue;
      mergeLog.itemsMerged.push({ key, source: 'guest', reason: 'new' });
    } else if (userValue === null && guestValue !== null) {
      // User field is empty - take guest value
      merged[key] = guestValue;
      mergeLog.itemsMerged.push({ key, source: 'guest', reason: 'user-empty' });
    } else if (typeof userValue === 'object' && typeof guestValue === 'object') {
      // Both are objects - deep merge
      merged[key] = deepMerge(userValue, guestValue, conflictStrategy);
      mergeLog.itemsMerged.push({ key, source: 'combined', reason: 'deep-merge' });
    } else if (typeof userValue === 'string' && typeof guestValue === 'string' && 
               userValue.length === 0 && guestValue.length > 0) {
      // User field is empty string - take guest value
      merged[key] = guestValue;
      mergeLog.itemsMerged.push({ key, source: 'guest', reason: 'user-empty-string' });
    } else if (conflictStrategy === 'guest-priority') {
      // Guest data takes priority on conflict
      merged[key] = guestValue;
      mergeLog.itemsMerged.push({ key, source: 'guest', reason: 'conflict-guest-priority' });
    } else {
      // Default: user-priority - keep user data
      mergeLog.itemsSkipped.push({ key, reason: 'conflict-user-priority' });
    }
  }
  
  // Add merge metadata
  merged._mergeMeta = {
    ...merged._mergeMeta,
    lastMerge: mergeTimestamp,
    lastMergeGuestId: guestId,
    totalMerges: (merged._mergeMeta?.totalMerges || 0) + 1
  };
  
  return { merged, mergeLog };
}

/**
 * Deep merge objects recursively
 */
function deepMerge(userObj, guestObj, conflictStrategy = 'user-priority') {
  const result = { ...userObj };
  
  if (!guestObj || typeof guestObj !== 'object') {
    return result;
  }
  
  for (const [key, guestValue] of Object.entries(guestObj)) {
    const userValue = result[key];
    
    if (userValue === undefined) {
      result[key] = guestValue;
    } else if (Array.isArray(userValue) && Array.isArray(guestValue)) {
      // Merge arrays - combine and deduplicate
      result[key] = [...new Set([...userValue, ...guestValue])];
    } else if (typeof userValue === 'object' && typeof guestValue === 'object') {
      // Recursive merge
      result[key] = deepMerge(userValue, guestValue, conflictStrategy);
    } else if (conflictStrategy === 'guest-priority') {
      result[key] = guestValue;
    }
    // else: keep user value (user-priority)
  }
  
  return result;
}

/**
 * Create merge audit entry
 */
function createMergeAudit(guestId, userId, guestData, mergedData, mergeLog) {
  return {
    id: `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    guestId,
    userId,
    mergeStatus: 'completed',
    mergeLog,
    dataSize: {
      guestData: JSON.stringify(guestData).length,
      mergedData: JSON.stringify(mergedData).length
    },
    createdAt: new Date().toISOString()
  };
}

/**
 * Validate guest data before merge
 */
function validateGuestData(guestData) {
  const errors = [];
  
  if (!guestData || typeof guestData !== 'object') {
    errors.push('Guest data must be an object');
    return errors;
  }
  
  // Check for suspicious fields
  const suspiciousFields = ['userId', 'id', 'admin', 'role', 'permissions'];
  for (const field of suspiciousFields) {
    if (field in guestData) {
      errors.push(`Suspicious field detected: ${field} cannot be merged from guest data`);
    }
  }
  
  // Check size
  const dataSize = JSON.stringify(guestData).length;
  if (dataSize > 5 * 1024 * 1024) { // 5MB limit
    errors.push(`Guest data too large: ${dataSize} bytes (max 5MB)`);
  }
  
  return errors;
}

module.exports = {
  mergeGuestDataIntoUser,
  deepMerge,
  createMergeAudit,
  validateGuestData
};
