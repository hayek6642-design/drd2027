import { jest } from '@jest/globals'

await jest.unstable_mockModule('@clerk/clerk-sdk-node', () => ({
  verifyToken: jest.fn(async (token) => ({
    sub: 'user_123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    image_url: 'https://example.com/avatar.png',
  })),
}))

await jest.unstable_mockModule('../../api/config/db.js', () => ({
  query: async () => ({ rows: [] }),
  pool: null,
}))

const { clerkAuth } = await import('../../api/middleware/clerk.js')

function createMockRes() {
  const res = {}
  res.statusCode = 200
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (o) => { res.body = o; return res }
  return res
}

test('clerkAuth attaches user and calls next on valid token', async () => {
  const req = { headers: { authorization: 'Bearer mock_token' }, cookies: {} }
  const res = createMockRes()
  let nextCalled = false
  const next = () => { nextCalled = true }

  await clerkAuth(req, res, next)

  expect(nextCalled).toBe(true)
  expect(req.user).toBeDefined()
  expect(req.user.email).toBe('test@example.com')
})
