import SendGrid from '@sendgrid/mail';
import { config } from '../config';
import { Context } from '../types/Context';

export class EmailService {
  constructor(private context: Context) {
    SendGrid.setApiKey(config.sendgrid.apiKey);
  }

  async sendEmailVerification(email: string, displayName: string, token: string): Promise<void> {
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

}
