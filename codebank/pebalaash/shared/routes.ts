import { z } from 'zod';
import { products, categories } from './schema';

export const COUNTRIES = [
  { code: "ALL",  name: "All Countries",  flag: "\uD83C\uDF0D" },
  { code: "EG",   name: "Egypt",          flag: "\uD83C\uDDEA\uD83C\uDDEC" },
  { code: "SA",   name: "Saudi Arabia",   flag: "\uD83C\uDDF8\uD83C\uDDE6" },
  { code: "AE",   name: "UAE",            flag: "\uD83C\uDDE6\uD83C\uDDEA" },
  { code: "KW",   name: "Kuwait",         flag: "\uD83C\uDDF0\uD83C\uDDFC" },
  { code: "QA",   name: "Qatar",          flag: "\uD83C\uDDF6\uD83C\uDDE6" },
  { code: "TR",   name: "Turkey",         flag: "\uD83C\uDDF9\uD83C\uDDF7" },
  { code: "MA",   name: "Morocco",        flag: "\uD83C\uDDF2\uD83C\uDDE6" },
  { code: "NG",   name: "Nigeria",        flag: "\uD83C\uDDF3\uD83C\uDDEC" },
  { code: "US",   name: "United States",  flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "GB",   name: "United Kingdom", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "DE",   name: "Germany",        flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "FR",   name: "France",         flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { code: "PK",   name: "Pakistan",       flag: "\uD83C\uDDF5\uD83C\uDDF0" },
  { code: "IN",   name: "India",          flag: "\uD83C\uDDEE\uD83C\uDDF3" },
];

export const api = {
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/pebalaash/categories',
      responses: { 200: z.array(z.any()) },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/pebalaash/products',
      input: z.object({
        categoryId:  z.number().optional(),
        countryCode: z.string().optional(),
      }).optional(),
      responses: { 200: z.array(z.any()) },
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
          userId: z.string(), codes: z.number(), silver: z.number(), gold: z.number(),
        }),
      },
    },
  },
  checkout: {
    purchase: {
      method: 'POST' as const,
      path: '/api/pebalaash/checkout',
      input: z.object({
        productId:    z.number(),
        paymentType:  z.enum(['codes','silver','gold']).default('codes'),
        customerInfo: z.object({
          name:    z.string(),
          phone:   z.string(),
          address: z.string(),
          email:   z.string().optional(),
          notes:   z.string().optional(),
        }),
      }),
      responses: {
        200: z.object({ success: z.boolean(), amountPaid: z.number(), paymentType: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
  },
  admin: {
    stats: {
      method: 'GET' as const,
      path: '/api/pebalaash/admin/stats',
      responses: { 200: z.object({ totalSold: z.number(), totalRevenueCodes: z.number(), recentOrders: z.array(z.any()), lowStockProducts: z.array(z.any()) }) },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
