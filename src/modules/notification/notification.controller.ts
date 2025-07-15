import { Controller, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications() {
    // TODO: Implement get notifications endpoint
    return { message: 'Get notifications endpoint' };
  }

  @Get('unread-count')
  async getUnreadCount() {
    // TODO: Implement get unread count endpoint
    return { message: 'Get unread count endpoint' };
  }
}
