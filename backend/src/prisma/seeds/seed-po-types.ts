import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { ConfigModule } from '@nestjs/config';
import { createHash } from 'crypto';

// DO NOT import AppModule if it contains Auth/Jwt strategies

/**
 * Deterministic UUID-like ID derived from a stable key.
 * Same namespace + key -> same output, every time, on every machine.
 * This keeps reference-data IDs stable across `migrate reset` + reseed,
 * so any foreign key pointing at them never goes stale.
 */
function deterministicId(namespace: string, key: string): string {
  const hash = createHash('sha256').update(`${namespace}:${key}`).digest('hex');
  return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join('-');
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext({
    module: class SeedModule {},
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [PrismaService],
  });

  const prisma = app.get(PrismaService);

  try {
    console.log('🌱 Seeding PO Types...');

    const poTypes = [
      { name: 'Transportation', description: 'Covers logistics, vehicle hire, fuel, and delivery-related costs.' },
      { name: 'Implementation', description: 'Covers deployment, installation, and system setup activities.' },
      { name: 'Service Package', description: 'Covers bundled services offered as a single commercial unit.' },
      { name: 'Revisit', description: 'Covers follow-up visits, inspections, or corrective actions.' },
      { name: 'Supply', description: 'Covers procurement of physical goods or materials.' },
      { name: 'Decom', description: 'Covers decommissioning, equipment removal, and site restoration.' }, // 🔧 Fixed copy-paste description
      { name: 'FTTH', description: 'Covers Fiber-to-the-Home deployment, structural cabling, and fiber connectivity.' }, // 🔧 Fixed copy-paste description
      { name: 'Survey', description: 'Covers site mapping' },
      { name: 'Installation', description: 'Covers site installation and setup activities.' },
      {
        name: 'Community Issue',
        description:
          'Covers costs arising from local community disputes, right-of-way hurdles, or social context delays.',
      }, // 🚀 Added
      {
        name: 'Incentive',
        description: 'Covers performance bonuses, fast-track rewards, or milestone-based premiums for field crews.',
      }, // 🚀 Added
      {
        name: 'Locked Team',
        description:
          'Covers standby retainers or compensation for teams unable to work due to site-access restrictions.',
      }, // 🚀 Added
    ];

    for (const type of poTypes) {
      const code = type.name.toUpperCase().replace(/\s+/g, '_');
      const id = deterministicId('po-type', code);

      await prisma.poType.upsert({
        where: { code },
        update: {}, // don't touch an existing row's id or data
        create: {
          id, // 🔧 deterministic — stable across resets, not random
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

bootstrap().catch((err) => console.error(err));
