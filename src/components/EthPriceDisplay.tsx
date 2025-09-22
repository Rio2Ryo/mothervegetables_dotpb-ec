'use client'

import { useState, useEffect } from 'react'
import { usePriceGuarantee } from '@/contexts/PriceGuaranteeContext'

interface LockedPrice {
  productId: string
  ethPrice: number
  lockedAt: number
}

// ETH価格のフック（グローバル状態管理）
let cachedEthPrice: number | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 60000 // 1分間キャッシュ

export function useEthPrice() {
  const [ethPriceInUsd, setEthPriceInUsd] = useState<number>(3000) // デフォルト値

  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        // キャッシュが有効な場合はキャッシュを使用
        if (cachedEthPrice && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
          setEthPriceInUsd(cachedEthPrice)
          return
        }

        // CoinGecko APIから価格を取得
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        const data = await response.json()

        if (data.ethereum?.usd) {
          const price = data.ethereum.usd
          setEthPriceInUsd(price)
          cachedEthPrice = price
          cacheTimestamp = Date.now()
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error)
        // エラー時はデフォルト値を使用
      }
    }

    fetchEthPrice()
    // 1分ごとに価格を更新
    const interval = setInterval(fetchEthPrice, 60000)

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
    // USD to ETH conversion
    const ethAmount = usdPrice / ethPriceInUsd

    if (productId) {
      const guarantee = getPriceGuarantee(productId)
      if (guarantee && isPriceValid(productId)) {
        setDisplayPrice(guarantee.ethPrice)
      } else {
        setDisplayPrice(ethAmount)
      }
    } else {
      setDisplayPrice(ethAmount)
    }
  }, [usdPrice, ethPriceInUsd, productId, getPriceGuarantee, isPriceValid])

  return (
    <span className={className}>
      {displayPrice.toFixed(6)} ETH
    </span>
  )
}