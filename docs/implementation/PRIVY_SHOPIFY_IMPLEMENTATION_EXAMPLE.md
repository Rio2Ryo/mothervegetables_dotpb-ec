# Privy + Shopify 統合実装例

## 🚀 実装手順

### **1. 必要なパッケージのインストール**

```bash
npm install @privy-io/react-auth @privy-io/server-auth
npm install @shopify/admin-api-client
npm install prisma @prisma/client
```

### **2. 環境変数設定**

```bash
# .env.local
# Privy設定
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Shopify設定
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token

# データベース
DATABASE_URL="postgresql://username:password@localhost:5432/crypto_payment_db"

# Alchemy
ALCHEMY_API_KEY=your_alchemy_api_key
```

### **3. データベーススキーマ設定**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model UserLink {
  id                String   @id @default(cuid())
  privyUserId       String   @unique
  shopifyCustomerId String   @unique
  email             String
  walletAddress     String?
  linkedAt          DateTime @default(now())
  updatedAt         DateTime @updatedAt

  orders            Order[]
  
  @@map("user_links")
}

model Order {
  id                String   @id @default(cuid())
  userLinkId        String?
  userLink          UserLink? @relation(fields: [userLinkId], references: [id])
  
  // Shopify関連
  shopifyOrderId    String?
  shopifyCartId     String?
  
  // カート情報
  items             Json
  totalAmount       Decimal
  currency          String
  paymentMethod     String
  status            OrderStatus
  
  // 仮想通貨関連
  cryptoAddress     String?
  cryptoAmount      Decimal?
  transactionHash   String?
  
  // タイムスタンプ
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@map("orders")
}

model CryptoTransaction {
  id                String   @id @default(cuid())
  orderId           String
  order             Order    @relation(fields: [orderId], references: [id])
  transactionHash   String   @unique
  fromAddress       String
  toAddress         String
  amount            Decimal
  blockNumber       BigInt?
  confirmationCount Int      @default(0)
  status            TransactionStatus @default(PENDING)
  createdAt         DateTime @default(now())
  
  @@map("crypto_transactions")
}

enum OrderStatus {
  PENDING_PAYMENT
  PAYMENT_RECEIVED
  SHIPPED
  DELIVERED
  CANCELLED
}

enum TransactionStatus {
  PENDING
  CONFIRMED
  FAILED
}
```

### **4. Shopify Admin API クライアント設定**

```typescript
// lib/shopify-admin-client.ts
import { createAdminApiClient } from '@shopify/admin-api-client'

export const shopifyAdmin = createAdminApiClient({
  storeDomain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!,
  apiVersion: '2024-01',
  accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
})

// カスタマー検索
export async function searchCustomerByEmail(email: string) {
  const response = await shopifyAdmin.rest.Customer.search({
    query: email,
  })
  
  return response.data?.customers?.[0] || null
}

// カスタマー作成
export async function createCustomer(customerData: {
  email: string
  first_name?: string
  last_name?: string
  note?: string
  metafields?: Array<{
    namespace: string
    key: string
    value: string
    type: string
  }>
}) {
  const response = await shopifyAdmin.rest.Customer.save({
    session: {},
    customer: customerData,
  })
  
  return response.data?.customer
}

// カスタマーメタフィールド更新
export async function updateCustomerMetafields(
  customerId: string,
  metafields: Array<{
    namespace: string
    key: string
    value: string
    type: string
  }>
) {
  const response = await shopifyAdmin.rest.Metafield.save({
    session: {},
    metafield: {
      owner_id: customerId,
      owner_resource: 'customer',
      ...metafields[0], // 最初のメタフィールド
    },
  })
  
  return response.data?.metafield
}
```

### **5. 統合認証API実装**

```typescript
// app/api/auth/sync-customer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrivyApi } from '@privy-io/server-auth'
import { searchCustomerByEmail, createCustomer, updateCustomerMetafields } from '@/lib/shopify-admin-client'
import { prisma } from '@/lib/database/connection'

