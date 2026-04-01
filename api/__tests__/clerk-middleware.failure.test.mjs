import { jest } from '@jest/globals'

await jest.unstable_mockModule('@clerk/clerk-sdk-node', () => ({
  verifyToken: jest.fn(async () => null),
}))

const { clerkAuth } = await import('../../api/middleware/clerk.js')

function createMockRes() {
  const res = {}
  res.statusCode = 200
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (o) => { res.body = o; return res }
  return res
}

test('clerkAuth returns 401 on invalid token', async () => {
  const req = { headers: { authorization: 'Bearer invalid' }, cookies: {} }
  const res = createMockRes()
  const next = () => {}

  await clerkAuth(req, res, next)

  expect(res.statusCode).toBe(401)
  expect(res.body?.error).toBeDefined()
})
