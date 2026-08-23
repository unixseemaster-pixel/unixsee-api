import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import { createAppLogger } from '#/common/logging/app-logger.js';
import type { AppConfigType } from '#/utils/config/app.config.js';

@Injectable()
export class MailService {
  private readonly logger = createAppLogger(MailService.name);
  private transporter: Transporter | undefined;

  constructor(
    private readonly config: ConfigService<AppConfigType, true>,
  ) {}

  /**
   * Temporary SMS stand-in: email the phone OTP to a fixed inbox for any
   * phone number. Replace with an SMS provider later.
   */
  async sendPhoneOtpMockEmail(input: {
    phoneNumber: string;
    otp: string;
  }): Promise<void> {
    const mail = this.config.get('app', { infer: true }).mail;
    const to = mail.phoneOtpMockDeliveryEmail;

    try {
      await this.getTransporter().sendMail({
        from: mail.from,
        to,
        subject: `Unixsee phone OTP (mock SMS) — ${input.phoneNumber}`,
        text: [
          'Phone verification code',
          '',
          'Use this one-time code in the client app.',
          'This email replaces SMS until a real SMS provider is connected.',
          '',
          `Phone number: ${input.phoneNumber}`,
          `OTP code: ${input.otp}`,
          '',
          'Mock SMS delivery',
        ].join('\n'),
        html: [
          '<p><strong>Phone verification code</strong></p>',
          '<p>Use this one-time code in the client app. This email replaces SMS until a real SMS provider is connected.</p>',
          `<p>Phone number: <code dir="ltr">${escapeHtml(input.phoneNumber)}</code></p>`,
          `<p>OTP code: <code dir="ltr">${escapeHtml(input.otp)}</code></p>`,
          '<p>Mock SMS delivery</p>',
        ].join(''),
      });

      this.logger.log('mail.phone_otp_mock.sent', {
        phoneNumber: input.phoneNumber,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error('mail.phone_otp_mock.failed', err, {
        phoneNumber: input.phoneNumber,
      });

      throw new ServiceUnavailableException(
        'OTP delivery is temporarily unavailable.',
      );
    }
  }

  /**
   * Temporary email-OTP stand-in: deliver to the fixed mock inbox (not the
   * target address) until real recipient delivery is enabled.
   */
  async sendEmailOtpMockEmail(input: {
    email: string;
    otp: string;
  }): Promise<void> {
    const mail = this.config.get('app', { infer: true }).mail;
    const to = mail.phoneOtpMockDeliveryEmail;

    try {
      await this.getTransporter().sendMail({
        from: mail.from,
        to,
        subject: `Unixsee email OTP (mock) — ${input.email}`,
        text: [
          'Email verification code',
          '',
          'Use this one-time code in the client app.',
          'This email is delivered to the mock inbox until real email delivery is connected.',
          '',
          `Intended recipient: ${input.email}`,
          `OTP code: ${input.otp}`,
          '',
          'Mock email delivery',
        ].join('\n'),
        html: [
          '<p><strong>Email verification code</strong></p>',
          '<p>Use this one-time code in the client app. Delivered to the mock inbox until real email delivery is connected.</p>',
          `<p>Intended recipient: <code dir="ltr">${escapeHtml(input.email)}</code></p>`,
          `<p>OTP code: <code dir="ltr">${escapeHtml(input.otp)}</code></p>`,
          '<p>Mock email delivery</p>',
        ].join(''),
      });

      this.logger.log('mail.email_otp_mock.sent', {
        email: input.email,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error('mail.email_otp_mock.failed', err, {
        email: input.email,
      });

      throw new ServiceUnavailableException(
        'OTP delivery is temporarily unavailable.',
      );
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const mail = this.config.get('app', { infer: true }).mail;

    this.transporter = nodemailer.createTransport({
      host: mail.smtpHost,
      port: mail.smtpPort,
      secure: mail.smtpSecure,
      auth: {
        user: mail.smtpUser,
        pass: mail.smtpPassword,
      },
      tls: {
        rejectUnauthorized: mail.smtpTlsRejectUnauthorized,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });

    return this.transporter;
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );
}
