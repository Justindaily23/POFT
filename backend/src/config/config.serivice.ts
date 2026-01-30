import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  get port(): number {
    return this.configService.get<number>('port') || 3000;
  }

  /*   get database() {
    return {
      host: this.configService.get<string>('host'),
      port: this.configService.get<number>('port'),
      username: this.configService.get<string>('username'),
      password: this.configService.get<string>('password'),
      name: this.configService.get<string>('name'),
    };
  } */
}
