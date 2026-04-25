/**
 * RewardGenerator
 * 
 * Generates reward codes in the correct format:
 * - Silver: SLVR-XXXX-XXXX-XXXX-XXXX-XXXX-P(n)
 * - Gold: GOLD-XXXX-XXXX-XXXX-XXXX-XXXX-P(n)
 * 
 * Where:
 * - Prefix (SLVR/GOLD) identifies reward type
 * - 5 groups of 4 alphanumeric chars = 20 chars total
 * - P(n) = period number (0-9)
 */

export class RewardGenerator {
  constructor() {
    this.CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    this.PREFIX_SILVER = 'SLVR';
    this.PREFIX_GOLD = 'GOLD';
    this.GROUPS_COUNT = 5;
    this.CHARS_PER_GROUP = 4;
  }

  /**
   * Generate a complete reward code
   * @param {string} type - 'silver' or 'gold'
   * @param {number} periodNumber - Period identifier (0-9)
   * @returns {string} Formatted reward code
   */
  generateCode(type, periodNumber = null) {
    // Validate inputs
    if (!['silver', 'gold'].includes(type?.toLowerCase())) {
      throw new Error(`Invalid type: ${type}. Must be 'silver' or 'gold'`);
    }

    // Use provided period or calculate from current date
    const period = periodNumber !== null ? periodNumber : this._calculatePeriod();
    
    // Validate period is single digit
    if (period < 0 || period > 9) {
      throw new Error(`Invalid period: ${period}. Must be 0-9`);
    }

    // Generate prefix
    const prefix = type.toLowerCase() === 'gold' ? this.PREFIX_GOLD : this.PREFIX_SILVER;

    // Generate 5 groups of 4 random chars
    const groups = [];
    for (let i = 0; i < this.GROUPS_COUNT; i++) {
      groups.push(this._generateGroup());
    }

    // Format: PREFIX-XXXX-XXXX-XXXX-XXXX-XXXX-P(n)
    return `${prefix}-${groups.join('-')}-P${period}`;
  }

  /**
   * Generate a single group of random characters
   * @private
   * @returns {string} 4-character random string
   */
  _generateGroup() {
    let group = '';
    for (let i = 0; i < this.CHARS_PER_GROUP; i++) {
      const randomIndex = Math.floor(Math.random() * this.CHARSET.length);
      group += this.CHARSET[randomIndex];
    }
    return group;
  }

  /**
   * Calculate period number based on current date
   * Uses day of month modulo 10 to get period 0-9
   * @private
   * @returns {number} Period number (0-9)
   */
  _calculatePeriod() {
    const dayOfMonth = new Date().getDate();
    return dayOfMonth % 10;
  }

  /**
   * Generate multiple codes at once
   * @param {string} type - 'silver' or 'gold'
   * @param {number} count - How many codes to generate
   * @param {number} periodNumber - Optional period number
   * @returns {string[]} Array of generated codes
   */
  generateBatch(type, count = 1, periodNumber = null) {
    if (count < 1 || count > 1000) {
      throw new Error(`Invalid count: ${count}. Must be between 1 and 1000`);
    }

    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateCode(type, periodNumber));
    }
    return codes;
  }

  /**
   * Get information about a code without validating format
   * @param {string} code - Reward code
   * @returns {object} Code information or null if parsing fails
   */
  parseCode(code) {
    if (!code || typeof code !== 'string') return null;

    const match = code.match(/^(SLVR|GOLD)-(.+)-P(\d)$/);
    if (!match) return null;

    const [, prefix, coreCode, period] = match;
    return {
      type: prefix === 'GOLD' ? 'gold' : 'silver',
      prefix,
      coreCode,
      period: parseInt(period, 10),
      formatted: code
    };
  }

  /**
   * Verify code structure without database lookup
   * @param {string} code - Code to verify
   * @returns {boolean} True if code structure is valid
   */
  isValidFormat(code) {
    if (!code || typeof code !== 'string') return false;
    
    // Pattern: PREFIX(4) + DASH + (4 chars + DASH) * 5 + P + DIGIT
    const pattern = /^(SLVR|GOLD)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[0-9]$/;
    return pattern.test(code);
  }

  /**
   * Get expected code length
   * @returns {number} Expected length in characters
   */
  getExpectedLength() {
    // SLVR/GOLD (4) + DASH (1) + GROUPS (20) + DASHES (4) + DASH + P + DIGIT (3)
    // = 4 + 1 + 20 + 4 + 3 = 32
    return 32;
  }

  /**
   * Get code statistics
   * @returns {object} Code format statistics
   */
  getStats() {
    return {
      prefixLength: 4,
      groupsCount: this.GROUPS_COUNT,
      charsPerGroup: this.CHARS_PER_GROUP,
      totalRandomChars: this.GROUPS_COUNT * this.CHARS_PER_GROUP,
      periodDigits: 1,
      totalLength: this.getExpectedLength(),
      charset: this.CHARSET,
      format: 'PREFIX-XXXX-XXXX-XXXX-XXXX-XXXX-P(n)',
      examples: {
        silver: `SLVR-87UD-NK88-2GJF-66LA-9YPP-P7`,
        gold: `GOLD-3NQP-522Q-CQ79-TTCR-PRQ7-P8`
      }
    };
  }
}

// Export singleton instance for ease of use
export const rewardGenerator = new RewardGenerator();

// Also attach to window for global access
if (typeof window !== 'undefined') {
  window.RewardGenerator = RewardGenerator;
  window.rewardGenerator = rewardGenerator;
}
