import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const envFile =
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : process.env.NODE_ENV === 'test'
        ? '.env.test.local'
        : '.env';
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
}


export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Falls back gracefully to native process variables if the wrapper helper returns empty
    url: env('DATABASE_URL') ?? process.env.DATABASE_URL,
  },
  migrations: {
    //Only attempt to call ts-node if we are NOT running inside our production cloud container
    seed: isProduction ? undefined : 'ts-node -r tsconfig-paths/register ./src/prisma/seed.ts',
  },
});