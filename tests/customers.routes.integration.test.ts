// tests/customers.routes.integration.test.ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestPrismaClient } from './test-db.js';

const prisma = createTestPrismaClient();
const app = createApp(prisma);

const fixtureNames = ['Route Test Alpha', 'Route Test Beta', 'Route Test Gamma'];

beforeEach(async () => {
  await prisma.customer.deleteMany({ where: { name: { in: fixtureNames } } });
});

afterAll(async () => {
  await prisma.customer.deleteMany({ where: { name: { in: fixtureNames } } });
  await prisma.$disconnect();
});

describe('GET /customers/count', () => {
  it('returns the actual row count', async () => {
    await prisma.customer.createMany({
      data: [
        { name: fixtureNames[0], telepules: 'Budapest', countryCode: 'HU', lat: 47.4979, lon: 19.0402 },
        { name: fixtureNames[1], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
      ],
    });

    const before = await prisma.customer.count();

    const response = await request(app).get('/customers/count');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: before });
  });
});
