import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { checkForUpdate } from './hooks/updateManager';
import { SplashScreen } from '@capacitor/splash-screen';
import { initStartupProfiler } from './lib/startupProfiler';

defineCustomElements(window);

// Profiler disabled - causing startup issues
// setTimeout(() => {
//   try { 
//     initStartupProfiler(); 
//   } catch (e) { 
//     console.error('Profiler failed:', e); 
//   }
// }, 100);

// Check for updates on app start (non-blocking)
checkForUpdate().catch(console.error);

createRoot(document.getElementById('root')).render(
    <App />

);

// Splash screen hiding is now handled in App.jsx after React initializes