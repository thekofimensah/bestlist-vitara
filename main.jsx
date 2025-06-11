import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { checkForUpdate } from './hooks/updateManager';

defineCustomElements(window);

// Check for updates on app start
checkForUpdate().catch(console.error);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);