'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface CryptoPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orderInfo: {
    orderId: string
    totalAmount: string
    currency: string
    items: Array<{
      id: string
      name: string
      quantity: number
      price: string
    }>
  }
}

interface PaymentWallet {
  orderId: string
  walletAddress: string
  derivationPath: string
  createdAt: string
  totalAmount: string
  currency: string
}

export default function CryptoPaymentModal({ isOpen, onClose, orderInfo }: CryptoPaymentModalProps) {
  const { t } = useLanguage()
  const [paymentWallet, setPaymentWallet] = useState<PaymentWallet | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<{
    orderId: string
    walletAddress: string
    isPaid: boolean
    amount: string
    transactionHash?: string
    blockNumber?: number
    timestamp?: Date
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null)
  const [customerBalance, setCustomerBalance] = useState<string | null>(null)
  const [walletInfo, setWalletInfo] = useState<{
    address: string
    balance: string
    network: string
  } | null>(null)
  const [transferStatus, setTransferStatus] = useState<{
    isTransferring: boolean
    isTransferred: boolean
    transactionHash?: string
    error?: string
  } | null>(null)

  // 子ウォレットを生成
  const generateWallet = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/crypto-payment/generate-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderInfo),
      })

      const result = await response.json()

      if (result.success) {
        setPaymentWallet(result.data)
        startPaymentMonitoring(result.data)
        // 顧客の残高を取得
        fetchCustomerBalance(result.data.walletAddress)
      } else {
        setError(result.error || 'Failed to generate wallet')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Error generating wallet:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // 支払い監視を開始
  const startPaymentMonitoring = (wallet: PaymentWallet) => {
    setIsMonitoring(true)
    
    const interval = setInterval(async () => {
      try {
        console.log('🔍 支払い監視中...', wallet.walletAddress)
        const response = await fetch('/api/crypto-payment/monitor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: wallet.walletAddress,
            expectedAmount: wallet.totalAmount,
            orderId: wallet.orderId,
          }),
        })

        const result = await response.json()
        console.log('📊 監視結果:', result)

        if (result.success) {
          console.log('📊 支払い状況更新:', result.data)
          setPaymentStatus(result.data)
          
          if (result.data.isPaid) {
            console.log('✅ 支払い完了！')
            setIsMonitoring(false)
            clearInterval(interval)
            setMonitoringInterval(null)
            
            // 自動移行の状況を表示
            setTransferStatus({
              isTransferring: true,
              isTransferred: false
            })
            
            // 自動移行の完了を待つ（5秒後）
            setTimeout(() => {
              setTransferStatus({
                isTransferring: false,
                isTransferred: true,
                transactionHash: result.data.transactionHash
              })
            }, 5000)
          } else {
            console.log('⏳ 支払い待機中...')
          }
        } else {
          console.warn('⚠️ 監視結果が失敗:', result)
        }
      } catch (err) {
        console.error('❌ 監視エラー:', err)
      }
    }, 5000) // 5秒間隔で監視（より頻繁に）

    setMonitoringInterval(interval)
  }

  // 顧客の残高を取得
  const fetchCustomerBalance = async (walletAddress: string) => {
    try {
      console.log('🔍 顧客残高を取得中...', walletAddress)
      const response = await fetch('/api/crypto-payment/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: walletAddress }),
      })

      console.log('📊 レスポンスステータス:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log('📄 レスポンステキスト:', text)
      
      if (!text) {
        console.log('⚠️ 空のレスポンス')
        return
      }

      const result = JSON.parse(text)
      console.log('📊 パース結果:', result)

      if (result.success) {
        setCustomerBalance(result.balance)
      }
    } catch (err) {
      console.error('❌ 顧客残高取得エラー:', err)
      // エラーの場合はデフォルト値を設定
      setCustomerBalance('0.0')
    }
  }

  // ウォレット情報を取得
  const fetchWalletInfo = async () => {
    try {
      // MetaMaskが利用可能かチェック
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          const address = accounts[0]
          const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
          })
          
          // weiをETHに変換
          const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(6)
          
          setWalletInfo({
            address,
            balance: balanceInEth,
            network: 'Sepolia Testnet'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching wallet info:', err)
    }
  }

  // 手動で支払い状況をチェック
  const manualCheckPayment = async () => {
    if (!paymentWallet) return
    
    try {
      console.log('🔄 手動チェック開始...')
      const response = await fetch('/api/crypto-payment/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: paymentWallet.walletAddress,
          expectedAmount: paymentWallet.totalAmount,
          orderId: paymentWallet.orderId,
        }),
      })

      const result = await response.json()
      console.log('📊 手動チェック結果:', result)

      if (result.success) {
        setPaymentStatus(result.data)
        
        if (result.data.isPaid) {
          console.log('✅ 支払い完了！')
          setIsMonitoring(false)
          if (monitoringInterval) {
            clearInterval(monitoringInterval)
            setMonitoringInterval(null)
          }
        }
      }
    } catch (err) {
      console.error('❌ 手動チェックエラー:', err)
    }
  }

  // 支払い監視を停止
  const stopPaymentMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      setMonitoringInterval(null)
    }
    setIsMonitoring(false)
  }

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval)
      }
    }
  }, [monitoringInterval])

  // モーダルが開いた時にウォレット情報を取得
  useEffect(() => {
    if (isOpen) {
      fetchWalletInfo()
    }
  }, [isOpen]) // fetchWalletInfo is stable as it doesn't use any props/state

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-green-500/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {t({ JP: '仮想通貨決済', EN: 'Crypto Payment' })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ウォレット情報 */}
        {walletInfo && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">
              {t({ JP: '接続中のウォレット', EN: 'Connected Wallet' })}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">{t({ JP: 'アドレス', EN: 'Address' })}:</span>
                <span className="text-blue-400 font-mono text-xs break-all">{walletInfo.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">{t({ JP: '残高', EN: 'Balance' })}:</span>
                <span className="text-blue-400 font-bold">{walletInfo.balance} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">{t({ JP: 'ネットワーク', EN: 'Network' })}:</span>
                <span className="text-blue-400">{walletInfo.network}</span>
              </div>
            </div>
          </div>
        )}

        {/* 注文情報 */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">
            {t({ JP: '注文情報', EN: 'Order Information' })}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">{t({ JP: '注文ID', EN: 'Order ID' })}:</span>
              <span className="text-white font-mono">{orderInfo.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">{t({ JP: '合計金額', EN: 'Total Amount' })}:</span>
              <span className="text-green-400 font-bold">{orderInfo.totalAmount} {orderInfo.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">{t({ JP: '商品数', EN: 'Items' })}:</span>
              <span className="text-white">{orderInfo.items.length}</span>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* ウォレット生成ボタン */}
        {!paymentWallet && (
          <div className="mb-6">
            <button
              onClick={generateWallet}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t({ JP: 'ウォレット生成中...', EN: 'Generating Wallet...' })}
                </div>
              ) : (
                t({ JP: '支払い用ウォレットを生成', EN: 'Generate Payment Wallet' })
              )}
            </button>
          </div>
        )}

        {/* 支払い情報 */}
        {paymentWallet && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-400 mb-3">
              {t({ JP: '支払い情報', EN: 'Payment Information' })}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  {t({ JP: '振込先アドレス', EN: 'Payment Address' })}
                </label>
                <div className="bg-gray-800 rounded-lg p-3">
                  <code className="text-green-400 font-mono text-sm break-all">
                    {paymentWallet.walletAddress}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(paymentWallet.walletAddress)}
                    className="ml-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {t({ JP: 'コピー', EN: 'Copy' })}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  {t({ JP: '支払い金額', EN: 'Payment Amount' })}
                </label>
                <div className="bg-gray-800 rounded-lg p-3">
                  <span className="text-green-400 font-bold text-lg">
                    {paymentWallet.totalAmount} {paymentWallet.currency}
                  </span>
                </div>
              </div>

              {customerBalance !== null && (
                <div>
                  <label className="text-sm text-gray-300 block mb-1">
                    {t({ JP: '現在の残高', EN: 'Current Balance' })}
                  </label>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <span className="text-blue-400 font-bold text-lg">
                      {customerBalance} ETH
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  {t({ JP: 'ネットワーク', EN: 'Network' })}
                </label>
                <div className="bg-gray-800 rounded-lg p-3">
                  <span className="text-white font-mono text-sm">
                    Sepolia Testnet (Chain ID: 11155111)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

            {/* 支払い状況 */}
            {paymentStatus && (
              <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">
                  {t({ JP: '支払い状況', EN: 'Payment Status' })}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t({ JP: '支払い済み', EN: 'Paid' })}:</span>
                    <span className={`font-bold ${paymentStatus.isPaid ? 'text-green-400' : 'text-yellow-400'}`}>
                      {paymentStatus.isPaid ? t({ JP: 'はい', EN: 'Yes' }) : t({ JP: 'いいえ', EN: 'No' })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t({ JP: '現在の残高', EN: 'Current Balance' })}:</span>
                    <span className="text-white font-mono">{paymentStatus.amount} ETH</span>
                  </div>

                  {paymentStatus.transactionHash && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">{t({ JP: 'トランザクション', EN: 'Transaction' })}:</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${paymentStatus.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm break-all"
                      >
                        {paymentStatus.transactionHash.slice(0, 10)}...
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 自動移行状況 */}
            {transferStatus && (
              <div className="mb-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-400 mb-3">
                  {t({ JP: '自動移行状況', EN: 'Auto Transfer Status' })}
                </h3>
                
                <div className="space-y-2">
                  {transferStatus.isTransferring && (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-purple-400 font-medium">
                        {t({ JP: 'マスターウォレットへの自動移行中...', EN: 'Auto transferring to master wallet...' })}
                      </span>
                    </div>
                  )}
                  
                  {transferStatus.isTransferred && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-400 font-medium">
                        {t({ JP: 'マスターウォレットへの自動移行完了！', EN: 'Auto transfer to master wallet completed!' })}
                      </span>
                    </div>
                  )}
                  
                  {transferStatus.error && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-400 font-medium">
                        {t({ JP: '自動移行エラー: ', EN: 'Auto transfer error: ' })}{transferStatus.error}
                      </span>
                    </div>
                  )}
                  
                  {/* 手動移動の手順 */}
                  {transferStatus.error && (
                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <h4 className="text-yellow-400 font-semibold mb-2">
                        {t({ JP: '手動移動の手順', EN: 'Manual Transfer Steps' })}
                      </h4>
                      <div className="text-sm text-yellow-300 space-y-1">
                        <p>1. {t({ JP: 'MetaMaskで子ウォレットをインポート', EN: 'Import child wallet in MetaMask' })}</p>
                        <p>2. {t({ JP: 'マスターウォレットに送金', EN: 'Send to master wallet' })}</p>
                        <p>3. {t({ JP: '送金先: 0xD159CaB9786a5E4D955354C3E067b297c453eD35', EN: 'Recipient: 0xD159CaB9786a5E4D955354C3E067b297c453eD35' })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

        {/* 監視状況 */}
        {isMonitoring && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-yellow-400 font-medium">
                {t({ JP: '支払いを監視中...', EN: 'Monitoring payment...' })}
              </span>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex space-x-4">
          {paymentWallet && (
            <button
              onClick={manualCheckPayment}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {t({ JP: '支払い状況を確認', EN: 'Check Payment Status' })}
            </button>
          )}
          
          {isMonitoring && (
            <button
              onClick={stopPaymentMonitoring}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {t({ JP: '監視を停止', EN: 'Stop Monitoring' })}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {t({ JP: '閉じる', EN: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  )
}
