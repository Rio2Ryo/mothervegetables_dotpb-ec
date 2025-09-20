'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCachedShopInfo } from '@/lib/shopify/shop-info';

interface ShopInfo {
  name: string;
  description?: string;
  primaryDomain?: {
    url: string;
    host: string;
  };
  paymentSettings?: {
    currencyCode: string;
    acceptedCardBrands: string[];
    supportedDigitalWallets: string[];
  };
}

interface ShopContextType {
  shop: ShopInfo | null;
  loading: boolean;
  error: string | null;
}

const ShopContext = createContext<ShopContextType>({
  shop: null,
  loading: true,
  error: null,
});

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopInfo = async () => {
      try {
        setLoading(true);
        const shopInfo = await getCachedShopInfo();

        if (shopInfo) {
          setShop(shopInfo);
        } else {
          // フォールバックとして環境変数から取得
          setShop({
            name: process.env.NEXT_PUBLIC_SHOPIFY_STORE_NAME || 'MOTHER VEGETABLES',
          });
        }
      } catch (err) {
        console.error('Error fetching shop info:', err);
        setError('ショップ情報の取得に失敗しました');
        // エラー時もフォールバック
        setShop({
          name: process.env.NEXT_PUBLIC_SHOPIFY_STORE_NAME || 'MOTHER VEGETABLES',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShopInfo();
  }, []);

  return (
    <ShopContext.Provider value={{ shop, loading, error }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}