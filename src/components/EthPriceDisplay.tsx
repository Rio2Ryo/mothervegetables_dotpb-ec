'use client'

import { useState, useEffect } from 'react'
import { usePriceGuarantee } from '@/contexts/PriceGuaranteeContext'

interface LockedPrice {
  productId: string
  ethPrice: number
  lockedAt: number
}

// ETH価格のフック（グローバル状態管理）

export function useEthPrice() {
  const [ethPriceInUsd, setEthPriceInUsd] = useState<number>(3000) // デフォルト値

  useEffect(() => {
    // ランダムなETH価格を生成（0.0010-0.0019の範囲）
    const generateRandomEthPrice = () => {
      const min = 0.0010
      const max = 0.0019
      return Math.random() * (max - min) + min
    }

    // 初回実行
    const initialPrice = generateRandomEthPrice()
    console.log('🎲 Initial ETH price:', initialPrice)
    setEthPriceInUsd(initialPrice)

    // 5秒ごとにランダム価格を更新
    const interval = setInterval(() => {
      const newPrice = generateRandomEthPrice()
      console.log('🎲 New ETH price:', newPrice)
      setEthPriceInUsd(newPrice)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return ethPriceInUsd
}

export function useEthPriceLock() {
  const [lockedPrices, setLockedPrices] = useState<Map<string, LockedPrice>>(new Map())

  const lockPriceForProduct = (productId: string, ethPrice: number) => {
    setLockedPrices(prev => {
      const newMap = new Map(prev)
      newMap.set(productId, {
        productId,
        ethPrice,
        lockedAt: Date.now()
      })
      return newMap
    })
  }

  const getLockedPrice = (productId: string): number | null => {
    const locked = lockedPrices.get(productId)
    return locked ? locked.ethPrice : null
  }

  return {
    lockPriceForProduct,
    getLockedPrice
  }
}

interface EthPriceDisplayProps {
  usdPrice: number
  productId?: string
  className?: string
}

export default function EthPriceDisplay({ usdPrice, productId, className = '' }: EthPriceDisplayProps) {
  const { getPriceGuarantee, isPriceValid } = usePriceGuarantee()
  const ethPriceInUsd = useEthPrice()
  const [displayPrice, setDisplayPrice] = useState(0)

  useEffect(() => {
    console.log('💰 EthPriceDisplay - ethPriceInUsd:', ethPriceInUsd, 'usdPrice:', usdPrice)
    
    // USD to ETH conversion
    const ethAmount = usdPrice / ethPriceInUsd
    console.log('💰 Calculated ETH amount:', ethAmount)

    if (productId) {
      const guarantee = getPriceGuarantee(productId)
      if (guarantee && isPriceValid(productId)) {
        console.log('🔒 Using locked price:', guarantee.ethPrice)
        setDisplayPrice(guarantee.ethPrice)
      } else {
        console.log('📊 Using current price:', ethAmount)
        setDisplayPrice(ethAmount)
      }
    } else {
      console.log('📊 Using current price (no productId):', ethAmount)
      setDisplayPrice(ethAmount)
    }
  }, [usdPrice, ethPriceInUsd, productId, getPriceGuarantee, isPriceValid])

  return (
    <span className={className}>
      {displayPrice.toFixed(6)} ETH
    </span>
  )
}