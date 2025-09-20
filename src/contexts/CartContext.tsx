'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import { ShopifyProduct } from '@/types/shopify'
import { useLanguage } from './LanguageContext'
import { CURRENCY_CONFIG, convertCurrency } from '@/lib/currency'

// カートアイテムの型定義
export interface CartItem {
  id: string
  productId: string
  variantId: string
  title: string
  handle: string
  price: string
  currencyCode: string
  quantity: number
  image?: string
  selectedOptions: Array<{
    name: string
    value: string
  }>
}

// カートの状態型定義
interface CartState {
  items: CartItem[]
  totalQuantity: number
  totalPrice: number
  currencyCode: string
  isLoading: boolean
  error: string | null
  shopifyCartId: string | null
  checkoutUrl: string | null
}

// カートアクションの型定義
type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_CART'; payload: CartItem[] }
  | { type: 'SET_SHOPIFY_CART'; payload: { cartId: string; checkoutUrl: string } }
  | { type: 'SYNC_SHOPIFY_CART'; payload: { cartId: string; checkoutUrl: string; items: CartItem[] } }

// 初期状態
const initialState: CartState = {
  items: [],
  totalQuantity: 0,
  totalPrice: 0,
  currencyCode: 'JPY',
  isLoading: false,
  error: null,
  shopifyCartId: null,
  checkoutUrl: null,
}

// カートリデューサー
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.variantId === action.payload.variantId)
      
      if (existingItem) {
        // 既存のアイテムの数量を増加
        const updatedItems = state.items.map(item =>
          item.variantId === action.payload.variantId
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        )
        
        const totalQuantity = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
        const totalPrice = updatedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
        
        return {
          ...state,
          items: updatedItems,
          totalQuantity,
          totalPrice,
        }
      } else {
        // 新しいアイテムを追加
        const newItems = [...state.items, action.payload]
        const totalQuantity = newItems.reduce((sum, item) => sum + item.quantity, 0)
        const totalPrice = newItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
        
        return {
          ...state,
          items: newItems,
          totalQuantity,
          totalPrice,
        }
      }
    }
    
    case 'REMOVE_ITEM': {
      const filteredItems = state.items.filter(item => item.variantId !== action.payload)
      const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0)
      const totalPrice = filteredItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
      
      return {
        ...state,
        items: filteredItems,
        totalQuantity,
        totalPrice,
      }
    }
    
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: action.payload.id })
      }
      
      const updatedItems = state.items.map(item =>
        item.variantId === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      )
      
      const totalQuantity = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
      const totalPrice = updatedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
      
      return {
        ...state,
        items: updatedItems,
        totalQuantity,
        totalPrice,
      }
    }
    
    case 'CLEAR_CART':
      return {
        ...initialState,
        currencyCode: state.currencyCode,
      }
    
    case 'SET_SHOPIFY_CART':
      return {
        ...state,
        shopifyCartId: action.payload.cartId,
        checkoutUrl: action.payload.checkoutUrl,
      }
    
    case 'SYNC_SHOPIFY_CART': {
      const totalQuantity = action.payload.items.reduce((sum, item) => sum + item.quantity, 0)
      const totalPrice = action.payload.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
      
      return {
        ...state,
        items: action.payload.items,
        totalQuantity,
        totalPrice,
        shopifyCartId: action.payload.cartId,
        checkoutUrl: action.payload.checkoutUrl,
      }
    }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      }
    
    case 'LOAD_CART': {
      const totalQuantity = action.payload.reduce((sum, item) => sum + item.quantity, 0)
      const totalPrice = action.payload.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
      
      return {
        ...state,
        items: action.payload,
        totalQuantity,
        totalPrice,
      }
    }
    
    default:
      return state
  }
}

// コンテキストの型定義
interface CartContextType {
  state: CartState
  addItem: (product: ShopifyProduct, variantId: string, quantity?: number) => Promise<void>
  removeItem: (variantId: string) => Promise<void>
  updateQuantity: (variantId: string, quantity: number) => Promise<void>
  clearCart: () => void
  formatPrice: (amount: string, originalCurrencyCode: string) => string
  syncWithShopify: () => Promise<void>
  createShopifyCart: () => Promise<{ id: string; checkoutUrl: string; lines?: unknown } | undefined>
  getCurrentCurrency: () => { code: string; locale: string; symbol: string }
}

