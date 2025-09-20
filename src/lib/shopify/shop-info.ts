import { shopifyStorefront } from './storefront-client';

// ショップ情報を取得
export async function getShopInfo() {
  try {
    const query = `
      query getShop {
        shop {
          name
          description
          primaryDomain {
            url
            host
          }
          paymentSettings {
            currencyCode
            acceptedCardBrands
            supportedDigitalWallets
          }
          privacyPolicy {
            url
          }
          termsOfService {
            url
          }
          refundPolicy {
            url
          }
          shippingPolicy {
            url
          }
        }
      }
    `;

    const response = await shopifyStorefront.request(query);

    if (!response || !response.shop) {
      console.error('Failed to fetch shop info');
      return null;
    }

    return response.shop;
  } catch (error) {
    console.error('Error fetching shop info:', error);
    return null;
  }
}

// ショップ情報をキャッシュ付きで取得
let cachedShopInfo: any = null;
let cacheExpiry = 0;

export async function getCachedShopInfo() {
  const now = Date.now();

  // キャッシュが有効な場合はキャッシュを返す（1時間）
  if (cachedShopInfo && cacheExpiry > now) {
    return cachedShopInfo;
  }

  // 新しくフェッチ
  const shopInfo = await getShopInfo();

  if (shopInfo) {
    cachedShopInfo = shopInfo;
    cacheExpiry = now + 60 * 60 * 1000; // 1時間後に期限切れ
  }

  return shopInfo;
}