import mongoose from 'mongoose';
import { config } from '../src/config';
import { connectDb, disconnectDb } from '../src/lib/db';
import { DEMO_PASSWORD } from './seed/data';
import { createRandom } from './seed/random';
import { seedUniversity } from './seed/university';

/** Wipes the database and fills it with the demo university. Never runs in production. */
async function main(): Promise<void> {
  if (config.env === 'production') throw new Error('Refusing to seed a production database');
  await connectDb(config.mongodbUri);
  await mongoose.connection.dropDatabase();
  const random = createRandom(2026);

  const university = await seedUniversity(random);
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  console.log(`Seeded ${university.schools.length} schools, ${university.programs.length} programs, ${university.students.length} students.`);
  console.log(`Log in with rajdeep@campus.test, mira@campus.test or admin@campus.test. Password: ${DEMO_PASSWORD}`);
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
