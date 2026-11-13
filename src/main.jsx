import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/store.js';   // boots the core db before first render
import './lib/notify.js';  // wires legacy toast()/goto()/modals to Sonner + router
import App from './App.jsx';
import { lang } from './lib/i18n.js';

document.documentElement.lang = lang;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
