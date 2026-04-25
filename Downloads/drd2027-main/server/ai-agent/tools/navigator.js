// server/ai-agent/tools/navigator.js
// Service URL registry and access validation

const SERVICES_MAP = {
  pebalaash:  { url: '/codebank/pebalaash/',       requiresAuth: true,  minCodes: 0 },
  games:      { url: '/codebank/games-centre/',    requiresAuth: true,  minCodes: 0 },
  safecode:   { url: '/codebank/safecode/',        requiresAuth: true,  minCodes: 0 },
  samma3ny:   { url: '/codebank/samma3ny/',        requiresAuth: false, minCodes: 0 },
  farragna:   { url: '/codebank/farragna/',        requiresAuth: false, minCodes: 0 },
  shots:      { url: '/codebank/shots/',           requiresAuth: true,  minCodes: 0 },
  aihub:      { url: '/codebank/aihub/',           requiresAuth: false, minCodes: 0 },
  e7ki:       { url: '/codebank/e7ki/',            requiresAuth: true,  minCodes: 0 },
  ledger:     { url: '/codebank/bankode/ledger.html',  requiresAuth: true,  minCodes: 0 },
  qarsan:     { url: '/codebank/qarsan/',          requiresAuth: true,  minCodes: 5 },
  battalooda: { url: '/codebank/battalooda/',      requiresAuth: true,  minCodes: 0 },
  nostalgia:  { url: '/codebank/nostalgia/',       requiresAuth: false, minCodes: 0 },
  corsa:      { url: '/codebank/corsa/',           requiresAuth: false, minCodes: 0 },
  home:       { url: '/codebank/index/',           requiresAuth: false, minCodes: 0 },
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
