import * as Sentry from '@sentry/node';
import { ApolloError } from 'apollo-server-errors';
import { ApolloServerPlugin, GraphQLRequestExecutionListener } from 'apollo-server-plugin-base';
import { Context } from '../types/Context';

export const SentryReportError: ApolloServerPlugin<Context> = {
  async requestDidStart({ request }) {
    const sentryTransaction = Sentry.startTransaction({
      op: 'gql',
      name: 'GraphQLTransaction', // this will be the default name, unless the gql query has a name
    });

    // Add query to the cloudwatch logs
    console.log('Query: ', request.query);
    if (request.operationName) {
      console.log('Operation Name: ', request.operationName);
      // set the transaction Name if we have named queries
      sentryTransaction.setName(request.operationName);
    }
    return {
      async willSendResponse() {
        // hook for transaction finished
        sentryTransaction.finish();
      },
      async didEncounterErrors(ctx) {
        if (!ctx.operation) {
          return;
        }

        for (const err of ctx.errors) {
          if (err instanceof ApolloError) {
            continue;
          }

          Sentry.withScope(scope => {
            scope.setTag('kind', ctx.operation.operation);
            scope.setExtra('query', ctx.request.query);
            scope.setExtra('variables', ctx.request.variables);

            if (err.path) {
              scope.addBreadcrumb({
                category: 'query-path',
                message: err.path.join(' > '),
                level: 'debug',
              });
            }
            Sentry.captureException(err);
          });
        }
      },
      async executionDidStart() {
        return {
          willResolveField({ info }) {
            // hook for each new resolver
            const span = sentryTransaction.startChild({
              op: 'resolver',
              description: `${info.parentType.name}.${info.fieldName}`,
            });
            return () => {
              // this will execute once the resolver is finished
              span.finish();
            };
          },
        } as GraphQLRequestExecutionListener<Context>;
      },
    };
  },
};
