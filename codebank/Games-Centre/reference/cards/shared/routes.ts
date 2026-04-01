import { z } from 'zod';
import { insertUserSchema, insertCompetitionSchema } from './schema';

// Error schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// API Contract
export const api = {
  users: {
    login: {
      method: 'POST' as const,
      path: '/api/users/login',
      input: insertUserSchema,
      responses: {
        200: z.object({ id: z.number(), username: z.string() }),
        401: z.object({ message: z.string() }),
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/users/register',
      input: insertUserSchema,
      responses: {
        201: z.object({ id: z.number(), username: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  competitions: {
    create: {
      method: 'POST' as const,
      path: '/api/competitions',
      input: insertCompetitionSchema,
      responses: {
        201: z.object({ id: z.number(), status: z.string() }),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/competitions/:id',
      responses: {
        200: z.object({ id: z.number(), status: z.string(), state: z.any().optional() }),
        404: errorSchemas.notFound,
      },
    },
    lockAssets: {
      method: 'POST' as const,
      path: '/api/competitions/:id/lock',
      input: z.object({ userId: z.number(), amount: z.number() }),
      responses: {
        200: z.object({ success: z.boolean(), lockId: z.string() }),
      },
    },
    settle: {
      method: 'POST' as const,
      path: '/api/competitions/:id/settle',
      input: z.object({ winnerId: z.number(), reason: z.string() }),
      responses: {
        200: z.object({ success: z.boolean(), transactionId: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
