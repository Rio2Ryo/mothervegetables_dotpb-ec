'use client'

import { LanguageProvider } from "@/contexts/LanguageContext"
import { CartProvider } from "@/contexts/CartContext"
import { ShopifyApolloProvider } from "@/lib/apollo-provider"
import { PrivyProvider } from '@privy-io/react-auth'
import { PrivyShopifyCartProvider } from '@/contexts/PrivyShopifyCartContext'
import { AuthInitializer } from '@/components/auth/AuthInitializer'
import AgentDetector from '@/components/agent/AgentDetector'
import { AuthModal } from '@/components/auth/AuthModal'
import { ShopProvider } from '@/contexts/ShopContext'

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // PrivyのApp IDが設定されていない場合は、Privyを無効化
  const hasPrivyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID && 
                       process.env.NEXT_PUBLIC_PRIVY_APP_ID !== 'your_privy_app_id_here'

  if (!hasPrivyAppId) {
    // Alchemyテスト用の簡易Provider（必要なContextのみ）
    return (
      <LanguageProvider>
        <ShopProvider>
          <ShopifyApolloProvider>
            <CartProvider>
              <AuthInitializer />
              <AgentDetector />
              <AuthModal />
              {children}
            </CartProvider>
          </ShopifyApolloProvider>
        </ShopProvider>
      </LanguageProvider>
    )
  }

  return (
    <LanguageProvider>
      <ShopProvider>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{
            appearance: {
              theme: 'dark',
              accentColor: '#676FFF',
            },
            embeddedWallets: {
              ethereum: {
                createOnLogin: 'users-without-wallets',
              },
            },
            loginMethods: ['email', 'google', 'apple'],
          }}
        >
          <ShopifyApolloProvider>
            <CartProvider>
              <PrivyShopifyCartProvider>
                <AuthInitializer />
                <AgentDetector />
                <AuthModal />
                {children}
              </PrivyShopifyCartProvider>
            </CartProvider>
          </ShopifyApolloProvider>
        </PrivyProvider>
      </ShopProvider>
    </LanguageProvider>
  )
}
