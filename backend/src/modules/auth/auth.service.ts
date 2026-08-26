import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterB2bDto } from './dto/register-b2b.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  companyId: true,
  locale: true,
  currency: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    await this.assertEmailFree(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: Role.RETAIL_CUSTOMER,
      },
      select: SAFE_USER_SELECT,
    });
    const tokens = await this.issueTokens(user.id, user.role);
    await this.sendWelcomeNotification(user.id, user.fullName);
    return { user, ...tokens };
  }

  async registerB2b(dto: RegisterB2bDto) {
    await this.assertEmailFree(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          taxId: dto.taxId,
          country: dto.country,
          businessType: dto.businessType,
          expectedVolume: dto.expectedVolume,
          interestedProducts: dto.interestedProducts,
          website: dto.website,
          contactPerson: dto.contactPerson,
        },
      });
      return tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.contactPerson,
          phone: dto.phone,
          role: Role.B2B_CUSTOMER,
          companyId: company.id,
        },
        select: SAFE_USER_SELECT,
      });
    });

    const tokens = await this.issueTokens(user.id, user.role);
    await this.sendWelcomeNotification(user.id, user.fullName);
    return {
      user,
      ...tokens,
      message: 'Registration submitted. Your B2B account is pending admin approval.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.issueTokens(user.id, user.role);
    const { passwordHash: _omit, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, revoked: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }
    const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });
    return this.issueTokens(user.id, user.role);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { success: true };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
  }

  /** Notification failures must never block registration — see NotificationsService's contract. */
  private async sendWelcomeNotification(userId: string, fullName: string): Promise<void> {
    try {
      await this.notifications.notify('user.welcome', { userId, data: { fullName } });
    } catch {
      // Swallow — notify() never throws in practice, but this is defensive redundancy
      // matching the convention used elsewhere in the codebase (e.g. RfqService).
    }
  }

  private async assertEmailFree(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
  }

  private async issueTokens(userId: string, role: Role): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessTtl'),
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl'),
      },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const ttlDays = this.parseTtlDays(this.config.get<string>('jwt.refreshTtl') ?? '7d');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private parseTtlDays(ttl: string): number {
    const match = /^(\d+)d$/.exec(ttl);
    return match ? parseInt(match[1], 10) : 7;
  }
}
