'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface CryptoPaymentFormProps {
  orderId: string
  amount: string
  currency?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface PaymentData {
  address: string
  amount: string
  currency: string
  orderId: string
  expiresAt: string
  paymentId: string
}

interface PaymentStatus {
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'INSUFFICIENT'
  transactionHash?: string
  balance?: string
}

export default function CryptoPaymentForm({
  orderId,
  amount,
  currency = 'ETH',
  onSuccess,
  onCancel
}: CryptoPaymentFormProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [status, setStatus] = useState<PaymentStatus['status']>('PENDING')
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generatePaymentAddress()
  }, [orderId])

  useEffect(() => {
    if (!paymentData) return

    const checkInterval = setInterval(() => {
      checkPaymentStatus()
    }, 10000)

    const timerInterval = setInterval(() => {
      const now = Date.now()
      const expires = new Date(paymentData.expiresAt).getTime()
      const remaining = Math.max(0, expires - now)
      setTimeLeft(remaining)

      if (remaining === 0) {
        setStatus('EXPIRED')
        clearInterval(checkInterval)
      }
    }, 1000)

    return () => {
      clearInterval(checkInterval)
      clearInterval(timerInterval)
    }
  }, [paymentData])

  useEffect(() => {
    if (status === 'CONFIRMED' && onSuccess) {
      onSuccess()
    }
  }, [status])

  const generatePaymentAddress = async () => {
    try {
      setLoading(true)
      setError(null)

      // OrderIDが未定義の場合は生成
      const currentOrderId = orderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

      const response = await fetch('/api/crypto/generate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: currentOrderId, amount, currency })
      })

      if (!response.ok) {
        throw new Error('Failed to generate payment address')
      }

      const data = await response.json()
      setPaymentData(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!paymentData) return

    try {
      const response = await fetch(
        `/api/crypto/payment-status?paymentId=${paymentData.paymentId}`
      )

      if (response.ok) {
        const data = await response.json()
        setStatus(data.data.status)
      }
    } catch (err) {
      console.error('Failed to check payment status:', err)
    }
  }

  const copyAddress = () => {
    if (paymentData) {
      navigator.clipboard.writeText(paymentData.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getEtherscanUrl = () => {
    if (!paymentData) return ''
    const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? '' : 'sepolia.'
    return `https://${network}etherscan.io/address/${paymentData.address}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3">
          {t({ JP: '支払いアドレスを生成中...', EN: 'Generating payment address...' })}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">
          {t({ JP: 'エラー', EN: 'Error' })}
        </h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={generatePaymentAddress}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {t({ JP: '再試行', EN: 'Retry' })}
        </button>
      </div>
    )
  }

  if (!paymentData) return null

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {t({ JP: '仮想通貨でお支払い', EN: 'Pay with Cryptocurrency' })}
        </h2>

        {status === 'PENDING' && (
          <div className="text-sm text-gray-600">
            {t({ JP: '残り時間: ', EN: 'Time remaining: ' })}
            <span className="font-mono font-bold text-lg">
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {status === 'CONFIRMED' ? (
        <div className="text-center py-8">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-green-600 mb-2">
            {t({ JP: '支払いが確認されました！', EN: 'Payment Confirmed!' })}
          </h3>
          <p className="text-gray-600">
            {t({
              JP: 'ご注文の処理を開始いたします。',
              EN: 'We are processing your order.'
            })}
          </p>
        </div>
      ) : status === 'EXPIRED' ? (
        <div className="text-center py-8">
          <div className="text-red-600 text-6xl mb-4">⏰</div>
          <h3 className="text-2xl font-bold text-red-600 mb-2">
            {t({ JP: '支払い期限が切れました', EN: 'Payment Expired' })}
          </h3>
          <button
            onClick={generatePaymentAddress}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t({ JP: '新しいアドレスを生成', EN: 'Generate New Address' })}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t({ JP: '送金額', EN: 'Amount to Send' })}
              </label>
              <div className="text-3xl font-bold text-gray-900">
                {amount} {currency}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t({ JP: '送金先アドレス', EN: 'Send to Address' })}
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-3 bg-white border border-gray-300 rounded text-sm break-all">
                  {paymentData.address}
                </code>
                <button
                  onClick={copyAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  {copied ? t({ JP: 'コピー済み!', EN: 'Copied!' }) : t({ JP: 'コピー', EN: 'Copy' })}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">
              {t({ JP: '支払い手順', EN: 'Payment Instructions' })}
            </h4>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>{t({ JP: 'ウォレットアプリを開く', EN: 'Open your wallet app' })}</li>
              <li>{t({ JP: '上記のアドレスに正確な金額を送金', EN: 'Send the exact amount to the address above' })}</li>
              <li>{t({ JP: '送金確認を待つ（約1-3分）', EN: 'Wait for confirmation (about 1-3 minutes)' })}</li>
            </ol>
          </div>

          <div className="text-center space-y-2">
            <a
              href={getEtherscanUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-600 hover:text-blue-800 underline text-sm"
            >
              {t({ JP: 'Etherscanで確認', EN: 'View on Etherscan' })}
            </a>

            <div className="text-sm text-gray-600">
              {t({ JP: 'ステータス: ', EN: 'Status: ' })}
              <span className="font-semibold">
                {status === 'PENDING' && t({ JP: '支払い待ち', EN: 'Awaiting Payment' })}
                {status === 'INSUFFICIENT' && t({ JP: '金額不足', EN: 'Insufficient Amount' })}
              </span>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-6 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              {t({ JP: 'キャンセル', EN: 'Cancel' })}
            </button>
          )}
        </>
      )}
    </div>
  )
}