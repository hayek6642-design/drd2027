export function getIdentity(req, res, next) {
  // Mock identity for zero-auth mode
  req.user = {
    id: 'anonymous',
    clerkUserId: 'anonymous',
    email: 'anonymous@example.com',
    role: 'user'
  }
  next()
}

export function requireAuth(req, res, next) {
  // Allow all requests in zero-auth mode
  next()
}
