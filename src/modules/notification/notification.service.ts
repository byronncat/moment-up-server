import type { NotificationPayload, PaginationDto } from 'api';
import { Injectable } from '@nestjs/common';
import { generateNotifications } from 'src/__mocks__/notifications';
import { NotificationsDto } from './dto/notifications';
import { NotificationType } from 'src/common/constants';

@Injectable()
export class NotificationService {
  private readonly notifications = generateNotifications();

  public async get(userId: string, { page, limit, type }: NotificationsDto) {
    const notifications = this.notifications
      .filter((notification) => {
        if (type === NotificationType.ALL) return true;
        if (type === NotificationType.REQUEST)
          return (
            notification.type === NotificationType.SOCIAL &&
            notification.information.type === NotificationType.FOLLOW
          );
        if (type === NotificationType.SOCIAL)
          return (
            notification.type === NotificationType.SOCIAL &&
            (notification.information.type === NotificationType.POST ||
              notification.information.type === NotificationType.MENTION)
          );
        return false;
      })
      .slice((page - 1) * limit, page * limit);
    const pagination: PaginationDto<NotificationPayload> = {
      total: this.notifications.length,
      page,
      limit,
      hasNextPage: page < Math.ceil(this.notifications.length / limit),
      items: notifications,
    };
    return pagination;
  }
}
