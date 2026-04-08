/**
 * Email Validator - Ensures real Gmail addresses only
 * Blocks virtual/temporary emails
 */

const dns = require('dns').promises;

// List of known temporary/virtual email domains to block
const BLOCKED_DOMAINS = [
    'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
    '10minutemail.com', 'yopmail.com', 'fakeinbox.com', 'sharklasers.com',
    'getairmail.com', 'tempinbox.com', 'mailnesia.com', 'tempmailaddress.com',
    'burnermail.io', 'temp-mail.org', 'fake-email.net', 'tempmailo.com',
    'tempail.com', 'throwawaymail.com', 'tempmailer.com', 'tempmail.net',
    'tmpmail.org', 'disposablemail.com', 'tempmailbox.com', 'throwmail.com',
    'mailtemporaire.com', 'emailtemporanea.com', 'temporarioemail.com',
    'jetable.org', 'mailforspam.com', 'spamgourmet.com', 'boun.cr', 'trashmail.com',
    'mytrashmail.com', 'mailcatch.com', 'tempmail.de', 'tempmail.fr',
    'tempmail.it', 'tempmail.es', 'tempmail.pl', 'tempmail.ru',
    'tempmail.cn', 'tempmail.jp', 'tempmail.kr', 'tempmail.in',
    'tempmail.co.uk', 'tempmail.com.au', 'tempmail.co.nz',
    'tempmail.co.za', 'tempmail.co.id', 'tempmail.co.th',
    'tempmail.my', 'tempmail.sg', 'tempmail.ph', 'tempmail.vn',
    'tempmail.tw', 'tempmail.hk', 'tempmail.mo',
    'tempmail.ae', 'tempmail.sa', 'tempmail.qa', 'tempmail.kw',
    'tempmail.bh', 'tempmail.om', 'tempmail.jo', 'tempmail.lb',
    'tempmail.eg', 'tempmail.ma', 'tempmail.tn', 'tempmail.dz',
    'tempmail.ly', 'tempmail.sd', 'tempmail.et', 'tempmail.so',
    'tempmail.ke', 'tempmail.tz', 'tempmail.ug', 'tempmail.rw',
    'tempmail.bi', 'tempmail.mw', 'tempmail.zm', 'tempmail.zw',
    'tempmail.mz', 'tempmail.mg', 'tempmail.mu', 'tempmail.sc',
    'tempmail.re', 'tempmail.yt', 'tempmail.io', 'tempmail.sh',
    'tempmail.ac', 'tempmail.gs', 'tempmail.pn', 'tempmail.tc',
    'tempmail.vg', 'tempmail.ms', 'tempmail.fm', 'tempmail.ki',
    'tempmail.nr', 'tempmail.tv', 'tempmail.ws', 'tempmail.to',
    'tempmail.nu', 'tempmail.st', 'tempmail.cd', 'tempmail.cg',
    'tempmail.ga', 'tempmail.gq', 'tempmail.ml', 'tempmail.bj',
    'tempmail.bf', 'tempmail.ne', 'tempmail.td', 'tempmail.cf',
    'tempmail.cm', 'tempmail.cv', 'tempmail.gw', 'tempmail.gn',
    'tempmail.sl', 'tempmail.lr', 'tempmail.gm', 'tempmail.sn',
    'tempmail.mr', 'tempmail.dj', 'tempmail.er',
    'tempmail.ss',
];

