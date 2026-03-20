import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validate } from './common/env.validation.js';
import { PrismaService } from './common/prisma.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogsModule } from './catalogs/catalogs.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { EvaluationModule } from './evaluation/evaluation.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    // Logger
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 300,
      },
    ]),

    // BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL'),
        },
      }),
    }),

    // Events
    EventEmitterModule.forRoot(),

    // Feature modules
    AuthModule,
    CatalogsModule,
    InterviewsModule,
    EvaluationModule,
    ReportsModule,
    NotificationsModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
