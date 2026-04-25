/**
 * Reward System Test Suite
 * 
 * Tests for:
 * - Code generation format
 * - Code validation
 * - Claim processing
 * - Storage and retrieval
 */

import { RewardGenerator } from './reward-generator.js';
import { RewardValidator } from './reward-validator.js';
import { RewardClaimProcessor } from './claim-processor.js';

export class RewardTests {
  constructor() {
    this.generator = new RewardGenerator();
    this.validator = new RewardValidator();
    this.processor = new RewardClaimProcessor();
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🧪 Starting Reward System Tests...\n');
    
    this.passed = 0;
    this.failed = 0;
    this.results = [];

    // Generator tests
    console.log('--- GENERATOR TESTS ---');
    await this.testCodeGenerationFormat();
    await this.testCodeLength();
    await this.testPeriodNumber();
    await this.testBatchGeneration();

    // Validator tests
    console.log('\n--- VALIDATOR TESTS ---');
    await this.testValidateValidCode();
    await this.testValidateInvalidCode();
    await this.testExtractCodeDetails();
    await this.testCodeParsing();

    // Claim processor tests
    console.log('\n--- CLAIM PROCESSOR TESTS ---');
    await this.testClaimProcess();
    await this.testDuplicateClaimPrevention();
    await this.testClaimRetrieval();
    await this.testClaimStats();

    // Integration tests
    console.log('\n--- INTEGRATION TESTS ---');
    await this.testEndToEnd();

    this.printSummary();
    return this.results;
  }

