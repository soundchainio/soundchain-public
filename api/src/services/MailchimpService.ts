import mailchimp from '@mailchimp/mailchimp_marketing';
import mailchimpTransactional, { MessagesSendResponse } from '@mailchimp/mailchimp_transactional';

import { config } from '../config';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { Service } from './Service';

export class MailchimpService extends Service {
  mainListId = 'fbe7aa8603';
  transactionalClient: ReturnType<typeof mailchimpTransactional>;

  constructor(context: Context) {
    super(context);

    mailchimp.setConfig({
      apiKey: config.mailchimp.apiKey,
      server: 'us14',
    });

    this.transactionalClient = mailchimpTransactional(config.mailchimp.transactionalApiKey);
  }

  async addMember(user: User): Promise<void> {
    if (!config.env.isProduction) return;
    if (!user) return;

    try {
      await mailchimp.lists.addListMember(this.mainListId, {
        email_address: user.email,
        status: 'subscribed',
      });
    } catch (err) {
      console.error('Mailchimp addMember Error:', err);
    }
  }

  async sendTemplateEmail(
    emailAddress: string,
    templateName: string,
    templateContent: Record<string, string>,
  ): Promise<MessagesSendResponse[] | unknown> {
    try {
      return this.transactionalClient.messages.sendTemplate({
        template_name: templateName,
        template_content: Object.entries(templateContent).map(([name, content]) => ({ name, content })),
        message: {
          subject: templateContent.subject,
          from_email: 'no-reply@soundchain.io',
          to: [
            {
              email: emailAddress,
              type: 'to',
            },
          ],
          merge_language: 'handlebars',
          global_merge_vars: Object.entries(templateContent).map(([name, content]) => ({ name, content })),
          merge_vars: [
            {
              rcpt: emailAddress,
              vars: Object.entries(templateContent).map(([name, content]) => ({ name, content })),
            },
          ],
        },
      });
    } catch (err) {
      console.error('Mailchimp sendTemplateEmail Error:', err);
      throw new Error('Failed to send email');
    }
  }
}
