import { Controller, Post, UploadedFile, UseInterceptors, Req, Get, Query, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PoImportService, ImportResult } from './po-import.service';
import { PoImportHistory } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
import { Request } from 'express';

// 1. Define the Authenticated Request structure to satisfy strict linting
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    // Add other JWT payload fields if needed (e.g., email, role)
  };
}

@Controller('purchase-orders')
export class PoImportController {
  constructor(
    private readonly importService: PoImportService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          // Prefix unused 'req' with '_'
          const name = file.originalname.split('.')[0];
          const fileExt = extname(file.originalname);
          const uniqueSuffix = Date.now();
          cb(null, `${name}-${uniqueSuffix}${fileExt}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        // Prefix unused 'req' with '_'
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(new Error('Only Excel files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  // 2. Change 'req: any' to 'req: AuthenticatedRequest' to remove "Unsafe member access"
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<ImportResult> {
    if (!file) throw new Error('No file uploaded');

    // 3. uploadedBy is now a known string, fixing the "Unsafe argument" warning
    const uploadedBy = req.user?.id;

    const result = await this.importService.importFromExcel(file, uploadedBy);

    return result;
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  async getHistory(@Query('limit') limit = '50', @Query('status') status?: string): Promise<PoImportHistory[]> {
    const where = status ? { status } : {};

    // 4. Handle parseInt safely to avoid potential numeric operation issues
    const take = parseInt(limit, 10);

    return await this.prisma.poImportHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: isNaN(take) ? 50 : take,
    });
  }
}
