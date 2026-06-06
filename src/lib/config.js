// Environment toggle for the product-owner portal.
// Set isProd = true to hit the deployed backend, false for local dev.

export const isProd = true;

export const API_BASE = isProd
  ? 'https://extraaedge-server.onrender.com/api/v1'
  : 'http://localhost:4000/api/v1';
