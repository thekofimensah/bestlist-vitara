/**
 * Design Tokens - Single Source of Truth for Splash Screen Design
 * This file defines all visual properties used across:
 * - React LoadingScreen component
 * - iOS LaunchScreen.storyboard  
 * - Android splash drawable
 * - Capacitor SplashScreen config
 */

export const splashScreenTokens = {
  // Colors
  backgroundColor: '#88b7b5', // Teal background from LoadingScreen
  iconFilter: 'brightness(0) saturate(100%) invert(100%)', // White icon
  textColor: '#FFFFFF',
  
  // Typography
  fontFamily: 'lateef',
  appName: 'bestlist',
  fontSize: {
    mobile: '5xl', // text-5xl in Tailwind
    tablet: '6xl', // text-6xl 
    desktop: '7xl' // text-7xl
  },
  
  // Layout
  iconSize: {
    width: 320,
    height: 320,
    mobileClass: 'w-72 h-72', // 288px
    tabletClass: 'md:w-80 md:h-80' // 320px
  },
  
  // Animation
  logoAnimation: {
    y: [0, -10, 0],
    duration: 3,
    repeat: 'infinite',
    ease: 'easeInOut'
  },
  
  // Native specific
  native: {
    // iOS LaunchScreen
    ios: {
      backgroundColorHex: '#88b7b5',
      systemBackgroundColor: false // Use custom color instead
    },
    
    // Android splash
    android: {
      backgroundColorHex: '#88b7b5',
      splashDrawable: '@drawable/splash',
      theme: 'AppTheme.NoActionBarLaunch'
    },
    
    // Capacitor config
    capacitor: {
      launchAutoHide: false,
      backgroundColor: '#88b7b5',
      showSpinner: false,
      fadeOutDuration: 200
    }
  },
  
  // Loading messages (from LoadingScreen)
  loadingMessages: [
    "Loading assets",
    "Loading Lists", 
    "Loading profile",
    "Done"
  ]
};

// CSS custom properties that can be imported into your components
export const splashScreenCSS = `
  :root {
    --splash-bg-color: ${splashScreenTokens.backgroundColor};
    --splash-text-color: ${splashScreenTokens.textColor};
    --splash-icon-filter: ${splashScreenTokens.iconFilter};
  }
`;

export default splashScreenTokens;

// Font Configuration - Change these values to update fonts across the app
export const FONTS = {
  // Main title font - currently set to Lateef
  title: 'font-lateef',
  
  // Alternative title fonts - uncomment and change title above to use these
  // title: 'font-katibeh',
  // title: 'font-sen',
  // title: 'font-jua',
  // title: 'font-reenie-beanie',
  
  // Body text font
  body: 'font-sans',
  
  // Special accent font
  accent: 'font-katibeh'
};

// Font weight configurations for titles
export const TITLE_WEIGHTS = {
  light: 'font-light',
  normal: 'font-normal', 
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold'
};

// Common title combinations
export const TITLE_STYLES = {
  // Main page titles
  h1: `${FONTS.title} ${TITLE_WEIGHTS.bold}`,
  h2: `${FONTS.title} ${TITLE_WEIGHTS.semibold}`,
  h3: `${FONTS.title} ${TITLE_WEIGHTS.medium}`,
  
  // Section headers
  section: `${FONTS.title} ${TITLE_WEIGHTS.semibold}`,
  
  // Card titles
  card: `${FONTS.title} ${TITLE_WEIGHTS.medium}`,
  
  // Modal titles
  modal: `${FONTS.title} ${TITLE_WEIGHTS.bold}`,
  
  // Navigation titles
  nav: `${FONTS.title} ${TITLE_WEIGHTS.medium}`,
  
  // Achievement titles
  achievement: `${FONTS.title} ${TITLE_WEIGHTS.bold}`,
  
  // List titles
  list: `${FONTS.title} ${TITLE_WEIGHTS.medium}`,
  
  // Profile titles
  profile: `${FONTS.title} ${TITLE_WEIGHTS.semibold}`
};

// Quick font switcher - change this to update all titles at once
export const CURRENT_TITLE_FONT = FONTS.title;

// Export all fonts for individual use
export const ALL_FONTS = {
  lateef: 'font-lateef',
  katibeh: 'font-katibeh', 
  sen: 'font-sen',
  jua: 'font-jua',
  reenieBeanie: 'font-reenie-beanie',
  sans: 'font-sans'
};
