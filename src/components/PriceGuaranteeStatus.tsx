'use client'

import { useState, useEffect } from 'react'
import { usePriceGuarantee } from '@/contexts/PriceGuaranteeContext'

interface PriceGuaranteeStatusProps {
  productId: string
  className?: string
}

export default function PriceGuaranteeStatus({ productId, className = '' }: PriceGuaranteeStatusProps) {
  const { getPriceGuarantee, isPriceValid, getRemainingTime, extendPriceGuarantee } = usePriceGuarantee()
  const [remainingTime, setRemainingTime] = useState(0)
  const [showExpiredWarning, setShowExpiredWarning] = useState(false)

  const guarantee = getPriceGuarantee(productId)
  const isValid = isPriceValid(productId)

  // 残り時間を更新
  useEffect(() => {
    if (!guarantee) return

    const updateRemainingTime = () => {
      const time = getRemainingTime(productId)
      setRemainingTime(time)
      
      // 期限切れの警告を表示
      if (time === 0 && isValid) {
        setShowExpiredWarning(true)
        // 3秒後に警告を非表示
        setTimeout(() => setShowExpiredWarning(false), 3000)
      }
    }

    updateRemainingTime()
    const interval = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(interval)
  }, [guarantee, productId, getRemainingTime, isValid])

  // 価格保証を延長
  const handleExtendGuarantee = () => {
    extendPriceGuarantee(productId)
    setShowExpiredWarning(false)
  }

  if (!guarantee) return null

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`${className}`}>
      {isValid ? (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-400 text-sm font-bold">
                🔒 価格保証中
              </div>
              <div className="text-xs text-gray-300">
                ETH: {guarantee.ethPrice.toFixed(4)} ETH
              </div>
              <div className="text-xs text-gray-300">
                ≈ ${guarantee.usdPrice.toFixed(2)} USD
              </div>
              <div className="text-xs text-yellow-300 mt-1">
                残り時間: {remainingTime}秒
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-400 text-lg font-bold">
                {formatTime(remainingTime)}
              </div>
              <div className="text-xs text-gray-300">
                残り時間
              </div>
            </div>
          </div>
          
          {/* 延長ボタン（残り10秒以下で表示） */}
          {remainingTime <= 10 && remainingTime > 0 && (
            <button
              onClick={handleExtendGuarantee}
              className="mt-2 w-full bg-green-500 hover:bg-green-600 text-black text-xs font-bold py-1 px-2 rounded transition-colors"
            >
              価格保証を延長 (+1分)
            </button>
          )}
        </div>
      ) : (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
          <div className="text-red-400 text-sm font-bold mb-1">
            ⚠️ 価格保証期限切れ
          </div>
          <div className="text-xs text-gray-300 mb-1">
            価格が変動している可能性があります
          </div>
          <div className="text-xs text-red-300 mb-2">
            残り時間: 0秒（期限切れ）
          </div>
          <button
            onClick={handleExtendGuarantee}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded transition-colors"
          >
            価格を再確認
          </button>
        </div>
      )}

      {/* 期限切れ警告 */}
      {showExpiredWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="font-bold">価格保証期限切れ</div>
            <div className="text-sm">価格が変動している可能性があります</div>
          </div>
        </div>
      )}
    </div>
  )
}

