import { Module } from '@nestjs/common';
import { PoWorkspaceService } from './po-workspace.service';
import { PoWorkspaceController } from './po-workspace.controller';

@Module({
  providers: [PoWorkspaceService],
  controllers: [PoWorkspaceController],
})
export class PoWorkspaceModule {}
