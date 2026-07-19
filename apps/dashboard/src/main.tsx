/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handler — catches errors before React mounts and displays them
window.onerror = function (msg, url, line, col, error) {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<pre style="color:#f87171;padding:16px;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;background:#020617;min-height:100vh;margin:0;">Fatal JavaScript Error:
${msg}
Location: ${url}:${line}:${col}
Stack: ${error ? error.stack : 'N/A'}
Build: 2026-07-19-critical-fix-v3</pre>`;
  }
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('Unhandled promise rejection:', event.reason);
});

// Deploy marker — bumping this forces a fresh frontend rebuild on Render
console.log('Allbright Dashboard build: 2026-07-19-critical-fix-v3');

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