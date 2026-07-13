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

describe('GET /customers/by-distance', () => {
  it('orders ascending by distance to Budapest, nulls last, ties by name', async () => {
    await prisma.customer.createMany({
      data: [
        { name: fixtureNames[0], telepules: 'Budapest', countryCode: 'HU', lat: 47.4979, lon: 19.0402 },
        { name: fixtureNames[1], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
        { name: fixtureNames[2], telepules: 'Nowhere', countryCode: 'ZZ', lat: null, lon: null },
      ],
    });

    const response = await request(app).get('/customers/by-distance');
    expect(response.status).toBe(200);

    const fixtureOnly = response.body.filter((c: { name: string }) => fixtureNames.includes(c.name));
    expect(fixtureOnly.map((c: { name: string }) => c.name)).toEqual([
      fixtureNames[0],
      fixtureNames[1],
      fixtureNames[2],
    ]);
    expect(fixtureOnly[0].distanceKm).toBe(0);
    expect(fixtureOnly[1].distanceKm).toBeGreaterThan(200);
    expect(fixtureOnly[1].distanceKm).toBeLessThan(225);
    expect(fixtureOnly[2].distanceKm).toBeNull();
  });

  it('breaks ties by name when distances are equal', async () => {
    await prisma.customer.createMany({
      data: [
        { name: fixtureNames[1], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
        { name: fixtureNames[0], telepules: 'Vienna', countryCode: 'AT', lat: 48.2085, lon: 16.3721 },
      ],
    });

    const response = await request(app).get('/customers/by-distance');
    const fixtureOnly = response.body.filter((c: { name: string }) => fixtureNames.includes(c.name));

    expect(fixtureOnly[0].name).toBe(fixtureNames[0]);
    expect(fixtureOnly[1].name).toBe(fixtureNames[1]);
    expect(fixtureOnly[0].distanceKm).toBe(fixtureOnly[1].distanceKm);
  });
});
