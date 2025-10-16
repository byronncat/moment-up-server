import type { Notification } from 'schema';
import type { NotificationDto, PaginationDto } from 'api';

import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { UserService } from '../user/user.service';
import { NotificationsDto } from './dto/notifications';
import { NotificationType } from 'src/common/constants';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService
  ) {}

  public async get(userId: string, { page, limit, type }: NotificationsDto) {
    try {
      const notifications = await this.supabaseService.select<Notification>('notifications', {
        select: 'id, type, created_at, read_at, actor_id',
        where: { user_id: userId, type },
        orderBy: { column: 'created_at', ascending: false },
        limit: limit + 1,
        offset: (page - 1) * limit,
      });

      const hasNextPage = notifications.length > limit;
      if (hasNextPage) notifications.pop();

      if (notifications.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        } as PaginationDto<NotificationDto>;

      const actorIds = [...new Set(notifications.map((n) => n.actor_id))];
      const actorSummaries = (await this.userService.getUserSummaries(actorIds, userId)) ?? [];
      const actorMap = new Map(actorSummaries.map((actor) => [actor.id, actor]));

      const items: NotificationDto[] = notifications
        .map((notification) => {
          const actor = actorMap.get(notification.actor_id);
          if (!actor) return null;

          return {
            type: notification.type,
            data: actor,
            createdAt: notification.created_at,
            viewed: notification.read_at !== null,
          } satisfies NotificationDto;
        })
        .filter((item) => item !== null);

      return {
        page,
        limit,
        hasNextPage,
        items,
      } as PaginationDto<NotificationDto>;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'get',
        context: 'NotificationService',
      });

      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async notify(
    type: NotificationType,
    data: {
      userId: string;
      actorId: string;
      entityId: string | null;
    }
  ) {
    try {
      const [notification] = await this.supabaseService.insert<Notification>('notifications', {
        user_id: data.userId,
        actor_id: data.actorId,
        entity_id: data.entityId as any,
        type,
      });

      return notification;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'notify',
        context: 'NotificationService',
      });
      return null;
    }
  }

  public async markAsRead(notificationId: number) {
    try {
      await this.supabaseService.update<Notification>(
        'notifications',
        { read_at: new Date() },
        { id: notificationId }
      );
      return true;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'markAsRead',
        context: 'NotificationService',
      });
      return false;
    }
  }

  public async markAllAsRead(userId: string) {
    try {
      await this.supabaseService.update<Notification>(
        'notifications',
        { read_at: new Date() },
        { user_id: userId, read_at: null }
      );
      return true;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'markAllAsRead',
        context: 'NotificationService',
      });
      return false;
    }
  }

  public async removeFollowRequest(userId: string, actorId: string) {
    try {
      await this.supabaseService.delete('notifications', {
        user_id: userId,
        actor_id: actorId,
        type: NotificationType.FOLLOW_REQUEST,
      });
      return true;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'removeFollowRequest',
        context: 'NotificationService',
      });
    }
  }
}
