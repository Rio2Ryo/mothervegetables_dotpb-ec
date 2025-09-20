'use client';

import { useCallback } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAgentStore } from '@/stores/agentStore';

export function useCartWithAgentDiscount() {
  const cart = useCart();
  const { couponCode, currentAgentCode } = useAgentStore();

  // 代理店割引を適用したカート作成
  const createShopifyCartWithAgentDiscount = useCallback(async () => {
    if (cart.state.items.length === 0) {
      throw new Error('カートが空です');
    }

    try {
      // カートアイテムをShopify形式に変換
      const lines = cart.state.items.map(item => ({
        merchandiseId: item.variantId,
        quantity: item.quantity,
      }));

      // 代理店コードを追加してAPIを呼び出し
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lines,
          agentCode: currentAgentCode, // 代理店コードを追加
        }),
      });

      if (!response.ok) {
        throw new Error('カートの作成に失敗しました');
      }

      const data = await response.json();
      
      // カート状態を更新（CartContextのメソッドを使用）
      // cart.dispatchは直接アクセスできないため、カート作成後の状態は自動的に更新される

      return data.cart;
    } catch (error) {
      console.error('Cart creation error:', error);
      throw error;
    }
  }, [cart.state.items, currentAgentCode]);

  // 代理店割引情報を取得
  const getDiscountInfo = useCallback(() => {
    if (!currentAgentCode || !couponCode) {
      return null;
    }

    return {
      agentCode: currentAgentCode,
      couponCode,
      discountApplied: true,
    };
  }, [currentAgentCode, couponCode]);

  return {
    ...cart,
    createShopifyCartWithAgentDiscount,
    getDiscountInfo,
    hasAgentDiscount: !!currentAgentCode && !!couponCode,
  };
}
