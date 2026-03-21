import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { EmailService } from './email.service.js';
import { NotificationListener } from './notification.listener.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [PrismaService, EmailService, NotificationListener],
  exports: [EmailService],
})
export class NotificationsModule {}
