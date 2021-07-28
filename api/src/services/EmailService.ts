import SendGrid, { ClientResponse } from '@sendgrid/mail';
import { SENDGRID_API_KEY, SENDGRID_SENDER_EMAIL, SENDGRID_VERIFICATION_TEMPLATE, WEB_APP_URL } from '../env';

export class EmailService {
  static initialize(): void {
    SendGrid.setApiKey(SENDGRID_API_KEY);
  }

  static sendEmailVerification(email: string, displayName: string, token: string): Promise<[ClientResponse, unknown]> {
    return SendGrid.send({
      to: email,
      from: SENDGRID_SENDER_EMAIL,
      templateId: SENDGRID_VERIFICATION_TEMPLATE,
      dynamicTemplateData: {
        displayName,
        verificationLink: `${WEB_APP_URL}/verify-email?token=${token}`,
      },
    });
  }
}
