'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { usePriceGuarantee } from '@/contexts/PriceGuaranteeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from './Toast'

export default function ExpiredItemCleanup() {
  const { state, removeItem } = useCart()
  const { priceGuarantees, getExpiredProductIds, removeExpiredPrices } = usePriceGuarantee()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRemovingRef = useRef(false)


  const cleanup = useCallback(async () => {
    // 既に削除処理中の場合はスキップ
    if (isRemovingRef.current) {
      return
    }

    // 期限切れの商品IDを取得
    const expiredProductIds = getExpiredProductIds()

    if (expiredProductIds.length === 0) {
      // 価格保証が0個で、カートに商品がある場合は強制削除を試行
      if (priceGuarantees && priceGuarantees.size === 0 && state.items.length > 0) {
        // 全商品を削除
        for (const item of state.items) {
          try {
            await removeItem(item.variantId)
          } catch (error) {
            console.error(`Failed to remove ${item.title}:`, error)
          }
        }
        
        // 通知を表示
        showToast(
          t({
            JP: `期限切れ商品を削除しました（${state.items.length}個）`,
            EN: `Expired items removed (${state.items.length} items)`
          }),
          'info'
        )
      }
      return
    }

    // カート内の期限切れ商品を検出
    // item.idまたはitem.productIdで価格保証を確認
    const expiredItems = state.items.filter(item => {
      const isExpiredById = expiredProductIds.includes(item.id)
      const isExpiredByProductId = expiredProductIds.includes(item.productId)
      const isExpired = isExpiredById || isExpiredByProductId
      return isExpired
    })


    // 期限切れ商品をカートから削除
    if (expiredItems.length > 0) {
      isRemovingRef.current = true

      try {
        // 各商品を順番に削除
        for (const item of expiredItems) {
          try {
            await removeItem(item.variantId)
          } catch (error) {
            console.error(`Failed to remove ${item.title}:`, error)
          }
        }

        // 削除通知を表示（まとめて表示）
        if (expiredItems.length === 1) {
          showToast(
            t({
              JP: `「${expiredItems[0].title}」は価格保証期限が切れたためカートから削除されました。`,
              EN: `"${expiredItems[0].title}" has been removed from cart due to expired price guarantee.`
            }),
            'info'
          )
        } else {
          showToast(
            t({
              JP: `${expiredItems.length}件の商品が価格保証期限切れのためカートから削除されました。`,
              EN: `${expiredItems.length} items have been removed from cart due to expired price guarantee.`
            }),
            'info'
          )
        }
      } finally {
        isRemovingRef.current = false
      }
    }

    // 期限切れ価格保証を削除
    removeExpiredPrices()
  }, [state.items, priceGuarantees, getExpiredProductIds, removeItem, removeExpiredPrices, showToast, t])

  // 初回と定期的なクリーンアップ
  useEffect(() => {
    // 即座に実行
    cleanup()
    
    // 初回は少し遅らせて実行（コンポーネントマウント後）
    const initialTimer = setTimeout(() => {
      cleanup()
    }, 1000)

    // 3秒ごとにチェック
    cleanupIntervalRef.current = setInterval(() => {
      cleanup()
    }, 3000)

    return () => {
      clearTimeout(initialTimer)
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [cleanup])

  return null // このコンポーネントはUIを表示しない
}