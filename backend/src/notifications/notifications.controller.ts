import { Controller, Get, Patch, Param, Request as Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.notificationsService.getUserNotifications(req.user.sub);
  }

  @Get('unread-count')
  getUnread(@Req() req: RequestWithUser) {
    return this.notificationsService.getUnreadCount(req.user.sub);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: RequestWithUser) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
