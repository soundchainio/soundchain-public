import SendGrid from '@sendgrid/mail';
import { config } from 'config';

export class EmailService {
  static initialize(): void {
    SendGrid.setApiKey(config.sendgrid.apiKey);
  }

  static async sendEmailVerification(email: string, displayName: string, token: string): Promise<void> {
    await SendGrid.send({
      to: email,
      from: config.sendgrid.sender,
      templateId: config.sendgrid.templates.userEmailVerification,
      dynamicTemplateData: {
        displayName,
        verificationLink: `${config.web.url}/verify-email?token=${token}`,
      },
    });
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await SendGrid.send({
      to: email,
      from: config.sendgrid.sender,
      templateId: config.sendgrid.templates.passwordReset,
      dynamicTemplateData: {
        resetPasswordLink: `${config.web.url}/reset-password?token=${token}`,
      },
    });
  }
}
