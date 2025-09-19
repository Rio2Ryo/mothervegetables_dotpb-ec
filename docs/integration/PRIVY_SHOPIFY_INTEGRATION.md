# Privy + Shopify 統合設計書

## 🎯 統合概要

Privyのログイン機能とShopifyのユーザー登録機能を統合し、仮想通貨決済とEC機能をシームレスに連携させる。

## 🔄 統合フロー

### **新規ユーザーの場合**
```
1. ユーザーがPrivyでログイン（メール/SSO）
2. Privyがウォレットを自動作成
3. バックエンドでShopifyカスタマーを作成
4. PrivyユーザーIDとShopifyカスタマーIDを紐付け
5. 仮想通貨決済とEC機能が利用可能
```

### **既存ユーザーの場合**
```
1. ユーザーがPrivyでログイン
2. 既存のShopifyカスタマーを検索
3. 見つからない場合は新規作成
4. 見つかった場合は紐付け更新
5. 購入履歴と仮想通貨決済履歴を統合表示
```

## 🛠 技術実装

### **1. Privy + Shopify 統合フック**

```typescript
// hooks/usePrivyShopifyAuth.ts
import { usePrivy } from '@privy-io/react-auth'
import { useShopifyCustomer } from './useShopifyCustomer'
import { useState, useEffect } from 'react'

interface PrivyShopifyUser {
  privyUserId: string
  shopifyCustomerId: string | null
  email: string
  wallet: any
  customer: any
  isLinked: boolean
}

export function usePrivyShopifyAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const [privyShopifyUser, setPrivyShopifyUser] = useState<PrivyShopifyUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Privyユーザーが変更された時の処理
  useEffect(() => {
    if (ready && authenticated && user) {
      handleUserSync()
    } else if (ready && !authenticated) {
      setPrivyShopifyUser(null)
    }
  }, [ready, authenticated, user])

  const handleUserSync = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // バックエンドでShopifyカスタマーとの同期を実行
      const response = await fetch('/api/auth/sync-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyUserId: user.id,
          email: user.email?.address,
          walletAddress: user.wallet?.address
        })
      })

      const data = await response.json()
      
      setPrivyShopifyUser({
        privyUserId: user.id,
        shopifyCustomerId: data.shopifyCustomerId,
        email: user.email?.address || '',
        wallet: user.wallet,
        customer: data.customer,
        isLinked: !!data.shopifyCustomerId
      })
    } catch (error) {
      console.error('User sync error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createShopifyCustomer = async (customerData: any) => {
    const response = await fetch('/api/auth/create-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privyUserId: user?.id,
        ...customerData
      })
    })
    
    return response.json()
  }

  return {
    ready,
    authenticated,
    user,
    privyShopifyUser,
    isLoading,
    login,
    logout,
    createShopifyCustomer,
    handleUserSync
  }
}
```

### **2. Shopify カスタマー管理フック**

