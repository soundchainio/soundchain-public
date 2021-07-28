import { createParamDecorator } from 'type-graphql';
import Context from '../../types/Context';

export const CurrentUser = (): ParameterDecorator => {
  return createParamDecorator<Context>(({ context }) => context.user);
};
