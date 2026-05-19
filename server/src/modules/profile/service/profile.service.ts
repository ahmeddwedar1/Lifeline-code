import bcrypt from 'bcrypt';
import { config } from '../../../config';
import prisma from '../../../infrastructure/database/prisma';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError';
import { addNotificationJob } from '../../../infrastructure/queues';

export class ProfileService {
  async updateProfile(userId: string, data: { fullName?: string; phone?: string; profilePictureUrl?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.profilePictureUrl && { profilePictureUrl: data.profilePictureUrl }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, config.saltRounds);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await addNotificationJob({
      userId,
      type: 'GENERAL',
      title: 'Password Changed',
      message: 'Your password has been changed successfully.',
    });
  }

  async uploadDocument(userId: string, documentType: string, documentUrl: string) {
    await prisma.verificationDocument.create({
      data: { userId, documentType, documentUrl },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'PENDING_DOCUMENTS' },
    });

    return { documentType, documentUrl, status: 'PENDING' };
  }

  async verifyDoctor(doctorId: string, adminId: string) {
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    if (!profile) throw new NotFoundError('Doctor profile not found');

    await prisma.doctorProfile.update({
      where: { userId: doctorId },
      data: { verified: true, verifiedAt: new Date() },
    });

    await prisma.verificationDocument.updateMany({
      where: { userId: doctorId, status: 'PENDING' },
      data: { status: 'VERIFIED', verifiedBy: adminId, verifiedAt: new Date() },
    });

    await addNotificationJob({
      userId: doctorId,
      type: 'GENERAL',
      title: 'Profile Verified',
      message: 'Your doctor profile has been verified.',
    });

    return { verified: true };
  }

  async deleteAccount(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }
}

export default new ProfileService();
