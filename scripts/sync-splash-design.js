/**
 * Build Script: Sync Splash Design Tokens to Native Assets
 * 
 * This script reads from design-tokens.js and updates:
 * - iOS LaunchScreen.storyboard background color
 * - Android styles.xml splash background
 * - Capacitor config splash settings
 * 
 * Run with: node scripts/sync-splash-design.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Import design tokens
const { splashScreenTokens } = await import(path.join(projectRoot, 'design-tokens.js'));

console.log('🎨 Syncing splash screen design tokens...');
console.log(`Background Color: ${splashScreenTokens.backgroundColor}`);
console.log(`App Name: ${splashScreenTokens.appName}`);

// 1. Update iOS LaunchScreen.storyboard
const updateiOSLaunchScreen = () => {
  const storyboardPath = path.join(projectRoot, 'ios/App/App/Base.lproj/LaunchScreen.storyboard');
  
  if (!fs.existsSync(storyboardPath)) {
    console.log('⚠️ iOS LaunchScreen.storyboard not found, skipping...');
    return;
  }
  
  let storyboard = fs.readFileSync(storyboardPath, 'utf8');
  
  // Replace systemBackgroundColor with custom color
  const hexColor = splashScreenTokens.backgroundColor;
  const [r, g, b] = hexColor.match(/\w\w/g).map(x => parseInt(x, 16) / 255);
  
  const colorXML = `<color red="${r.toFixed(3)}" green="${g.toFixed(3)}" blue="${b.toFixed(3)}" alpha="1" colorSpace="custom" customColorSpace="displayP3"/>`;
  
  // Replace the systemBackgroundColor
  storyboard = storyboard.replace(
    /<color white="1" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"\/>/,
    colorXML
  );
  
  fs.writeFileSync(storyboardPath, storyboard);
  console.log('✅ Updated iOS LaunchScreen.storyboard');
};

// 2. Update Android colors.xml (create if doesn't exist)
const updateAndroidColors = () => {
  const colorsPath = path.join(projectRoot, 'android/app/src/main/res/values/colors.xml');
  const colorsDir = path.dirname(colorsPath);
  
  if (!fs.existsSync(colorsDir)) {
    fs.mkdirSync(colorsDir, { recursive: true });
  }
  
  const colorsXML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Splash Screen Colors - Generated from design-tokens.js -->
    <color name="splash_background">${splashScreenTokens.backgroundColor}</color>
    <color name="colorPrimary">${splashScreenTokens.backgroundColor}</color>
    <color name="colorPrimaryDark">#6FA09C</color>
    <color name="colorAccent">${splashScreenTokens.backgroundColor}</color>
</resources>`;
  
  fs.writeFileSync(colorsPath, colorsXML);
  console.log('✅ Updated Android colors.xml');
};

// 3. Update Android styles.xml to use the color
const updateAndroidStyles = () => {
  const stylesPath = path.join(projectRoot, 'android/app/src/main/res/values/styles.xml');
  
  if (!fs.existsSync(stylesPath)) {
    console.log('⚠️ Android styles.xml not found, skipping...');
    return;
  }
  
  let styles = fs.readFileSync(stylesPath, 'utf8');
  
  // Update the splash theme to use our color (handle both @drawable/splash and @null)
  styles = styles.replace(
    /<item name="android:background">@drawable\/splash<\/item>/,
    `<item name="android:background">@color/splash_background</item>`
  );
  
  // Also ensure the main theme uses our color
  styles = styles.replace(
    /<item name="android:background">@null<\/item>/,
    `<item name="android:background">@color/splash_background</item>`
  );
  
  fs.writeFileSync(stylesPath, styles);
  console.log('✅ Updated Android styles.xml');
};

// 4. Update Capacitor config
const updateCapacitorConfig = () => {
  const configPath = path.join(projectRoot, 'capacitor.config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('⚠️ capacitor.config.json not found, skipping...');
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Ensure plugins object exists
  if (!config.plugins) config.plugins = {};
  
  // Update SplashScreen config
  config.plugins.SplashScreen = {
    launchAutoHide: splashScreenTokens.native.capacitor.launchAutoHide,
    backgroundColor: splashScreenTokens.native.capacitor.backgroundColor,
    showSpinner: splashScreenTokens.native.capacitor.showSpinner
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Updated capacitor.config.json');
};

// 5. Generate summary
const generateSummary = () => {
  console.log('\n📋 Design Token Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎨 Background Color: ${splashScreenTokens.backgroundColor}`);
  console.log(`📱 App Name: ${splashScreenTokens.appName}`);
  console.log(`🖼️ Icon Filter: ${splashScreenTokens.iconFilter}`);
  console.log(`📱 iOS: Background synced to LaunchScreen.storyboard`);
  console.log(`🤖 Android: Background synced to colors.xml and styles.xml`);
  console.log(`⚡ Capacitor: Plugin configured for seamless handoff`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ All platforms now reference the same design source!');
  console.log('📦 Run `npx cap sync` to apply changes to native projects');
};

// Run all updates
try {
  updateiOSLaunchScreen();
  updateAndroidColors();
  updateAndroidStyles();
  updateCapacitorConfig();
  generateSummary();
} catch (error) {
  console.error('❌ Error syncing design tokens:', error);
  process.exit(1);
}
