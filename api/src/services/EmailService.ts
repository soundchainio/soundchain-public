import SendGrid, { ClientResponse } from '@sendgrid/mail';

const {
  WEB_APP_URL = 'http://localhost:3000',
  SENDGRID_SENDER_EMAIL = 'caaina@ae.studio',
  SENDGRID_VERIFICATION_TEMPLATE = 'd-30c856476a8e4dcfa97d93ca08fc680d',
  SENDGRID_API_KEY = 'SG.example',
} = process.env;

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
        verificationLink: `${WEB_APP_URL}/verification?token=${token}`,
      },
    });
  }
}
