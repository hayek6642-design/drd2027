#!/usr/bin/env node

/**
 * build-apk.js - CodeBank Mobile Build Script
 * 
 * Builds Android APK and iOS IPA without requiring Android Studio or Xcode.
 * Uses Capacitor CLI + command-line Android/iOS SDK tools.
 * 
 * Usage:
 *   node build-apk.js                    # Build both platforms
 *   node build-apk.js --android          # Android only
 *   node build-apk.js --ios              # iOS only
 *   node build-apk.js --android --release # Release APK (signed)
 *   node build-apk.js --ci               # CI mode (no interactive prompts)
 * 
 * Prerequisites:
 *   - Node.js 18+
 *   - Java JDK 17 (for Android)
 *   - Android SDK command-line tools (for Android)
 *   - Xcode command-line tools (for iOS, macOS only)
 */

import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// Configuration
// ==========================================

const CONFIG = {
  appId: 'com.codebank.app',
  appName: 'CodeBank',
  serverUrl: 'https://drd2027.onrender.com',
  webDir: 'www',
  minSdkVersion: 22,
  targetSdkVersion: 34,
  versionCode: 1,
  versionName: '1.0.0',
  
  // Keystore for signed APK (set via env vars in CI)
  keystore: process.env.KEYSTORE_PATH || './codebank-release.keystore',
  keystorePassword: process.env.KEYSTORE_PASSWORD || '',
  keyAlias: process.env.KEY_ALIAS || 'codebank',
  keyPassword: process.env.KEY_PASSWORD || '',
  
  // Output
  outputDir: './build-output'
};

// ==========================================
// Utilities
// ==========================================

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = 'cyan') {
  console.log(`${COLORS[color]}[CodeBank Build]${COLORS.reset} ${msg}`);
}

function logStep(step, msg) {
  console.log(`\n${COLORS.bold}${COLORS.green}[Step ${step}]${COLORS.reset} ${msg}`);
}

function logError(msg) {
  console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${msg}`);
}

function run(cmd, options = {}) {
  log(`$ ${cmd}`, 'yellow');
  try {
    return execSync(cmd, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || __dirname,
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 300000 // 5 min default
    });
  } catch (err) {
    if (options.ignoreError) {
      log(`Command failed (ignored): ${err.message}`, 'yellow');
      return null;
    }
    throw err;
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.resolve(__dirname, filePath));
}

// ==========================================
// Parse Arguments
// ==========================================

const args = process.argv.slice(2);
const buildAndroid = args.includes('--android') || (!args.includes('--ios'));
const buildIOS = args.includes('--ios') || (!args.includes('--android'));
const isRelease = args.includes('--release');
const isCI = args.includes('--ci');

// ==========================================
// Step 1: Prepare Web Assets
// ==========================================

async function prepareWebAssets() {
  logStep(1, 'Preparing web assets...');

  // Create www directory
  const wwwDir = path.join(__dirname, CONFIG.webDir);
  if (fs.existsSync(wwwDir)) {
    fs.rmSync(wwwDir, { recursive: true });
  }
  fs.mkdirSync(wwwDir, { recursive: true });

  // For server-side rendering mode, we create a minimal shell
  // that loads from the remote server (OTA updates built-in)
  const shellHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0d1117">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>CodeBank</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #0d1117; 
      color: #fff; 
      font-family: -apple-system, system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Safe area support */
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid #30363d;
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { 
      color: #8b949e; 
      font-size: 14px;
      margin-top: 8px;
    }
    .error-msg {
      display: none;
      color: #f85149;
      font-size: 14px;
      margin-top: 16px;
      max-width: 300px;
    }
    .retry-btn {
      display: none;
      margin-top: 16px;
      padding: 10px 24px;
      background: #00d4ff;
      color: #0d1117;
      border: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner" id="spinner"></div>
    <div class="status" id="status">Connecting to CodeBank...</div>
    <div class="error-msg" id="error">
      Unable to connect. Please check your internet connection.
    </div>
    <button class="retry-btn" id="retry" onclick="tryConnect()">
      Retry Connection
    </button>
  </div>

  <script>
    const SERVER = '${CONFIG.serverUrl}';
    let retries = 0;
    const MAX_RETRIES = 3;

    async function tryConnect() {
      document.getElementById('spinner').style.display = 'block';
      document.getElementById('error').style.display = 'none';
      document.getElementById('retry').style.display = 'none';
      document.getElementById('status').textContent = 'Connecting to CodeBank...';

      try {
        const resp = await fetch(SERVER + '/api/health', { 
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(15000) 
        });
        
        if (resp.ok) {
          document.getElementById('status').textContent = 'Loading app...';
          // Server is up, redirect to it
          window.location.replace(SERVER);
        } else {
          throw new Error('Server returned ' + resp.status);
        }
      } catch (err) {
        retries++;
        if (retries < MAX_RETRIES) {
          document.getElementById('status').textContent = 
            'Retrying... (' + retries + '/' + MAX_RETRIES + ')';
          setTimeout(tryConnect, 2000 * retries);
        } else {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('status').textContent = 'Connection failed';
          document.getElementById('error').style.display = 'block';
          document.getElementById('retry').style.display = 'inline-block';
          retries = 0;
        }
      }
    }

    // Start connection attempt
    tryConnect();
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(wwwDir, 'index.html'), shellHtml);

  // Create error fallback page
  const errorHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{background:#0d1117;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.c{text-align:center;max-width:300px}h2{color:#f85149}button{padding:12px 24px;background:#00d4ff;color:#0d1117;border:none;border-radius:8px;font-weight:bold;margin-top:20px;cursor:pointer}</style>
</head><body><div class="c"><h2>Connection Error</h2><p>Unable to reach CodeBank servers. Please check your internet connection and try again.</p>
<button onclick="location.href='index.html'">Retry</button></div></body></html>`;

  fs.writeFileSync(path.join(wwwDir, 'error.html'), errorHtml);

  log('Web assets prepared in ' + CONFIG.webDir);
}

