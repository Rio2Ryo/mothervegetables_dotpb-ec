'use client'

import React, { createContext, useContext, useReducer } from 'react'
import { useMetaMaskAuth } from './MetaMaskAuthContext'
import { useCart } from './CartContext'
import { useLanguage } from './LanguageContext'

interface MetaMaskShopifyCartState {
  isWalletConnected: boolean
  shopifyCustomerId: string | null
  walletAddress: string | null
  paymentMethod: 'credit_card' | 'crypto' | null
  isLoading: boolean
}

const initialState: MetaMaskShopifyCartState = {
  isWalletConnected: false,
  shopifyCustomerId: null,
  walletAddress: null,
  paymentMethod: null,
  isLoading: false
}

type MetaMaskShopifyCartAction =
  | { type: 'SET_AUTH_STATE'; payload: Partial<MetaMaskShopifyCartState> }
  | { type: 'SET_PAYMENT_METHOD'; payload: 'credit_card' | 'crypto' }
  | { type: 'SET_LOADING'; payload: boolean }

function metaMaskShopifyCartReducer(
  state: MetaMaskShopifyCartState,
  action: MetaMaskShopifyCartAction
): MetaMaskShopifyCartState {
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

interface MetaMaskShopifyCartContextType {
  state: MetaMaskShopifyCartState
  metamask: ReturnType<typeof useMetaMaskAuth>
  cart: ReturnType<typeof useCart>
  language: ReturnType<typeof useLanguage>
  handleCryptoCheckout: () => Promise<{orderId: string, walletAddress: string, totalAmount: string, currency: string, items: unknown[]}>
  handleCreditCardCheckout: () => Promise<void>
}

const MetaMaskShopifyCartContext = createContext<MetaMaskShopifyCartContextType | undefined>(undefined)

export function MetaMaskShopifyCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(metaMaskShopifyCartReducer, initialState)
  const metamask = useMetaMaskAuth()
  const cart = useCart()
  const language = useLanguage()

  const handleCryptoCheckout = async () => {
    if (!metamask.isConnected) {
      await metamask.connect()
    }

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: 'crypto' })

    try {
      console.log('Processing crypto payment with wallet:', metamask.address)

      // OrderIDとPayment Addressを必ず同じタイミングで生成
      const cryptoPaymentData = await cart.generateCryptoPayment(metamask.address)
      
      console.log('OrderID and Payment Address generated:', {
        orderId: cryptoPaymentData.orderId,
        address: cryptoPaymentData.walletAddress,
        totalAmount: cryptoPaymentData.totalAmount
      })

      // 支払い画面に遷移またはモーダルを表示
      // ここで支払い画面の表示処理を実装
      return cryptoPaymentData

    } catch (error) {
      console.error('Crypto checkout error:', error)
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleCreditCardCheckout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: 'credit_card' })

    try {
      // Implement credit card payment logic here
      console.log('Processing credit card payment')
      // Redirect to Shopify checkout or process through your payment gateway
    } catch (error) {
      console.error('Credit card checkout error:', error)
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  React.useEffect(() => {
    dispatch({
      type: 'SET_AUTH_STATE',
      payload: {
        isWalletConnected: metamask.isConnected,
        walletAddress: metamask.address || null
      }
    })
  }, [metamask.isConnected, metamask.address])

  const value = {
    state,
    metamask,
    cart,
    language,
    handleCryptoCheckout,
    handleCreditCardCheckout
  }

  return (
    <MetaMaskShopifyCartContext.Provider value={value}>
      {children}
    </MetaMaskShopifyCartContext.Provider>
  )
}

export function useMetaMaskShopifyCart() {
  const context = useContext(MetaMaskShopifyCartContext)
  if (!context) {
    throw new Error('useMetaMaskShopifyCart must be used within MetaMaskShopifyCartProvider')
  }
  return context
}