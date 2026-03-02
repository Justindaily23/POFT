import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile =
  process.env.NODE_ENV === 'development'
    ? '.env.development'
    : process.env.NODE_ENV === 'test'
      ? '.env.test.local'
      : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL') ?? process.env.DATABASE_URL,
  },
  migrations: {
    // Point this to your seed file
    // seed: 'ts-node -r tsconfig-paths/register ./src/prisma/seed/login-credentials.seed.ts',
    seed: 'ts-node -r tsconfig-paths/register ./src/prisma/seed/seed-po-types.ts',
    // seed: 'ts-node -r tsconfig-paths/register ./src/prisma/seed/states.seed.ts',
  },
});
