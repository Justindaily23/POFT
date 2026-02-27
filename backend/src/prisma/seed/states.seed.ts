import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { ConfigModule } from '@nestjs/config'; // Add ConfigModule
import { NIGERIAN_STATES } from '../data/states';

// DO NOT import AppModule if it contains Auth/Jwt strategies

async function bootstrap() {
  /**
   * FIX: Create a dynamic module that only includes what the seed needs.
   * This prevents Nest from instantiating the JwtStrategy
   */
  const app = await NestFactory.createApplicationContext({
    module: class SeedModule {},
    imports: [
      ConfigModule.forRoot({ isGlobal: true }), // Loads your .env
      // Import your PrismaModule here. Assuming it exports PrismaService.
      // If not, you can use: providers: [PrismaService]
    ],
    providers: [PrismaService],
  });

  const prisma = app.get(PrismaService);

  try {
    console.log('🌱 Seeding Nigerian States...');

    // No transaction wrapper needed here
    for (const state of NIGERIAN_STATES) {
      await prisma.state.upsert({
        where: { code: state.code },
        update: { name: state.name },
        create: {
          code: state.code,
          name: state.name,
        },
      });
    }

    console.log(`✅ Successfully seeded ${NIGERIAN_STATES.length} states.`);
  } catch (error) {
    console.error('❌ States seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

bootstrap().catch((err) => console.error(err)); // Add this line
