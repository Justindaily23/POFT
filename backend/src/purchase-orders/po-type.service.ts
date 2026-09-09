import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePoTypeDto } from './dto/create-po-type.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PoTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePoTypeDto) {
    const code = dto.name.toUpperCase().trim().replace(/\s+/g, '_');

    const existing = await this.prisma.poType.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`A PO Type named "${dto.name}" already exists.`);
    }

    return this.prisma.poType.create({
      data: {
        id: randomUUID(), // fine here — created via UI, no reseed-collision risk like the seed script had
        name: dto.name.trim(),
        description: dto.description.trim(),
        code,
      },
    });
  }

  async findAll() {
    return this.prisma.poType.findMany({ orderBy: { name: 'asc' } });
  }

  async deactivate(id: string) {
    // Soft-delete, not hard delete — see note below on why
    return this.prisma.poType.update({
      where: { id },
      data: { isActive: false },
    });
  }
}