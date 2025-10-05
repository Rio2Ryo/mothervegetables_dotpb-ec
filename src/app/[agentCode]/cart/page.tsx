'use client'

import { useCart } from '@/contexts/CartContext'
import { useLanguage } from '@/contexts/LanguageContext'
import CartItemComponent from '@/components/cart/CartItem'
import CryptoPaymentModal from '@/components/crypto/CryptoPaymentModal'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { usePriceGuarantee } from '@/contexts/PriceGuaranteeContext'
import PriceGuaranteeStatus from '@/components/PriceGuaranteeStatus'
import ExpiredItemCleanup from '@/components/ExpiredItemCleanup'
export default function AgentCartPage() {
  const params = useParams()
  const agentCode = params.agentCode as string
  const { state: cartState, removeItem, formatPrice, clearCart, generateCryptoPayment } = useCart()
  const { t, countryCode, currency } = useLanguage()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCryptoModal, setShowCryptoModal] = useState(false)
  const { priceGuarantees, isPriceValid, resetAllPriceGuarantees, getRemainingTime, lockPrice, forceExpireAllGuarantees } = usePriceGuarantee()
  const [walletInfo, setWalletInfo] = useState<{
    address: string
    balance: string
    network: string
  } | null>(null)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  
  const handleCheckout = async () => {
    setIsProcessing(true)
    try {
      console.log('Starting checkout process...', {
        agentCode,
        itemsCount: cartState.items.length,
        items: cartState.items
      })

      // Shopify Checkoutに遷移
      const checkoutUrl = await createShopifyCheckout()
      console.log('Checkout URL received:', checkoutUrl)
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(t({ 
        JP: `チェックアウトでエラーが発生しました: ${errorMessage}`, 
        EN: `Error occurred during checkout: ${errorMessage}` 
      }))
    } finally {
      setIsProcessing(false)
    }
  }

  const [orderInfo, setOrderInfo] = useState<{orderId: string, walletAddress: string, totalAmount: string, currency: string, items: {id: string, name: string, quantity: number, price: string}[], agentCode?: string} | null>(null)
  const [currentConnectedWallet, setCurrentConnectedWallet] = useState<{address: string, balance: string, network: string} | null>(null)

  // MetaMaskウォレット情報を取得
  const fetchWalletInfo = async () => {
    try {
      setIsConnectingWallet(true)
      console.log('🔍 MetaMask接続状態を確認中...')

      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('✅ MetaMaskが検出されました')

        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        }) as string[]

        if (accounts.length > 0) {
          const address = accounts[0]
          const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
          }) as string

          const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(6)

          const chainId = await window.ethereum.request({
            method: 'eth_chainId'
          }) as string

          const networkName = chainId === '0xaa36a7' ? 'Sepolia Testnet' :
                             chainId === '0x1' ? 'Ethereum Mainnet' :
                             `Network ${chainId}`

          const walletData = {
            address,
            balance: balanceInEth,
            network: networkName
          }

          setWalletInfo(walletData)

          console.log('✅ ウォレット情報取得完了')
          return walletData
        } else {
          setWalletInfo(null)
          return null
        }
      } else {
        setWalletInfo(null)
        return null
      }
    } catch (err) {
      console.error('❌ ウォレット情報取得エラー:', err)
      setWalletInfo(null)
      return null
    } finally {
      setIsConnectingWallet(false)
    }
  }

  const handleCryptoPayment = async () => {
    try {
      setIsProcessing(true)

      // まずウォレット情報を取得（返り値を使用）
      const currentWalletInfo = await fetchWalletInfo()

      if (!currentWalletInfo) {
        alert(t({
          JP: 'MetaMaskの接続に失敗しました。MetaMaskがインストールされていることを確認してください。',
          EN: 'Failed to connect MetaMask. Please ensure MetaMask is installed.'
        }))
        setIsProcessing(false)
        return
      }

      // OrderIDを生成（Payment AddressとDraft Orderの作成はCryptoPaymentModalで実行）
      const cryptoPaymentData = await generateCryptoPayment()

      console.log('🎯 Crypto Payment Data:', cryptoPaymentData)

      // カート内商品の価格保証から合計金額を計算
      let totalETH = 0
      const hasValidPriceGuarantees = cartState.items.every(item => {
        const guarantee = priceGuarantees.get(item.variantId)
        return guarantee && isPriceValid(item.variantId)
      })

      if (!hasValidPriceGuarantees) {
        // 価格保証が切れている場合はエラー
        alert(t({
          JP: '価格保証が期限切れです。カートページをリロードしてください。',
          EN: 'Price guarantee has expired. Please reload the cart page.'
        }))
        setIsProcessing(false)
        return
      }

      cartState.items.forEach(item => {
        const guarantee = priceGuarantees.get(item.variantId)
        if (guarantee && isPriceValid(item.variantId)) {
          totalETH += guarantee.ethPrice * item.quantity
        }
      })

      const clampedETH = totalETH.toFixed(6)

      console.log('💰 Cart Total Amount:', {
        totalAmount: clampedETH,
        currency: 'SepoliaETH',
        itemsCount: cartState.items.length
      })

      // 注文情報を準備（代理店情報を含む）
      const newOrderInfo = {
        orderId: cryptoPaymentData.orderId, // OrderIDのみ
        walletAddress: currentWalletInfo.address, // 接続されたウォレットアドレス
        totalAmount: clampedETH,
        currency: 'SepoliaETH',
        agentCode: agentCode,
        items: cartState.items.map(item => ({
          id: item.variantId,
          name: item.title,
          quantity: item.quantity,
          price: item.price
        }))
      }

      console.log('📦 Order Info:', newOrderInfo)
      console.log('💼 Wallet Info:', currentWalletInfo)

      // 最新のウォレット情報を保存
      setCurrentConnectedWallet(currentWalletInfo)
      setOrderInfo(newOrderInfo)
      setShowCryptoModal(true)
    } catch (error) {
      console.error('Crypto payment initialization error:', error)
      alert(t({
        JP: '暗号通貨決済の初期化でエラーが発生しました',
        EN: 'Error occurred during crypto payment initialization'
      }))
    } finally {
      setIsProcessing(false)
    }
  }

  const createShopifyCheckout = async () => {
    try {
      // microCMSから代理店情報を取得してクーポンコードを取得
      const agentResponse = await fetch(`/api/agents?code=${agentCode}`);
      const agentData = await agentResponse.json();

      const discountCode = agentData.agent?.coupon_code || null;

      if (discountCode) {
        console.log('Applying discount code:', discountCode);
      }

      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineItems: cartState.items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
          })),
          agentCode: agentCode,
          discountCode: discountCode,
          countryCode: countryCode,
          currencyCode: currency
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Checkout API error:', errorData)
        throw new Error(errorData.error || errorData.message || 'Failed to create checkout')
      }

      const data = await response.json()
      console.log('Checkout API response:', data)

      if (!data.success || !data.checkout) {
        throw new Error(data.error || data.message || 'Checkout creation failed')
      }

      // Shopify Checkout URLを取得
      return data.checkout.webUrl
    } catch (error) {
      console.error('Error creating checkout:', error)
      throw error
    }
  }

  if (cartState.items.length === 0) {
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
                  href={`/${agentCode}`}
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
              {t({ JP: `${cartState.totalQuantity}個の商品`, EN: `${cartState.totalQuantity} items` })}
            </p>
            
            {/* 代理店情報表示 */}
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
                    {t({ JP: `代理店コード: ${agentCode}`, EN: `Agent Code: ${agentCode}` })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* エラー表示 */}
          {cartState.error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-400 font-medium">
                  {cartState.error}
                </p>
              </div>
            </div>
          )}

          {/* 価格保証デバッグ情報 */}
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-blue-400 font-medium mb-2">価格保証デバッグ情報 (代理店経由)</div>
            <div className="text-sm text-gray-300">
              <div>価格保証総数: {priceGuarantees.size}</div>
              <div>カートアイテム数: {cartState.items.length}</div>
              <div>代理店コード: {agentCode}</div>
              <div>カートアイテム詳細:</div>
              <pre className="text-xs mt-2 bg-gray-800 p-2 rounded">
                {cartState.items.map(item => 
                  `${item.title}: productId=${item.productId}, variantId=${item.variantId}`
                ).join('\n')}
              </pre>
              <div className="mt-2">価格保証詳細:</div>
              <pre className="text-xs mt-2 bg-gray-800 p-2 rounded">
                {Array.from(priceGuarantees.entries()).map(([id, guarantee]) => 
                  `${id}: ${guarantee.ethPrice.toFixed(4)} ETH (有効: ${isPriceValid(id)}) (残り: ${getRemainingTime(id)}秒)`
                ).join('\n')}
              </pre>
              
              {/* テスト用: 手動で価格保証を設定 */}
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => {
                    cartState.items.forEach(item => {
                      const ethPrice = 0.0010 + Math.random() * (0.0019 - 0.0010)
                      const usdPrice = parseFloat(item.price)
                      lockPrice(item.id, ethPrice, usdPrice)
                    })
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded"
                >
                  手動で価格保証を設定（テスト用）
                </button>
                
                <button
                  onClick={() => {
                    // まず価格保証を設定
                    cartState.items.forEach(item => {
                      const ethPrice = 0.0010 + Math.random() * (0.0019 - 0.0010)
                      const usdPrice = parseFloat(item.price)
                      lockPrice(item.id, ethPrice, usdPrice)
                    })
                    
                    // 少し待ってから強制的に期限切れにする
                    setTimeout(() => {
                      forceExpireAllGuarantees()
                      console.log('全商品を強制的に期限切れに設定')
                    }, 500)
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded"
                >
                  強制的に期限切れにする（テスト用）
                </button>
                
                <button
                  onClick={() => {
                    // カート内の全商品を即座に削除
                    cartState.items.forEach(item => {
                      removeItem(item.variantId)
                    })
                    console.log('全商品を即座に削除')
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1 px-2 rounded"
                >
                  全商品を即座に削除（テスト用）
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カートアイテム一覧 */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {cartState.items.map((item) => (
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
                    // カートをクリアする処理
                    clearCart()
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
                      {formatPrice(cartState.totalPrice.toString(), cartState.currencyCode)}
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
                        {formatPrice(cartState.totalPrice.toString(), cartState.currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 代理店情報表示 */}
                <div className="bg-blue-900 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold mb-2 text-blue-200">
                    {t({ JP: '代理店情報', EN: 'Agent Info' })}
                  </h3>
                  <p className="text-sm text-blue-100">
                    {t({ JP: '代理店コード', EN: 'Agent Code' })}: {agentCode}
                  </p>
                  <p className="text-xs text-blue-300 mt-2">
                    {t({
                      JP: '※チェックアウト時に割引が自動適用されます',
                      EN: '※ Discount will be applied automatically at checkout'
                    })}
                  </p>
                </div>

                {/* 購入ボタン */}
                <div className="mb-4">
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 sm:w-5 h-4 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm sm:text-base">
                        {isProcessing ? (
                          t({ JP: '処理中...', EN: 'Processing...' })
                        ) : (
                          t({ JP: 'クレジットカードで購入', EN: 'Pay with Card' })
                        )}
                      </span>
                    </div>
                  </button>
                </div>

                {/* 仮想通貨決済ボタン */}
                <div className="mb-4 sm:mb-6">
                  <button
                    onClick={handleCryptoPayment}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-4 sm:w-5 h-4 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm sm:text-base">
                        {t({ JP: '仮想通貨で支払う', EN: 'Pay with Crypto' })}
                      </span>
                    </div>
                  </button>
                </div>

                {/* 続けて買い物ボタン */}
                <Link 
                  href={`/${agentCode}`}
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
        {orderInfo && (
          <CryptoPaymentModal
            isOpen={showCryptoModal}
            onClose={() => setShowCryptoModal(false)}
            orderInfo={orderInfo}
            connectedWallet={currentConnectedWallet}
          />
        )}
    </>
  )
}
