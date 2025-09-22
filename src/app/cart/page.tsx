'use client'

import { useMetaMaskShopifyCart } from '@/contexts/MetaMaskShopifyCartContext'
import { useCart } from '@/contexts/CartContext'
import CartItemComponent from '@/components/cart/CartItem'
import CryptoPaymentModal from '@/components/crypto/CryptoPaymentModal'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState } from 'react'
import { usePriceGuarantee } from '@/contexts/PriceGuaranteeContext'
import PriceGuaranteeStatus from '@/components/PriceGuaranteeStatus'
import ExpiredItemCleanup from '@/components/ExpiredItemCleanup'

export default function CartPage() {
  const { state, cart, language, handleCreditCardCheckout } = useMetaMaskShopifyCart()
  const { state: cartState, clearCart } = useCart()
  const { t } = language
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCryptoModal, setShowCryptoModal] = useState(false)
  const { priceGuarantees, isPriceValid, resetAllPriceGuarantees, getRemainingTime } = usePriceGuarantee()
  
  const handleCryptoPayment = async () => {
    setShowCryptoModal(true)
  }

      // 注文情報を準備
      const orderInfo = {
        orderId: `order_${Date.now()}`,
        totalAmount: "0.001", // テスト用に0.001 ETHに設定
        currency: "ETH",
        items: cart.state.items.map(item => ({
          id: item.id,
          name: item.title,
          quantity: item.quantity,
          price: "0.001" // テスト用に0.001 ETHに設定
        }))
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
      <ExpiredItemCleanup />
      <main className="min-h-screen bg-black text-white pt-20">
        <div className="container mx-auto px-4 py-16">
          {/* ページヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {t({ JP: 'ショッピングカート', EN: 'Shopping Cart' })}
            </h1>
            <p className="text-gray-300">
              {t({ JP: `${cart.state.totalQuantity}個の商品`, EN: `${cart.state.totalQuantity} items` })}
            </p>
            
            {/* 代理店情報表示 */}
            {cartState.agentCode && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-blue-300 font-medium">
                      {t({ JP: '代理店経由でのご注文', EN: 'Ordering through agent' })}
                    </p>
                    <p className="text-blue-400 text-sm">
                      {t({ JP: `代理店コード: ${cartState.agentCode}`, EN: `Agent Code: ${cartState.agentCode}` })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {cart.state.error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-400 font-medium">
                  {cart.state.error}
                </p>
              </div>
            </div>
          )}

          {/* 価格保証デバッグ情報 */}
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-blue-400 font-medium mb-2">価格保証デバッグ情報</div>
            <div className="text-sm text-gray-300">
              <div>価格保証総数: {priceGuarantees.size}</div>
              <div>カートアイテム数: {cart.state.items.length}</div>
              <div>価格保証詳細:</div>
              <pre className="text-xs mt-2 bg-gray-800 p-2 rounded">
                {Array.from(priceGuarantees.entries()).map(([id, guarantee]) => 
                  `${id}: ${guarantee.ethPrice.toFixed(4)} ETH (有効: ${isPriceValid(id)}) (残り: ${getRemainingTime(id)}秒)`
                ).join('\n')}
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カートアイテム一覧 */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {cart.state.items.map((item) => (
                  <div key={item.id}>
                    <CartItemComponent item={item} />
                    
                    {/* デバッグ情報 */}
                    <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
                      <div>商品ID: {item.id}</div>
                      <div>価格保証有効: {isPriceValid(item.id) ? 'Yes' : 'No'}</div>
                      <div>価格保証数: {priceGuarantees.size}</div>
                      <div>残り時間: {getRemainingTime(item.id)}秒</div>
                    </div>
                    
                    {/* 価格保証状況 */}
                    {isPriceValid(item.id) && (
                      <div className="mt-2">
                        <PriceGuaranteeStatus productId={item.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* カートをクリアボタン */}
              <div className="mt-8">
                <button
                  onClick={() => {
                    cart.clearCart()
                    // 価格保証もリセット
                    resetAllPriceGuarantees()
                  }}
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
                      {cart.formatPrice(cart.state.totalPrice.toString(), cart.state.currencyCode)}
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
                        {cart.formatPrice(cart.state.totalPrice.toString(), cart.state.currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ユーザー状態表示 */}
                {state.isWalletConnected && (
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

                {/* 購入ボタン */}
                <div className="mb-4">
                  <button
                    onClick={handleCreditCardPayment}
                    disabled={isProcessing}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-4 px-6 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {isProcessing ? (
                        t({ JP: '処理中...', EN: 'Processing...' })
                      ) : (
                        t({ JP: 'クレジットカードで購入', EN: 'Pay with Card' })
                      )}
                    </div>
                  </button>
                </div>

                {/* 仮想通貨決済ボタン */}
                <div className="mb-6">
                  <button
                    onClick={handleCryptoPayment}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      {t({ JP: '仮想通貨で支払う', EN: 'Pay with Crypto' })}
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
      
      {/* 仮想通貨決済モーダル */}
      <CryptoPaymentModal
        isOpen={showCryptoModal}
        onClose={() => setShowCryptoModal(false)}
        orderInfo={orderInfo}
      />
    </>
  )
}
