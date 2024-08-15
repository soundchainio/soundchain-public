import mailchimp from '@mailchimp/mailchimp_marketing';
import mailchimpTransactional from '@mailchimp/mailchimp_transactional';
import * as Sentry from '@sentry/serverless';

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
      Sentry.captureException(err);
    }
  }

  async sendTemplateEmail(user: User, templateName: string, templateContent: Record<string, string>): Promise<void> {
    if (!config.env.isProduction) return;
    if (!user) return;

    try {
      const response = await this.transactionalClient.messages.sendTemplate({
        template_name: templateName,
        template_content: Object.entries(templateContent).map(([name, content]) => ({ name, content })),
        message: {
          from_email: 'admin@soundchain.io',
          to: [
            {
              email: user.email,
              type: 'to',
            },
          ],
          merge_language: 'handlebars',
          global_merge_vars: Object.entries(templateContent).map(([name, content]) => ({ name, content })),
        },
      });

      console.log(response);
      // const [result] = response;
      // if (result.status !== 'sent' && result.status !== 'queued') {
      //   throw new Error(`Failed to send email: ${result.status}`);
      // }
    } catch (err) {
      Sentry.captureException(err);
      throw new Error('Failed to send email');
    }
  }
}
