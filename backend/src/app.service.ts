// src/app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getSystemStatus() {
    return {
      name: 'Stecam POFT API',
      version: '1.0.0',
      environment: this.configService.get<string>('NODE_ENV') || 'production',
    };
  }
}
