import prisma from '../../../infrastructure/database/prisma';
import { RegisterInput } from '../dto/auth.dto';

export class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        profilePictureUrl: true,
        emailVerified: true,
        mfaEnabled: true,
        hospitalId: true,
        createdAt: true,
        doctorProfile: true,
      },
    });
  }

  async create(data: RegisterInput & { passwordHash: string; verificationToken?: string }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role as any,
        hospitalId: data.hospitalId,
        verificationToken: data.verificationToken,
        status: 'PENDING_VERIFICATION',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  async verifyEmail(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        verificationToken: null,
      },
    });
  }

  async incrementFailedAttempts(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });
  }

  async lockAccount(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        status: 'SUSPENDED',
      },
    });
  }

  async resetFailedAttempts(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
    });
  }

  async setResetToken(userId: string, token: string, expires: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: { resetPasswordToken: token, resetPasswordExpires: expires },
    });
  }

  async findByResetToken(token: string) {
    return prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });
  }

  async updateMfaSecret(userId: string, secret: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: true },
    });
  }

  async createSession(userId: string, refreshToken: string, deviceInfo?: string, ipAddress?: string) {
    return prisma.session.create({
      data: {
        userId,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async findSessionByRefreshToken(refreshToken: string) {
    return prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });
  }

  async deleteSession(refreshToken: string) {
    return prisma.session.delete({ where: { refreshToken } });
  }

  async createOtp(userId: string, code: string, type: string = 'EMAIL_VERIFICATION') {
    return prisma.oTP.create({
      data: {
        userId,
        code,
        type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }

  async findValidOtp(userId: string, code: string, type: string = 'EMAIL_VERIFICATION') {
    return prisma.oTP.findFirst({
      where: {
        userId,
        code,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markOtpUsed(otpId: string) {
    return prisma.oTP.update({
      where: { id: otpId },
      data: { used: true },
    });
  }
}

export default new AuthRepository();
