import { z } from 'zod';
import { products, categories } from './schema';

export const api = {
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/pebalaash/categories',
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/pebalaash/products',
      input: z.object({
        categoryId: z.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/pebalaash/products/:id',
      responses: {
        200: z.any(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  wallet: {
    get: {
      method: 'GET' as const,
      path: '/api/pebalaash/wallet',
      responses: {
        200: z.object({
          userId: z.string(),
          codes: z.number(),
        }),
      },
    },
  },
  checkout: {
    purchase: {
      method: 'POST' as const,
      path: '/api/pebalaash/checkout',
      input: z.object({
        productId: z.number(),
        customerInfo: z.object({
          name: z.string(),
          phone: z.string(),
          address: z.string(),
          notes: z.string().optional(),
        }),
      }),
      responses: {
        200: z.object({ success: z.boolean(), remainingCodes: z.number() }),
        400: z.object({ message: z.string() }),
      },
    },
  },
  admin: {
    stats: {
      method: 'GET' as const,
      path: '/api/pebalaash/admin/stats',
      responses: {
        200: z.object({
          totalSold: z.number(),
          totalRevenueCodes: z.number(),
          recentOrders: z.array(z.any()),
          lowStockProducts: z.array(z.any()),
        }),
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
