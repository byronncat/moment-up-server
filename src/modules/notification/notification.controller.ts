import type { JwtPayload } from 'jwt-library';
import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AccessToken } from 'src/common/decorators';
import { AccessTokenGuard } from 'src/common/guards';
import { NotificationsDto } from './dto/notifications';

@Controller({
  path: 'notifications',
  version: '1',
})
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getNotifications(
    @AccessToken() token: JwtPayload,
    @Query() notificationsDto: NotificationsDto
  ) {
    const userId = token?.sub || '';
    return this.notificationService.get(userId, notificationsDto);
  }
}
