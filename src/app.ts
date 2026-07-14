// src/app.ts
import express, { type Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createCustomersRouter } from './routes/customers.js';

export function createApp(prisma: PrismaClient): Express {
  const app = express();
  app.use('/customers', createCustomersRouter(prisma));
  return app;
}
