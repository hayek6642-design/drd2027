/**
 * Auth Two-Factor Authentication Setup
 * Configures and manages 2FA for enhanced security
 */

class TwoFactorAuth {
  constructor() {
    this.userSecrets = new Map();
    this.backupCodes = new Map();
  }

  generateSecret(userId) {
    // In production, use a proper TOTP library like 'speakeasy'
    const secret = this.generateRandomSecret(32);
    const qrCode = this.generateQRCode(userId, secret);

    return {
      secret,
      qrCode,
      userId,
      createdAt: new Date().toISOString(),
      backupCodes: this.generateBackupCodes(10)
    };
  }

  generateRandomSecret(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  generateQRCode(userId, secret) {
    // Simplified QR code URL (in production, generate actual QR)
    const encodedSecret = encodeURIComponent(secret);
    const appName = encodeURIComponent('E7ki Auth System');
    return \`otpauth://totp/\${appName}:\${userId}?secret=\${encodedSecret}&issuer=E7kiAuth\`;
  }

  generateBackupCodes(count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = \`\${Math.random().toString(36).substr(2, 4)}-\${Math.random().toString(36).substr(2, 4)}-\${Math.random().toString(36).substr(2, 4)}\`;
      codes.push({ code, used: false });
    }
    return codes;
  }

  enableTwoFactor(userId, secret, backupCodes) {
    this.userSecrets.set(userId, {
      secret,
      enabled: true,
      enabledAt: new Date().toISOString()
    });

    this.backupCodes.set(userId, backupCodes);

    return {
      userId,
      enabled: true,
      backupCodesCount: backupCodes.length
    };
  }

  disableTwoFactor(userId) {
    this.userSecrets.delete(userId);
    this.backupCodes.delete(userId);

    return {
      userId,
      enabled: false,
      disabledAt: new Date().toISOString()
    };
  }

  is2FAEnabled(userId) {
    const secret = this.userSecrets.get(userId);
    return secret ? secret.enabled : false;
  }

  verifyBackupCode(userId, code) {
    const codes = this.backupCodes.get(userId);
    if (!codes) return false;

    const backupCode = codes.find(c => c.code === code && !c.used);
    if (backupCode) {
      backupCode.used = true;
      return true;
    }

    return false;
  }

  getStatus(userId) {
    const secret = this.userSecrets.get(userId);
    const codes = this.backupCodes.get(userId) || [];

    return {
      userId,
      enabled: secret ? secret.enabled : false,
      enabledAt: secret?.enabledAt || null,
      backupCodesRemaining: codes.filter(c => !c.used).length
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TwoFactorAuth;
}
