// src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard) //  Only logged-in users can see their alerts
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Used by PMs and Admins to see their list of alerts.
   */
  @Get()
  findAll(@Request() req) {
    // req.user.id comes from your JWT payload
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  /**
   * GET /notifications/unread-count
   * Used for the little red dot/badge on the Bell icon.
   */
  @Get('unread-count')
  getUnread(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  /**
   * PATCH /notifications/:id/read
   * Triggered when a user clicks an individual notification.
   */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  /**
   * PATCH /notifications/read-all
   * The "Clear All" enterprise feature.
   */
  @Patch('read-all')
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
