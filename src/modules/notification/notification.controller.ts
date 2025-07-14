import { Controller, Get, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Query('userId') userId: string) {
    // TODO: Implement get notifications endpoint
    console.log('Fetching notifications for user:', userId);
    return { message: 'Get notifications endpoint' };
  }

  @Get('unread-count')
  async getUnreadCount(@Query('userId') userId: string) {
    // TODO: Implement get unread count endpoint
    console.log('Fetching unread count for user:', userId);
    return { message: 'Get unread count endpoint' };
  }
}
