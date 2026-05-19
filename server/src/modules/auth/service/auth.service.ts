import bcrypt from 'bcrypt';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { config } from '../../../config';
import { generateTokenPair, verifyRefreshToken } from '../../../shared/utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../../shared/utils/email';
import { addNotificationJob } from '../../../infrastructure/queues';
import { AppError, BadRequestError, UnauthorizedError, ConflictError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/utils/logger';
import authRepository from '../repository/auth.repository';
import { RegisterInput, LoginInput } from '../dto/auth.dto';
import { AuthResponse, LoginResponse, MfaSetupResponse } from '../interfaces/auth.interface';

const MAX_FAILED_ATTEMPTS = 5;

export class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const existingUser = await authRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, config.saltRounds);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await authRepository.create({
      ...data,
      passwordHash,
      verificationToken,
    });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await authRepository.createOtp(user.id, otpCode, 'EMAIL_VERIFICATION');

    try {
      await sendVerificationEmail(data.email, otpCode);
    } catch (err) {
      logger.warn('Failed to send verification email:', err);
    }

    await addNotificationJob({
      userId: user.id,
      type: 'GENERAL',
      title: 'Welcome to LifeLine!',
      message: 'Your account has been created. Please verify your email to get started.',
    });

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const tokens = generateTokenPair(tokenPayload);

    await authRepository.createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
      },
      ...tokens,
    };
  }

  async login(data: LoginInput): Promise<LoginResponse> {
    const user = await authRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedError('Account is locked. Try again later.');
      }
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      await authRepository.incrementFailedAttempts(user.id);

      if (user.failedLoginAttempts + 1 >= MAX_FAILED_ATTEMPTS) {
        await authRepository.lockAccount(user.id);
        logger.warn(`Account locked due to failed attempts: ${user.email}`);
      }

      throw new UnauthorizedError('Invalid email or password');
    }

    await authRepository.resetFailedAttempts(user.id);
    await authRepository.updateLastLogin(user.id);

    if (user.mfaEnabled) {
      const mfaToken = crypto.randomBytes(32).toString('hex');
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
        },
        accessToken: '',
        refreshToken: '',
        requiresMfa: true,
        mfaToken,
      };
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const tokens = generateTokenPair(tokenPayload);

    await authRepository.updateRefreshToken(user.id, tokens.refreshToken);
    await authRepository.createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        profilePictureUrl: user.profilePictureUrl,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const session = await authRepository.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedError('Session not found');
    }

    const user = await authRepository.findById(payload.id);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }

    await authRepository.deleteSession(refreshToken);

    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    await authRepository.createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await authRepository.deleteSession(refreshToken);
    } catch {
      // Session might already be deleted
    }
  }

  async verifyEmailOtp(email: string, otp: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    if (!user) throw new BadRequestError('User not found');

    if (user.emailVerified) throw new BadRequestError('Email already verified');

    const validOtp = await authRepository.findValidOtp(user.id, otp, 'EMAIL_VERIFICATION');
    if (!validOtp) throw new BadRequestError('Invalid or expired OTP');

    await authRepository.markOtpUsed(validOtp.id);
    await authRepository.verifyEmail(user.id);

    await addNotificationJob({
      userId: user.id,
      type: 'GENERAL',
      title: 'Email Verified',
      message: 'Your email has been verified successfully.',
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await authRepository.setResetToken(user.id, token, expires);

    try {
      await sendPasswordResetEmail(email, token);
    } catch (err) {
      logger.warn('Failed to send password reset email:', err);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await authRepository.findByResetToken(token);
    if (!user) throw new BadRequestError('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, config.saltRounds);
    await authRepository.updatePassword(user.id, passwordHash);

    await addNotificationJob({
      userId: user.id,
      type: 'GENERAL',
      title: 'Password Changed',
      message: 'Your password has been changed successfully.',
    });
  }

  async setupMfa(userId: string, token: string): Promise<MfaSetupResponse> {
    const user = await authRepository.findById(userId);
    if (!user) throw new BadRequestError('User not found');

    const verified = speakeasy.totp.verify({
      secret: token,
      encoding: 'base32',
      token,
    });

    if (!verified) throw new BadRequestError('Invalid MFA token');

    const secret = speakeasy.generateSecret({
      name: `LifeLine:${user.email}`,
    });

    await authRepository.updateMfaSecret(userId, secret.base32);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  async getProfile(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new BadRequestError('User not found');
    return user;
  }
}

export default new AuthService();
