import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtCookieStrategy } from './strategies/jwt-cookie.strategy.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtCookieGuard } from './guards/jwt-cookie.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: config.get<string>('JWT_PRIVATE_KEY')!.replace(/\\n/g, '\n'),
        publicKey: config.get<string>('JWT_PUBLIC_KEY')!.replace(/\\n/g, '\n'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    JwtCookieStrategy,
    LocalStrategy,
    JwtCookieGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtCookieGuard, RolesGuard],
})
export class AuthModule {}
