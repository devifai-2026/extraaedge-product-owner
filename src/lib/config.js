// Environment for the product-owner portal.
// isProd is derived from Vite's build mode: `vite build` sets import.meta.env.PROD
// = true, so any deployed build automatically targets the production backend —
// no manual toggle to forget. `vite`/`vite dev` keeps it false for localhost.
// Override the API host explicitly with VITE_API_BASE_URL if it ever moves.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const isProd = env.PROD === true;

export const API_BASE =
  env.VITE_API_BASE_URL
  || (isProd
    ? 'https://extraaedge-server.onrender.com/api/v1'
    : 'http://localhost:4000/api/v1');

// Grafana observability service (embedded in the Analytics page). Override at
// build time with VITE_GRAFANA_URL; falls back to the Render service URL in
// prod and localhost in dev. Empty string → the Analytics page shows a setup
// hint instead of a broken iframe.
export const GRAFANA_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GRAFANA_URL)
  || (isProd ? 'https://extraaedge-grafana.onrender.com' : 'http://localhost:3001');
