import SendGrid from '@sendgrid/mail';

const {
  SENDGRID_SENDER_EMAIL,
  SENDGRID_API_KEY,
  SENDGRID_VERIFICATION_TEMPLATE,
  SENDGRID_RESET_PASSWORD_TEMPLATE,
  WEB_APP_URL,
} = process.env;

export class EmailService {
  static initialize(): void {
    SendGrid.setApiKey(SENDGRID_API_KEY as string);
  }

  static async sendEmailVerification(email: string, displayName: string, token: string): Promise<void> {
    await SendGrid.send({
      to: email,
      from: SENDGRID_SENDER_EMAIL as string,
      templateId: SENDGRID_VERIFICATION_TEMPLATE as string,
      dynamicTemplateData: {
        displayName,
        verificationLink: `${WEB_APP_URL}/verify-email?token=${token}`,
      },
    });
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await SendGrid.send({
      to: email,
      from: SENDGRID_SENDER_EMAIL as string,
      templateId: SENDGRID_RESET_PASSWORD_TEMPLATE as string,
      dynamicTemplateData: {
        resetPasswordLink: `${WEB_APP_URL}/reset-password?token=${token}`,
      },
    });
  }
}
