import Sendgrid from '@sendgrid/mail';
import { config } from '../config';

export class EmailService {
  static initialize(): void {
    Sendgrid.setApiKey(config.sendgrid.apiKey);
  }

  static async sendEmailVerification(email: string, displayName: string, token: string): Promise<void> {
    await Sendgrid.send({
      to: email,
      from: config.sendgrid.sender,
      templateId: config.sendgrid.templates.userEmailVerification,
      dynamicTemplateData: {
        displayName,
        verificationLink: `${config.web.url}/verify-email?token=${token}`,
      },
    });
  }
}
