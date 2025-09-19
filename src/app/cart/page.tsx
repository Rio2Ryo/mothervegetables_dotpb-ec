'use client'

import { useCart } from '@/contexts/CartContext'
import { useLanguage } from '@/contexts/LanguageContext'
import CartItemComponent from '@/components/cart/CartItem'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState } from 'react'

export default function CartPage() {
  const { state, clearCart, formatPrice, createShopifyCart, getCurrentCurrency } = useCart()
  const { t, language } = useLanguage()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  
  const currentCurrency = getCurrentCurrency()

  const handleCheckout = async () => {
    if (isCheckingOut) return // 重複実行を防止
    
    setIsCheckingOut(true)
    try {
      // チェックアウト前に確実に同期を完了
      console.log('🔄 チェックアウト前の同期開始...')
      
      // デバウンスを無視して即座に同期を実行
      const cartData = await createShopifyCart()
      if (!cartData?.checkoutUrl) {
        throw new Error('チェックアウトURLの取得に失敗しました')
      }

      console.log('✅ 同期完了、チェックアウトURL:', cartData.checkoutUrl)

      // 言語パラメータを追加
      const url = new URL(cartData.checkoutUrl)
      
      // Shopify Checkoutの言語設定パラメータを追加
      if (language === 'EN') {
        url.searchParams.set('locale', 'en')
        url.searchParams.set('language', 'en')
      } else {
        url.searchParams.set('locale', 'ja')
        url.searchParams.set('language', 'ja')
      }

      console.log('🌐 チェックアウトページに遷移:', url.toString())

      // チェックアウトページに遷移
      window.location.href = url.toString()
    } catch (error) {
      console.error('チェックアウトエラー:', error)
      alert(t({ 
        JP: 'チェックアウトに失敗しました。もう一度お試しください。', 
        EN: 'Checkout failed. Please try again.' 
      }))
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (state.items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-black text-white pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-8">
                {t({ JP: 'ショッピングカート', EN: 'Shopping Cart' })}
              </h1>
              
              {/* 空のカート表示 */}
              <div className="max-w-md mx-auto bg-gray-900/50 border border-green-500/20 rounded-xl p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h6m-6 0a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-4">
                  {t({ JP: 'カートが空です', EN: 'Your cart is empty' })}
                </h2>
                <p className="text-gray-300 mb-6">
                  {t({ 
                    JP: '商品をカートに追加して、素晴らしいショッピング体験をお楽しみください。', 
                    EN: 'Add items to your cart to start shopping.' 
                  })}
                </p>
                <Link 
                  href="/"
                  className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t({ JP: '商品を見る', EN: 'Continue Shopping' })}
                </Link>
              </div>
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
        <div className="container mx-auto px-4 py-16">
          {/* ページヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {t({ JP: 'ショッピングカート', EN: 'Shopping Cart' })}
            </h1>
            <p className="text-gray-300">
              {t({ JP: `${state.totalQuantity}個の商品`, EN: `${state.totalQuantity} items` })}
            </p>
            <p className="text-sm text-green-400 mt-2">
              {t({ 
                JP: `表示通貨: ${currentCurrency.symbol}${currentCurrency.code}`, 
                EN: `Display Currency: ${currentCurrency.symbol}${currentCurrency.code}` 
              })}
            </p>
          </div>

          {/* エラー表示 */}
          {state.error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-400 font-medium">
                  {state.error}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カートアイテム一覧 */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {state.items.map((item) => (
                  <CartItemComponent key={item.id} item={item} />
                ))}
              </div>

              {/* カートをクリアボタン */}
              <div className="mt-8">
                <button
                  onClick={() => clearCart()}
                  className="text-red-400 hover:text-red-300 text-sm underline"
                >
                  {t({ JP: 'カートをクリア', EN: 'Clear Cart' })}
                </button>
              </div>
            </div>

            {/* 注文サマリー */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 border border-green-500/20 rounded-xl p-6 sticky top-24">
                <h2 className="text-xl font-bold text-white mb-6">
                  {t({ JP: '注文サマリー', EN: 'Order Summary' })}
                </h2>

                {/* 小計 */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-300">
                      {t({ JP: '小計', EN: 'Subtotal' })}
                    </span>
                    <span className="text-white font-medium">
                      {formatPrice(state.totalPrice.toString(), state.currencyCode)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-300">
                      {t({ JP: '配送料', EN: 'Shipping' })}
                    </span>
                    <span className="text-green-400 font-medium">
                      {t({ JP: '無料', EN: 'Free' })}
                    </span>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-white">
                        {t({ JP: '合計', EN: 'Total' })}
                      </span>
                      <span className="text-lg font-bold text-green-400">
                        {formatPrice(state.totalPrice.toString(), state.currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 決済方法選択 */}
                <div className="space-y-3 mb-6">
                  {/* 通常のチェックアウトボタン */}
                  <button
                    onClick={handleCheckout}
                    disabled={state.isLoading || isCheckingOut}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-4 px-6 rounded-lg transition-colors duration-200"
                  >
                    {state.isLoading || isCheckingOut ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isCheckingOut ? t({ JP: '同期中...', EN: 'Syncing...' }) : t({ JP: '処理中...', EN: 'Processing...' })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                        {t({ JP: 'クレジットカードで支払う', EN: 'Pay with Credit Card' })}
                      </div>
                    )}
                  </button>

                  {/* 仮想通貨決済ボタン */}
                  <button
                    onClick={() => console.log('仮想通貨決済を開始')}
                    disabled={state.isLoading || isCheckingOut}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {t({ JP: '独自コインで支払う', EN: 'Pay with Custom Coin' })}
                    </div>
                  </button>
                </div>

                {/* 続けて買い物ボタン */}
                <Link 
                  href="/"
                  className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 text-center"
                >
                  {t({ JP: '続けて買い物', EN: 'Continue Shopping' })}
                </Link>

                {/* セキュリティ情報 */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-center text-xs text-gray-400">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {t({ JP: '安全なお支払い', EN: 'Secure Payment' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
