// server/ai-agent/tools/navigator.js
// Service URL registry and access validation

const SERVICES_MAP = {
  pebalaash:  { url: '/codebank/pebalaash.html',       requiresAuth: true,  minCodes: 0 },
  games:      { url: '/codebank/Games-Centre.html',    requiresAuth: true,  minCodes: 0 },
  safecode:   { url: '/codebank/safecode.html',        requiresAuth: true,  minCodes: 0 },
  samma3ny:   { url: '/codebank/samma3ny.html',        requiresAuth: false, minCodes: 0 },
  farragna:   { url: '/codebank/farragna.html',        requiresAuth: false, minCodes: 0 },
  shots:      { url: '/codebank/shots.html',           requiresAuth: true,  minCodes: 0 },
  aihub:      { url: '/codebank/aihub.html',           requiresAuth: false, minCodes: 0 },
  e7ki:       { url: '/codebank/e7ki.html',            requiresAuth: true,  minCodes: 0 },
  ledger:     { url: '/codebank/bankode/ledger.html',  requiresAuth: true,  minCodes: 0 },
  qarsan:     { url: '/codebank/qarsan.html',          requiresAuth: true,  minCodes: 5 },
  battalooda: { url: '/codebank/battalooda.html',      requiresAuth: true,  minCodes: 0 },
  nostaglia:  { url: '/codebank/nostaglia.html',       requiresAuth: false, minCodes: 0 },
  corsa:      { url: '/codebank/corsa.html',           requiresAuth: false, minCodes: 0 },
  home:       { url: '/codebank/index.html',           requiresAuth: false, minCodes: 0 },
};

export function resolveService(serviceId) {
  if (!serviceId) return null;
  const svc = SERVICES_MAP[serviceId.toLowerCase()];
  if (!svc) return null;
  return { id: serviceId.toLowerCase(), ...svc };
}

export function canAccess(service, userContext) {
  if (!service) return { ok: false, reason: 'Service not found' };
  if (service.minCodes > 0 && userContext.assets.codes < service.minCodes) {
    return {
      ok:     false,
      reason: `Requires ${service.minCodes} codes (you have ${userContext.assets.codes})`,
    };
  }
  return { ok: true };
}

export function listServices() {
  return Object.entries(SERVICES_MAP).map(([id, s]) => ({ id, url: s.url }));
}
