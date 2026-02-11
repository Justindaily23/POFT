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
        filename: (req, file, cb) => {
          const name = file.originalname.split('.')[0];
          const fileExt = extname(file.originalname);
          const uniqueSuffix = Date.now();
          cb(null, `${name}-${uniqueSuffix}${fileExt}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(new Error('Only Excel files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: any): Promise<ImportResult> {
    if (!file) throw new Error('No file uploaded');

    const uploadedBy = req.user?.id || null;

    const result = await this.importService.importFromExcel(file, uploadedBy);

    return result;
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  async getHistory(@Query('limit') limit = '50', @Query('status') status?: string): Promise<PoImportHistory[]> {
    const where = status ? { status } : {};

    return await this.prisma.poImportHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });
  }
}
