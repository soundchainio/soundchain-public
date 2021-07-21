/* eslint-disable @typescript-eslint/no-explicit-any */
import { GraphQLResolveInfo } from 'graphql';

export interface ArgsDictionary {
  [argName: string]: any;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface ResolverData<ContextType = {}> {
  root: any;
  args: ArgsDictionary;
  context: ContextType;
  info: GraphQLResolveInfo;
}
