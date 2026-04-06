/**
 * CodeBank Service Configuration
 * 
 * Resolves service paths for both development and production.
 * In dev mode with Vite proxy, relative paths are proxied to the correct dev servers.
 * In production, services are served from their built static paths.
 */

// API base - always use relative paths (proxied in dev, direct in prod)
export const API_BASE = '';

// Service iframe paths - relative to the app root
export const SERVICE_PATHS = {
  codebank: '/codebank/indexCB.html',
  corsa:    '/codebank/corsa/index.html',
  e7ki:     '/codebank/e7ki/client/index.html',
  farragna: '/codebank/farragna/index.html',
};

// API endpoints (relative - proxied through Vite in dev)
export const API_ENDPOINTS = {
  setta: {
    photos:     '/api/setta/photos',
    upload:     '/api/setta/upload',
  },
  piccarboon: {
    challenge:   '/api/piccarboon/challenge',
    submit:      '/api/piccarboon/submit',
    leaderboard: '/api/piccarboon/leaderboard',
    winners:     '/api/piccarboon/winners',
    losers:      '/api/piccarboon/losers',
  },
};
