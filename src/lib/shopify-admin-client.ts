// 一時的に無効化（Shopify Admin APIの型定義問題のため）
// 実際の実装時には適切なShopify Admin APIクライアントを使用してください

export async function searchCustomerByEmail(_email: string) {
  // 実装待ち
  throw new Error('Shopify Admin API client is temporarily disabled');
}

export async function createCustomer(_customerData: Record<string, unknown>) {
  // 実装待ち
  throw new Error('Shopify Admin API client is temporarily disabled');
}

export async function updateCustomerMetafields(_customerId: string, _metafields: Array<{ key: string; value: string }>) {
  // 実装待ち
  throw new Error('Shopify Admin API client is temporarily disabled');
}