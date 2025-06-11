import sgMail from '@sendgrid/mail';
import { config } from '../config';

export class EmailService {
  constructor() {
    sgMail.setApiKey(config.sendgrid.apiKey);
  }

  async sendVerificationEmail(to: string, token: string) {
    const msg = {
      to,
      from: config.sendgrid.sender,
      templateId: config.sendgrid.templates.userEmailVerification,
      dynamicTemplateData: { token },
    };
    await sgMail.send(msg);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const msg = {
      to,
      from: config.sendgrid.sender,
      templateId: config.sendgrid.templates.passwordReset,
      dynamicTemplateData: { token },
    };
    await sgMail.send(msg);
  }
}
