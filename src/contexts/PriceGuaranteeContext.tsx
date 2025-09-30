'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PriceGuarantee {
  productId: string
  ethPrice: number
  usdPrice: number
  lockedAt: number // タイムスタンプ
  expiresAt: number // 有効期限のタイムスタンプ
}

interface PriceGuaranteeContextType {
  priceGuarantees: Map<string, PriceGuarantee>
  lockPrice: (productId: string, ethPrice: number, usdPrice: number) => void
  getPriceGuarantee: (productId: string) => PriceGuarantee | null
  isPriceValid: (productId: string) => boolean
  getRemainingTime: (productId: string) => number // 残り時間（秒）
  removeExpiredPrices: () => void
  extendPriceGuarantee: (productId: string) => void // 価格保証を延長
  resetPriceGuarantee: (productId: string) => void // 価格保証をリセット
  resetAllPriceGuarantees: () => void // 全商品の価格保証をリセット
  resetAllPriceGuaranteeTimes: () => void // 全商品の価格保証時間だけをリセット
  getExpiredProductIds: () => string[] // 期限切れ商品IDを取得
  forceExpireAllGuarantees: () => void // 全商品の価格保証を強制的に期限切れにする
}

const PriceGuaranteeContext = createContext<PriceGuaranteeContextType | undefined>(undefined)

export function PriceGuaranteeProvider({ children }: { children: ReactNode }) {
  const [priceGuarantees, setPriceGuarantees] = useState<Map<string, PriceGuarantee>>(new Map())

  // 価格をロック（15分間保証）
  const lockPrice = (productId: string, ethPrice: number, usdPrice: number) => {
    const now = Date.now()
    const expiresAt = now + (15 * 60 * 1000) // 15分後

    setPriceGuarantees(prev => {
      const newMap = new Map(prev)
      newMap.set(productId, {
        productId,
        ethPrice,
        usdPrice,
        lockedAt: now,
        expiresAt
      })
      return newMap
    })
  }

  // 価格保証情報を取得
  const getPriceGuarantee = (productId: string) => {
    return priceGuarantees.get(productId) || null
  }

  // 価格が有効かチェック
  const isPriceValid = (productId: string) => {
    const guarantee = priceGuarantees.get(productId)
    if (!guarantee) return false
    
    const now = Date.now()
    return now < guarantee.expiresAt
  }

  // 残り時間を取得（秒）
  const getRemainingTime = (productId: string) => {
    const guarantee = priceGuarantees.get(productId)
    if (!guarantee) return 0
    
    const now = Date.now()
    const remaining = Math.max(0, Math.floor((guarantee.expiresAt - now) / 1000))
    return remaining
  }

  // 期限切れの価格保証を削除
  const removeExpiredPrices = () => {
    const now = Date.now()
    setPriceGuarantees(prev => {
      const newMap = new Map()
      prev.forEach((guarantee, productId) => {
        if (now < guarantee.expiresAt) {
          newMap.set(productId, guarantee)
        }
      })
      return newMap
    })
  }

  // 価格保証を延長（15分間延長）
  const extendPriceGuarantee = (productId: string) => {
    const guarantee = priceGuarantees.get(productId)
    if (!guarantee) return

    const now = Date.now()
    const newExpiresAt = now + (15 * 60 * 1000) // 15分延長

    setPriceGuarantees(prev => {
      const newMap = new Map(prev)
      newMap.set(productId, {
        ...guarantee,
        expiresAt: newExpiresAt
      })
      return newMap
    })
  }

  // 価格保証をリセット（商品追加時に呼び出し）
  const resetPriceGuarantee = (productId: string) => {
    setPriceGuarantees(prev => {
      const newMap = new Map(prev)
      newMap.delete(productId)
      return newMap
    })
  }

  // 全商品の価格保証をリセット（商品追加時に呼び出し）
  const resetAllPriceGuarantees = () => {
    setPriceGuarantees(new Map())
  }

  // 全商品の価格保証時間だけをリセット（価格は維持）
  const resetAllPriceGuaranteeTimes = () => {
    const now = Date.now()
    const newExpiresAt = now + (15 * 60 * 1000) // 15分後

    setPriceGuarantees(prev => {
      const newMap = new Map()
      prev.forEach((guarantee, productId) => {
        newMap.set(productId, {
          ...guarantee,
          lockedAt: now,
          expiresAt: newExpiresAt
        })
      })
      return newMap
    })
  }

  // 期限切れ商品IDを取得
  const getExpiredProductIds = () => {
    const now = Date.now()
    const expiredIds: string[] = []
    
    priceGuarantees.forEach((guarantee, productId) => {
      if (now >= guarantee.expiresAt) {
        expiredIds.push(productId)
      }
    })
    
    return expiredIds
  }

  // 全商品の価格保証を強制的に期限切れにする（テスト用）
  const forceExpireAllGuarantees = () => {
    const now = Date.now()
    const pastTime = now - (30 * 60 * 1000) // 30分前

    setPriceGuarantees(prev => {
      const newMap = new Map()
      prev.forEach((guarantee, productId) => {
        newMap.set(productId, {
          ...guarantee,
          lockedAt: pastTime,
          expiresAt: pastTime + (15 * 60 * 1000) // 15分前
        })
      })
      return newMap
    })
  }

  // 定期的に期限切れの価格保証をチェック
  useEffect(() => {
    const interval = setInterval(() => {
      removeExpiredPrices()
    }, 1000) // 1秒ごとにチェック

    return () => clearInterval(interval)
  }, [])

  return (
    <PriceGuaranteeContext.Provider value={{
      priceGuarantees,
      lockPrice,
      getPriceGuarantee,
      isPriceValid,
      getRemainingTime,
      removeExpiredPrices,
      extendPriceGuarantee,
      resetPriceGuarantee,
      resetAllPriceGuarantees,
      resetAllPriceGuaranteeTimes,
      getExpiredProductIds,
      forceExpireAllGuarantees
    }}>
      {children}
    </PriceGuaranteeContext.Provider>
  )
}

export function usePriceGuarantee() {
  const context = useContext(PriceGuaranteeContext)
  if (context === undefined) {
    throw new Error('usePriceGuarantee must be used within a PriceGuaranteeProvider')
  }
  return context
}