// コンテキスト作成
const CartContext = createContext<CartContextType | undefined>(undefined)

// 通貨設定は @/lib/currency からインポート

// カートプロバイダーコンポーネント
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { language } = useLanguage()
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ローカルストレージからカートを読み込み
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('shopify-cart')
      const savedCartId = localStorage.getItem('shopify-cart-id')
      const savedCheckoutUrl = localStorage.getItem('shopify-checkout-url')
      
      if (savedCart) {
        const cartItems = JSON.parse(savedCart)
        dispatch({ type: 'LOAD_CART', payload: cartItems })
      }
      
      if (savedCartId && savedCheckoutUrl) {
        dispatch({ 
          type: 'SET_SHOPIFY_CART', 
          payload: { cartId: savedCartId, checkoutUrl: savedCheckoutUrl } 
        })
      }
    } catch (error) {
      console.error('カートの読み込みに失敗しました:', error)
    }
  }, [])

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  // カートの変更をローカルストレージに保存（同期中は除外）
  useEffect(() => {
    if (state.isLoading) return // 同期中は保存をスキップ
    
    try {
      localStorage.setItem('shopify-cart', JSON.stringify(state.items))
      if (state.shopifyCartId) {
        localStorage.setItem('shopify-cart-id', state.shopifyCartId)
      }
      if (state.checkoutUrl) {
        localStorage.setItem('shopify-checkout-url', state.checkoutUrl)
      }
    } catch (error) {
      console.error('カートの保存に失敗しました:', error)
    }
  }, [state.items, state.shopifyCartId, state.checkoutUrl]) // isLoadingを依存関係から削除

  // 商品をカートに追加
  const addItem = async (product: ShopifyProduct, variantId: string, quantity: number = 1) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const variant = product.variants.edges.find(edge => edge.node.id === variantId)?.node
      
      if (!variant) {
        dispatch({ type: 'SET_ERROR', payload: '商品のバリエーションが見つかりません' })
        return
      }

      const firstImage = product.images.edges[0]?.node

      const cartItem: CartItem = {
        id: `${product.id}-${variantId}`,
        productId: product.id,
        variantId: variantId,
        title: product.title,
        handle: product.handle,
        price: variant.price.amount,
        currencyCode: variant.price.currencyCode,
        quantity,
        image: firstImage?.url,
        selectedOptions: variant.selectedOptions,
      }

      // ローカル状態を更新
      dispatch({ type: 'ADD_ITEM', payload: cartItem })

      // Shopifyカートに同期（デバウンス）
      debouncedSyncWithShopify()
    } catch (error) {
      console.error('カート追加エラー:', error)
      dispatch({ type: 'SET_ERROR', payload: 'カートの追加に失敗しました' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // 商品をカートから削除
  const removeItem = async (variantId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      // ローカル状態を更新
      dispatch({ type: 'REMOVE_ITEM', payload: variantId })

      // Shopifyカートに同期（デバウンス）
      debouncedSyncWithShopify()
    } catch (error) {
      console.error('カート削除エラー:', error)
      dispatch({ type: 'SET_ERROR', payload: 'カートの削除に失敗しました' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // 商品の数量を更新
  const updateQuantity = async (variantId: string, quantity: number) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      // ローカル状態を更新
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: variantId, quantity } })

      // Shopifyカートに同期（デバウンス）
      debouncedSyncWithShopify()
    } catch (error) {
      console.error('カート更新エラー:', error)
      dispatch({ type: 'SET_ERROR', payload: 'カートの更新に失敗しました' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // カートをクリア
  const clearCart = async () => {
    try {
      // ローカル状態をクリア
      dispatch({ type: 'CLEAR_CART' })
      
      // Shopifyカートもクリア
      if (state.shopifyCartId) {
        await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: state.shopifyCartId,
            lines: [],
            action: 'replace'
          })
        })
      }
    } catch (error) {
      console.error('カートクリアエラー:', error)
    }
  }

  // デバウンスされた同期処理
  const debouncedSyncWithShopify = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncWithShopify()
    }, 500) // 500ms後に実行
  }, [])

  // Shopifyカートと同期（リトライ機能付き）
  const syncWithShopify = async (retryCount = 0) => {
    const maxRetries = 3
    
    // 既に同期中の場合はスキップ
    if (state.isLoading && retryCount === 0) {
      console.log('🔄 既に同期中です。スキップします。')
      return
    }
    
    if (state.items.length === 0) {
      // カートが空の場合は既存のShopifyカートをクリア
      if (state.shopifyCartId) {
        try {
          const response = await fetch('/api/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartId: state.shopifyCartId,
              lines: [],
              action: 'replace'
            })
          })
          
          if (!response.ok) {
            console.warn('カートクリアに失敗しました:', response.status)
          }
        } catch (error) {
          console.error('カートクリアエラー:', error)
        }
      }
      return
    }

    try {
      const lines = state.items.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity,
      }))

      let response;
      if (state.shopifyCartId) {
        // 既存のカートを完全に置き換え
        response = await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: state.shopifyCartId,
            lines,
            action: 'replace'
          })
        })
      } else {
        // 新しいカートを作成
        response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines })
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const cartData = await response.json()
      
      console.log('🛒 Shopifyカート同期完了:', {
        cartId: cartData.id,
        checkoutUrl: cartData.checkoutUrl,
        linesCount: cartData.lines?.edges?.length || 0,
        localItemsCount: state.items.length,
        retryCount
      })
      
      dispatch({
        type: 'SET_SHOPIFY_CART',
        payload: {
          cartId: cartData.id,
          checkoutUrl: cartData.checkoutUrl
        }
      })
    } catch (error) {
      console.error(`Shopify同期エラー (試行 ${retryCount + 1}/${maxRetries + 1}):`, error)
      
      if (retryCount < maxRetries) {
        // リトライ（指数バックオフ）
        const delay = Math.pow(2, retryCount) * 1000
        console.log(`${delay}ms後にリトライします...`)
        
        setTimeout(() => {
          syncWithShopify(retryCount + 1)
        }, delay)
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Shopifyカートの同期に失敗しました（最大リトライ回数に達しました）' })
      }
    }
  }

  // Shopifyカートを作成または更新（チェックアウト用）
  const createShopifyCart = async () => {
    if (state.items.length === 0) return

    try {
      const lines = state.items.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity,
      }))

      let response;
      if (state.shopifyCartId) {
        // 既存のカートを更新
        console.log('🔄 既存のShopifyカートを更新中...')
        response = await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId: state.shopifyCartId,
            lines,
            action: 'replace'
          })
        })
      } else {
        // 新しいカートを作成
        console.log('🆕 新しいShopifyカートを作成中...')
        response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines })
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Shopifyカートの同期に失敗しました: ${errorText}`)
      }

      const cartData = await response.json()
      
      console.log('✅ Shopifyカート同期完了:', {
        cartId: cartData.id,
        checkoutUrl: cartData.checkoutUrl,
        linesCount: cartData.lines?.edges?.length || 0,
        localItemsCount: state.items.length
      })
      
      dispatch({
        type: 'SET_SHOPIFY_CART',
        payload: {
          cartId: cartData.id,
          checkoutUrl: cartData.checkoutUrl
        }
      })

      return cartData
    } catch (error) {
      console.error('Shopifyカート同期エラー:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Shopifyカートの同期に失敗しました' })
      throw error
    }
  }

  // 通貨変換関数は @/lib/currency からインポート

  // 価格フォーマット関数（言語対応）
  const formatPrice = (amount: string, originalCurrencyCode: string) => {
    const config = CURRENCY_CONFIG[language as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.JP
    const convertedAmount = convertCurrency(amount, originalCurrencyCode, config.code)
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
    }).format(convertedAmount)
  }

  // 現在の通貨設定を取得
  const getCurrentCurrency = () => {
    return CURRENCY_CONFIG[language as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.JP
  }

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    formatPrice,
    syncWithShopify,
    createShopifyCart,
    getCurrentCurrency,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// カートフック
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
