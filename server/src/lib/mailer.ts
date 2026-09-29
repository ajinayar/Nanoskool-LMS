import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

export const sentMail: { to: string; subject: string; text: string }[] = [];

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  if (env.NODE_ENV === 'test') {
    sentMail.push({ to, subject, text });
    return;
  }
  try {
    await transport.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
    if (!env.SMTP_HOST) logger.info({ to, subject, text }, 'Email (console transport)');
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
  }
}
