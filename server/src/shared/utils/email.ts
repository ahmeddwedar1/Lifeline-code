import nodemailer from 'nodemailer';
import { config } from '../../config';
import { logger } from './logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"LifeLine System" <${config.email.user}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const resetUrl = `${config.clientUrl}/reset-password/${token}`;
  await sendEmail(
    to,
    'LifeLine - Password Reset Request',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #E63946;">LifeLine Password Reset</h2>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #E63946; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
      <hr>
      <p style="color: #6C757D; font-size: 12px;">LifeLine Emergency Medical Resource Management</p>
    </div>
    `,
  );
}

export async function sendVerificationEmail(
  to: string,
  otp: string,
): Promise<void> {
  await sendEmail(
    to,
    'LifeLine - Verify Your Email',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #E63946;">Welcome to LifeLine!</h2>
      <p>Your verification code is:</p>
      <div style="text-align: center; margin: 30px 0; font-size: 32px; 
                  letter-spacing: 8px; font-weight: bold; color: #1D3557;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <hr>
      <p style="color: #6C757D; font-size: 12px;">LifeLine Emergency Medical Resource Management</p>
    </div>
    `,
  );
}