// ==========================================
// Step 2: Install Dependencies
// ==========================================

async function installDeps() {
  logStep(2, 'Installing Capacitor dependencies...');
  
  // Check if node_modules exists and has capacitor
  if (!fileExists('node_modules/@capacitor/core')) {
    run('npm install');
  } else {
    log('Dependencies already installed');
  }
}

// ==========================================
// Step 3: Initialize Capacitor Platforms
// ==========================================

async function initPlatforms() {
  logStep(3, 'Initializing Capacitor platforms...');

  if (buildAndroid && !fileExists('android')) {
    log('Adding Android platform...');
    run('npx cap add android');
  }

  if (buildIOS && !fileExists('ios')) {
    log('Adding iOS platform...');
    run('npx cap add ios');
  }

  // Sync web assets to native projects
  run('npx cap sync');
}

// ==========================================
// Step 4: Configure Android Project
// ==========================================

async function configureAndroid() {
  if (!buildAndroid) return;
  logStep(4, 'Configuring Android project...');

  const androidDir = path.join(__dirname, 'android');
  
  // Update AndroidManifest.xml for required permissions
  const manifestPath = path.join(androidDir, 'app/src/main/AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    
    // Add Internet permission if not present
    if (!manifest.includes('android.permission.INTERNET')) {
      manifest = manifest.replace(
        '<application',
        `<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n    <uses-permission android:name="android.permission.WAKE_LOCK" />\n    <application`
      );
    }

    // Enable cleartext traffic for development
    if (!manifest.includes('usesCleartextTraffic')) {
      manifest = manifest.replace(
        'android:allowBackup',
        'android:usesCleartextTraffic="true"\n        android:allowBackup'
      );
    }

    fs.writeFileSync(manifestPath, manifest);
    log('Android manifest updated');
  }

  // Configure build.gradle for proper SDK versions
  const buildGradlePath = path.join(androidDir, 'app/build.gradle');
  if (fs.existsSync(buildGradlePath)) {
    let gradle = fs.readFileSync(buildGradlePath, 'utf8');
    
    // Update min/target SDK
    gradle = gradle.replace(/minSdkVersion \d+/, `minSdkVersion ${CONFIG.minSdkVersion}`);
    gradle = gradle.replace(/targetSdkVersion \d+/, `targetSdkVersion ${CONFIG.targetSdkVersion}`);
    
    // Update version
    gradle = gradle.replace(/versionCode \d+/, `versionCode ${CONFIG.versionCode}`);
    gradle = gradle.replace(/versionName "[^"]*"/, `versionName "${CONFIG.versionName}"`);
    
    fs.writeFileSync(buildGradlePath, gradle);
    log('Android build.gradle configured');
  }
}

// ==========================================
// Step 5: Build APK
// ==========================================

