// App Configuration - Update these values when you decide on your app name
export const appConfig = {
  // App branding
  name: "curate", // Change this to your final app name
  displayName: "CURATE", // User-friendly display name
  
  // URL scheme for deep linking (should match your app name)
  urlScheme: "curate", // Change this to match your app name
  
  // App store URLs (update these when you publish)
  appStoreUrl: "https://apps.apple.com/app/your-app-id", // iOS App Store
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.test.curate", // Google Play Store
  
  // Web app URL (optional - for future web version)
  webUrl: "https://your-app-name.vercel.app", // Optional: for web version
  
  // Google APIs
  // Prefer setting Vite env var VITE_GOOGLE_PLACES_API_KEY. This value here is a fallback.
  googlePlacesApiKey: "",
  
  // Deep link base URL
  get deepLinkUrl() {
    return `${this.urlScheme}://`;
  },
  
  // Get store URL based on platform
  getStoreUrl() {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        return this.appStoreUrl;
      } else {
        return this.playStoreUrl;
      }
    }
    return this.playStoreUrl; // Default to Play Store
  }
};

// Export individual values for convenience
export const { 
  name: appName, 
  displayName, 
  urlScheme, 
  deepLinkUrl,
  getStoreUrl 
} = appConfig; 