  /**
   * TEST 1: Code Generation Format
   */
  async testCodeGenerationFormat() {
    const testName = 'Code Generation Format';
    try {
      const code = this.generator.generateCode('silver');
      const pattern = /^(SLVR|GOLD)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P\d$/;
      
      if (!pattern.test(code)) {
        throw new Error(`Invalid format: ${code}`);
      }

      this.pass(testName, `Generated: ${code}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 2: Code Length
   */
  async testCodeLength() {
    const testName = 'Code Length';
    try {
      const code = this.generator.generateCode('gold');
      const expectedLength = 32; // 4 + 1 + 20 + 4 + 3
      
      if (code.length !== expectedLength) {
        throw new Error(`Length ${code.length}, expected ${expectedLength}`);
      }

      this.pass(testName, `Length: ${code.length} chars`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 3: Period Number
   */
  async testPeriodNumber() {
    const testName = 'Period Number';
    try {
      const code = this.generator.generateCode('silver');
      const period = code.match(/P(\d)$/)[1];
      
      if (!/^\d$/.test(period)) {
        throw new Error(`Invalid period: ${period}`);
      }

      this.pass(testName, `Period: P${period}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 4: Batch Generation
   */
  async testBatchGeneration() {
    const testName = 'Batch Generation';
    try {
      const count = 10;
      const codes = this.generator.generateBatch('silver', count);
      
      if (codes.length !== count) {
        throw new Error(`Generated ${codes.length}, expected ${count}`);
      }

      // Check all are valid
      const allValid = codes.every(code => this.validator.isValid(code));
      if (!allValid) {
        throw new Error('Some generated codes are invalid');
      }

      // Check uniqueness
      const unique = new Set(codes).size;
      if (unique !== count) {
        throw new Error(`Only ${unique}/${count} codes are unique`);
      }

      this.pass(testName, `Generated ${count} unique valid codes`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 5: Validate Valid Code
   */
  async testValidateValidCode() {
    const testName = 'Validate Valid Code';
    try {
      const code = 'SLVR-87UD-NK88-2GJF-66LA-9YPP-P7';
      
      if (!this.validator.isValid(code)) {
        throw new Error(`Failed to validate known good code: ${code}`);
      }

      this.pass(testName, `Validated: ${code}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 6: Validate Invalid Code
   */
  async testValidateInvalidCode() {
    const testName = 'Validate Invalid Code';
    try {
      const invalidCodes = [
        'SLVR-ABCD',                          // Too short
        'SLVR-87UD-NK88-2GJF-66LA-9YPP',     // Missing period
        'FAKE-87UD-NK88-2GJF-66LA-9YPP-P7',  // Wrong prefix
        'SLVR-87UD-NK88-2GJF-66LA-9YPP-P10', // Invalid period
        'SLVR87UD-NK88-2GJF-66LA-9YPP-P7',   // Missing dash
        ''                                     // Empty
      ];

      const allInvalid = invalidCodes.every(code => !this.validator.isValid(code));
      if (!allInvalid) {
        throw new Error('Some invalid codes were accepted');
      }

      this.pass(testName, `Rejected all ${invalidCodes.length} invalid codes`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 7: Extract Code Details
   */
  async testExtractCodeDetails() {
    const testName = 'Extract Code Details';
    try {
      const code = 'GOLD-3NQP-522Q-CQ79-TTCR-PRQ7-P8';
      const details = this.validator.validate(code);
      
      if (!details) {
        throw new Error('Failed to extract details');
      }

      if (details.type !== 'gold') throw new Error(`Wrong type: ${details.type}`);
      if (details.period !== 8) throw new Error(`Wrong period: ${details.period}`);
      if (details.groups.length !== 5) throw new Error(`Wrong groups count: ${details.groups.length}`);

      this.pass(testName, `Extracted: type=${details.type}, period=P${details.period}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 8: Code Parsing
   */
  async testCodeParsing() {
    const testName = 'Code Parsing';
    try {
      const code = this.generator.generateCode('silver');
      const parsed = this.validator.parse(code);
      
      if (!parsed) {
        throw new Error('Failed to parse generated code');
      }

      if (parsed.type !== 'silver') {
        throw new Error(`Wrong type: ${parsed.type}`);
      }

      this.pass(testName, `Parsed: ${parsed.formatted}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 9: Claim Process
   */
  async testClaimProcess() {
    const testName = 'Claim Process';
    try {
      const code = this.generator.generateCode('silver');
      const asset = {
        code: code,
        type: 'silver',
        amount: 1
      };

      const result = await this.processor.processClaim(asset);
      
      if (!result.success) {
        throw new Error(`Claim failed: ${result.error}`);
      }

      if (result.code !== code) {
        throw new Error(`Code mismatch: ${result.code} vs ${code}`);
      }

      this.pass(testName, `Claimed: ${code}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 10: Duplicate Claim Prevention
   */
  async testDuplicateClaimPrevention() {
    const testName = 'Duplicate Claim Prevention';
    try {
      const code = this.generator.generateCode('gold');
      const asset = { code, type: 'gold', amount: 1 };

      // First claim should succeed
      const result1 = await this.processor.processClaim(asset);
      if (!result1.success) {
        throw new Error(`First claim failed: ${result1.error}`);
      }

      // Second claim should fail
      const result2 = await this.processor.processClaim(asset);
      if (result2.success) {
        throw new Error('Duplicate claim was not prevented');
      }

      if (!result2.error.includes('already claimed')) {
        throw new Error(`Wrong error message: ${result2.error}`);
      }

      this.pass(testName, 'Duplicate claims prevented');
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 11: Claim Retrieval
   */
  async testClaimRetrieval() {
    const testName = 'Claim Retrieval';
    try {
      const code = this.generator.generateCode('silver');
      const asset = { code, type: 'silver', amount: 1 };

      await this.processor.processClaim(asset);

      // Retrieve
      const claimed = this.processor.getClaim(code);
      if (!claimed) {
        throw new Error('Claimed code not found');
      }

      if (claimed.code !== code) {
        throw new Error(`Code mismatch: ${claimed.code}`);
      }

      this.pass(testName, `Retrieved: ${code}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 12: Claim Stats
   */
  async testClaimStats() {
    const testName = 'Claim Stats';
    try {
      const stats = this.processor.getStats();
      
      if (typeof stats.totalClaimed !== 'number') {
        throw new Error('Stats invalid');
      }

      this.pass(testName, `Total claimed: ${stats.totalClaimed}, Silver: ${stats.silverCount}, Gold: ${stats.goldCount}`);
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * TEST 13: End-to-End
   */
  async testEndToEnd() {
    const testName = 'End-to-End Flow';
    try {
      // Generate multiple codes
      const silverCode = this.generator.generateCode('silver');
      const goldCode = this.generator.generateCode('gold', 5);

      // Validate both
      if (!this.validator.isValid(silverCode)) throw new Error('Silver code invalid');
      if (!this.validator.isValid(goldCode)) throw new Error('Gold code invalid');

      // Claim both
      const r1 = await this.processor.processClaim({ code: silverCode, type: 'silver' });
      const r2 = await this.processor.processClaim({ code: goldCode, type: 'gold' });

      if (!r1.success || !r2.success) {
        throw new Error('Claim failed');
      }

      // Verify stats
      const stats = this.processor.getStats();
      if (stats.silverCount < 1 || stats.goldCount < 1) {
        throw new Error('Stats not updated');
      }

      this.pass(testName, 'Complete flow successful');
    } catch (e) {
      this.fail(testName, e.message);
    }
  }

  /**
   * Helper: Pass test
   */
  pass(name, message) {
    this.passed++;
    const result = { name, status: 'PASS', message };
    this.results.push(result);
    console.log(`✅ ${name}: ${message}`);
  }

  /**
   * Helper: Fail test
   */
  fail(name, message) {
    this.failed++;
    const result = { name, status: 'FAIL', message };
    this.results.push(result);
    console.log(`❌ ${name}: ${message}`);
  }

  /**
   * Print summary
   */
  printSummary() {
    const total = this.passed + this.failed;
    const percentage = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(50));
    console.log(`📊 TEST SUMMARY`);
    console.log('='.repeat(50));
    console.log(`✅ Passed:  ${this.passed}/${total}`);
    console.log(`❌ Failed:  ${this.failed}/${total}`);
    console.log(`📈 Success: ${percentage}%`);
    console.log('='.repeat(50) + '\n');

    if (this.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!\n');
    } else {
      console.log(`⚠️ ${this.failed} test(s) failed.\n`);
    }
  }
}

// Export for use
export const rewardTests = new RewardTests();

// Attach to window
if (typeof window !== 'undefined') {
  window.RewardTests = RewardTests;
  window.rewardTests = rewardTests;
}

// Run if called directly
if (typeof module !== 'undefined' && module.name === '__main__') {
  rewardTests.runAll().catch(console.error);
}
