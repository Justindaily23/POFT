import { PrismaService } from '../prisma.service';
import { NIGERIAN_STATES } from '../data/states';

export async function seedStates(prisma: PrismaService) {
  console.log('🌱 Seeding Nigerian States...');

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
}
