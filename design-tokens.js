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
  backgroundColor: '#F6F6F4', 
  iconFilter: 'brightness(0) saturate(100%)',
  textColor: '#000000',
  
  // Typography
  fontFamily: 'arsenal-sc',
  appName: 'CURATE',
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
      backgroundColorHex: '#F6F6F4',
      systemBackgroundColor: false // Use custom color instead
    },
    
    // Android splash
    android: {
      backgroundColorHex: '#F6F6F4',
      splashDrawable: '@drawable/splash',
      theme: 'AppTheme.NoActionBarLaunch'
    },
    
    // Capacitor config
    capacitor: {
      launchAutoHide: false,
      backgroundColor: '#F6F6F4',
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