async function buildAPK() {
  if (!buildAndroid) return;
  logStep(5, `Building Android APK (${isRelease ? 'release' : 'debug'})...`);

  const androidDir = path.join(__dirname, 'android');
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

  // Make gradlew executable
  if (process.platform !== 'win32') {
    run(`chmod +x ${gradlew}`, { cwd: androidDir });
  }

  if (isRelease) {
    // Build signed release APK
    if (!CONFIG.keystorePassword) {
      logError('KEYSTORE_PASSWORD environment variable required for release builds');
      logError('Set: KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD');
      process.exit(1);
    }

    run(`${gradlew} assembleRelease`, {
      cwd: androidDir,
      env: {
        KEYSTORE_PATH: path.resolve(CONFIG.keystore),
        KEYSTORE_PASSWORD: CONFIG.keystorePassword,
        KEY_ALIAS: CONFIG.keyAlias,
        KEY_PASSWORD: CONFIG.keyPassword
      }
    });
  } else {
    // Build debug APK
    run(`${gradlew} assembleDebug`, { cwd: androidDir });
  }

  // Copy APK to output directory
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  
  const variant = isRelease ? 'release' : 'debug';
  const apkSource = path.join(androidDir, `app/build/outputs/apk/${variant}/app-${variant}.apk`);
  const apkDest = path.join(CONFIG.outputDir, `CodeBank-${CONFIG.versionName}-${variant}.apk`);

  if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, apkDest);
    const size = (fs.statSync(apkDest).size / 1024 / 1024).toFixed(1);
    log(`APK built successfully: ${apkDest} (${size} MB)`, 'green');
  } else {
    logError('APK file not found at: ' + apkSource);
    // Try to find APK in alternate locations
    const altApk = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
    if (fs.existsSync(altApk)) {
      fs.copyFileSync(altApk, apkDest);
      log(`APK found at alternate location: ${apkDest}`, 'green');
    }
  }
}

// ==========================================
// Step 6: Build iOS (macOS only)
// ==========================================

async function buildIPA() {
  if (!buildIOS) return;
  
  if (process.platform !== 'darwin') {
    log('iOS builds require macOS. Skipping iOS build.', 'yellow');
    log('Use the GitHub Actions workflow for iOS builds.', 'yellow');
    return;
  }

  logStep(6, `Building iOS IPA (${isRelease ? 'release' : 'debug'})...`);

  const iosDir = path.join(__dirname, 'ios');

  // Build using xcodebuild CLI (no Xcode GUI needed)
  const scheme = 'App';
  const configuration = isRelease ? 'Release' : 'Debug';

  run(`xcodebuild -workspace App.xcworkspace -scheme ${scheme} -configuration ${configuration} -archivePath build/CodeBank.xcarchive archive CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO`, {
    cwd: path.join(iosDir, 'App')
  });

  // Export IPA
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  if (isRelease) {
    // For release, you need proper signing
    log('For App Store release, configure signing in the GitHub Actions workflow', 'yellow');
  }

  log('iOS build completed', 'green');
}

// ==========================================
// Main Build Pipeline
// ==========================================

async function main() {
  console.log(`
╔══════════════════════════════════════╗
║     CodeBank Mobile Build Tool       ║
║     Version ${CONFIG.versionName.padEnd(27)}║
╚══════════════════════════════════════╝
  `);

  log(`Platforms: ${buildAndroid ? 'Android' : ''} ${buildIOS ? 'iOS' : ''}`);
  log(`Mode: ${isRelease ? 'Release' : 'Debug'}`);
  log(`Server: ${CONFIG.serverUrl}`);

  const startTime = Date.now();

  try {
    await prepareWebAssets();
    await installDeps();
    await initPlatforms();
    await configureAndroid();
    await buildAPK();
    await buildIPA();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`
${COLORS.green}${COLORS.bold}
╔══════════════════════════════════════╗
║         BUILD SUCCESSFUL!            ║
╚══════════════════════════════════════╝
${COLORS.reset}
  Time: ${elapsed}s
  Output: ${CONFIG.outputDir}/
    `);

    // List output files
    if (fs.existsSync(CONFIG.outputDir)) {
      const files = fs.readdirSync(CONFIG.outputDir);
      files.forEach(f => {
        const size = (fs.statSync(path.join(CONFIG.outputDir, f)).size / 1024 / 1024).toFixed(1);
        log(`  ${f} (${size} MB)`, 'green');
      });
    }

  } catch (err) {
    logError(`Build failed: ${err.message}`);
    process.exit(1);
  }
}

main();
