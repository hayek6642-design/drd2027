/**
 * Code Generation Utility for Bankode Assets
 * Ensures all codes follow proper format rules
 */
function generateSegment(length = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generatePValue() {
    // P1-P9 based on random weighting or admin selection
    return Math.floor(Math.random() * 9) + 1; // 1-9
}

/**
 * Generate formatted code based on type
 * @param {string} type - 'code' | 'silver' | 'gold'
 * @param {number} pValue - Optional P-value (1-9), auto-generated if not provided
 * @returns {string} Formatted code
 */
function generateFormattedCode(type = 'code', pValue = null) {
    const p = pValue || generatePValue();
    
    if (type === 'silver') {
        return `SLVR-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-P${p}`;
    }
    
    if (type === 'gold') {
        return `GOLD-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-P${p}`;
    }
    
    // Normal code
    return `${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}-P${p}`;
}

/**
 * Validate code format
 * @param {string} code 
 * @returns {boolean}
 */
function isValidCodeFormat(code, type = 'code') {
    const patterns = {
        code: /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[1-9]$/,
        silver: /^SLVR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[1-9]$/,
        gold: /^GOLD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[1-9]$/
    };
    
    return patterns[type]?.test(code) || patterns.code.test(code);
}

/**
 * Parse code to extract metadata
 * @param {string} code 
 * @returns {object} { type, segments, pValue, isValid }
 */
function parseCode(code) {
    const parts = code.split('-');
    const type = parts[0] === 'SLVR' ? 'silver' : parts[0] === 'GOLD' ? 'gold' : 'code';
    const pValue = parseInt(parts[parts.length - 1].replace('P', '')) || 1;
    
    return {
        type,
        segments: parts,
        pValue,
        isValid: isValidCodeFormat(code, type),
        raw: code
    };
}

module.exports = {
    generateFormattedCode,
    generateSegment,
    generatePValue,
    isValidCodeFormat,
    parseCode
};