const privy = new PrivyApi(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function POST(request: NextRequest) {
  try {
    const { privyUserId, email, walletAddress } = await request.json()

    if (!email || !privyUserId) {
      return NextResponse.json(
        { error: 'Email and Privy user ID are required' },
        { status: 400 }
      )
    }

    // Privyユーザー情報を取得
    const privyUser = await privy.getUser(privyUserId)
    
    if (!privyUser) {
      return NextResponse.json(
        { error: 'Privy user not found' },
        { status: 404 }
      )
    }

    // 既存のユーザーリンクを確認
    const existingLink = await prisma.userLink.findUnique({
      where: { privyUserId }
    })

    if (existingLink) {
      // 既存のShopifyカスタマーを取得
      const customer = await searchCustomerByEmail(email)
      return NextResponse.json({
        shopifyCustomerId: existingLink.shopifyCustomerId,
        customer,
        isNew: false,
        userLink: existingLink
      })
    }

    // Shopifyでメールアドレスでカスタマーを検索
    let customer = await searchCustomerByEmail(email)
    let shopifyCustomerId: string
    let isNewCustomer = false

    if (customer) {
      // 既存のカスタマーが見つかった場合
      shopifyCustomerId = customer.id.toString()
      
      // ウォレット情報をメタフィールドに追加
      await updateCustomerMetafields(shopifyCustomerId, [
        {
          namespace: 'wallet',
          key: 'address',
          value: walletAddress || '',
          type: 'single_line_text_field'
        },
        {
          namespace: 'privy',
          key: 'user_id',
          value: privyUserId,
          type: 'single_line_text_field'
        }
      ])
    } else {
      // 新規カスタマーを作成
      customer = await createCustomer({
        email,
        first_name: privyUser.linkedAccounts?.[0]?.name?.firstName || '',
        last_name: privyUser.linkedAccounts?.[0]?.name?.lastName || '',
        note: `Privy User: ${privyUserId}`,
        metafields: [
          {
            namespace: 'privy',
            key: 'user_id',
            value: privyUserId,
            type: 'single_line_text_field'
          },
          {
            namespace: 'wallet',
            key: 'address',
            value: walletAddress || '',
            type: 'single_line_text_field'
          }
        ]
      })
      
      if (!customer) {
        throw new Error('Failed to create Shopify customer')
      }
      
      shopifyCustomerId = customer.id.toString()
      isNewCustomer = true
    }

    // ユーザーリンクを作成
    const userLink = await prisma.userLink.create({
      data: {
        privyUserId,
        shopifyCustomerId,
        email,
        walletAddress,
        linkedAt: new Date()
      }
    })

    return NextResponse.json({
      shopifyCustomerId,
      customer,
      isNew: isNewCustomer,
      userLink
    })

  } catch (error) {
    console.error('Customer sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### **6. 統合カートコンテキスト実装**

```typescript
// contexts/PrivyShopifyCartContext.tsx
'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useCart } from './CartContext'
import { useLanguage } from './LanguageContext'

interface PrivyShopifyCartState {
  isPrivyAuthenticated: boolean
  shopifyCustomerId: string | null
  walletAddress: string | null
  paymentMethod: 'credit_card' | 'crypto' | null
  userLink: any | null
  isLoading: boolean
}

const initialState: PrivyShopifyCartState = {
  isPrivyAuthenticated: false,
  shopifyCustomerId: null,
  walletAddress: null,
  paymentMethod: null,
  userLink: null,
  isLoading: false
}

type PrivyShopifyCartAction = 
  | { type: 'SET_AUTH_STATE'; payload: Partial<PrivyShopifyCartState> }
  | { type: 'SET_PAYMENT_METHOD'; payload: 'credit_card' | 'crypto' }
  | { type: 'SET_LOADING'; payload: boolean }

function privyShopifyCartReducer(
  state: PrivyShopifyCartState, 
  action: PrivyShopifyCartAction
): PrivyShopifyCartState {
  switch (action.type) {
    case 'SET_AUTH_STATE':
      return { ...state, ...action.payload }
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    default:
      return state
  }
}

interface PrivyShopifyCartContextType {
  state: PrivyShopifyCartState
  privy: ReturnType<typeof usePrivy>
  cart: ReturnType<typeof useCart>
  language: ReturnType<typeof useLanguage>
  setPaymentMethod: (method: 'credit_card' | 'crypto') => void
  handleCryptoCheckout: () => Promise<void>
  handleCreditCardCheckout: () => Promise<void>
  syncUserWithShopify: () => Promise<void>
}

const PrivyShopifyCartContext = createContext<PrivyShopifyCartContextType | undefined>(undefined)

export function PrivyShopifyCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(privyShopifyCartReducer, initialState)
  const privy = usePrivy()
  const cart = useCart()
  const language = useLanguage()

  // Privy認証状態を監視
  useEffect(() => {
    if (privy.ready && privy.authenticated && privy.user) {
      syncUserWithShopify()
    } else if (privy.ready && !privy.authenticated) {
      dispatch({
        type: 'SET_AUTH_STATE',
        payload: {
          isPrivyAuthenticated: false,
          shopifyCustomerId: null,
          walletAddress: null,
          userLink: null
        }
      })
    }
  }, [privy.ready, privy.authenticated, privy.user])

  const syncUserWithShopify = async () => {
    if (!privy.user) return

    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const response = await fetch('/api/auth/sync-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyUserId: privy.user.id,
          email: privy.user.email?.address,
          walletAddress: privy.user.wallet?.address
        })
      })

      const data = await response.json()
      
      dispatch({
        type: 'SET_AUTH_STATE',
        payload: {
          isPrivyAuthenticated: true,
          shopifyCustomerId: data.shopifyCustomerId,
          walletAddress: privy.user.wallet?.address || null,
          userLink: data.userLink
        }
      })
    } catch (error) {
      console.error('User sync error:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const setPaymentMethod = (method: 'credit_card' | 'crypto') => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method })
  }

  const handleCryptoCheckout = async () => {
    if (!privy.authenticated) {
      await privy.login()
      return
    }

    if (!state.walletAddress) {
      throw new Error('Wallet not available')
    }

    try {
      // 注文データを作成
      const orderData = {
        userLinkId: state.userLink?.id,
        shopifyCustomerId: state.shopifyCustomerId,
        walletAddress: state.walletAddress,
        items: cart.state.items,
        paymentMethod: 'crypto',
        currency: 'USD' // または動的に設定
      }

      const response = await fetch('/api/orders/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      const { orderId, paymentAddress } = await response.json()
      
      // 決済画面にリダイレクト
      window.location.href = `/payment/crypto/${orderId}`
    } catch (error) {
      console.error('Crypto checkout error:', error)
      throw error
    }
  }

  const handleCreditCardCheckout = async () => {
    try {
      // 従来のShopify決済フロー
      const cartData = await cart.createShopifyCart()
      if (cartData?.checkoutUrl) {
        // 言語パラメータを追加
        const url = new URL(cartData.checkoutUrl)
        const { language } = language
        
        if (language === 'EN') {
          url.searchParams.set('locale', 'en')
        } else {
          url.searchParams.set('locale', 'ja')
        }

        window.location.href = url.toString()
      }
    } catch (error) {
      console.error('Credit card checkout error:', error)
      throw error
    }
  }

  return (
    <PrivyShopifyCartContext.Provider value={{
      state,
      privy,
      cart,
      language,
      setPaymentMethod,
      handleCryptoCheckout,
      handleCreditCardCheckout,
      syncUserWithShopify
    }}>
      {children}
    </PrivyShopifyCartContext.Provider>
  )
}

export function usePrivyShopifyCart() {
  const context = useContext(PrivyShopifyCartContext)
  if (!context) {
    throw new Error('usePrivyShopifyCart must be used within PrivyShopifyCartProvider')
  }
  return context
}
```

### **7. アプリケーションルートでの統合**

```typescript
// app/layout.tsx (更新版)
import { PrivyProvider } from '@privy-io/react-auth'
import { ShopifyApolloProvider } from '@/lib/apollo-provider'
import { CartProvider } from '@/contexts/CartContext'
import { PrivyShopifyCartProvider } from '@/contexts/PrivyShopifyCartContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
            config={{
              appearance: {
                theme: 'dark',
                accentColor: '#676FFF',
              },
              embeddedWallets: {
                createOnLogin: 'users-without-wallets',
              },
              loginMethods: ['email', 'google', 'apple'],
            }}
          >
            <ShopifyApolloProvider>
              <CartProvider>
                <PrivyShopifyCartProvider>
                  {children}
                </PrivyShopifyCartProvider>
              </CartProvider>
            </ShopifyApolloProvider>
          </PrivyProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
```

### **8. 統合されたカートページ**

```typescript
// app/cart/page.tsx (完全版)
'use client'

import { usePrivyShopifyCart } from '@/contexts/PrivyShopifyCartContext'
import CartItemComponent from '@/components/cart/CartItem'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState } from 'react'

export default function CartPage() {
  const { state, privy, cart, language, setPaymentMethod, handleCryptoCheckout, handleCreditCardCheckout } = usePrivyShopifyCart()
  const { t } = language
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCryptoPayment = async () => {
    setIsProcessing(true)
    try {
      await handleCryptoCheckout()
    } catch (error) {
      console.error('Crypto payment error:', error)
      alert(t({ 
        JP: '仮想通貨決済でエラーが発生しました', 
        EN: 'Error occurred during crypto payment' 
      }))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreditCardPayment = async () => {
    setIsProcessing(true)
    try {
      await handleCreditCardCheckout()
    } catch (error) {
      console.error('Credit card payment error:', error)
      alert(t({ 
        JP: 'クレジットカード決済でエラーが発生しました', 
        EN: 'Error occurred during credit card payment' 
      }))
    } finally {
      setIsProcessing(false)
    }
  }

  if (cart.state.items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-black text-white pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-8">
                {t({ JP: 'ショッピングカート', EN: 'Shopping Cart' })}
              </h1>
              <p className="text-xl mb-8">
                {t({ JP: 'カートに商品がありません', EN: 'Your cart is empty' })}
              </p>
              <Link 
                href="/"
                className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-8 rounded-lg transition-colors duration-200"
              >
                {t({ JP: '買い物を続ける', EN: 'Continue Shopping' })}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black text-white pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">
            {t({ JP: 'ショッピングカート', EN: 'Shopping Cart' })}
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カートアイテム */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {cart.state.items.map((item) => (
                  <CartItemComponent key={item.id} item={item} />
                ))}
              </div>

              {/* カートをクリアボタン */}
              <div className="mt-8">
                <button
                  onClick={() => cart.clearCart()}
                  className="text-red-400 hover:text-red-300 text-sm underline"
                >
                  {t({ JP: 'カートをクリア', EN: 'Clear Cart' })}
                </button>
              </div>
            </div>

            {/* 注文サマリー */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">
                  {t({ JP: '注文サマリー', EN: 'Order Summary' })}
                </h2>

                {/* 合計金額 */}
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold">
                    {t({ JP: '合計', EN: 'Total' })}
                  </span>
                  <span className="text-2xl font-bold">
                    {cart.formatPrice(
                      cart.state.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0).toString(),
                      'USD'
                    )}
                  </span>
                </div>

                {/* ユーザー状態表示 */}
                {state.isPrivyAuthenticated && (
                  <div className="bg-blue-900 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold mb-2 text-blue-200">
                      {t({ JP: 'ウォレット情報', EN: 'Wallet Info' })}
                    </h3>
                    <p className="text-sm text-blue-100">
                      {t({ JP: 'アドレス', EN: 'Address' })}: {state.walletAddress?.slice(0, 6)}...{state.walletAddress?.slice(-4)}
                    </p>
                    {state.shopifyCustomerId && (
                      <p className="text-sm text-blue-100">
                        {t({ JP: 'カスタマーID', EN: 'Customer ID' })}: {state.shopifyCustomerId.slice(-8)}
                      </p>
                    )}
                  </div>
                )}

                {/* 決済方法選択 */}
                <div className="space-y-3">
                  {/* クレジットカード決済 */}
                  <button
                    onClick={handleCreditCardPayment}
                    disabled={isProcessing}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-4 px-6 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      {t({ JP: 'クレジットカードで支払う', EN: 'Pay with Credit Card' })}
                    </div>
                  </button>

                  {/* 仮想通貨決済 */}
                  <button
                    onClick={handleCryptoPayment}
                    disabled={isProcessing || (!state.isPrivyAuthenticated && !privy.ready)}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {state.isPrivyAuthenticated 
                        ? t({ JP: '独自コインで支払う', EN: 'Pay with Custom Coin' })
                        : t({ JP: 'ログインして仮想通貨決済', EN: 'Login for Crypto Payment' })
                      }
                    </div>
                  </button>
                </div>

                {/* 続けて買い物ボタン */}
                <Link 
                  href="/"
                  className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 text-center mt-4"
                >
                  {t({ JP: '続けて買い物', EN: 'Continue Shopping' })}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
```

## 🎯 実装のポイント

### **統合の流れ**
1. **Privyログイン**: ユーザーがPrivyでログイン
2. **自動同期**: バックエンドでShopifyカスタマーと自動同期
3. **統合状態**: 両方のサービスが連携された状態
4. **決済選択**: クレジットカードまたは仮想通貨で決済可能

### **データ同期**
- PrivyユーザーIDとShopifyカスタマーIDを紐付け
- ウォレットアドレスをShopifyメタフィールドに保存
- 注文履歴を統合して管理

### **ユーザー体験**
- 一度のログインで全機能利用可能
- 決済方法の選択が簡単
- 統合された購入履歴

この実装により、PrivyとShopifyが完全に統合され、シームレスな仮想通貨決済体験を提供できます。
