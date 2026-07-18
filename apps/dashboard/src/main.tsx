/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Environment validation - warn (do NOT throw) if recommended VITE_* vars are missing.
// Throwing here blanks the entire app (white screen) in production builds where
// build-time env vars may be absent. App.tsx provides safe fallbacks for all of these.
const RECOMMENDED_ENV_VARS = [
  'VITE_API_BASE',
  'VITE_ENGINE_MODE',
];

const missing = RECOMMENDED_ENV_VARS.filter(key => !import.meta.env[key]);
if (missing.length > 0) {
  console.warn(`Missing recommended environment variables (using fallbacks): ${missing.join(', ')}`);
} else {
  console.log('Environment validation passed');
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML =
    '<pre style="color:#f87171;padding:16px;font-family:monospace">Fatal: #root element not found in index.html</pre>';
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
