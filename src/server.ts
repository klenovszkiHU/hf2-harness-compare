// src/server.ts
import { createApp } from './app.js';
import { prisma } from './prisma-client.js';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = createApp(prisma);

app.listen(port, () => {
  console.log(`HF2 customer service listening on port ${port}`);
});
