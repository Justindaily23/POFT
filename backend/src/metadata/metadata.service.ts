import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- STAFF ROLES ----------------

  async getStaffRoles() {
    return this.prisma.staffRole.findMany({
      select: { id: true, name: true, code: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async createStaffRole(dto: CreateStaffRoleDto) {
    const code = dto.code ? dto.code.toUpperCase() : this.generateCodeFromName(dto.name);

    const exists = await this.prisma.staffRole.findUnique({
      where: { code },
    });

    if (exists) {
      throw new BadRequestException('Staff role with this code already exists');
    }

    return this.prisma.staffRole.create({
      data: {
        name: dto.name,
        code,
      },
    });
  }

  // ---------------- STATES ----------------

  async getStates() {
    return this.prisma.state.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async getPoTypes() {
    return this.prisma.poType.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      // Using the index you defined for high-performance sorting
      orderBy: {
        name: 'asc',
      },
    });
  }
  // async createState(dto: CreateStateDto) {
  //   const code = this.generateCodeFromName(dto.name);

  //   const exists = await this.prisma.state.findUnique({
  //     where: { code },
  //   });

  //   if (exists) {
  //     throw new BadRequestException('State already exists');
  //   }

  //   return this.prisma.state.create({
  //     data: {
  //       name: dto.name,
  //       code,
  //     },
  //   });
  // }

  // ---------------- HELPERS ----------------
  /**
   * Generates a short, clean acronym from a given string.
   * Handles edge cases like multiple spaces, special characters, and empty inputs.
   */
  private generateCodeFromName(name: string): string {
    if (!name || typeof name !== 'string') return 'N/A';

    const acronym = name
      .trim()
      // 1. Split by any non-word character (spaces, hyphens, underscores)
      .split(/[\s\-_]+/)
      // 2. Filter out empty strings from the split
      .filter((word) => word.length > 0)
      // 3. Take first letter, handle Unicode (accents) correctly via spread
      .map((word) => [...word][0])
      // 4. Filter only alphanumeric characters (removes emojis/punctuation starts)
      .filter((char) => /[a-zA-Z0-9]/.test(char))
      .join('')
      .toUpperCase();

    // 5. Fallback if the name was all special characters (e.g., "!!!")
    return acronym.length > 0 ? acronym : 'CODE';
  }
}
