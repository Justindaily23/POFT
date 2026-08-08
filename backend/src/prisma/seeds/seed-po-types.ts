import { PrismaService } from '../prisma.service';
import { createHash } from 'crypto';

function deterministicId(namespace: string, key: string): string {
  const hash = createHash('sha256').update(`${namespace}:${key}`).digest('hex');
  return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join('-');
}

export async function seedPoTypes(prisma: PrismaService) {
  console.log('🌱 Seeding PO Types...');

  const poTypes = [
    { name: 'Transportation', description: 'Covers logistics, vehicle hire, fuel, and delivery-related costs.' },
    { name: 'Implementation', description: 'Covers deployment, installation, and system setup activities.' },
    { name: 'Service Package', description: 'Covers bundled services offered as a single commercial unit.' },
    { name: 'Revisit', description: 'Covers follow-up visits, inspections, or corrective actions.' },
    { name: 'Supply', description: 'Covers procurement of physical goods or materials.' },
    { name: 'Decom', description: 'Covers decommissioning, equipment removal, and site restoration.' },
    { name: 'FTTH', description: 'Covers Fiber-to-the-Home deployment, structural cabling, and fiber connectivity.' },
    { name: 'Survey', description: 'Covers site mapping' },
    { name: 'Installation', description: 'Covers site installation and setup activities.' },
    {
      name: 'Community Issue',
      description:
        'Covers costs arising from local community disputes, right-of-way hurdles, or social context delays.',
    },
    {
      name: 'Incentive',
      description: 'Covers performance bonuses, fast-track rewards, or milestone-based premiums for field crews.',
    },
    {
      name: 'Locked Team',
      description: 'Covers standby retainers or compensation for teams unable to work due to site-access restrictions.',
    },
  ];

  for (const type of poTypes) {
    const code = type.name.toUpperCase().replace(/\s+/g, '_');
    const id = deterministicId('po-type', code);

    await prisma.poType.upsert({
      where: { code },
      update: {},
      create: { id, ...type, code },
    });
  }

  console.log('✅ PO Types seeded successfully');
}
