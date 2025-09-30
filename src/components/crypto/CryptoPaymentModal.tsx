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
  draftOrderId?: string // Shopifyドラフト注文ID
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
  const [manualAmount, setManualAmount] = useState<string>('')
  const [useManualAmount, setUseManualAmount] = useState<boolean>(false)
  const [isOneClickProcessing, setIsOneClickProcessing] = useState<boolean>(false)

  // 子ウォレットを生成
  const generateWallet = async () => {
    setIsGenerating(true)
    setError(null)

    // 前回のWalletIDをクリア
    setPaymentWallet(null)
    setPaymentStatus(null)
    setTransferStatus(null)
    console.log('🧹 Cleared previous wallet data in modal')

    try {
      // orderInfoをAPIが期待する形式に変換
      const walletRequest = {
        orderId: orderInfo.orderId,
        totalAmount: orderInfo.totalAmount,
        currency: orderInfo.currency || 'SepoliaETH',
        items: orderInfo.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      }
      
      console.log('📤 ウォレット生成リクエスト:', walletRequest)
      
      const response = await fetch('/api/crypto-payment/generate-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(walletRequest),
      })

      const result = await response.json()
      console.log('📊 従来APIレスポンス:', result)
      console.log('📊 レスポンスステータス:', response.status)

      if (result.success) {
        setPaymentWallet(result.data)
        startPaymentMonitoring(result.data)
        // 顧客の残高を取得
        fetchCustomerBalance(result.data.walletAddress)
        console.log('✅ 従来API: ウォレット生成完了')
      } else {
        console.error('❌ 従来APIエラー詳細:', result)
        setError(result.error || result.details || 'Failed to generate wallet')
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
            
            // ドラフト注文を正式注文に変換
            await confirmPayment(result.data)
            
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

  // Sepoliaテストネットに接続
  const connectToSepolia = async () => {
    try {
      // まず切り替えを試行（ネットワークが既に追加されている場合）
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        })
        console.log('✅ Sepoliaテストネットに切り替えました')
        return true
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          // ネットワークが追加されていない場合、追加を試行
          console.log('📝 Sepoliaテストネットを追加中...')
          
          // Sepoliaテストネットの設定（複数のRPC URLを用意）
          const sepoliaConfig = {
            chainId: '0xaa36a7', // 11155111 in hex
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'SepoliaETH',
              decimals: 18,
            },
            rpcUrls: [
              'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
              'https://rpc.sepolia.org',
              'https://sepolia.gateway.tenderly.co'
            ],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }

          // ネットワークの追加
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [sepoliaConfig],
          })

          console.log('✅ Sepoliaテストネットに接続しました')
          return true
        } else {
          throw switchErr
        }
      }
    } catch (err: any) {
      console.error('❌ ネットワーク接続エラー:', err)
      
      // より詳細なエラーメッセージ
      let errorMessage = 'Sepoliaテストネットに接続できませんでした'
      if (err.code) {
        switch (err.code) {
          case 4001:
            errorMessage = 'ユーザーがネットワーク切り替えを拒否しました'
            break
          case 4902:
            errorMessage = 'Sepoliaテストネットが追加されていません'
            break
          case -32002:
            errorMessage = 'MetaMaskで処理中のリクエストがあります'
            break
          default:
            errorMessage = `ネットワークエラー: ${err.message || err.code}`
        }
      }
      
      setError(errorMessage)
      return false
    }
  }

  // 現在のネットワークを確認
  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const sepoliaChainId = '0xaa36a7' // 11155111 in hex
      
      if (chainId !== sepoliaChainId) {
        console.log('⚠️ 現在のネットワーク:', chainId, '期待値:', sepoliaChainId)
        return false
      }
      return true
    } catch (err) {
      console.error('❌ ネットワーク確認エラー:', err)
      return false
    }
  }

  // ウォレット情報を取得
  const fetchWalletInfo = async () => {
    try {
      // MetaMaskが利用可能かチェック
      if (typeof window !== 'undefined' && window.ethereum) {
        // まずSepoliaに接続
        const connected = await connectToSepolia()
        if (!connected) {
          return
        }

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

  // ワンクリック決済（ウォレット生成 + 自動送金）
  const oneClickPayment = async () => {
    if (!walletInfo) {
      setError('MetaMaskが接続されていません')
      return
    }

    setIsOneClickProcessing(true)
    setError(null)

    try {
      console.log('🚀 ワンクリック決済開始...')

      // 送金前にSepoliaネットワークを確認
      const isSepolia = await checkNetwork()
      if (!isSepolia) {
        console.log('🔄 Sepoliaネットワークに接続中...')
        const connected = await connectToSepolia()
        if (!connected) {
          throw new Error('Sepoliaテストネットに接続できませんでした')
        }
      }

      // 1. ウォレット生成（draftOrderIdを含むAPIを使用）
      console.log('📝 支払い用ウォレットを生成中...')
      console.log('Order Info:', orderInfo) // デバッグログ追加
      const response = await fetch('/api/crypto/generate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderInfo.orderId, // 必須パラメータを追加
          amount: parseFloat(orderInfo.totalAmount),
          currency: orderInfo.currency || 'SepoliaETH',
          customerEmail: 'crypto-payment@example.com',
          lineItems: orderInfo.items.map(item => ({
            variantId: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        }),
      })

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('❌ JSONパースエラー:', jsonError)
        console.error('❌ レスポンステキスト:', await response.text())
        throw new Error('Invalid JSON response from server')
      }
      
      console.log('📊 APIレスポンス:', result)
      console.log('📊 レスポンスステータス:', response.status)
      console.log('📊 レスポンスヘッダー:', Object.fromEntries(response.headers.entries()))

      // レスポンスステータスをチェック
      if (!response.ok) {
        console.error('❌ HTTPエラー:', response.status, response.statusText)
        console.error('❌ APIエラー詳細:', result)
        console.error('❌ リクエストURL:', '/api/crypto/generate-address')
        console.error('❌ リクエストボディ:', {
          orderId: orderInfo.orderId,
          amount: parseFloat(orderInfo.totalAmount),
          currency: orderInfo.currency || 'SepoliaETH',
          customerEmail: 'crypto-payment@example.com',
          lineItems: orderInfo.items.map(item => ({
            variantId: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
        
        const errorMessage = result?.error || result?.details || `HTTP ${response.status}: Failed to generate wallet`
        console.error('❌ 最終エラーメッセージ:', errorMessage)
        throw new Error(errorMessage)
      }

      if (!result.success) {
        console.error('❌ APIエラー詳細:', result)
        throw new Error(result.error || result.details || 'Failed to generate wallet')
      }

      const wallet = result.data
      // generate-address APIのレスポンス形式に合わせて変換
      const walletData = {
        orderId: wallet.orderId,
        walletAddress: wallet.address,
        derivationPath: '', // generate-address APIには含まれていない
        createdAt: new Date().toISOString(),
        totalAmount: wallet.amount?.toString() || orderInfo.totalAmount,
        currency: wallet.currency || 'SepoliaETH',
        items: orderInfo.items,
        draftOrderId: wallet.draftOrderId // 重要な: draftOrderIdを保存
      }
      
      setPaymentWallet(walletData)
      console.log('✅ ウォレット生成完了:', walletData.walletAddress)
      console.log('📝 DraftOrderId:', walletData.draftOrderId)

      // 2. 自動送金
      console.log('💰 自動送金開始...')
      const amountToSend = walletData.totalAmount

      // SepoliaETHをWeiに変換
      const amountInWei = (parseFloat(amountToSend) * Math.pow(10, 18)).toString(16)

      console.log('MetaMask SepoliaETH送金開始:', {
        to: walletData.walletAddress,
        amount: amountToSend,
        amountInWei: `0x${amountInWei}`
      })

      // MetaMaskでトランザクションを送信
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletInfo.address,
          to: walletData.walletAddress,
          value: `0x${amountInWei}`,
          gas: '0x5208', // 21000 gas
        }],
      })

      console.log('✅ MetaMask SepoliaETH送金完了:', txHash)

      // 送金完了を通知
      setTransferStatus({
        isTransferring: false,
        isTransferred: true,
        transactionHash: txHash
      })

      // 3. 支払い監視を開始
      console.log('👀 支払い監視開始...')
      startPaymentMonitoring(walletData)

      // 顧客の残高を取得
      fetchCustomerBalance(walletData.walletAddress)

    } catch (err: any) {
      console.error('❌ ワンクリック決済エラー:', err)
      setError(`決済エラー: ${err.message || 'Unknown error'}`)
      setTransferStatus({
        isTransferring: false,
        isTransferred: false,
        error: err.message || 'Unknown error'
      })
    } finally {
      setIsOneClickProcessing(false)
    }
  }

  // MetaMaskから正確な金額を取得して送金（従来の機能）
  const sendPaymentWithMetaMask = async () => {
    if (!paymentWallet || !walletInfo) {
      setError('ウォレット情報が不足しています')
      return
    }

    try {
      // 送金前にSepoliaネットワークを確認
      const isSepolia = await checkNetwork()
      if (!isSepolia) {
        console.log('🔄 Sepoliaネットワークに接続中...')
        const connected = await connectToSepolia()
        if (!connected) {
          throw new Error('Sepoliaテストネットに接続できませんでした')
        }
      }
      // 送金金額を決定（手動入力または自動計算）
      const amountToSend = useManualAmount ? manualAmount : paymentWallet.totalAmount
      
      // SepoliaETHをWeiに変換
      const amountInWei = (parseFloat(amountToSend) * Math.pow(10, 18)).toString(16)
      
      console.log('MetaMask SepoliaETH送金開始:', {
        to: paymentWallet.walletAddress,
        amount: amountToSend,
        amountInWei: `0x${amountInWei}`
      })

      // MetaMaskでトランザクションを送信
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletInfo.address,
          to: paymentWallet.walletAddress,
          value: `0x${amountInWei}`,
          gas: '0x5208', // 21000 gas
        }],
      })

      console.log('MetaMask SepoliaETH送金完了:', txHash)
      
      // 送金完了を通知
      setTransferStatus({
        isTransferring: false,
        isTransferred: true,
        transactionHash: txHash
      })

      // 支払い監視を開始
      startPaymentMonitoring(paymentWallet)

    } catch (err: any) {
      console.error('MetaMask SepoliaETH送金エラー:', err)
      setError(`SepoliaETH送金エラー: ${err.message || 'Unknown error'}`)
      setTransferStatus({
        isTransferring: false,
        isTransferred: false,
        error: err.message || 'Unknown error'
      })
    }
  }

  // 支払い完了を確認してドラフト注文を正式注文に変換
  const confirmPayment = async (paymentData: any) => {
    try {
      console.log('🔄 支払い完了を確認中...', paymentData)
      
      // draftOrderIdを取得（複数のソースから試行）
      let draftOrderId = null
      
      // 1. paymentWalletからdraftOrderIdを取得（最優先）
      if ((paymentWallet as any)?.draftOrderId) {
        draftOrderId = (paymentWallet as any).draftOrderId
        console.log('📝 DraftOrderId found in paymentWallet:', draftOrderId)
      }
      // 2. orderInfoから取得を試行
      else if ((orderInfo as any).draftOrderId) {
        draftOrderId = (orderInfo as any).draftOrderId
        console.log('📝 DraftOrderId found in orderInfo:', draftOrderId)
      }
      // 3. paymentWalletのorderIdから取得を試行
      else if (paymentWallet?.orderId) {
        draftOrderId = paymentWallet.orderId
        console.log('📝 DraftOrderId found in paymentWallet.orderId:', draftOrderId)
      }
      // 4. orderInfo.orderIdから取得を試行
      else if (orderInfo.orderId) {
        draftOrderId = orderInfo.orderId
        console.log('📝 DraftOrderId found in orderInfo.orderId:', draftOrderId)
      }
      
      if (!draftOrderId) {
        console.error('❌ DraftOrderId not found in any source')
        console.error('orderInfo:', orderInfo)
        console.error('paymentWallet:', paymentWallet)
        console.error('paymentData:', paymentData)
        return
      }

      const response = await fetch('/api/crypto/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftOrderId: draftOrderId,
          transactionHash: paymentData.transactionHash,
          fromAddress: paymentData.fromAddress || 'unknown',
          toAddress: paymentData.toAddress || paymentWallet?.walletAddress,
          amount: paymentData.amount || paymentWallet?.totalAmount,
          currency: paymentData.currency || 'SepoliaETH'
        }),
      })

      const result = await response.json()
      console.log('📊 支払い確認結果:', result)

      if (result.success) {
        console.log('✅ ドラフト注文が正式注文に変換されました:', result.data.orderId)
      } else {
        console.error('❌ 支払い確認エラー:', result.error)
      }
    } catch (err) {
      console.error('❌ 支払い確認エラー:', err)
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
          
          // ドラフト注文を正式注文に変換
          await confirmPayment(result.data)
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
      // 前回のWalletIDをクリア
      setPaymentWallet(null)
      setPaymentStatus(null)
      setTransferStatus(null)
      setError(null)
      setManualAmount('')
      setUseManualAmount(false)
      console.log('🧹 Cleared previous wallet data on modal open')
      
      fetchWalletInfo()
    }
  }, [isOpen]) // fetchWalletInfo is stable as it doesn't use any props/state

  // 手動入力モードで金額が変更された時の処理
  useEffect(() => {
    if (useManualAmount && !manualAmount) {
      setManualAmount(paymentWallet?.totalAmount || '')
    }
  }, [useManualAmount, paymentWallet?.totalAmount, manualAmount])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-green-500/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t({ JP: '仮想通貨決済', EN: 'Crypto Payment' })}
            </h2>
            <div className="mt-2 flex items-center">
              <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-semibold border border-orange-500/30">
                🧪 {t({ JP: 'テストモード - Sepoliaテストネット', EN: 'TEST MODE - Sepolia Testnet' })}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* SepoliaETH取得案内 */}
        {!walletInfo && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">
              {t({ JP: 'SepoliaETHが必要です', EN: 'SepoliaETH Required' })}
            </h3>
            <div className="space-y-3 text-sm">
              <p className="text-yellow-300">
                {t({ JP: 'この決済にはテスト用のSepoliaETHが必要です。以下のFaucetから無料で取得できます：', EN: 'This payment requires test SepoliaETH. You can get it for free from these faucets:' })}
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 font-semibold text-xs">
                  ⚠️ {t({ JP: '重要: MetaMaskでEthereum Mainnetが選択されている場合、自動でSepoliaテストネットに切り替わります', EN: 'Important: If Ethereum Mainnet is selected in MetaMask, it will automatically switch to Sepolia testnet' })}
                </p>
              </div>
              <div className="space-y-2">
                <a 
                  href="https://www.alchemy.com/faucets/ethereum-sepolia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  Alchemy Sepolia Faucet
                </a>
                <a 
                  href="https://sepoliafaucet.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  Sepolia Faucet
                </a>
              </div>
              <p className="text-xs text-yellow-400 bg-yellow-500/20 p-2 rounded">
                {t({ JP: '💡 ヒント: MetaMaskでSepoliaテストネットワークに接続してからFaucetを使用してください', EN: '💡 Tip: Connect to Sepolia testnet in MetaMask before using the faucet' })}
              </p>
            </div>
          </div>
        )}

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
                <span className="text-blue-400 font-bold">{walletInfo.balance} SepoliaETH</span>
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

        {/* ワンクリック決済ボタン */}
        {!paymentWallet && walletInfo && (
          <div className="mb-6">
            <button
              onClick={oneClickPayment}
              disabled={isOneClickProcessing}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              {isOneClickProcessing ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t({ JP: 'ワンクリック決済中...', EN: 'One-Click Payment Processing...' })}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                  </svg>
                  {t({ JP: 'ワンクリック決済', EN: 'One-Click Payment' })}
                </div>
              )}
            </button>
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-400">
                {t({ JP: 'ウォレット生成 + 自動送金 + 支払い監視を一括実行', EN: 'Generate wallet + Auto transfer + Payment monitoring in one click' })}
              </p>
              <p className="text-xs text-orange-400 font-semibold mt-1">
                🧪 {t({ JP: 'Sepoliaテストネットで実行', EN: 'Executes on Sepolia Testnet' })}
              </p>
            </div>
          </div>
        )}

        {/* 従来のウォレット生成ボタン（フォールバック用） */}
        {!paymentWallet && !walletInfo && (
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
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-400">
                {t({ JP: 'MetaMaskを接続するとワンクリック決済が利用できます', EN: 'Connect MetaMask to use one-click payment' })}
              </p>
              <p className="text-xs text-orange-400 font-semibold mt-1">
                🧪 {t({ JP: 'Sepoliaテストネットで実行', EN: 'Executes on Sepolia Testnet' })}
              </p>
            </div>
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
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold text-lg">
                      {paymentWallet.totalAmount} {paymentWallet.currency}
                    </span>
                    <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded">
                      {t({ JP: '自動設定', EN: 'Auto Set' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {t({ JP: 'カートの合計金額が自動で設定されています', EN: 'Cart total amount is automatically set' })}
                  </p>
                </div>
              </div>

              {customerBalance !== null && (
                <div>
                  <label className="text-sm text-gray-300 block mb-1">
                    {t({ JP: '現在の残高', EN: 'Current Balance' })}
                  </label>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <span className="text-blue-400 font-bold text-lg">
                      {customerBalance} SepoliaETH
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  {t({ JP: 'ネットワーク', EN: 'Network' })}
                </label>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-semibold mr-3">
                      🧪 TESTNET
                    </span>
                    <span className="text-orange-300 font-mono text-sm">
                      Sepolia Testnet (Chain ID: 11155111)
                    </span>
                  </div>
                  <p className="text-xs text-orange-400 mt-2">
                    {t({ JP: '⚠️ これはテストネットです。実際のお金は使用されません', EN: '⚠️ This is a testnet. No real money is used' })}
                  </p>
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
                    <span className="text-white font-mono">{paymentStatus.amount} SepoliaETH</span>
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

        {/* 手動送金ボタン（フォールバック用） */}
        {paymentWallet && walletInfo && !paymentStatus?.isPaid && (
          <div className="mb-6">
            <button
              onClick={sendPaymentWithMetaMask}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15v-3a2 2 0 114 0v3H8z"/>
                </svg>
                {t({ JP: '手動で送金', EN: 'Manual Send' })}
              </div>
            </button>
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-400">
                {t({ JP: 'ワンクリック決済が失敗した場合の手動送金', EN: 'Manual send if one-click payment fails' })}
              </p>
              <p className="text-xs text-orange-400 font-semibold mt-1">
                🧪 {t({ JP: 'Sepoliaテストネットで実行', EN: 'Executes on Sepolia Testnet' })}
              </p>
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
