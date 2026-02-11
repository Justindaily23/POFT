import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { ConfigService, ConfigModule } from '@nestjs/config'; // Add ConfigModule
import { randomUUID } from 'crypto';

// DO NOT import AppModule if it contains Auth/Jwt strategies

async function bootstrap() {
  /**
   * FIX: Create a dynamic module that only includes what the seed needs.
   * This prevents Nest from instantiating the JwtStrategy which is failing.
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
    console.log('🌱 Seeding PO Types...');

    const poTypes = [
      {
        name: 'Transportation',
        description: 'Covers logistics, vehicle hire, fuel, and delivery-related costs.',
      },
      {
        name: 'Implementation',
        description: 'Covers deployment, installation, and system setup activities.',
      },
      {
        name: 'Service Package',
        description: 'Covers bundled services offered as a single commercial unit.',
      },
      {
        name: 'Site Revisit',
        description: 'Covers follow-up visits, inspections, or corrective actions.',
      },
      {
        name: 'Supply',
        description: 'Covers procurement of physical goods or materials.',
      },
      {
        name: 'Transportation Decommissioning',
        description: 'Covers follow-up visits, inspections, or corrective actions.',
      },
      {
        name: 'FTTH',
        description: 'Covers procurement of physical goods or materials.',
      },
      {
        name: 'Survey',
        description: 'Covers site mapping',
      },
    ];

    for (const type of poTypes) {
      const code = type.name.toUpperCase().replace(/\s+/g, '_');

      // No $transaction wrapper - much more stable for cloud
      await prisma.poType.upsert({
        where: { code },
        update: {}, // Don't change anything if it already exists
        create: {
          id: randomUUID(),
          ...type,
          code,
        },
      });
    }

    console.log('✅ PO Types seeded successfully');
  } catch (error) {
    console.error('❌ PO Types seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

bootstrap().catch((err) => console.error(err)); // Add this line