// Gmail-specific validation patterns
const GMAIL_PATTERNS = {
    validFormat: /^[a-zA-Z0-9][a-zA-Z0-9._-]{5,29}@gmail\.com$/i,
    
    spamPatterns: [
        /^\d{10,}@gmail\.com$/,
        /^[a-zA-Z0-9]{30,}@gmail\.com$/,
        /^test\d*@gmail\.com$/i,
        /^fake\d*@gmail\.com$/i,
        /^spam\d*@gmail\.com$/i,
        /^temp\d*@gmail\.com$/i,
        /^noreply\d*@gmail\.com$/i,
        /^admin\d*@gmail\.com$/i,
        /^root\d*@gmail\.com$/i,
        /^postmaster\d*@gmail\.com$/i,
        /^hostmaster\d*@gmail\.com$/i,
        /^webmaster\d*@gmail\.com$/i,
        /^abuse\d*@gmail\.com$/i,
        /^security\d*@gmail\.com$/i,
        /^info\d*@gmail\.com$/i,
        /^support\d*@gmail\.com$/i,
        /^contact\d*@gmail\.com$/i,
        /^sales\d*@gmail\.com$/i,
        /^marketing\d*@gmail\.com$/i,
        /^billing\d*@gmail\.com$/i,
        /^help\d*@gmail\.com$/i,
        /^service\d*@gmail\.com$/i,
        /^mail\d*@gmail\.com$/i,
        /^email\d*@gmail\.com$/i,
        /^user\d*@gmail\.com$/i,
        /^account\d*@gmail\.com$/i,
        /^member\d*@gmail\.com$/i,
        /^subscriber\d*@gmail\.com$/i,
        /^customer\d*@gmail\.com$/i,
        /^client\d*@gmail\.com$/i,
        /^guest\d*@gmail\.com$/i,
        /^visitor\d*@gmail\.com$/i,
        /^anonymous\d*@gmail\.com$/i,
        /^unknown\d*@gmail\.com$/i,
        /^random\d*@gmail\.com$/i,
        /^example\d*@gmail\.com$/i,
        /^sample\d*@gmail\.com$/i,
        /^demo\d*@gmail\.com$/i,
        /^testuser\d*@gmail\.com$/i,
        /^fakeuser\d*@gmail\.com$/i,
        /^spamuser\d*@gmail\.com$/i,
        /^tempuser\d*@gmail\.com$/i,
        /^dummy\d*@gmail\.com$/i,
        /^placeholder\d*@gmail\.com$/i,
    ],
    
    suspiciousPatterns: [
        /[a-zA-Z0-9]{20,}@gmail\.com$/i,
        /(\d{3,}.*){2,}@gmail\.com$/i,
        /^[a-zA-Z0-9]{1,3}\d{6,}@gmail\.com$/i,
    ]
};

class EmailValidator {
    /**
     * Validate email for signup
     * Returns: { valid: boolean, reason: string, score: number }
     */
    async validateSignupEmail(email) {
        const normalized = email.toLowerCase().trim();
        
        if (!this.isValidFormat(normalized)) {
            return {
                valid: false,
                reason: 'Invalid email format',
                code: 'INVALID_FORMAT',
                score: 0
            };
        }
        
        if (!this.isGmail(normalized)) {
            return {
                valid: false,
                reason: 'Only Gmail addresses are allowed',
                code: 'NON_GMAIL',
                score: 0
            };
        }
        
        const domain = normalized.split('@')[1];
        if (BLOCKED_DOMAINS.includes(domain)) {
            return {
                valid: false,
                reason: 'Temporary/disposable email addresses are not allowed',
                code: 'BLOCKED_DOMAIN',
                score: 0
            };
        }
        
        const gmailCheck = this.validateGmailFormat(normalized);
        if (!gmailCheck.valid) {
            return gmailCheck;
        }
        
        const spamCheck = this.checkSpamPatterns(normalized);
        if (spamCheck.isSpam) {
            return {
                valid: false,
                reason: 'Email pattern detected as suspicious',
                code: 'SUSPICIOUS_PATTERN',
                details: spamCheck.matches,
                score: 10
            };
        }
        
        const mxCheck = await this.verifyMXRecords(domain);
        if (!mxCheck.valid) {
            return {
                valid: false,
                reason: 'Email domain has invalid mail servers',
                code: 'INVALID_MX',
                score: 20
            };
        }
        
        const score = this.calculateTrustScore(normalized);
        
        if (score < 30) {
            return {
                valid: false,
                reason: 'Email appears to be virtual/temporary',
                code: 'LOW_TRUST_SCORE',
                score: score
            };
        }
        
        return {
            valid: true,
            reason: 'Email validated successfully',
            code: 'VALID',
            score: score,
            normalized: normalized
        };
    }
    
    isValidFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    isGmail(email) {
        return email.endsWith('@gmail.com');
    }
    
