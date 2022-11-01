import mailchimp from '@mailchimp/mailchimp_marketing';
import * as Sentry from '@sentry/serverless';
import { config } from '../config';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { Service } from './Service';

export class MailchimpService extends Service {
  mainListId = 'fbe7aa8603';

  constructor(context: Context) {
    super(context);

    mailchimp.setConfig({
      apiKey: config.mailchimp.apiKey,
      server: 'us14',
    });
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
}
