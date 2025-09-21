'use client'

import { LanguageProvider } from "@/contexts/LanguageContext"
import { CartProvider } from "@/contexts/CartContext"
import { ShopifyApolloProvider } from "@/lib/apollo-provider"
import { AuthInitializer } from '@/components/auth/AuthInitializer'
import AgentDetector from '@/components/agent/AgentDetector'
import { AuthModal } from '@/components/auth/AuthModal'
import { ShopProvider } from '@/contexts/ShopContext'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi-config'
import { MetaMaskAuthProvider } from '@/contexts/MetaMaskAuthContext'
import { MetaMaskShopifyCartProvider } from '@/contexts/MetaMaskShopifyCartContext'

const queryClient = new QueryClient()

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ShopProvider>
            <MetaMaskAuthProvider>
              <ShopifyApolloProvider>
                <CartProvider>
                  <MetaMaskShopifyCartProvider>
                    <AuthInitializer />
                    <AgentDetector />
                    <AuthModal />
                    {children}
                  </MetaMaskShopifyCartProvider>
                </CartProvider>
              </ShopifyApolloProvider>
            </MetaMaskAuthProvider>
          </ShopProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
