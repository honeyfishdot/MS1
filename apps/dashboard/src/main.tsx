/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handler — catches errors before React mounts
window.onerror = function (msg, url, line, col, error) {
  console.error('Global error:', msg, url, line, col, error);
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="color:#f87171;padding:20px;font-family:monospace;font-size:14px;background:#000;min-height:100vh;margin:0;">
      <h2 style="color:#ef4444">JavaScript Error</h2>
      <p><strong>Error:</strong> ${msg}</p>
      <p><strong>Location:</strong> ${url}:${line}:${col}</p>
      <p><strong>Stack:</strong> ${error ? error.stack?.substring(0, 500) : 'N/A'}</p>
      <p style="color:#6b7280;margin-top:20px">Build: 2026-07-19-debug-v4</p>
    </div>`;
  }
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('[MAIN] Starting dashboard initialization...');

// Verify CSS loaded
console.log('[MAIN] index.css imported');

const rootEl = document.getElementById('root');
if (!rootEl) {
  const errorMsg = 'Fatal: #root element not found in index.html';
  console.error(errorMsg);
  document.body.innerHTML = `<pre style="color:#f87171;padding:16px;font-family:monospace">${errorMsg}</pre>`;
} else {
  console.log('[MAIN] Root element found, creating React root...');
  try {
    const root = ReactDOM.createRoot(rootEl);
    console.log('[MAIN] React root created, rendering App...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('[MAIN] App rendered successfully');
  } catch (err) {
    console.error('[MAIN] Failed to render App:', err);
    rootEl.innerHTML = `<div style="color:#f87171;padding:20px;font-family:monospace;">
      <h2>Render Error</h2>
      <p>${err instanceof Error ? err.message : String(err)}</p>
    </div>`;
  }
}