```typescript
// hooks/useShopifyCustomer.ts
import { useState, useEffect } from 'react'

export function useShopifyCustomer(customerId: string | null) {
  const [customer, setCustomer] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (customerId) {
      fetchCustomerData()
    }
  }, [customerId])

  const fetchCustomerData = async () => {
    if (!customerId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/shopify/customers/${customerId}`)
      const data = await response.json()
      
      setCustomer(data.customer)
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Failed to fetch customer data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateCustomer = async (updates: any) => {
    const response = await fetch(`/api/shopify/customers/${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    
    const data = await response.json()
    setCustomer(data.customer)
    return data
  }

  return {
    customer,
    orders,
    isLoading,
    updateCustomer,
    refetch: fetchCustomerData
  }
}
```

### **3. 統合認証API**

```typescript
// app/api/auth/sync-customer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { shopifyClient } from '@/lib/shopify-client'
import { prisma } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    const { privyUserId, email, walletAddress } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // 既存のユーザーリンクを確認
    const existingLink = await prisma.userLink.findUnique({
      where: { privyUserId }
    })

    if (existingLink) {
      // 既存のShopifyカスタマーを取得
      const customer = await getShopifyCustomer(existingLink.shopifyCustomerId)
      return NextResponse.json({
        shopifyCustomerId: existingLink.shopifyCustomerId,
        customer,
        isNew: false
      })
    }

    // Shopifyでメールアドレスでカスタマーを検索
    const existingCustomer = await searchShopifyCustomerByEmail(email)
    
    let shopifyCustomerId: string
    
    if (existingCustomer) {
      // 既存のカスタマーが見つかった場合
      shopifyCustomerId = existingCustomer.id
      
      // ウォレットアドレスをカスタマーメタに追加
      await updateCustomerMeta(shopifyCustomerId, {
        wallet_address: walletAddress,
        privy_user_id: privyUserId
      })
    } else {
      // 新規カスタマーを作成
      const newCustomer = await createShopifyCustomer({
        email,
        accepts_marketing: true,
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
            value: walletAddress,
            type: 'single_line_text_field'
          }
        ]
      })
      
      shopifyCustomerId = newCustomer.id
    }

    // ユーザーリンクを作成
    await prisma.userLink.create({
      data: {
        privyUserId,
        shopifyCustomerId,
        email,
        walletAddress,
        linkedAt: new Date()
      }
    })

    const customer = await getShopifyCustomer(shopifyCustomerId)
    
    return NextResponse.json({
      shopifyCustomerId,
      customer,
      isNew: !existingCustomer
    })

  } catch (error) {
    console.error('Customer sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Shopifyカスタマー検索
async function searchShopifyCustomerByEmail(email: string) {
  const query = `
    query searchCustomers($query: String!) {
      customers(first: 1, query: $query) {
        edges {
          node {
            id
            email
            firstName
            lastName
            metafields(first: 10) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
          }
        }
      }
    }
  `

  const { data } = await shopifyClient.query({
    query,
    variables: { query: `email:${email}` }
  })

  return data.customers.edges[0]?.node || null
}

// Shopifyカスタマー作成
async function createShopifyCustomer(input: any) {
  const mutation = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const { data } = await shopifyClient.mutate({
    mutation,
    variables: { input }
  })

  if (data.customerCreate.userErrors.length > 0) {
    throw new Error(data.customerCreate.userErrors[0].message)
  }

  return data.customerCreate.customer
}
```

### **4. 統合されたカートコンテキスト**

```typescript
// contexts/PrivyShopifyCartContext.tsx
'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { usePrivyShopifyAuth } from '@/hooks/usePrivyShopifyAuth'
import { useCart } from './CartContext'

interface PrivyShopifyCartState {
  isPrivyAuthenticated: boolean
  shopifyCustomerId: string | null
  walletAddress: string | null
  paymentMethod: 'credit_card' | 'crypto' | null
}

const initialState: PrivyShopifyCartState = {
  isPrivyAuthenticated: false,
  shopifyCustomerId: null,
  walletAddress: null,
  paymentMethod: null
}

type PrivyShopifyCartAction = 
  | { type: 'SET_AUTH_STATE'; payload: Partial<PrivyShopifyCartState> }
  | { type: 'SET_PAYMENT_METHOD'; payload: 'credit_card' | 'crypto' }

function privyShopifyCartReducer(
  state: PrivyShopifyCartState, 
  action: PrivyShopifyCartAction
): PrivyShopifyCartState {
  switch (action.type) {
    case 'SET_AUTH_STATE':
      return { ...state, ...action.payload }
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload }
    default:
      return state
  }
}

interface PrivyShopifyCartContextType {
  state: PrivyShopifyCartState
  privyAuth: ReturnType<typeof usePrivyShopifyAuth>
  cart: ReturnType<typeof useCart>
  setPaymentMethod: (method: 'credit_card' | 'crypto') => void
  handleCryptoCheckout: () => Promise<void>
  handleCreditCardCheckout: () => Promise<void>
}

const PrivyShopifyCartContext = createContext<PrivyShopifyCartContextType | undefined>(undefined)

export function PrivyShopifyCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(privyShopifyCartReducer, initialState)
  const privyAuth = usePrivyShopifyAuth()
  const cart = useCart()

  // Privy認証状態を監視
  useEffect(() => {
    dispatch({
      type: 'SET_AUTH_STATE',
      payload: {
        isPrivyAuthenticated: privyAuth.authenticated,
        shopifyCustomerId: privyAuth.privyShopifyUser?.shopifyCustomerId || null,
        walletAddress: privyAuth.privyShopifyUser?.wallet?.address || null
      }
    })
  }, [privyAuth.authenticated, privyAuth.privyShopifyUser])

  const setPaymentMethod = (method: 'credit_card' | 'crypto') => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method })
  }

  const handleCryptoCheckout = async () => {
    if (!privyAuth.authenticated) {
      await privyAuth.login()
      return
    }

    if (!state.walletAddress) {
      throw new Error('Wallet not available')
    }

    // 仮想通貨決済フローを開始
    const orderData = {
      customerId: state.shopifyCustomerId,
      walletAddress: state.walletAddress,
      items: cart.state.items,
      paymentMethod: 'crypto'
    }

    const response = await fetch('/api/orders/crypto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })

    const { orderId, paymentAddress } = await response.json()
    
    // 決済画面にリダイレクト
    window.location.href = `/payment/crypto/${orderId}`
  }

  const handleCreditCardCheckout = async () => {
    // 従来のShopify決済フロー
    await cart.createShopifyCart()
    // Shopify Checkoutにリダイレクト
  }

  return (
    <PrivyShopifyCartContext.Provider value={{
      state,
      privyAuth,
      cart,
      setPaymentMethod,
      handleCryptoCheckout,
      handleCreditCardCheckout
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

### **5. 統合されたカートページ**

```typescript
// app/cart/page.tsx (更新版)
'use client'

import { usePrivyShopifyCart } from '@/contexts/PrivyShopifyCartContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function CartPage() {
  const { state, privyAuth, cart, setPaymentMethod, handleCryptoCheckout, handleCreditCardCheckout } = usePrivyShopifyCart()
  const { t } = useLanguage()

  if (cart.state.items.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {t({ JP: 'ショッピングカート', EN: 'Shopping Cart' })}
      </h1>

      {/* カートアイテム表示 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* カートアイテムリスト */}
        </div>

        <div className="lg:col-span-1">
          {/* 決済方法選択 */}
          <div className="space-y-3 mb-6">
            {/* クレジットカード決済 */}
            <button
              onClick={() => {
                setPaymentMethod('credit_card')
                handleCreditCardCheckout()
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
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
              onClick={() => {
                setPaymentMethod('crypto')
                handleCryptoCheckout()
              }}
              disabled={!state.isPrivyAuthenticated}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
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

          {/* ユーザー状態表示 */}
          {state.isPrivyAuthenticated && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">
                {t({ JP: 'ウォレット情報', EN: 'Wallet Info' })}
              </h3>
              <p className="text-sm text-gray-600">
                {t({ JP: 'アドレス', EN: 'Address' })}: {state.walletAddress?.slice(0, 6)}...{state.walletAddress?.slice(-4)}
              </p>
              {state.shopifyCustomerId && (
                <p className="text-sm text-gray-600">
                  {t({ JP: 'ShopifyカスタマーID', EN: 'Shopify Customer ID' })}: {state.shopifyCustomerId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

## 🗄️ データベース設計

```prisma
// schema.prisma に追加
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
  
  // 既存のフィールド
  items             Json
  totalAmount       Decimal
  paymentMethod     String
  status            OrderStatus
  
  @@map("orders")
}
```

## 🎯 統合のメリット

### **ユーザー体験**
- ✅ **シングルサインオン**: 一度ログインすれば全ての機能が利用可能
- ✅ **統合履歴**: 購入履歴と仮想通貨決済履歴を一元管理
- ✅ **シームレス決済**: 決済方法の選択が簡単

### **開発効率**
- ✅ **コード統合**: 認証ロジックの統一
- ✅ **データ同期**: ユーザーデータの自動同期
- ✅ **メンテナンス**: 単一の認証システム

### **ビジネス価値**
- ✅ **顧客分析**: 統合された顧客データ
- ✅ **マーケティング**: 統一された顧客プロファイル
- ✅ **サポート**: 一元化された顧客情報

この統合により、Privyのウォレット機能とShopifyのEC機能が完全に連携し、ユーザーは一度のログインで全ての機能を利用できるようになります。
