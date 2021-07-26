import { useMeQuery } from '../lib/graphql';

export default function useMe() {
  const result = useMeQuery();
  return result.data?.me;
}
