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
    seed: 'ts-node -r tsconfig-paths/register ./src/prisma/seed.ts',
  },
});
