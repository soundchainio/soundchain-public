import { useMeQuery } from 'lib/graphql'

export const useMe = () => {
  try {
    // Use cache-first to read from Apollo cache immediately
    // This ensures logged-in users see their data right away without network delay
    const result = useMeQuery({
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
    })

    // Debug logging to track auth state issues
    if (typeof window !== 'undefined' && !result.data?.me && !result.loading) {
      console.log('[useMe] No user data - loading:', result.loading, 'error:', result.error?.message)
    }

    return result.data?.me
  } catch (error) {
    console.error('useMe error:', error)
    return undefined
  }
}

// Extended hook that also returns loading state for components that need it
export const useMeWithLoading = () => {
  try {
    const result = useMeQuery({
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
    })

    return {
      me: result.data?.me,
      loading: result.loading,
      error: result.error,
      refetch: result.refetch,
    }
  } catch (error) {
    console.error('useMeWithLoading error:', error)
    return { me: undefined, loading: false, error: error as Error, refetch: () => Promise.resolve({} as any) }
  }
}
