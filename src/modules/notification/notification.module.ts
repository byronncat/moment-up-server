import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, UserService],
})
export class NotificationModule {}
