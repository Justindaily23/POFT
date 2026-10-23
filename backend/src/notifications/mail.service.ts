import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { logger } from 'src/common/logger/logger';

/**
 * Single place that knows about Resend. The rest of the app calls send().
 * Env vars: RESEND_API_KEY, MAIL_FROM (e.g. "Stecam POFT <noreply@mail.yourdomain.com>")
 */
@Injectable()
export class MailService {
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('MAIL_FROM') ?? '';
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      // In production a missing key must fail loudly, otherwise the processor
      // would mark notifications as sent when nothing was sent.
      if (this.isProduction) {
        throw new Error('RESEND_API_KEY is not set');
      }
      logger.info(`[mail disabled] would send "${subject}" to ${to}`);
      return;
    }

    // Resend returns an error object instead of throwing, so turn it into an
    // exception: BullMQ then retries the job.
    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
