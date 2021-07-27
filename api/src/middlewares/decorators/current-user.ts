import { createParamDecorator } from 'type-graphql';
import { UserService } from '../../services/UserService';
import Context from '../../types/Context';

export const CurrentUser = (): ParameterDecorator => {
  return createParamDecorator<Context>(({ context }) => UserService.getUser(context.jwtUser?.sub as string));
};
