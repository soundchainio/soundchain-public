import { useMeQuery } from 'lib/graphql'

export const useMe = () => {
  try {
    const result = useMeQuery()
    return result.data?.me
  } catch (error) {
    console.error('useMe error:', error)
    return undefined
  }
}
