import { ReactNode, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from 'lib/wagmi'
import { initAppKit } from 'lib/appkit'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export function WalletProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Reown loads dynamically — won't throw if projectId is absent.
    void initAppKit()
  }, [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
