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
  userLink: { id: string } | null
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
        // languageは既にコンポーネントレベルで取得済み

        if (language.language === 'JP') {
          url.searchParams.set('locale', 'ja-JP')
        } else {
          // 国際マーケットの場合は英語
          url.searchParams.set('locale', 'en-US')
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
