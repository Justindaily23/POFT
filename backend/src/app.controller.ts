// src/app.controller.ts
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './common/decorators/decorator';
import { AppStatusResponse } from './types/interface/app-status.interface';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  getHealth(): AppStatusResponse {
    const isMaintenance = this.configService.get<string>('MAINTENANCE_MODE') === 'true';

    if (isMaintenance) {
      // 🟢 503 is the industry standard for Maintenance
      throw new ServiceUnavailableException({
        status: 'MAINTENANCE',
        message: 'Stecam POFT is undergoing final verification.',
        system: 'v1.0.0',
      });
    }

    // 🟢 200 OK for Health Monitors (UptimeRobot, Render, AWS)
    return {
      status: 'OPERATIONAL',
      app: 'Stecam Nigeria Limited - POFT API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
