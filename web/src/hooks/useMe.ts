import { useMeQuery } from 'lib/graphql'

export const useMe = () => {
  const result = useMeQuery()
  return result.data?.me
}