    validateGmailFormat(email) {
        const localPart = email.split('@')[0];
        
        if (localPart.length < 6 || localPart.length > 30) {
            return {
                valid: false,
                reason: 'Gmail username must be 6-30 characters',
                code: 'GMAIL_LENGTH'
            };
        }
        
        if (!GMAIL_PATTERNS.validFormat.test(email)) {
            return {
                valid: false,
                reason: 'Gmail username contains invalid characters',
                code: 'GMAIL_INVALID_CHARS'
            };
        }
        
        if (localPart.includes('..')) {
            return {
                valid: false,
                reason: 'Gmail username cannot contain consecutive dots',
                code: 'GMAIL_CONSECUTIVE_DOTS'
            };
        }
        
        if (localPart.startsWith('.') || localPart.endsWith('.')) {
            return {
                valid: false,
                reason: 'Gmail username cannot start or end with a dot',
                code: 'GMAIL_DOT_BOUNDARY'
            };
        }
        
        return { valid: true };
    }
    
    checkSpamPatterns(email) {
        const matches = [];
        
        for (const pattern of GMAIL_PATTERNS.spamPatterns) {
            if (pattern.test(email)) {
                matches.push(pattern.toString());
            }
        }
        
        return {
            isSpam: matches.length > 0,
            matches: matches
        };
    }
    
    async verifyMXRecords(domain) {
        try {
            const mxRecords = await dns.resolveMx(domain);
            
            if (!mxRecords || mxRecords.length === 0) {
                return { valid: false, reason: 'No MX records found' };
            }
            
            const hasGmailMX = mxRecords.some(record => 
                record.exchange.includes('google.com') ||
                record.exchange.includes('gmail.com')
            );
            
            if (domain === 'gmail.com' && !hasGmailMX) {
                return { valid: false, reason: 'Domain claims to be Gmail but has wrong MX records' };
            }
            
            return { valid: true, records: mxRecords };
        } catch (error) {
            console.error('[EmailValidator] MX check failed:', error);
            return { valid: false, reason: 'Failed to verify MX records' };
        }
    }
    
    calculateTrustScore(email) {
        const localPart = email.split('@')[0];
        let score = 50;
        
        if (localPart.length >= 8 && localPart.length <= 20) {
            score += 15;
        } else if (localPart.length < 6) {
            score -= 20;
        } else if (localPart.length > 25) {
            score -= 10;
        }
        
        const hasLetters = /[a-z]/.test(localPart);
        const hasNumbers = /\d/.test(localPart);
        const hasDots = /\./.test(localPart);
        
        if (hasLetters && hasNumbers) score += 10;
        if (hasDots) score += 5;
        
        const numberRatio = (localPart.match(/\d/g) || []).length / localPart.length;
        const letterRatio = (localPart.match(/[a-z]/g) || []).length / localPart.length;
        
        if (numberRatio > 0.5) score -= 20;
        if (numberRatio > 0.3) score -= 10;
        
        if (letterRatio > 0.7 && numberRatio < 0.2) score += 10;
        
        const entropy = this.calculateEntropy(localPart);
        if (entropy > 4.5) score -= 15;
        
        if (/^[a-z]+[._]?[a-z]+$/i.test(localPart)) score += 10;
        
        return Math.max(0, Math.min(100, score));
    }
    
    calculateEntropy(str) {
        const len = str.length;
        const freq = {};
        
        for (const char of str) {
            freq[char] = (freq[char] || 0) + 1;
        }
        
        let entropy = 0;
        for (const char in freq) {
            const p = freq[char] / len;
            entropy -= p * Math.log2(p);
        }
        
        return entropy;
    }
    
    quickValidate(email) {
        const normalized = email.toLowerCase().trim();
        
        if (!this.isValidFormat(normalized)) {
            return { valid: false, reason: 'Invalid format' };
        }
        
        if (!this.isGmail(normalized)) {
            return { valid: false, reason: 'Gmail only' };
        }
        
        const gmailCheck = this.validateGmailFormat(normalized);
        if (!gmailCheck.valid) {
            return gmailCheck;
        }
        
        const spamCheck = this.checkSpamPatterns(normalized);
        if (spamCheck.isSpam) {
            return { valid: false, reason: 'Suspicious pattern' };
        }
        
        return { valid: true, normalized };
    }
}

module.exports = new EmailValidator();
