// src/routes/customers.ts
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { distanceFromBudapestKm } from '../lib/haversine.js';

export function createCustomersRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/count', async (_req, res) => {
    const count = await prisma.customer.count();
    res.json({ count });
  });

  router.get('/by-distance', async (_req, res) => {
    const customers = await prisma.customer.findMany();

    const withDistance = customers.map((customer) => ({
      ...customer,
      distanceKm:
        customer.lat !== null && customer.lon !== null
          ? distanceFromBudapestKm({ lat: customer.lat, lon: customer.lon })
          : null,
    }));

    withDistance.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return a.name.localeCompare(b.name);
    });

    res.json(withDistance);
  });

  return router;
}
