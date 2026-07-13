// src/routes/customers.ts
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';

export function createCustomersRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/count', async (_req, res) => {
    const count = await prisma.customer.count();
    res.json({ count });
  });

  return router;
}
