import SendGrid from '@sendgrid/mail';

const from = process.env.SENDGRID_SENDER_EMAIL as string;

export class EmailService {
  static initialize(): void {
    SendGrid.setApiKey(process.env.SENDGRID_API_KEY as string);
  }

  static async sendEmailVerification(email: string, displayName: string, token: string): Promise<void> {
    await SendGrid.send({
      to: email,
      from,
      templateId: process.env.SENDGRID_VERIFICATION_TEMPLATE as string,
      dynamicTemplateData: {
        displayName,
        verificationLink: `${process.env.WEB_APP_URL}/verify-email?token=${token}`,
      },
    });
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await SendGrid.send({
      to: email,
      from,
      templateId: process.env.SENDGRID_RESET_PASSWORD_TEMPLATE as string,
      dynamicTemplateData: {
        resetPasswordLink: `${process.env.WEB_APP_URL}/reset-password?token=${token}`,
      },
    });
  }
}
