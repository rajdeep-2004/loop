import { buildApp } from './app';
import { config } from './config';
import { connectDb, disconnectDb } from './lib/db';

async function main(): Promise<void> {
  await connectDb(config.mongodbUri);
  const app = await buildApp();
  await app.listen({ port: config.port, host: config.host });

  const shutdown = async () => {
    await app.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
