import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { checkForUpdate } from './hooks/updateManager';
import { SplashScreen } from '@capacitor/splash-screen';

defineCustomElements(window);

// Check for updates on app start
checkForUpdate().catch(console.error);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Hide native splash screen immediately after React renders
// This creates seamless handoff from native splash to React LoadingScreen
requestAnimationFrame(() => {
  SplashScreen.hide({ fadeOutDuration: 150 }).catch(() => {
    // Gracefully handle if SplashScreen plugin isn't available (web)
  });
});