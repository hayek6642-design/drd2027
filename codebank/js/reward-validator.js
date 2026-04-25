/**
 * RewardValidator
 * 
 * Validates reward codes and extracts information
 * Format: SLVR-XXXX-XXXX-XXXX-XXXX-XXXX-P(n) or GOLD-XXXX-XXXX-XXXX-XXXX-XXXX-P(n)
 */

export class RewardValidator {
  constructor() {
    this.CODE_PATTERN = /^(SLVR|GOLD)-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-P(\d)$/;
    this.CORE_PATTERN = /^(SLVR|GOLD)-(.+)-P(\d)$/;
  }

  /**
   * Validate complete reward code format
   * @param {string} code - Code to validate
   * @returns {boolean} True if code is valid
   */
  isValid(code) {
    return this.CODE_PATTERN.test(code);
  }

  /**
   * Validate and return detailed information
   * @param {string} code - Code to validate
   * @returns {object|null} Details if valid, null if invalid
   */
  validate(code) {
    if (!this.isValid(code)) {
      return null;
    }

    const match = code.match(this.CODE_PATTERN);
    const [, prefix, g1, g2, g3, g4, g5, period] = match;

    return {
      isValid: true,
      code: code,
      type: prefix === 'GOLD' ? 'gold' : 'silver',
      prefix: prefix,
      groups: [g1, g2, g3, g4, g5],
      coreCode: `${g1}-${g2}-${g3}-${g4}-${g5}`,
      period: parseInt(period, 10),
      length: code.length,
      timestamp: Date.now()
    };
  }

  /**
   * Extract code details without strict validation
   * Useful for parsing potentially malformed codes
   * @param {string} code - Code to parse
   * @returns {object|null} Parsed details or null
   */
  parse(code) {
    if (!code || typeof code !== 'string') {
      return null;
    }

    const match = code.match(this.CORE_PATTERN);
    if (!match) {
      return null;
    }

    const [, prefix, coreCode, period] = match;
    return {
      prefix: prefix,
      type: prefix === 'GOLD' ? 'gold' : 'silver',
      coreCode: coreCode,
      period: parseInt(period, 10),
      formatted: code
    };
  }

  /**
   * Get type from code
   * @param {string} code - Code to check
   * @returns {string|null} 'silver', 'gold', or null
   */
  getType(code) {
    const validation = this.validate(code);
    return validation ? validation.type : null;
  }

  /**
   * Get period from code
   * @param {string} code - Code to check
   * @returns {number|null} Period number (0-9) or null
   */
  getPeriod(code) {
    const validation = this.validate(code);
    return validation ? validation.period : null;
  }

  /**
   * Check if code is for silver reward
   * @param {string} code - Code to check
   * @returns {boolean}
   */
  isSilver(code) {
    return this.getType(code) === 'silver';
  }

  /**
   * Check if code is for gold reward
   * @param {string} code - Code to check
   * @returns {boolean}
   */
  isGold(code) {
    return this.getType(code) === 'gold';
  }

  /**
   * Check if code belongs to specific period
   * @param {string} code - Code to check
   * @param {number} periodNumber - Expected period
   * @returns {boolean}
   */
  isPeriod(code, periodNumber) {
    const period = this.getPeriod(code);
    return period !== null && period === periodNumber;
  }

  /**
   * Batch validate multiple codes
   * @param {string[]} codes - Array of codes
   * @returns {object} Summary with valid/invalid counts and details
   */
  validateBatch(codes) {
    const results = {
      total: codes.length,
      valid: [],
      invalid: [],
      byType: { silver: 0, gold: 0 },
      byPeriod: {}
    };

    for (const code of codes) {
      const validation = this.validate(code);
      if (validation) {
        results.valid.push(validation);
        results.byType[validation.type]++;
        
        if (!results.byPeriod[validation.period]) {
          results.byPeriod[validation.period] = [];
        }
        results.byPeriod[validation.period].push(code);
      } else {
        results.invalid.push(code);
      }
    }

    results.summary = {
      validCount: results.valid.length,
      invalidCount: results.invalid.length,
      validPercentage: ((results.valid.length / results.total) * 100).toFixed(2),
      silverCount: results.byType.silver,
      goldCount: results.byType.gold
    };

    return results;
  }

  /**
   * Extract all codes from mixed text
   * Finds any valid reward codes within arbitrary text
   * @param {string} text - Text to search
   * @returns {string[]} Found codes
   */
  extractCodes(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Find all potential code patterns
    const pattern = /(SLVR|GOLD)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P\d/g;
    const matches = text.match(pattern) || [];
    
    // Filter to valid codes
    return matches.filter(code => this.isValid(code));
  }

  /**
   * Compare two codes
   * @param {string} code1 - First code
   * @param {string} code2 - Second code
   * @returns {boolean} True if codes are identical
   */
  compare(code1, code2) {
    return code1 === code2;
  }

  /**
   * Check if code has expired (optional, requires timestamp)
   * @param {string} code - Code to check
   * @param {number} expiryMs - Milliseconds until expiry
   * @param {number} createdAt - When code was created
   * @returns {boolean} True if expired
   */
  isExpired(code, expiryMs, createdAt) {
    if (!this.isValid(code) || !createdAt) {
      return false;
    }

    const now = Date.now();
    const age = now - createdAt;
    return age > expiryMs;
  }

  /**
   * Get validation report for debugging
   * @param {string} code - Code to analyze
   * @returns {object} Detailed report
   */
  getReport(code) {
    const isValid = this.isValid(code);
    const validation = this.validate(code);
    const parse = this.parse(code);

    return {
      code: code,
      isValid: isValid,
      length: code ? code.length : 0,
      expectedLength: 32,
      lengthMatch: code && code.length === 32,
      validation: validation,
      parse: parse,
      type: validation ? validation.type : 'unknown',
      period: validation ? validation.period : null,
      errors: this._getErrors(code)
    };
  }

  /**
   * Get specific errors for invalid code
   * @private
   * @param {string} code - Code to check
   * @returns {string[]} Array of error messages
   */
  _getErrors(code) {
    const errors = [];

    if (!code) {
      errors.push('Code is empty or null');
      return errors;
    }

    if (typeof code !== 'string') {
      errors.push(`Code is not a string (type: ${typeof code})`);
      return errors;
    }

    if (code.length !== 32) {
      errors.push(`Invalid length: ${code.length} (expected 32)`);
    }

    if (!code.match(/^(SLVR|GOLD)-/)) {
      errors.push('Invalid prefix (must be SLVR or GOLD)');
    }

    if (!code.match(/-P\d$/)) {
      errors.push('Invalid period suffix (must be -P followed by single digit)');
    }

    if (!code.match(/^(SLVR|GOLD)-([A-Z0-9]{4}-){4}[A-Z0-9]{4}-P\d$/)) {
      errors.push('Invalid character groups (must be 5 groups of 4 alphanumeric)');
    }

    return errors;
  }
}

// Export singleton instance
export const rewardValidator = new RewardValidator();

// Convenience function exports
export function validateRewardCode(code) {
  return rewardValidator.isValid(code);
}

export function extractRewardDetails(code) {
  return rewardValidator.validate(code);
}

export function getRewardType(code) {
  return rewardValidator.getType(code);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.RewardValidator = RewardValidator;
  window.rewardValidator = rewardValidator;
  window.validateRewardCode = validateRewardCode;
  window.extractRewardDetails = extractRewardDetails;
  window.getRewardType = getRewardType;
}
