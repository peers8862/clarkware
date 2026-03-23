import { buildApp } from './app.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Clark API listening on port ${PORT}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
