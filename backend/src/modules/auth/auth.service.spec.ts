import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: JwtService;
  let config: ConfigService;
  let notifications: { notify: jest.Mock };

  const CONFIG_VALUES: Record<string, string> = {
    'jwt.accessSecret': 'test-access-secret',
    'jwt.refreshSecret': 'test-refresh-secret',
    'jwt.accessTtl': '15m',
    'jwt.refreshTtl': '7d',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    jwt = new JwtService({});
    config = { get: (key: string) => CONFIG_VALUES[key] } as unknown as ConfigService;
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
      config,
      notifications as unknown as NotificationsService,
    );
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ email: 'a@b.com', password: 'password1', fullName: 'A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a RETAIL_CUSTOMER and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        role: Role.RETAIL_CUSTOMER,
        companyId: null,
      });

      const result = await service.register({
        email: 'a@b.com',
        password: 'password1',
        fullName: 'A',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: Role.RETAIL_CUSTOMER }) }),
      );
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(notifications.notify).toHaveBeenCalledWith(
        'user.welcome',
        expect.objectContaining({ userId: 'u1' }),
      );
    });
  });

  describe('login', () => {
    it('rejects unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'missing@b.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
        isActive: true,
        role: Role.RETAIL_CUSTOMER,
      });
      await expect(
        service.login({ email: 'a@b.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
        isActive: true,
        role: Role.RETAIL_CUSTOMER,
      });

      const result = await service.login({ email: 'a@b.com', password: 'correct-password' });
      expect(result.accessToken).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects an inactive account', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });
      await expect(
        service.login({ email: 'a@b.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rejects a malformed/expired JWT before touching the database', async () => {
      await expect(service.refresh('not-a-real-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
    });

    it('rejects when no stored token matches (revoked/reuse)', async () => {
      const refreshToken = await jwt.signAsync(
        { sub: 'u1' },
        { secret: CONFIG_VALUES['jwt.refreshSecret'], expiresIn: '7d' },
      );
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates tokens when the stored hash matches', async () => {
      const refreshToken = await jwt.signAsync(
        { sub: 'u1' },
        { secret: CONFIG_VALUES['jwt.refreshSecret'], expiresIn: '7d' },
      );
      const tokenHash = await bcrypt.hash(refreshToken, 10);
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt1',
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.RETAIL_CUSTOMER,
      });

      const result = await service.refresh(refreshToken);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt1' }, data: { revoked: true } }),
      );
      expect(result.accessToken).toBeDefined();
    });
  });
});
